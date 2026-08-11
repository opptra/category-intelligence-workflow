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

const SYNTHESIZE_SUMMARY_TOOL = toolDefinition(
  'synthesize-summary',
  'Category intelligence summary: how top sellers win'
);
const SYNTHESIZE_LEXICON_TOOL = toolDefinition(
  'synthesize-lexicon',
  'Category lexicon observations and seller/search terms'
);
const SYNTHESIZE_VOC_TOOL = toolDefinition(
  'synthesize-voc',
  'Unified voice of customer observations and buyer signals'
);
const SYNTHESIZE_TOPICS_TOOL = toolDefinition(
  'synthesize-topics',
  'Topic observations and actions for a category intelligence report'
);

const VISUAL_TOPIC_NAMES = new Set(['gallery_images', 'aplus']);
const COPY_TOPIC_NAMES = ['title', 'item_highlights', 'bullets', 'keywords'];
const COMMERCE_TOPIC_NAMES = ['specs', 'pricing', 'reviews_and_trust', 'consistency_and_hygiene'];

function buildMetricsContext(competitorMetrics, categoryStandard) {
  const m = competitorMetrics;
  const avg = (key) => {
    const vals = m.map((x) => x[key]).filter(Number.isFinite);
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  };

  return {
    title_len: categoryStandard.title?.median_length,
    title_limit_chars: 75,
    item_highlights_limit_chars: 125,
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

function validateTopicBatch(topics, expectedNames, batchLabel = 'topics') {
  if (!Array.isArray(topics) || topics.length === 0) {
    throw new Error(
      `Missing required non-empty array: synthesized topics`
      + (batchLabel ? ` [${batchLabel}]` : '')
      + ` (got ${topics === undefined ? 'undefined' : topics === null ? 'null' : typeof topics}`
      + `${Array.isArray(topics) ? `, length=${topics.length}` : ''})`
    );
  }
  const names = new Set();
  for (const topic of topics) {
    requireNonEmptyString(topic.name, 'topic.name');
    requireNonEmptyString(topic.observations, `topic ${topic.name} observations`);
    requireNonEmptyArray(topic.actions, `topic ${topic.name} actions`);
    names.add(topic.name);
  }
  for (const required of expectedNames) {
    if (!names.has(required)) {
      throw new Error(`Synthesized topics missing required topic: ${required} [${batchLabel}]`);
    }
  }
  return topics;
}

/** Slim research payloads so each focused call stays reliable. */
function researchForSummary(research) {
  return {
    category: research.category,
    n_leaders: research.n_leaders,
    n_ours: research.n_ours,
    metrics: research.metrics,
    catalog_gaps: research.catalog_gaps,
    copy: {
      title_pattern: research.copy?.title_pattern,
      bullet_topics: research.copy?.bullet_topics,
      keywords: research.copy?.keywords
    },
    vision: {
      pdp_gallery: research.vision?.pdp_gallery
        ? {
            n_analyzed: research.vision.pdp_gallery.n_analyzed,
            median_image_count: research.vision.pdp_gallery.median_image_count,
            roles: (research.vision.pdp_gallery.roles || []).slice(0, 8)
          }
        : null,
      aplus: research.vision?.aplus
        ? {
            n_analyzed: research.vision.aplus.n_analyzed,
            median_image_count: research.vision.aplus.median_image_count,
            roles: (research.vision.aplus.roles || []).slice(0, 8)
          }
        : null,
      ours_vs_leaders: research.vision?.ours_vs_leaders
        ? {
            missing_vs_leader_required: research.vision.ours_vs_leaders.missing_vs_leader_required
          }
        : null
    }
  };
}

function researchForLexicon(research) {
  return {
    category: research.category,
    n_leaders: research.n_leaders,
    titles: research.titles,
    listings: (research.listings || []).map((l) => ({
      title: l.title,
      bullets: l.bullets,
      item_highlights: l.item_highlights
    })),
    copy: research.copy,
    catalog_gaps: {
      missing_lexicon_terms: research.catalog_gaps?.missing_lexicon_terms || []
    }
  };
}

function researchForVoc(research) {
  return {
    category: research.category,
    n_leaders: research.n_leaders,
    n_ours: research.n_ours,
    voice: research.voice,
    catalog_gaps: {
      summary: research.catalog_gaps?.summary || null
    }
  };
}

async function synthesizeSummary({ llm, category, research, log }) {
  if (log) log('S5a', 'Writing category summary...');
  const result = await llm.completeTool({
    system: 'You write a concise Amazon category intelligence summary focused on how top sellers win.',
    tool: SYNTHESIZE_SUMMARY_TOOL,
    user: `Category: ${category}

Research:
${compactJson(researchForSummary(research))}

Write a category summary from the research.
- Primary: how top sellers win (patterns, vocabulary, buyer expectations)
- Secondary: catalog-level gaps vs that bar when supported
- No ASINs, no framework IDs`,
    maxTokens: 4096
  });

  requireNonEmptyString(result?.summary, 'summary');
  return { summary: result.summary.trim() };
}

async function synthesizeLexicon({ llm, category, research, log }) {
  if (log) log('S5b', 'Building category lexicon...');
  const result = await llm.completeTool({
    system: 'You extract Amazon category seller vocabulary into a lexicon with observations.',
    tool: SYNTHESIZE_LEXICON_TOOL,
    user: `Category: ${category}

Research:
${compactJson(researchForLexicon(research))}

Build the category lexicon from competitor/leader listings only.
- Cover how leaders use seller vocabulary across title, bullets, highlights, A+, specs
- Prefer ~30–50 terms when the corpus supports it
- No ASINs`,
    maxTokens: 8192
  });

  requireFields(result, { values: ['category_lexicon'] }, 'lexicon result');
  requireFields(result.category_lexicon, {
    strings: ['observations'],
    arrays: ['terms']
  }, 'category_lexicon');
  validateLexiconTerms(result.category_lexicon.terms);

  return {
    category_lexicon: {
      observations: result.category_lexicon.observations.trim(),
      terms: result.category_lexicon.terms
    }
  };
}

async function synthesizeVoc({ llm, category, research, log }) {
  if (log) log('S5c', 'Mining unified voice of customer...');
  const result = await llm.completeTool({
    system: 'You synthesize Amazon category buyer language into one voice-of-customer section.',
    tool: SYNTHESIZE_VOC_TOOL,
    user: `Category: ${category}

Research:
${compactJson(researchForVoc(research))}

Synthesize one unified voice-of-customer section from the research.
- Merge leader/our mines into one narrative (no leaders/ours buckets)
- Include complaints and objections, not only praise
- Prefer ~25–40 signals when the sample supports it
- No ASINs, no source labels`,
    maxTokens: 8192
  });

  requireFields(result, { values: ['voice_of_customer'] }, 'voc result');
  requireFields(result.voice_of_customer, {
    strings: ['observations'],
    arrays: ['signals']
  }, 'voice_of_customer');
  validateVoiceSignals(result.voice_of_customer.signals);

  return {
    voice_of_customer: {
      observations: result.voice_of_customer.observations.trim(),
      signals: result.voice_of_customer.signals
    }
  };
}

/**
 * Core synthesis is three focused calls so each section gets full attention
 * and empty required fields fail on a small surface instead of one huge blob.
 */
async function synthesizeCore({ llm, category, research, log }) {
  const summaryPart = await synthesizeSummary({ llm, category, research, log });
  const lexiconPart = await synthesizeLexicon({ llm, category, research, log });
  const vocPart = await synthesizeVoc({ llm, category, research, log });

  return {
    summary: summaryPart.summary,
    category_lexicon: lexiconPart.category_lexicon,
    voice_of_customer: vocPart.voice_of_customer
  };
}

function visualObservationRules(topicName) {
  if (topicName === 'gallery_images') {
    return `- Topic gallery_images: use ONLY vision.pdp_gallery (+ ours_vs_leaders). Never cite A+ modules or A+ humans here.
- Cite observed numbers: n_analyzed, median_image_count, and role/signal prevalence (count and % of PDP galleries analyzed).
- State the surface explicitly ("leader PDP galleries…").
- Recommending quantities is allowed (e.g. median ~10 images). Do NOT prescribe per-image scripts ("image 1 should be X"). Slot plans live in report.image_plan, not in this topic.
- Do not restate image_plan slot briefs.
- If vision.pdp_gallery.signals.human_presence.prevalence is 0 (or near 0), do NOT claim or recommend human/person/model images for PDP galleries.`;
  }

  if (topicName === 'aplus') {
    return `- Topic aplus: use ONLY vision.aplus. Never cite PDP gallery cells here.
- Cite observed numbers: n_analyzed, median_image_count/modules, and role/signal prevalence among A+ listings analyzed.
- State the surface explicitly ("leader A+ modules…").
- Recommending module quantities is allowed. Do NOT prescribe per-module scripts ("module 1 should be X"). Slot plans live in report.image_plan, not in this topic.
- Do not restate image_plan slot briefs.
- Only claim human/person patterns in A+ when vision.aplus.signals.human_presence supports it.`;
  }

  return '';
}

function copyTopicRules() {
  return `- Amazon 2026: title <=75 chars; item_highlights <=125 chars (searchable line under title).
- title: 75-char pattern only (no legacy long titles).
- item_highlights: complementary searchable highlight line for overflow benefits/specs.
- keywords: point to category_lexicon; do not dump the full term list.`;
}

function normalizeTopicsResult(result, expectedNames) {
  if (!result) return null;

  if (Array.isArray(result.topics)) return result.topics;
  if (Array.isArray(result)) return result;

  // Single topic object returned at top level
  if (result.name && result.observations && Array.isArray(result.actions)) {
    return [result];
  }

  // Nested under common wrappers
  for (const key of ['data', 'result', 'output', 'synthesize_topics']) {
    if (Array.isArray(result[key]?.topics)) return result[key].topics;
    if (Array.isArray(result[key])) return result[key];
  }

  // Map keyed by topic name
  if (expectedNames.every((name) => result[name] && typeof result[name] === 'object')) {
    return expectedNames.map((name) => ({
      name,
      observations: result[name].observations,
      actions: result[name].actions
    }));
  }

  return null;
}

async function synthesizeTopicBatch({
  llm,
  category,
  research,
  core,
  topicNames,
  extraRules = '',
  log,
  label,
  checkpoint,
  checkpointKey
}) {
  const batchLabel = label || topicNames.join(',');
  if (checkpointKey && checkpoint?.has?.(checkpointKey)) {
    if (log) log('S5d', `Resuming topics from checkpoint: ${batchLabel}`);
    return validateTopicBatch(checkpoint.load(checkpointKey), topicNames, batchLabel);
  }

  if (log) log('S5d', `Writing topics: ${batchLabel}...`);
  const scoped = scopeResearchForTopics(research, topicNames);
  const topicList = topicNames.join(', ');
  const userPrompt = `Category: ${category}

Research:
${compactJson(scoped)}

Core already written:
${compactJson({ summary: core.summary, lexicon: core.category_lexicon.observations })}

Required topic names (each exactly once): ${topicList}

Rules:
- Primary focus: how top sellers win on each topic
- Secondary: note catalog-level shortfalls vs that bar when catalog_gaps / our_catalog / vision.ours_vs_leaders support it
- topics.keywords should reference category_lexicon for vocabulary, not duplicate the full term list
- No framework IDs or ASINs
${extraRules}`;

  // Output shape and length bounds live in synthesize-topics.schema.json (tool).
  const result = await llm.completeTool({
    system: 'You write category research topic observations for Amazon catalog intelligence.',
    tool: SYNTHESIZE_TOPICS_TOOL,
    user: userPrompt,
    maxTokens: 8192
  });

  const topics = normalizeTopicsResult(result, topicNames);
  if (!topics) {
    const keys = result && typeof result === 'object' ? Object.keys(result).join(',') : typeof result;
    throw new Error(
      `Missing required non-empty array: synthesized topics [${batchLabel}] `
      + `(got undefined topics; result_keys=${keys || 'none'})`
    );
  }

  const validated = validateTopicBatch(topics, topicNames, batchLabel);
  if (checkpointKey && checkpoint?.save) checkpoint.save(checkpointKey, validated);
  return validated;
}

/**
 * Topic synthesis: copy, commerce, gallery, A+ as separate focused batches.
 * Sequential to avoid OpenRouter parallel tool-call drops.
 */
async function synthesizeTopics({ llm, category, research, core, log, checkpoint }) {
  // Split copy into two 2-topic calls so tool JSON fits reliably under max_tokens.
  const titleHighlightTopics = await synthesizeTopicBatch({
    llm,
    category,
    research,
    core,
    topicNames: ['title', 'item_highlights'],
    extraRules: copyTopicRules(),
    log,
    label: 'copy (title, highlights)',
    checkpoint,
    checkpointKey: 's5d_topics_copy_title'
  });
  const bulletsKeywordsTopics = await synthesizeTopicBatch({
    llm,
    category,
    research,
    core,
    topicNames: ['bullets', 'keywords'],
    extraRules: copyTopicRules(),
    log,
    label: 'copy (bullets, keywords)',
    checkpoint,
    checkpointKey: 's5d_topics_copy_bullets'
  });
  const copyTopics = [...titleHighlightTopics, ...bulletsKeywordsTopics];
  const commerceTopics = await synthesizeTopicBatch({
    llm,
    category,
    research,
    core,
    topicNames: COMMERCE_TOPIC_NAMES,
    log,
    label: 'commerce (specs, pricing, reviews, hygiene)',
    checkpoint,
    checkpointKey: 's5d_topics_commerce'
  });
  const galleryTopics = await synthesizeTopicBatch({
    llm,
    category,
    research,
    core,
    topicNames: ['gallery_images'],
    extraRules: visualObservationRules('gallery_images'),
    log,
    label: 'gallery_images',
    checkpoint,
    checkpointKey: 's5d_topics_gallery'
  });
  const aplusTopics = await synthesizeTopicBatch({
    llm,
    category,
    research,
    core,
    topicNames: ['aplus'],
    extraRules: visualObservationRules('aplus'),
    log,
    label: 'aplus',
    checkpoint,
    checkpointKey: 's5d_topics_aplus'
  });

  const byName = new Map();
  for (const topic of [...copyTopics, ...commerceTopics, ...galleryTopics, ...aplusTopics]) {
    byName.set(topic.name, topic);
  }

  return REQUIRED_TOPIC_NAMES.map((name) => {
    const topic = byName.get(name);
    if (!topic) {
      throw new Error(`Synthesized topics missing required topic: ${name}`);
    }
    return topic;
  });
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
  catalogGaps,
  log,
  checkpoint
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

  const core = await checkpointedCore({ llm, category, research, log, checkpoint });
  const topics = await synthesizeTopics({ llm, category, research, core, log, checkpoint });

  return {
    summary: core.summary,
    category_lexicon: core.category_lexicon,
    voice_of_customer: core.voice_of_customer,
    topics,
    catalog_gaps: catalogGaps
  };
}

async function checkpointedCore({ llm, category, research, log, checkpoint }) {
  if (checkpoint?.has?.('s5_core')) {
    if (log) log('S5', 'Resuming core synthesis from checkpoint');
    return checkpoint.load('s5_core');
  }

  let summaryPart;
  if (checkpoint?.has?.('s5a_summary')) {
    if (log) log('S5a', 'Resuming category summary from checkpoint');
    summaryPart = checkpoint.load('s5a_summary');
  } else {
    summaryPart = await synthesizeSummary({ llm, category, research, log });
    checkpoint?.save?.('s5a_summary', summaryPart);
  }

  let lexiconPart;
  if (checkpoint?.has?.('s5b_lexicon')) {
    if (log) log('S5b', 'Resuming category lexicon from checkpoint');
    lexiconPart = checkpoint.load('s5b_lexicon');
  } else {
    lexiconPart = await synthesizeLexicon({ llm, category, research, log });
    checkpoint?.save?.('s5b_lexicon', lexiconPart);
  }

  let vocPart;
  if (checkpoint?.has?.('s5c_voc')) {
    if (log) log('S5c', 'Resuming voice of customer from checkpoint');
    vocPart = checkpoint.load('s5c_voc');
  } else {
    vocPart = await synthesizeVoc({ llm, category, research, log });
    checkpoint?.save?.('s5c_voc', vocPart);
  }

  const core = {
    summary: summaryPart.summary,
    category_lexicon: lexiconPart.category_lexicon,
    voice_of_customer: vocPart.voice_of_customer
  };
  checkpoint?.save?.('s5_core', core);
  return core;
}

module.exports = {
  synthesizeReport,
  synthesizeCore,
  visualObservationRules,
  COPY_TOPIC_NAMES,
  COMMERCE_TOPIC_NAMES
};
