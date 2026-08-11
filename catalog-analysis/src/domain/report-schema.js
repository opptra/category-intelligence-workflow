const {
  requireValue,
  requireNonEmptyString,
  requireNonEmptyArray,
  requireFields
} = require('../utils/assert');
const { MAX_LEXICON_OUTPUT, MAX_SIGNALS_OUTPUT } = require('./report-normalize');

const SCHEMA_VERSION = '2.4';

const REQUIRED_TOPIC_NAMES = [
  'title',
  'item_highlights',
  'bullets',
  'keywords',
  'gallery_images',
  'aplus',
  'specs',
  'pricing',
  'reviews_and_trust',
  'consistency_and_hygiene'
];

const VALID_RELEVANCE = new Set(['high', 'medium']);
const VALID_SENTIMENT = new Set(['praise', 'complaint', 'objection', 'neutral']);
const VALID_SLOT_PRIORITY = new Set(['core', 'extended']);

function validateLexiconTerm(term, index) {
  requireValue(term, `category_lexicon.terms[${index}]`);
  requireNonEmptyString(term.term, `category_lexicon.terms[${index}].term`);
  if (!VALID_RELEVANCE.has(term.relevance)) {
    throw new Error(`category_lexicon.terms[${index}].relevance must be high or medium`);
  }
}

function validateVoiceSignal(signal, index) {
  requireValue(signal, `voice_of_customer.signals[${index}]`);
  requireNonEmptyString(signal.phrase, `voice_of_customer.signals[${index}].phrase`);
  if (!VALID_SENTIMENT.has(signal.sentiment)) {
    throw new Error(`voice_of_customer.signals[${index}].sentiment is invalid`);
  }
  if (!VALID_RELEVANCE.has(signal.relevance)) {
    throw new Error(`voice_of_customer.signals[${index}].relevance must be high or medium`);
  }
  if (!Number.isFinite(signal.mention_count) || signal.mention_count < 1) {
    throw new Error(`voice_of_customer.signals[${index}].mention_count must be >= 1`);
  }
}

function validateCatalogGaps(catalogGaps) {
  requireValue(catalogGaps, 'catalog_gaps');
  requireNonEmptyString(catalogGaps.summary, 'catalog_gaps.summary');

  for (const key of [
    'metric_deltas',
    'missing_visual_roles',
    'missing_spec_keys',
    'missing_lexicon_terms'
  ]) {
    if (!Array.isArray(catalogGaps[key])) {
      throw new Error(`catalog_gaps.${key} must be an array`);
    }
  }

  if (catalogGaps.metric_deltas.length < 1) {
    throw new Error('catalog_gaps.metric_deltas must be a non-empty array');
  }
}

function validateImagePlanSlot(slot, pathLabel) {
  requireValue(slot, pathLabel);
  requireNonEmptyString(slot.role || slot.source_role, `${pathLabel}.role`);
  requireNonEmptyString(slot.kind, `${pathLabel}.kind`);
  requireNonEmptyString(slot.pattern, `${pathLabel}.pattern`);
  requireNonEmptyString(slot.content, `${pathLabel}.content`);
  if (!VALID_SLOT_PRIORITY.has(slot.priority)) {
    throw new Error(`${pathLabel}.priority must be core or extended`);
  }
  if (!Number.isFinite(slot.order) || slot.order < 1) {
    throw new Error(`${pathLabel}.order must be a positive number`);
  }
  if (slot.evidence && typeof slot.evidence === 'object') {
    // evidence is optional structured metadata; no hard schema beyond object
  }
}

function validateImageCountStats(stats, pathLabel) {
  requireValue(stats, pathLabel);
  for (const key of ['min', 'median', 'max']) {
    const value = stats[key];
    if (value !== null && !Number.isFinite(value)) {
      throw new Error(`${pathLabel}.${key} must be a number or null`);
    }
  }
}

function validateImagePlanTrack(track, pathLabel) {
  requireValue(track, pathLabel);
  requireValue(track.observed, `${pathLabel}.observed`);
  requireNonEmptyString(track.build_rationale || track.reason || 'empty', `${pathLabel}.build_rationale`);

  if (!Number.isFinite(track.recommended_build) || track.recommended_build < 0) {
    throw new Error(`${pathLabel}.recommended_build must be a non-negative number`);
  }
  if (!Array.isArray(track.slots)) {
    throw new Error(`${pathLabel}.slots must be an array`);
  }
  if (track.recommended_build > track.slots.length) {
    throw new Error(`${pathLabel}.recommended_build must be <= slots.length`);
  }

  const countStats = track.observed.image_count || track.observed.module_count;
  if (countStats) {
    validateImageCountStats(countStats, `${pathLabel}.observed.count`);
  }

  track.slots.forEach((slot, index) => {
    validateImagePlanSlot(slot, `${pathLabel}.slots[${index}]`);
  });
}

