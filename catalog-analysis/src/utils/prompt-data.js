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

function formatListingCopy(products, {
  maxBullets = 5,
  bulletMax = 240,
  aplusMax = 6,
  aplusTextMax = 120,
  maxSpecKeys = 10
} = {}) {
  return products.map((p) => {
    const specs = pickCatalogSpecs(p.product_details);
    const trimmedSpecs = {};
    for (const [key, value] of Object.entries(specs).slice(0, maxSpecKeys)) {
      trimmedSpecs[key] = value;
    }
    return {
      title: (p.title || '').trim(),
      bullets: (p.feature_bullets || []).slice(0, maxBullets).map((b) => b.slice(0, bulletMax)),
      aplus: (p.aplus_text_blocks || []).slice(0, aplusMax).map((t) => t.slice(0, aplusTextMax)),
      specs: trimmedSpecs
    };
  });
}

/**
 * Compact catalog-level digest of our listings (no ASINs).
 */
function formatOurCatalogDigest(ours, { maxListings = 8, maxBullets = 4, bulletMax = 220 } = {}) {
  return {
    n: ours.length,
    listings: ours.slice(0, maxListings).map((p) => ({
      title: (p.title || '').trim().slice(0, 180),
      bullets: (p.feature_bullets || []).slice(0, maxBullets).map((b) => b.slice(0, bulletMax)),
      image_count: (p.product_images || []).length,
      aplus_present: (p.aplus_images || []).length > 0 || (p.aplus_text_blocks || []).length > 0,
      rating: p.normalized?.rating ?? null,
      review_count: p.normalized?.review_count ?? null
    }))
  };
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

function formatCorpusVoice(corpus) {
  if (!corpus) {
    return { signals: [], themes: { praise: [], complaints: [], objections: [] }, sampled_count: 0 };
  }
  return {
    // Cap for synthesis prompt size — full mines stay in stage output only
    signals: (corpus.signals || []).slice(0, 25),
    themes: corpus.themes || { praise: [], complaints: [], objections: [] },
    sampled_count: corpus.sampled_count || 0
  };
}

/**
 * Research-only shape: leaders vs ours mines stay internal so synthesis can merge
 * into a single voice_of_customer in the report.
 */
function formatMinedVoice(voiceOfCustomer) {
  if (!voiceOfCustomer) {
    return null;
  }
  if (voiceOfCustomer.leaders || voiceOfCustomer.ours) {
    return {
      leaders: formatCorpusVoice(voiceOfCustomer.leaders),
      ours: formatCorpusVoice(voiceOfCustomer.ours)
    };
  }
  return {
    leaders: formatCorpusVoice(voiceOfCustomer),
    ours: formatCorpusVoice(null)
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
  const oursVs = visualStandard.ours_vs_leaders || {};
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
    galleries_analyzed: (visualStandard.per_product_gallery || []).length,
    ours_vs_leaders: {
      galleries_analyzed: oursVs.galleries_analyzed || 0,
      median_image_count: oursVs.median_image_count ?? null,
      role_rates: (oursVs.role_rates || []).slice(0, 12),
      missing_vs_leader_required: (oursVs.missing_vs_leader_required || []).slice(0, 10)
    }
  };
}

function formatCatalogGapsForResearch(catalogGaps) {
  if (!catalogGaps) return null;
  return {
    summary: catalogGaps.summary,
    metric_deltas: (catalogGaps.metric_deltas || []).slice(0, 12),
    missing_visual_roles: (catalogGaps.missing_visual_roles || []).slice(0, 10),
    missing_spec_keys: (catalogGaps.missing_spec_keys || []).slice(0, 12),
    missing_lexicon_terms: (catalogGaps.missing_lexicon_terms || []).slice(0, 20),
    our_norms: catalogGaps.our_norms,
    leader_norms: catalogGaps.leader_norms
  };
}

function buildSynthesisResearch({
  category,
  competitors,
  ours,
  categoryStandard,
  voiceOfCustomer,
  visualStandard,
  metricsContext,
  catalogGaps
}) {
  return {
    category,
    n_leaders: competitors.length,
    n_ours: ours?.length || 0,
    metrics: metricsContext,
    titles: formatLeaderTitles(competitors),
    listings: formatListingCopy(competitors),
    our_catalog: formatOurCatalogDigest(ours || []),
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
    vision: formatVisionSummary(visualStandard),
    catalog_gaps: formatCatalogGapsForResearch(catalogGaps)
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
  formatOurCatalogDigest,
  buildSynthesisResearch,
  buildSynthesisTopicsResearch
};
