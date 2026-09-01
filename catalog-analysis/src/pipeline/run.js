const { buildAnalysisConfig } = require('../config');
const { requireApiKey } = require('../utils/assert');
const { createCheckpoint, checkpointed } = require('../services/checkpoint');
const { loadDatasetsFromInput } = require('./stages/load');
const { computeCorpusMetrics } = require('./stages/metrics');
const { createLlmClient } = require('../services/llm');
const { buildCategoryStandard } = require('./stages/standards');
const { mineVoiceOfCustomer } = require('./stages/reviews-mine');
const { buildVisualStandard } = require('./stages/images');
const { buildImagePlan } = require('./stages/image-plan');
const { buildCatalogGaps } = require('./stages/catalog-gaps');
const { buildBackendKeywords } = require('./stages/backend-keywords');
const { synthesizeReport } = require('./stages/synthesize-report');
const { assembleReport } = require('./stages/assemble');

function log(stage, message) {
  console.log(`[${stage}] ${message}`);
}

async function runAnalysis(options = {}) {
  if (!options.input) {
    throw new Error('runAnalysis requires input: { our_products, top_sellers }');
  }

  const config = buildAnalysisConfig(options);
  requireApiKey(config);
  const checkpoint = createCheckpoint(options.checkpointDir || config.checkpointDir || null);

  log('S0', 'Loading datasets from in-memory input...');
  const datasets = loadDatasetsFromInput(config.input);
  const { competitors, ours, meta } = datasets;

  log('S1', 'Computing deterministic metrics...');
  const competitorMetrics = computeCorpusMetrics(competitors);
  const ourMetrics = computeCorpusMetrics(ours);

  const llm = createLlmClient(config);

  const categoryStandard = await checkpointed(
    checkpoint,
    's2_standards',
    async () => {
      log('S2', 'Building category research (standards)...');
      return buildCategoryStandard({
        llm,
        config,
        competitors,
        competitorMetrics,
        category: meta.category
      });
    },
    { log }
  );

  const voiceOfCustomer = await checkpointed(
    checkpoint,
    's3_voc',
    async () => {
      log('S3', 'Mining voice of customer (leaders vs ours)...');
      return mineVoiceOfCustomer({
        llm,
        config,
        competitors,
        ours,
        category: meta.category
      });
    },
    { log }
  );

  const visualStandard = await checkpointed(
    checkpoint,
    's4_visual',
    async () => {
      log('S4', 'Analyzing galleries (leaders + ours)...');
      return buildVisualStandard({
        llm,
        config,
        competitors,
        ours,
        category: meta.category,
        log
      });
    },
    { log }
  );

  categoryStandard.gallery_standard = {
    ...categoryStandard.gallery_standard,
    required_roles: visualStandard.gallery_standard.required_roles,
    hero_conventions: visualStandard.gallery_standard.hero_conventions,
    quality_notes: visualStandard.gallery_standard.quality_notes
  };
  categoryStandard.aplus_standard = {
    ...categoryStandard.aplus_standard,
    topics: visualStandard.aplus_topics_from_vision
  };

  const catalogGaps = await checkpointed(
    checkpoint,
    's4b_gaps',
    async () => {
      log('S4b', 'Computing catalog-level gaps vs leaders...');
      return buildCatalogGaps({
        competitorMetrics,
        ourMetrics,
        categoryStandard,
        ours,
        visualStandard
      });
    },
    { log }
  );

  const imagePlan = await checkpointed(
    checkpoint,
    's4c_image_plan',
    async () => {
      log('S4c', 'Building gallery and A+ image slot plans...');
      return buildImagePlan({
        llm,
        visualStandard,
        categoryStandard,
        category: meta.category
      });
    },
    { log }
  );

  const synthesized = await checkpointed(
    checkpoint,
    's5_synthesized',
    async () => {
      log('S5', 'Synthesizing category intelligence report...');
      return synthesizeReport({
        llm,
        config,
        category: meta.category,
        competitors,
        ours,
        categoryStandard,
        voiceOfCustomer,
        visualStandard,
        competitorMetrics,
        catalogGaps,
        log,
        checkpoint
      });
    },
    { log }
  );

  const backendKeywords = await checkpointed(
    checkpoint,
    's5e_backend_keywords',
    async () => buildBackendKeywords({
      marketplace: config.marketplace || meta.domain,
      categoryLexicon: synthesized.category_lexicon,
      keywordMap: categoryStandard.keyword_map,
      missingLexiconTerms: catalogGaps.missing_lexicon_terms,
      ours
    }),
    { log }
  );

  log('S6', 'Assembling report...');
  const report = assembleReport({
    meta,
    config,
    synthesized,
    imagePlan,
    backendKeywords
  });
  checkpoint.save('s6_report', report);

  log(
    'done',
    `${report.topics.length} topics, ${report.category_lexicon.terms.length} lexicon terms, `
    + `${report.catalog_gaps.missing_lexicon_terms.length} lexicon gaps, `
    + `backend keywords ${report.backend_keywords.terms.length} (${report.backend_keywords.used_bytes}/${report.backend_keywords.marketplace_limit_bytes} bytes), `
    + `gallery slots ${report.image_plan.gallery.slots.length} (build ${report.image_plan.gallery.recommended_build}), `
    + `A+ slots ${report.image_plan.aplus.slots.length} (build ${report.image_plan.aplus.recommended_build})`
  );

  return { report };
}

module.exports = { runAnalysis };
