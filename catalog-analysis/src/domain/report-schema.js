const {
  requireValue,
  requireNonEmptyString,
  requireNonEmptyArray
} = require('../utils/assert');
const { MAX_LEXICON_OUTPUT, MAX_SIGNALS_OUTPUT } = require('./report-normalize');

const SCHEMA_VERSION = '2.1';

const REQUIRED_TOPIC_NAMES = [
  'title',
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

function validateReport(report) {
  requireValue(report.meta, 'meta');
  requireNonEmptyString(report.meta.schema_version, 'meta.schema_version');
  requireNonEmptyString(report.meta.category, 'meta.category');
  requireNonEmptyString(report.meta.marketplace, 'meta.marketplace');
  requireNonEmptyString(report.meta.generated_at, 'meta.generated_at');

  if (report.meta.schema_version !== SCHEMA_VERSION) {
    throw new Error(`Unsupported schema_version: ${report.meta.schema_version}`);
  }

  if (!Number.isFinite(report.meta.competitor_count) || report.meta.competitor_count < 1) {
    throw new Error('meta.competitor_count must be a positive number');
  }

  requireNonEmptyString(report.summary, 'summary');

  requireValue(report.category_lexicon, 'category_lexicon');
  requireNonEmptyString(report.category_lexicon.observations, 'category_lexicon.observations');
  requireNonEmptyArray(report.category_lexicon.terms, 'category_lexicon.terms');

  if (report.category_lexicon.terms.length > MAX_LEXICON_OUTPUT) {
    throw new Error(`category_lexicon.terms exceeds max of ${MAX_LEXICON_OUTPUT}`);
  }

  report.category_lexicon.terms.forEach(validateLexiconTerm);

  requireValue(report.voice_of_customer, 'voice_of_customer');
  requireNonEmptyString(report.voice_of_customer.observations, 'voice_of_customer.observations');
  requireNonEmptyArray(report.voice_of_customer.signals, 'voice_of_customer.signals');

  if (report.voice_of_customer.signals.length > MAX_SIGNALS_OUTPUT) {
    throw new Error(`voice_of_customer.signals exceeds max of ${MAX_SIGNALS_OUTPUT}`);
  }

  report.voice_of_customer.signals.forEach(validateVoiceSignal);

  requireNonEmptyArray(report.topics, 'topics');

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

  if (report.voice_of_customer.phrases) {
    throw new Error('voice_of_customer.phrases is deprecated — use voice_of_customer.signals');
  }

  return report;
}

module.exports = {
  SCHEMA_VERSION,
  REQUIRED_TOPIC_NAMES,
  MAX_LEXICON_OUTPUT,
  MAX_SIGNALS_OUTPUT,
  validateReport
};
