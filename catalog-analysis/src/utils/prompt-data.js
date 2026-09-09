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
  return competitors
    .map((p) => (p.title || '').trim())
    .filter(Boolean)
    .slice(0, 12);
}

function formatListingCopy(products, {
  maxBullets = 5,
  bulletMax = 240,
  aplusMax = 6,
  aplusTextMax = 120,
  maxSpecKeys = 10,
  maxListings = 12
} = {}) {
  return products.slice(0, maxListings).map((p) => {
    const specs = pickCatalogSpecs(p.product_details);
    const trimmedSpecs = {};
    for (const [key, value] of Object.entries(specs).slice(0, maxSpecKeys)) {
      trimmedSpecs[key] = value;
    }
    return {
      title: (p.title || '').trim().slice(0, 180),
      item_highlights: (p.item_highlights || []).slice(0, 6).map((t) => String(t).slice(0, 125)),
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
  const themes = corpus.themes || { praise: [], complaints: [], objections: [] };
  return {
    // Cap for synthesis prompt size — full mines stay in stage output only
    signals: (corpus.signals || []).slice(0, 25),
    themes: {
      praise: (themes.praise || []).slice(0, 8),
      complaints: (themes.complaints || []).slice(0, 8),
      objections: (themes.objections || []).slice(0, 8)
    },
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

function trimTrackSummary(summary, { maxRoles = 12, maxNotes = 10, maxSignals = 8 } = {}) {
  if (!summary) {
    return null;
  }
  return {
    track: summary.track,
    n_analyzed: summary.n_analyzed,
    median_image_count: summary.median_image_count ?? null,
    image_count: summary.image_count || null,
    roles: (summary.roles || []).slice(0, maxRoles).map((r) => ({
      role: r.role,
      kind: r.kind,
      count: r.count,
      prevalence: r.prevalence,
      typical_per_listing: r.typical_per_listing,
      typical_position: r.typical_position,
      text_present_rate: r.text_present_rate ?? 0,
      median_fact_count: r.median_fact_count ?? 0,
      content_tags: (r.content_tags || []).slice(0, 8),
      board_facts: (r.board_facts || []).slice(0, 8)
    })),
    signals: (summary.signals || []).slice(0, maxSignals),
    notes: (summary.notes || []).slice(0, maxNotes)
  };
}

/**
 * PDP gallery and A+ stay sibling objects of identical shape — never flattened together.
 */
function formatVisionSummary(visualStandard) {
  const oursVs = visualStandard.ours_vs_leaders || {};
  const pdp = visualStandard.pdp_summary
    || trimTrackSummary({
      track: 'pdp',
      n_analyzed: (visualStandard.per_product_gallery || []).length,
      roles: (visualStandard.gallery_standard?.required_roles || []).map((role) => ({
        role,
        count: null,
        prevalence: null
      })),
      signals: [],
      notes: (visualStandard.gallery_standard?.quality_notes || []).map((note) => ({
        note,
        count: null,
        prevalence: null
      }))
    });

  const aplus = visualStandard.aplus_summary
    || trimTrackSummary({
      track: 'aplus',
      n_analyzed: (visualStandard.per_product_aplus || []).length,
      roles: (visualStandard.aplus_topics_with_counts || []).map((t) => ({
        role: t.topic,
        count: t.count,
        prevalence: t.prevalence
      })),
      signals: [],
      notes: []
    });

  return {
    pdp_gallery: trimTrackSummary(pdp),
    aplus: trimTrackSummary(aplus),
    ours_vs_leaders: {
      galleries_analyzed: oursVs.galleries_analyzed || 0,
      median_image_count: oursVs.median_image_count ?? null,
      role_rates: (oursVs.role_rates || []).slice(0, 12),
      missing_vs_leader_required: (oursVs.missing_vs_leader_required || []).slice(0, 10),
      signals: (oursVs.signals || []).slice(0, 8)
    }
  };
}

function formatCatalogGapsForResearch(catalogGaps) {
  if (!catalogGaps) return null;
  const slimNorms = (norms) => {
    if (!norms) return null;
    return {
      title_length: norms.title_length || null,
      bullet_count: norms.bullet_count || null,
      image_count: norms.image_count || null,
      aplus_presence_rate: norms.aplus_presence_rate ?? null,
      rating: norms.rating || null,
      review_count: norms.review_count || null
    };
  };
  return {
    applicable: catalogGaps.applicable !== false,
    reason: catalogGaps.reason || null,
    summary: catalogGaps.summary,
    metric_deltas: (catalogGaps.metric_deltas || []).slice(0, 12),
    missing_visual_roles: (catalogGaps.missing_visual_roles || []).slice(0, 10),
    missing_spec_keys: (catalogGaps.missing_spec_keys || []).slice(0, 12),
    missing_lexicon_terms: (catalogGaps.missing_lexicon_terms || []).slice(0, 20),
    our_norms: slimNorms(catalogGaps.our_norms),
    leader_norms: slimNorms(catalogGaps.leader_norms)
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
  catalogGaps,
  corpusSource
}) {
  return {
    category,
    corpus_source: corpusSource,
    n_leaders: competitors.length,
    n_ours: ours?.length || 0,
    metrics: metricsContext,
    titles: formatLeaderTitles(competitors),
    listings: formatListingCopy(competitors),
    our_catalog: formatOurCatalogDigest(ours || []),
    copy: {
      title_pattern: categoryStandard.title?.template,
      title_tokens: categoryStandard.title?.required_tokens,
      title_limit_chars: categoryStandard.title?.limit_chars || 75,
      mobile_first: (categoryStandard.title?.mobile_first_75_chars || []).slice(0, 5),
      item_highlights_template: categoryStandard.item_highlights?.template,
      item_highlights_limit_chars: categoryStandard.item_highlights?.limit_chars || 125,
      item_highlights_examples: (categoryStandard.item_highlights?.examples || []).slice(0, 5),
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

/**
 * Scope research so a topic prompt only sees its own visual track.
 * - gallery_images → vision.pdp_gallery only
 * - aplus → vision.aplus only
 * - other topics → no vision detail (metrics / catalog_gaps only)
 */
function scopeResearchForTopics(research, topicNames) {
  const names = new Set(topicNames);
  const base = buildSynthesisTopicsResearch(research);
  const vision = base.vision || {};

  if (names.has('gallery_images') && !names.has('aplus')) {
    return {
      ...base,
      vision: {
        pdp_gallery: vision.pdp_gallery || null,
        ours_vs_leaders: vision.ours_vs_leaders || null
      }
    };
  }

  if (names.has('aplus') && !names.has('gallery_images')) {
    return {
      ...base,
      vision: {
        aplus: vision.aplus || null
      }
    };
  }

  if (!names.has('gallery_images') && !names.has('aplus')) {
    const { vision: _drop, ...withoutVision } = base;
    return {
      ...withoutVision,
      vision: {
        ours_vs_leaders: vision.ours_vs_leaders
          ? {
              galleries_analyzed: vision.ours_vs_leaders.galleries_analyzed,
              median_image_count: vision.ours_vs_leaders.median_image_count,
              missing_vs_leader_required: vision.ours_vs_leaders.missing_vs_leader_required
            }
          : null
      }
    };
  }

  return base;
}

module.exports = {
  compactJson,
  groupReviewsByRating,
  formatLeaderTitles,
  formatListingCopy,
  formatOurCatalogDigest,
  formatVisionSummary,
  buildSynthesisResearch,
  buildSynthesisTopicsResearch,
  scopeResearchForTopics
};
