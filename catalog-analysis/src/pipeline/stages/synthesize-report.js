const { REQUIRED_TOPIC_NAMES } = require('../../domain/report-schema');
const {
  requireNonEmptyString,
  requireNonEmptyArray,
  requireFields
} = require('../../utils/assert');
const { toolDefinition } = require('../../utils/schema-tools');
const {
  buildSynthesisResearch,
  buildSynthesisTopicsResearch,
  compactJson
} = require('../../utils/prompt-data');

const SYNTHESIZE_CORE_TOOL = toolDefinition(
  'synthesize-core',
  'Core sections of a category intelligence report: summary, lexicon, and voice of customer'
);
const SYNTHESIZE_TOPICS_TOOL = toolDefinition(
  'synthesize-topics',
  'Topic observations and actions for a category intelligence report'
);

function buildMetricsContext(competitorMetrics, categoryStandard) {
  const m = competitorMetrics;
  const avg = (key) => {
    const vals = m.map((x) => x[key]).filter(Number.isFinite);
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  };

  return {
    title_len: categoryStandard.title?.median_length,
    bullets: categoryStandard.bullet_norms?.median_count ?? avg('bullet_count'),
    images: categoryStandard.gallery_standard?.median_images,
    aplus_rate: categoryStandard.aplus_standard?.presence_rate,
    aplus_modules: categoryStandard.aplus_standard?.median_modules,
    price_inr: categoryStandard.price_band?.per_set,
    rating: categoryStandard.reviews_norm?.rating_band,
    reviews: categoryStandard.reviews_norm?.median_volume,
    node: categoryStandard.category_node
  };
}

function validateLexiconTerms(terms) {
  requireNonEmptyArray(terms, 'category_lexicon.terms');
  for (const term of terms) {
    requireNonEmptyString(term.term, 'lexicon term');
    if (!['high', 'medium', 'low'].includes(term.relevance)) {
      throw new Error(`Invalid lexicon term relevance: ${term.relevance}`);
    }
  }
}

function validateVoiceSignals(signals) {
  requireNonEmptyArray(signals, 'voice_of_customer.signals');
  for (const signal of signals) {
    requireNonEmptyString(signal.phrase, 'voice signal phrase');
    if (!['praise', 'complaint', 'objection', 'neutral'].includes(signal.sentiment)) {
      throw new Error(`Invalid voice signal sentiment: ${signal.sentiment}`);
    }
    if (!['high', 'medium', 'low'].includes(signal.relevance)) {
      throw new Error(`Invalid voice signal relevance: ${signal.relevance}`);
    }
    if (!Number.isFinite(signal.mention_count) || signal.mention_count < 1) {
      throw new Error('voice signal mention_count must be >= 1');
    }
  }
}

async function synthesizeCore({ llm, config, category, research }) {
  const result = await llm.completeTool({
    system: 'You synthesize Amazon category research into a concise intelligence report.',
    tool: SYNTHESIZE_CORE_TOOL,
    user: `Category: ${category}

Research:
${compactJson(research)}

Write the core sections of a category intelligence report.

Rules:
- category_lexicon.terms: seller/search terms from competitor listings only; classify each as high, medium, or low relevance; include low-relevance terms for completeness — they will be filtered later
- voice_of_customer.signals: buyer phrases from reviews with sentiment (praise, complaint, objection, neutral), relevance, and approximate mention_count from the sample; include complaints and objections, not only praise
- No ASINs, no framework IDs, no per-seller gap callouts`,
    maxTokens: 4096
  });

  requireFields(result, {
    values: ['category_lexicon', 'voice_of_customer'],
    strings: ['summary']
  }, 'synthesized');
  requireFields(result.category_lexicon, {
    strings: ['observations'],
    arrays: ['terms']
  }, 'category_lexicon');
  validateLexiconTerms(result.category_lexicon.terms);
  requireFields(result.voice_of_customer, {
    strings: ['observations'],
    arrays: ['signals']
  }, 'voice_of_customer');
  validateVoiceSignals(result.voice_of_customer.signals);

  return result;
}

async function synthesizeTopics({ llm, config, category, research, core }) {
  const topicList = REQUIRED_TOPIC_NAMES.join(', ');
  const topicsResearch = buildSynthesisTopicsResearch(research);

  const result = await llm.completeTool({
    system: 'You write category research topic observations for Amazon catalog intelligence.',
    tool: SYNTHESIZE_TOPICS_TOOL,
    user: `Category: ${category}

Research:
${compactJson(topicsResearch)}

Core already written:
${compactJson({ summary: core.summary, lexicon: core.category_lexicon.observations })}

Required topic names (each exactly once): ${topicList}

Rules:
- observations are research findings in prose
- actions are category-wide, not our-SKU specific
- topics.keywords should reference category_lexicon for vocabulary, not duplicate the full term list
- No framework IDs or ASINs`,
    maxTokens: 6144
  });

  requireNonEmptyArray(result.topics, 'synthesized topics');

  const names = new Set();
  for (const topic of result.topics) {
    requireNonEmptyString(topic.name, 'topic.name');
    requireNonEmptyString(topic.observations, `topic ${topic.name} observations`);
    requireNonEmptyArray(topic.actions, `topic ${topic.name} actions`);
    names.add(topic.name);
  }

  for (const required of REQUIRED_TOPIC_NAMES) {
    if (!names.has(required)) {
      throw new Error(`Synthesized topics missing required topic: ${required}`);
    }
  }

  return result.topics;
}

async function synthesizeReport({
  llm,
  config,
  category,
  competitors,
  categoryStandard,
  voiceOfCustomer,
  visualStandard,
  competitorMetrics
}) {
  const metricsContext = buildMetricsContext(competitorMetrics, categoryStandard);
  const research = buildSynthesisResearch({
    category,
    competitors,
    categoryStandard,
    voiceOfCustomer,
    visualStandard,
    metricsContext
  });

  const core = await synthesizeCore({ llm, config, category, research });
  const topics = await synthesizeTopics({ llm, config, category, research, core });

  return {
    summary: core.summary,
    category_lexicon: core.category_lexicon,
    voice_of_customer: core.voice_of_customer,
    topics
  };
}

module.exports = {
  synthesizeReport
};
