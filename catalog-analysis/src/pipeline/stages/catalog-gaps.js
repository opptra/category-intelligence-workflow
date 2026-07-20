const { aggregateNorms } = require('./metrics');

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

const METRIC_KEYS = [
  'title_length',
  'bullet_count',
  'image_count',
  'aplus_image_count',
  'aplus_text_count',
  'spec_key_count',
  'price_inr',
  'price_per_panel',
  'rating',
  'review_count'
];

function buildOurCombinedCopy(ours) {
  return ours
    .map((p) => [
      p.title || '',
      ...(p.feature_bullets || []),
      ...(p.aplus_text_blocks || []),
      p.description || ''
    ].join(' '))
    .join(' ')
    .toLowerCase();
}

function buildOurSpecFillRates(ours) {
  const counts = new Map();
  for (const product of ours) {
    for (const key of Object.keys(product.product_details || {})) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  const total = ours.length || 1;
  const rates = {};
  for (const [key, count] of counts.entries()) {
    rates[key] = Math.round((count / total) * 100) / 100;
  }
  return rates;
}

function collectKeywordTerms(keywordMap = {}) {
  return [
    ...(keywordMap.head || []),
    ...(keywordMap.long_tail || []),
    ...(keywordMap.vernacular || []),
    ...(keywordMap.occasion || [])
  ]
    .map((t) => String(t || '').trim())
    .filter(Boolean);
}

function findMissingLexiconTerms(keywordMap, ourCopy) {
  const seen = new Set();
  const missing = [];
  for (const term of collectKeywordTerms(keywordMap)) {
    const lower = term.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    if (!ourCopy.includes(lower)) {
      missing.push(term);
    }
  }
  return missing.slice(0, 30);
}

function findMissingSpecKeys(leaderSpecUnion = [], ourFillRates = {}) {
  return leaderSpecUnion
    .filter((s) => s.fill_rate >= 0.5 && !SPEC_EXCLUDE_KEYS.has(s.key))
    .filter((s) => (ourFillRates[s.key] || 0) < 0.5)
    .map((s) => ({
      key: s.key,
      leader_fill_rate: s.fill_rate,
      our_fill_rate: ourFillRates[s.key] || 0
    }))
    .slice(0, 20);
}

function buildMetricDeltas(leaderNorms, ourNorms) {
  return METRIC_KEYS.map((key) => ({
    metric: key,
    leaders: leaderNorms[key] || { min: null, median: null, max: null },
    ours: ourNorms[key] || { min: null, median: null, max: null }
  })).concat([{
    metric: 'aplus_presence_rate',
    leaders: { rate: leaderNorms.aplus_presence_rate ?? null },
    ours: { rate: ourNorms.aplus_presence_rate ?? null }
  }]);
}

function buildDeterministicSummary({
  metric_deltas,
  missing_visual_roles,
  missing_spec_keys,
  missing_lexicon_terms
}) {
  const parts = [];

  const reviewDelta = metric_deltas.find((d) => d.metric === 'review_count');
  if (
    reviewDelta
    && Number.isFinite(reviewDelta.leaders?.median)
    && Number.isFinite(reviewDelta.ours?.median)
    && reviewDelta.ours.median < reviewDelta.leaders.median
  ) {
    parts.push(
      `review volume trails leaders (median ${reviewDelta.ours.median} vs ${reviewDelta.leaders.median})`
    );
  }

  const aplus = metric_deltas.find((d) => d.metric === 'aplus_presence_rate');
  if (
    aplus
    && Number.isFinite(aplus.leaders?.rate)
    && Number.isFinite(aplus.ours?.rate)
    && aplus.ours.rate < aplus.leaders.rate
  ) {
    parts.push(
      `A+ presence lower (${Math.round(aplus.ours.rate * 100)}% vs ${Math.round(aplus.leaders.rate * 100)}%)`
    );
  }

  if (missing_visual_roles.length) {
    parts.push(`missing or rare gallery roles vs leaders: ${missing_visual_roles.slice(0, 5).join(', ')}`);
  }
  if (missing_spec_keys.length) {
    parts.push(
      `spec fields under-filled vs leaders: ${missing_spec_keys.slice(0, 5).map((s) => s.key).join(', ')}`
    );
  }
  if (missing_lexicon_terms.length) {
    parts.push(
      `leader lexicon terms absent from our catalog copy: ${missing_lexicon_terms.slice(0, 8).join(', ')}`
    );
  }

  if (!parts.length) {
    return 'Our catalog is broadly near leader norms on measured surfaces; residual gaps are minor.';
  }
  return `Relative to category leaders, our catalog (aggregated): ${parts.join('; ')}.`;
}

/**
 * Deterministic catalog-level gaps: leaders define the bar; ours are aggregated only.
 */
function buildCatalogGaps({
  competitorMetrics,
  ourMetrics,
  categoryStandard,
  ours,
  visualStandard
}) {
  const leaderNorms = aggregateNorms(competitorMetrics);
  const ourNorms = aggregateNorms(ourMetrics);
  const ourCopy = buildOurCombinedCopy(ours);
  const ourFillRates = buildOurSpecFillRates(ours);

  const metric_deltas = buildMetricDeltas(leaderNorms, ourNorms);
  const missing_spec_keys = findMissingSpecKeys(categoryStandard.spec_union, ourFillRates);
  const missing_lexicon_terms = findMissingLexiconTerms(categoryStandard.keyword_map, ourCopy);

  const oursVisual = visualStandard.ours_vs_leaders || {};
  const missing_visual_roles = oursVisual.missing_vs_leader_required || [];

  const catalog_gaps = {
    summary: '',
    metric_deltas,
    missing_visual_roles,
    missing_spec_keys,
    missing_lexicon_terms,
    our_norms: {
      title_length: ourNorms.title_length,
      bullet_count: ourNorms.bullet_count,
      image_count: ourNorms.image_count,
      aplus_presence_rate: ourNorms.aplus_presence_rate,
      rating: ourNorms.rating,
      review_count: ourNorms.review_count,
      price_inr: ourNorms.price_inr
    },
    leader_norms: {
      title_length: leaderNorms.title_length,
      bullet_count: leaderNorms.bullet_count,
      image_count: leaderNorms.image_count,
      aplus_presence_rate: leaderNorms.aplus_presence_rate,
      rating: leaderNorms.rating,
      review_count: leaderNorms.review_count,
      price_inr: leaderNorms.price_inr
    }
  };

  catalog_gaps.summary = buildDeterministicSummary(catalog_gaps);
  return catalog_gaps;
}

module.exports = {
  buildCatalogGaps,
  buildOurCombinedCopy,
  findMissingLexiconTerms,
  findMissingSpecKeys
};
