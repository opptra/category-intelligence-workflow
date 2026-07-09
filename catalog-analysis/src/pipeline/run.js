const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../config');
const { loadDatasets } = require('./stages/load');
const { computeCorpusMetrics } = require('./stages/metrics');
const { createLlmClient } = require('../services/llm');
const { buildCategoryStandard, buildDeterministicStandard } = require('./stages/standards');
const { mineVoiceOfCustomer } = require('./stages/reviews-mine');
const { buildVisualStandard } = require('./stages/images');
const { computeInternalGaps } = require('./stages/gaps');
const { buildRecommendations } = require('./stages/recommend');
const { assemblePlaybook, resolveOutputPath } = require('./stages/assemble');

function log(stage, message) {
  console.log(`[${stage}] ${message}`);
}

async function runAnalysis(config = loadConfig()) {
  log('S0', `Loading datasets from ${config.outputDir}...`);
  const datasets = loadDatasets(config);
  const { competitors, ours, meta } = datasets;

  log('S1', 'Computing deterministic metrics...');
  const competitorMetrics = computeCorpusMetrics(competitors);
  const ourMetrics = computeCorpusMetrics(ours);

  const llm = config.apiKey ? createLlmClient(config) : null;

  log('S2', 'Building category standard...');
  const deterministic = buildDeterministicStandard(competitors, competitorMetrics);
  const categoryStandard = llm
    ? await buildCategoryStandard({
      llm,
      config,
      competitors,
      competitorMetrics,
      category: meta.category
    })
    : {
      title: {
        template: 'Brand + Key Attribute + Product Type + Size + Pack + Benefits + Room + Dimensions + Color',
        required_tokens: [],
        median_length: deterministic.title_norms.median_length,
        mobile_first_75_chars: ['brand', 'opacity', 'type', 'size']
      },
      keyword_map: { head: [], long_tail: [], vernacular: [], occasion: [] },
      bullet_topics: [],
      bullet_framing_pattern: 'CAPITALIZED HOOK: spec → benefit → who it helps',
      ...deterministic
    };

  log('S3', 'Mining voice of customer...');
  const voiceOfCustomer = llm
    ? await mineVoiceOfCustomer({
      llm,
      config,
      allProducts: datasets.all,
      category: meta.category
    })
    : {
      praise: [],
      complaints: [],
      objections: [],
      phrase_bank: []
    };

  log('S4', 'Analyzing competitor galleries...');
  const visualStandard = await buildVisualStandard({
    llm,
    config,
    competitors,
    ours,
    skipVision: config.skipVision || !llm
  });

  if (visualStandard.gallery_standard?.required_roles) {
    categoryStandard.gallery_standard = {
      ...categoryStandard.gallery_standard,
      required_roles: visualStandard.gallery_standard.required_roles,
      hero_conventions: visualStandard.gallery_standard.hero_conventions
    };
  }
  if (visualStandard.aplus_topics_from_vision?.length) {
    categoryStandard.aplus_standard = {
      ...categoryStandard.aplus_standard,
      topics: visualStandard.aplus_topics_from_vision
    };
  }

  log('S5', 'Detecting internal gaps from our sample (not emitted)...');
  const gapAnalysis = computeInternalGaps({
    ourMetrics,
    categoryStandard,
    visualStandard,
    ourProducts: ours
  });

  log('S6', 'Synthesizing per-attribute recommendations...');
  const recommendations = await buildRecommendations({
    llm,
    config,
    category: meta.category,
    categoryStandard,
    voiceOfCustomer,
    visualStandard,
    gapAnalysis
  });

  log('S7', 'Assembling category playbook...');
  const playbook = assemblePlaybook({
    meta,
    config,
    categoryStandard,
    voiceOfCustomer,
    recommendations
  });

  const outputPath = resolveOutputPath(config, meta.category);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(playbook, null, 2), 'utf-8');

  log('done', `Wrote ${outputPath}`);
  log('summary', `${playbook.recommendations.length} recommendations for ${meta.category}`);

  return { outputPath, playbook };
}

module.exports = { runAnalysis };
