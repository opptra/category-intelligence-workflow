const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../config');
const { requireApiKey } = require('../utils/assert');
const { loadDatasets } = require('./stages/load');
const { computeCorpusMetrics } = require('./stages/metrics');
const { createLlmClient } = require('../services/llm');
const { buildCategoryStandard } = require('./stages/standards');
const { mineVoiceOfCustomer } = require('./stages/reviews-mine');
const { buildVisualStandard } = require('./stages/images');
const { synthesizeReport } = require('./stages/synthesize-report');
const { assembleReport, resolveOutputPath } = require('./stages/assemble');

function log(stage, message) {
  console.log(`[${stage}] ${message}`);
}

async function runAnalysis(config = loadConfig()) {
  requireApiKey(config);

  log('S0', `Loading datasets from ${config.outputDir}...`);
  const datasets = loadDatasets(config);
  const { competitors, meta } = datasets;

  log('S1', 'Computing deterministic metrics...');
  const competitorMetrics = computeCorpusMetrics(competitors);

  const llm = createLlmClient(config);

  log('S2', 'Building category research (standards)...');
  const categoryStandard = await buildCategoryStandard({
    llm,
    config,
    competitors,
    competitorMetrics,
    category: meta.category
  });

  log('S3', 'Mining voice of customer...');
  const voiceOfCustomer = await mineVoiceOfCustomer({
    llm,
    config,
    allProducts: datasets.all,
    category: meta.category
  });

  log('S4', 'Analyzing competitor galleries...');
  const visualStandard = await buildVisualStandard({
    llm,
    config,
    competitors,
    ours: datasets.ours
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

  log('S5', 'Synthesizing category intelligence report...');
  const synthesized = await synthesizeReport({
    llm,
    config,
    category: meta.category,
    competitors,
    categoryStandard,
    voiceOfCustomer,
    visualStandard,
    competitorMetrics
  });

  log('S6', 'Assembling report...');
  const report = assembleReport({
    meta,
    config,
    synthesized
  });

  const outputPath = resolveOutputPath(config, meta.category);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  log('done', `Wrote ${outputPath}`);
  log('summary', `${report.topics.length} topics, ${report.category_lexicon.terms.length} lexicon terms`);

  return { outputPath, report };
}

module.exports = { runAnalysis };