function validateImagePlan(imagePlan) {
  requireValue(imagePlan, 'image_plan');
  validateImagePlanTrack(imagePlan.gallery, 'image_plan.gallery');
  validateImagePlanTrack(imagePlan.aplus, 'image_plan.aplus');
}

function validateBackendKeywords(backendKeywords) {
  requireValue(backendKeywords, 'backend_keywords');
  if (!Number.isFinite(backendKeywords.marketplace_limit_bytes) || backendKeywords.marketplace_limit_bytes < 1) {
    throw new Error('backend_keywords.marketplace_limit_bytes must be a positive number');
  }
  if (!Number.isFinite(backendKeywords.used_bytes) || backendKeywords.used_bytes < 0) {
    throw new Error('backend_keywords.used_bytes must be a non-negative number');
  }
  if (!Array.isArray(backendKeywords.terms)) {
    throw new Error('backend_keywords.terms must be an array');
  }
  if (!Array.isArray(backendKeywords.excluded_because_already_in_copy)) {
    throw new Error('backend_keywords.excluded_because_already_in_copy must be an array');
  }
  for (const term of backendKeywords.terms) {
    requireNonEmptyString(term, 'backend_keywords.terms[]');
  }
}

function validateReport(report) {
  requireFields(report, {
    values: ['meta', 'category_lexicon', 'voice_of_customer', 'catalog_gaps', 'image_plan', 'backend_keywords'],
    strings: ['summary'],
    arrays: ['topics']
  });
  requireFields(report.meta, {
    strings: ['schema_version', 'category', 'marketplace', 'generated_at']
  }, 'meta');

  if (report.meta.schema_version !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schema_version: ${report.meta.schema_version}`);
  }

  if (!Number.isFinite(report.meta.competitor_count) || report.meta.competitor_count < 1) {
    throw new Error('meta.competitor_count must be a positive number');
  }

  if (!Number.isFinite(report.meta.our_count) || report.meta.our_count < 1) {
    throw new Error('meta.our_count must be a positive number');
  }

  requireFields(report.category_lexicon, {
    strings: ['observations'],
    arrays: ['terms']
  }, 'category_lexicon');

  if (report.category_lexicon.terms.length > MAX_LEXICON_OUTPUT) {
    throw new Error(`category_lexicon.terms exceeds max of ${MAX_LEXICON_OUTPUT}`);
  }

  report.category_lexicon.terms.forEach(validateLexiconTerm);

  requireFields(report.voice_of_customer, {
    strings: ['observations'],
    arrays: ['signals']
  }, 'voice_of_customer');

  if (report.voice_of_customer.signals.length > MAX_SIGNALS_OUTPUT) {
    throw new Error(`voice_of_customer.signals exceeds max of ${MAX_SIGNALS_OUTPUT}`);
  }

  report.voice_of_customer.signals.forEach(validateVoiceSignal);

  if (report.voice_of_customer.leaders || report.voice_of_customer.ours) {
    throw new Error(
      'voice_of_customer.leaders / .ours must not appear in the report — use a single signals list'
    );
  }
  if (report.voice_of_customer.phrases) {
    throw new Error('voice_of_customer.phrases is deprecated — use voice_of_customer.signals');
  }

  validateCatalogGaps(report.catalog_gaps);
  validateImagePlan(report.image_plan);
  validateBackendKeywords(report.backend_keywords);

  const names = new Set();
  for (const topic of report.topics) {
    requireNonEmptyString(topic.name, 'topic.name');
    requireNonEmptyString(topic.observations, `topic ${topic.name} observations`);
    requireNonEmptyArray(topic.actions, `topic ${topic.name} actions`);

    if (names.has(topic.name)) {
      throw new Error(`Duplicate topic name: ${topic.name}`);
    }
    names.add(topic.name);

    for (const action of topic.actions) {
      requireNonEmptyString(action, `topic ${topic.name} action`);
    }
  }

  for (const required of REQUIRED_TOPIC_NAMES) {
    if (!names.has(required)) {
      throw new Error(`Missing required topic: ${required}`);
    }
  }

  if (report.topics.find((t) => t.name === 'keywords')?.terms) {
    throw new Error('topics.keywords must not include terms[] — use category_lexicon.terms');
  }

  return report;
}

module.exports = {
  SCHEMA_VERSION,
  REQUIRED_TOPIC_NAMES,
  validateReport
};
