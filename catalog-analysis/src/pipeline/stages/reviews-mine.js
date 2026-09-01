const { sampleReviewsForMining } = require('./metrics');
const { requireNonEmptyArray } = require('../../utils/assert');
const { groupReviewsByRating, compactJson } = require('../../utils/prompt-data');
const { toolDefinition } = require('../../utils/schema-tools');
const VOICE_OF_CUSTOMER_TOOL = toolDefinition(
  'voice-of-customer-mine',
  'Mine Amazon product reviews into structured voice-of-customer signals'
);

function validateMinedSignals(signals, label) {
  requireNonEmptyArray(signals, `${label} voice-of-customer signals`);
  for (const signal of signals) {
    if (!signal.phrase || !signal.sentiment || !signal.relevance || !signal.mention_count) {
      throw new Error(`Each ${label} voice signal must have phrase, sentiment, relevance, and mention_count`);
    }
    if (!['praise', 'complaint', 'objection', 'neutral'].includes(signal.sentiment)) {
      throw new Error(`Invalid ${label} voice signal sentiment: ${signal.sentiment}`);
    }
    if (!['high', 'medium', 'low'].includes(signal.relevance)) {
      throw new Error(`Invalid ${label} voice signal relevance: ${signal.relevance}`);
    }
    if (!Number.isFinite(signal.mention_count) || signal.mention_count < 1) {
      throw new Error(`${label} voice signal mention_count must be >= 1`);
    }
  }
}

function collectReviews(products) {
  const allReviews = [];
  for (const product of products) {
    for (const item of product.reviews?.items || []) {
      allReviews.push(item);
    }
  }
  return allReviews;
}

async function mineCorpusReviews({ llm, config, products, category, corpusLabel }) {
  const allReviews = collectReviews(products);
  if (!allReviews.length) {
    return {
      signals: [],
      themes: { praise: [], complaints: [], objections: [] },
      sampled_count: 0
    };
  }

  const sampled = sampleReviewsForMining(allReviews, config);
  if (!sampled.length) {
    return {
      signals: [],
      themes: { praise: [], complaints: [], objections: [] },
      sampled_count: 0
    };
  }

  const reviewsByRating = groupReviewsByRating(sampled);

  const result = await llm.completeTool({
    system: 'You mine Amazon product reviews into category-wide voice-of-customer insights for catalog building.',
    tool: VOICE_OF_CUSTOMER_TOOL,
    user: `Category: ${category}
Corpus: ${corpusLabel}

Sampled reviews by rating (${sampled.length} total):
${compactJson(reviewsByRating)}

Rules:
- Include complaints and objections, not only praise
- Stay catalog-level for this corpus only (${corpusLabel})
- Do not include reviewer names, ASINs, or review IDs`
  });

  validateMinedSignals(result.signals, corpusLabel);

  return {
    signals: result.signals,
    themes: result.themes || { praise: [], complaints: [], objections: [] },
    sampled_count: sampled.length
  };
}

/**
 * Mine leaders and our catalog reviews separately (no pooled corpus).
 */
async function mineVoiceOfCustomer({ llm, config, competitors, ours, category }) {
  const leaders = await mineCorpusReviews({
    llm,
    config,
    products: competitors,
    category,
    corpusLabel: 'category leaders / top sellers'
  });

  const oursMined = await mineCorpusReviews({
    llm,
    config,
    products: ours,
    category,
    corpusLabel: 'our catalog'
  });

  requireNonEmptyArray(leaders.signals, 'leader voice-of-customer signals');

  return {
    leaders,
    ours: oursMined
  };
}

module.exports = { mineVoiceOfCustomer };
