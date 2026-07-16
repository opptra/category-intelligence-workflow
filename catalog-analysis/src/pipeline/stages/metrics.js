function median(values) {
  const nums = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!nums.length) {
    return null;
  }
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function band(values) {
  const nums = values.filter((v) => Number.isFinite(v));
  if (!nums.length) {
    return { min: null, median: null, max: null };
  }
  return {
    min: Math.min(...nums),
    median: median(nums),
    max: Math.max(...nums)
  };
}

function parseReviewDate(dateText) {
  if (!dateText) {
    return null;
  }
  const match = dateText.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (!match) {
    return null;
  }
  const months = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };
  const month = months[match[2].toLowerCase()];
  if (month === undefined) {
    return null;
  }
  return new Date(parseInt(match[3], 10), month, parseInt(match[1], 10));
}

function starDistributionShape(byStar) {
  const total = Object.values(byStar || {}).reduce((sum, n) => sum + n, 0);
  if (!total) {
    return { negative_tail_pct: null, positive_pct: null, total: 0 };
  }
  const low = (byStar['1'] || 0) + (byStar['2'] || 0);
  const high = (byStar['4'] || 0) + (byStar['5'] || 0);
  return {
    negative_tail_pct: Math.round((low / total) * 100),
    positive_pct: Math.round((high / total) * 100),
    total
  };
}

function computeProductMetrics(product) {
  const reviews = product.reviews || {};
  const byStar = reviews.by_star || {};
  const items = reviews.items || [];
  const verifiedCount = items.filter((r) => r.verified).length;
  const videoCount = items.filter((r) => r.has_video).length;
  const helpfulTotal = items.reduce((sum, r) => sum + (r.helpful_count || 0), 0);
  const dates = items.map((r) => parseReviewDate(r.date)).filter(Boolean);
  const recentCutoff = dates.length
    ? new Date(Math.max(...dates.map((d) => d.getTime())) - 90 * 24 * 60 * 60 * 1000)
    : null;
  const recentCount = recentCutoff
    ? items.filter((r) => {
      const d = parseReviewDate(r.date);
      return d && d >= recentCutoff;
    }).length
    : 0;

  return {
    asin: product.asin,
    is_ours: product.is_ours,
    title_length: product.normalized.title_length,
    title_mobile_75: product.normalized.title_mobile_75,
    bullet_count: product.normalized.bullet_count,
    bullet_avg_length: product.normalized.bullet_lengths.length
      ? Math.round(product.normalized.bullet_lengths.reduce((a, b) => a + b, 0) / product.normalized.bullet_lengths.length)
      : 0,
    description_present: product.normalized.description_present,
    spec_key_count: product.normalized.spec_keys.length,
    spec_keys: product.normalized.spec_keys,
    image_count: product.normalized.image_count,
    aplus_image_count: product.normalized.aplus_image_count,
    aplus_text_count: product.normalized.aplus_text_count,
    aplus_text_chars: product.normalized.aplus_text_chars,
    aplus_present: product.normalized.aplus_present,
    price_inr: product.normalized.price_inr,
    price_per_panel: product.normalized.price_per_panel,
    pack_count: product.normalized.pack_count,
    rating: product.normalized.rating,
    review_count: product.normalized.review_count,
    star_shape: starDistributionShape(byStar),
    verified_ratio: items.length ? verifiedCount / items.length : null,
    video_review_count: videoCount,
    helpful_total: helpfulTotal,
    recent_review_count: recentCount,
    bsr_rank: product.normalized.bsr_rank,
    bsr_node: product.normalized.bsr_node,
    dimensions: product.normalized.dimensions,
    opacity: product.product_details?.Opacity || null,
    material: product.product_details?.['Enclosure Material']
      || product.product_details?.['Fabric Type']
      || null,
    fabric_type: product.product_details?.['Fabric Type'] || null,
    category_node: product.normalized.category_node
  };
}

function computeCorpusMetrics(products) {
  return products.map(computeProductMetrics);
}

function aggregateNorms(metrics) {
  return {
    title_length: band(metrics.map((m) => m.title_length)),
    bullet_count: band(metrics.map((m) => m.bullet_count)),
    bullet_avg_length: band(metrics.map((m) => m.bullet_avg_length)),
    image_count: band(metrics.map((m) => m.image_count)),
    aplus_image_count: band(metrics.map((m) => m.aplus_image_count)),
    aplus_text_count: band(metrics.map((m) => m.aplus_text_count)),
    spec_key_count: band(metrics.map((m) => m.spec_key_count)),
    price_inr: band(metrics.map((m) => m.price_inr)),
    price_per_panel: band(metrics.map((m) => m.price_per_panel)),
    rating: band(metrics.map((m) => m.rating)),
    review_count: band(metrics.map((m) => m.review_count)),
    aplus_presence_rate: metrics.length
      ? metrics.filter((m) => m.aplus_present).length / metrics.length
      : 0
  };
}

function sampleReviewsForMining(reviews, config) {
  const negatives = reviews
    .filter((r) => r.rating <= 2)
    .slice(0, config.maxNegativeReviews);
  const positives = reviews
    .filter((r) => r.rating >= 4)
    .sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0))
    .slice(0, config.maxPositiveReviews);
  const byId = new Map();
  for (const r of [...negatives, ...positives]) {
    byId.set(r.review_id || `${r.asin}-${r.rating}-${r.review_text?.slice(0, 40)}`, r);
  }
  return [...byId.values()];
}

module.exports = {
  median,
  computeCorpusMetrics,
  aggregateNorms,
  sampleReviewsForMining
};
