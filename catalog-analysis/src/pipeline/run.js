const { buildAnalysisConfig } = require('../config');
const { requireApiKey } = require('../utils/assert');
const { loadDatasetsFromInput } = require('./stages/load');
const { computeCorpusMetrics } = require('./stages/metrics');
const { createLlmClient } = require('../services/llm');
const { buildCategoryStandard } = require('./stages/standards');
const { mineVoiceOfCustomer } = require('./stages/reviews-mine');
const { buildVisualStandard } = require('./stages/images');
const { buildCatalogGaps } = require('./stages/catalog-gaps');
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

  log('S0', 'Loading datasets from in-memory input...');
  const datasets = loadDatasetsFromInput(config.input);
  const { competitors, ours, meta } = datasets;

  log('S1', 'Computing deterministic metrics...');
  const competitorMetrics = computeCorpusMetrics(competitors);
  const ourMetrics = computeCorpusMetrics(ours);

  const llm = createLlmClient(config);

  log('S2', 'Building category research (standards)...');
  const categoryStandard = await buildCategoryStandard({
    llm,
    config,
    competitors,
    competitorMetrics,
    category: meta.category
  });

  log('S3', 'Mining voice of customer (leaders vs ours)...');
  const voiceOfCustomer = await mineVoiceOfCustomer({
    llm,
    config,
    competitors,
    ours,
    category: meta.category
  });

  log('S4', 'Analyzing galleries (leaders + ours)...');
  const visualStandard = await buildVisualStandard({
    llm,
    config,
    competitors,
    ours,
    log
  });

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

  log('S4b', 'Computing catalog-level gaps vs leaders...');
  const catalogGaps = buildCatalogGaps({
    competitorMetrics,
    ourMetrics,
    categoryStandard,
    ours,
    visualStandard
  });

  log('S5', 'Synthesizing category intelligence report...');
  const synthesized = await synthesizeReport({
    llm,
    config,
    category: meta.category,
    competitors,
    ours,
    categoryStandard,
    voiceOfCustomer,
    visualStandard,
    competitorMetrics,
    catalogGaps
  });

  log('S6', 'Assembling report...');
  const report = assembleReport({
    meta,
    config,
    synthesized
  });

  log(
    'done',
    `${report.topics.length} topics, ${report.category_lexicon.terms.length} lexicon terms, `
    + `${report.catalog_gaps.missing_lexicon_terms.length} lexicon gaps`
  );

  return { report };
}

module.exports = { runAnalysis };
