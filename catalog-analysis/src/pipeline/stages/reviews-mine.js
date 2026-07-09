const { withCache } = require('../../services/cache');
const { sampleReviewsForMining } = require('./metrics');

function formatReviewsForPrompt(reviews) {
  return reviews.map((r) => ({
    rating: r.rating,
    title: r.title,
    text: (r.review_text || '').slice(0, 400),
    verified: r.verified,
    has_video: r.has_video
  }));
}

async function mineVoiceOfCustomer({ llm, config, allProducts, category }) {
  const allReviews = [];
  for (const product of allProducts) {
    for (const item of product.reviews?.items || []) {
      allReviews.push(item);
    }
  }

  const sampled = sampleReviewsForMining(
    allReviews.map((r) => ({ ...r, asin: 'category' })),
    config
  );

  const cacheInput = {
    model: config.model,
    category,
    reviewCount: sampled.length
  };

  return withCache({
    cacheDir: config.cacheDir,
    stage: 'voice-of-customer',
    input: cacheInput,
    refresh: config.refresh,
    fn: async () => {
      const result = await llm.completeJson({
        system: 'You mine Amazon product reviews into category-wide voice-of-customer insights for catalog building.',
        user: `Category: ${category}

Sampled reviews (${sampled.length}):
${JSON.stringify(formatReviewsForPrompt(sampled), null, 2)}

Return JSON:
{
  "praise": [{ "theme": "", "frequency": 0, "phrases": [], "weight": 9 }],
  "complaints": [{ "theme": "", "frequency": 0, "severity": "low|medium|high", "weight": 9 }],
  "objections": [{ "question": "", "resolve_with": "" }],
  "phrase_bank": []
}

Rules:
- frequency is approximate count from the sample
- phrases are short customer-validated phrases suitable for copy
- objections are pre-purchase questions buyers raise
- do not include ASINs or review IDs in output`
      });

      return {
        praise: result.praise || [],
        complaints: result.complaints || [],
        objections: result.objections || [],
        phrase_bank: result.phrase_bank || []
      };
    }
  });
}

module.exports = { mineVoiceOfCustomer };
