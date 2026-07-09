const { withCache } = require('../../services/cache');
const { sampleReviewsForMining } = require('./metrics');
const { requireNonEmptyArray } = require('../../utils/assert');
const { groupReviewsByRating, compactJson } = require('../../utils/prompt-data');
const { toolDefinition } = require('../../utils/schema-tools');

const VOICE_OF_CUSTOMER_TOOL = toolDefinition(
  'voice-of-customer-mine',
  'Mine Amazon product reviews into structured voice-of-customer signals'
);

function validateMinedSignals(signals) {
  requireNonEmptyArray(signals, 'voice-of-customer signals');
  for (const signal of signals) {
    if (!signal.phrase || !signal.sentiment || !signal.relevance || !signal.mention_count) {
      throw new Error('Each voice signal must have phrase, sentiment, relevance, and mention_count');
    }
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

async function mineVoiceOfCustomer({ llm, config, allProducts, category }) {
  const allReviews = [];
  for (const product of allProducts) {
    for (const item of product.reviews?.items || []) {
      allReviews.push(item);
    }
  }

  const sampled = sampleReviewsForMining(allReviews, config);
  requireNonEmptyArray(sampled, 'sampled reviews for voice-of-customer mining');

  const reviewsByRating = groupReviewsByRating(sampled);

  const cacheInput = {
    model: config.model,
    category,
    reviewCount: sampled.length,
    promptFormat: 'by-rating-v1',
    schema: 'v2.1-voc-tool'
  };

  return withCache({
    cacheDir: config.cacheDir,
    stage: 'voice-of-customer',
    input: cacheInput,
    refresh: config.refresh,
    fn: async () => {
      const result = await llm.completeTool({
        system: 'You mine Amazon product reviews into category-wide voice-of-customer insights for catalog building.',
        tool: VOICE_OF_CUSTOMER_TOOL,
        user: `Category: ${category}

Sampled reviews by rating (${sampled.length} total):
${compactJson(reviewsByRating)}

Rules:
- signals: short buyer phrases with sentiment (praise, complaint, objection, neutral), relevance (high, medium, low), and approximate mention_count from the sample
- include complaints and objections, not only praise
- themes (optional): group recurring themes into praise, complaints, objections arrays
- do not include reviewer names, ASINs, or review IDs in output`
      });

      validateMinedSignals(result.signals);

      return {
        signals: result.signals,
        themes: result.themes || { praise: [], complaints: [], objections: [] }
      };
    }
  });
}

module.exports = { mineVoiceOfCustomer };
