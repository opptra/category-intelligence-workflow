const { REQUIRED_TOPIC_NAMES } = require('../../domain/report-schema');
const {
  requireNonEmptyString,
  requireNonEmptyArray,
  requireFields
} = require('../../utils/assert');
const { toolDefinition } = require('../../utils/schema-tools');
const {
  buildSynthesisResearch,
  scopeResearchForTopics,
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

const VISUAL_TOPIC_NAMES = new Set(['gallery_images', 'aplus']);

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

function validateTopicBatch(topics, expectedNames) {
  requireNonEmptyArray(topics, 'synthesized topics');
  const names = new Set();
  for (const topic of topics) {
    requireNonEmptyString(topic.name, 'topic.name');
    requireNonEmptyString(topic.observations, `topic ${topic.name} observations`);
    requireNonEmptyArray(topic.actions, `topic ${topic.name} actions`);
    names.add(topic.name);
  }
  for (const required of expectedNames) {
    if (!names.has(required)) {
      throw new Error(`Synthesized topics missing required topic: ${required}`);
    }
  }
  return topics;
}

async function synthesizeCore({ llm, config, category, research }) {
  const result = await llm.completeTool({
    system: 'You synthesize Amazon category research into a concise intelligence report focused on how top sellers win.',
    tool: SYNTHESIZE_CORE_TOOL,
    user: `Category: ${category}

Research:
${compactJson(research)}

Write the core sections of a category intelligence report.

Priority:
1. Primary — how top sellers win (patterns, vocabulary, buyer expectations)
2. Secondary — catalog-level gaps vs that bar using catalog_gaps, our_catalog, and vision.ours_vs_leaders. Reference our catalog only in aggregate.

Rules:
- category_lexicon.observations: required non-empty paragraph on how leaders use seller vocabulary (write this before terms)
- category_lexicon.terms: ~30–50 seller/search terms from competitor/leader listings only; classify each as high, medium, or low relevance
- voice_of_customer: ONE unified section. Research.voice may include separate leader/our review mines for context — merge into a single non-empty observations narrative and a single signals[] list. Do not output leaders/ours buckets, source labels, or ASINs
- voice_of_customer.signals: buyer phrases with sentiment (praise, complaint, objection, neutral), relevance, and approximate mention_count; include complaints and objections, not only praise; keep to ~25–40 signals
- When mentioning visuals, keep PDP gallery claims separate from A+ claims. Do not attribute A+ patterns to PDP galleries or vice versa.
- No ASINs, no framework IDs, no per-SKU gap callouts — catalog-level only`,
    maxTokens: 20000
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

function visualObservationRules(topicName) {
  if (topicName === 'gallery_images') {
    return `- Topic gallery_images: use ONLY vision.pdp_gallery (+ ours_vs_leaders). Never cite A+ modules or A+ humans here.
- Cite observed numbers: n_analyzed, median_image_count, and role/signal prevalence (count and % of PDP galleries analyzed).
- State the surface explicitly ("leader PDP galleries…").
- Recommending quantities is allowed (e.g. median ~10 images). Do NOT prescribe per-image scripts ("image 1 should be X").
- If vision.pdp_gallery.signals.human_presence.prevalence is 0 (or near 0), do NOT claim or recommend human/person/model images for PDP galleries.`;
  }

  if (topicName === 'aplus') {
    return `- Topic aplus: use ONLY vision.aplus. Never cite PDP gallery cells here.
- Cite observed numbers: n_analyzed, median_image_count/modules, and role/signal prevalence among A+ listings analyzed.
- State the surface explicitly ("leader A+ modules…").
- Recommending module quantities is allowed. Do NOT prescribe per-module scripts ("module 1 should be X").
- Only claim human/person patterns in A+ when vision.aplus.signals.human_presence supports it.`;
  }

  return '';
}

async function synthesizeTopicBatch({
  llm,
  category,
  research,
  core,
  topicNames,
  extraRules = ''
}) {
  const scoped = scopeResearchForTopics(research, topicNames);
  const topicList = topicNames.join(', ');

  const result = await llm.completeTool({
    system: 'You write category research topic observations for Amazon catalog intelligence.',
    tool: SYNTHESIZE_TOPICS_TOOL,
    user: `Category: ${category}

Research:
${compactJson(scoped)}

Core already written:
${compactJson({ summary: core.summary, lexicon: core.category_lexicon.observations })}

Required topic names (each exactly once): ${topicList}

Rules:
- Primary focus: how top sellers win on each topic
- Secondary: note catalog-level shortfalls vs that bar when catalog_gaps / our_catalog / vision.ours_vs_leaders support it
- observations are research findings in prose
- actions are category-wide playbook steps; may mention aggregated catalog gaps, never individual SKUs/ASINs
- topics.keywords should reference category_lexicon for vocabulary, not duplicate the full term list
- No framework IDs or ASINs
${extraRules}`,
    maxTokens: 20000
  });

  return validateTopicBatch(result.topics, topicNames);
}

/**
 * Structural separation: non-visual topics, then PDP gallery alone, then A+ alone.
 * Each visual topic prompt never receives the other track's evidence.
 */
async function synthesizeTopics({ llm, config, category, research, core }) {
  const nonVisualTopics = REQUIRED_TOPIC_NAMES.filter((name) => !VISUAL_TOPIC_NAMES.has(name));

  const [nonVisual, galleryTopics, aplusTopics] = await Promise.all([
    synthesizeTopicBatch({
      llm,
      category,
      research,
      core,
      topicNames: nonVisualTopics
    }),
    synthesizeTopicBatch({
      llm,
      category,
      research,
      core,
      topicNames: ['gallery_images'],
      extraRules: visualObservationRules('gallery_images')
    }),
    synthesizeTopicBatch({
      llm,
      category,
      research,
      core,
      topicNames: ['aplus'],
      extraRules: visualObservationRules('aplus')
    })
  ]);

  const byName = new Map();
  for (const topic of [...nonVisual, ...galleryTopics, ...aplusTopics]) {
    byName.set(topic.name, topic);
  }

  const merged = REQUIRED_TOPIC_NAMES.map((name) => {
    const topic = byName.get(name);
    if (!topic) {
      throw new Error(`Synthesized topics missing required topic: ${name}`);
    }
    return topic;
  });

  return merged;
}

async function synthesizeReport({
  llm,
  config,
  category,
  competitors,
  ours,
  categoryStandard,
  voiceOfCustomer,
  visualStandard,
  competitorMetrics,
  catalogGaps
}) {
  const metricsContext = buildMetricsContext(competitorMetrics, categoryStandard);
  const research = buildSynthesisResearch({
    category,
    competitors,
    ours,
    categoryStandard,
    voiceOfCustomer,
    visualStandard,
    metricsContext,
    catalogGaps
  });

  const core = await synthesizeCore({ llm, config, category, research });
  const topics = await synthesizeTopics({ llm, config, category, research, core });

  return {
    summary: core.summary,
    category_lexicon: core.category_lexicon,
    voice_of_customer: core.voice_of_customer,
    topics,
    catalog_gaps: catalogGaps
  };
}

module.exports = {
  synthesizeReport,
  visualObservationRules
};
