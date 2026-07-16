const SPEC_EXCLUDE_KEYS = new Set([
  'ASIN',
  'Best Sellers Rank',
  'Customer Reviews',
  'Manufacturer',
  'Manufacturer Contact Information',
  'Packer Contact Information',
  'Importer Contact Information',
  'Manufacturer Warranty Description'
]);

function compactJson(value) {
  return JSON.stringify(value);
}

function pickCatalogSpecs(productDetails = {}) {
  const specs = {};
  for (const [key, value] of Object.entries(productDetails)) {
    if (SPEC_EXCLUDE_KEYS.has(key) || !value) {
      continue;
    }
    specs[key] = String(value).slice(0, 120);
  }
  return specs;
}

function groupReviewsByRating(reviews, { maxPerRating = 25, textMax = 280 } = {}) {
  const byRating = new Map();

  for (const review of reviews) {
    const rating = review.rating;
    if (!Number.isFinite(rating)) {
      continue;
    }
    const text = (review.review_text || review.text || '').trim().slice(0, textMax);
    if (!text) {
      continue;
    }
    if (!byRating.has(rating)) {
      byRating.set(rating, []);
    }
    const bucket = byRating.get(rating);
    if (bucket.length < maxPerRating) {
      bucket.push(text);
    }
  }

  return [...byRating.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([rating, texts]) => ({ rating, reviews: texts }));
}

function formatLeaderTitles(competitors) {
  return competitors.map((p) => (p.title || '').trim()).filter(Boolean);
}

function formatListingCopy(competitors, {
  maxBullets = 5,
  bulletMax = 320,
  aplusMax = 12,
  aplusTextMax = 180
} = {}) {
  return competitors.map((p) => ({
    title: (p.title || '').trim(),
    bullets: (p.feature_bullets || []).slice(0, maxBullets).map((b) => b.slice(0, bulletMax)),
    aplus: (p.aplus_text_blocks || []).slice(0, aplusMax).map((t) => t.slice(0, aplusTextMax)),
    specs: pickCatalogSpecs(p.product_details)
  }));
}

function formatKeywordMap(keywordMap) {
  if (!keywordMap) {
    return null;
  }
  return {
    head: (keywordMap.head || []).slice(0, 12),
    long_tail: (keywordMap.long_tail || []).slice(0, 12),
    vernacular: (keywordMap.vernacular || []).slice(0, 10),
    occasion: (keywordMap.occasion || []).slice(0, 8)
  };
}

function formatMinedVoice(voiceOfCustomer) {
  if (!voiceOfCustomer) {
    return null;
  }
  return {
    signals: (voiceOfCustomer.signals || []).slice(0, 40),
    themes: voiceOfCustomer.themes || { praise: [], complaints: [], objections: [] }
  };
}

function formatSpecPatterns(categoryStandard) {
  const union = categoryStandard.spec_union || [];
  return {
    flagship: categoryStandard.flagship_attribute,
    fields: union
      .filter((s) => s.fill_rate >= 0.5 && !SPEC_EXCLUDE_KEYS.has(s.key))
      .slice(0, 12)
      .map((s) => ({
        key: s.key,
        values: (s.typical_values || []).slice(0, 5)
      }))
  };
}

function formatVisionSummary(visualStandard) {
  const gallery = visualStandard.gallery_standard || {};
  return {
    gallery: {
      roles: (gallery.required_roles || []).slice(0, 10),
      hero: (gallery.hero_conventions || []).slice(0, 6),
      notes: (gallery.quality_notes || []).slice(0, 8)
    },
    aplus_notes: [...new Set(
      (visualStandard.per_product_aplus || [])
        .flatMap((p) => p.quality_notes || [])
    )].slice(0, 12),
    galleries_analyzed: (visualStandard.per_product_gallery || []).length
  };
}

function buildSynthesisResearch({
  category,
  competitors,
  categoryStandard,
  voiceOfCustomer,
  visualStandard,
  metricsContext
}) {
  return {
    category,
    n: competitors.length,
    metrics: metricsContext,
    titles: formatLeaderTitles(competitors),
    listings: formatListingCopy(competitors),
    copy: {
      title_pattern: categoryStandard.title?.template,
      title_tokens: categoryStandard.title?.required_tokens,
      mobile_first: categoryStandard.title?.mobile_first_75_chars,
      bullet_topics: categoryStandard.bullet_topics,
      bullet_pattern: categoryStandard.bullet_framing_pattern,
      keywords: formatKeywordMap(categoryStandard.keyword_map)
    },
    specs: formatSpecPatterns(categoryStandard),
    voice: formatMinedVoice(voiceOfCustomer),
    vision: formatVisionSummary(visualStandard)
  };
}

function buildSynthesisTopicsResearch(research) {
  const { voice, ...rest } = research;
  return rest;
}

module.exports = {
  compactJson,
  groupReviewsByRating,
  formatLeaderTitles,
  formatListingCopy,
  buildSynthesisResearch,
  buildSynthesisTopicsResearch
};
