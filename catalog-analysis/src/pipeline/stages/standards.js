const { aggregateNorms, median } = require('./metrics');
const {
  formatLeaderTitles,
  formatListingCopy,
  compactJson
} = require('../../utils/prompt-data');
const { toolDefinition } = require('../../utils/schema-tools');
const STANDARDS_LLM_TOOL = toolDefinition(
  'standards-llm',
  'Extract reusable catalog standards from Amazon category leader listings'
);
const {
  requireFields
} = require('../../utils/assert');

function buildSpecUnion(competitors) {
  const keyStats = new Map();

  for (const product of competitors) {
    const details = product.product_details || {};
    for (const [key, value] of Object.entries(details)) {
      if (!keyStats.has(key)) {
        keyStats.set(key, { values: new Set(), count: 0 });
      }
      const stat = keyStats.get(key);
      stat.count += 1;
      if (value) {
        stat.values.add(String(value).trim());
      }
    }
  }

  const total = competitors.length || 1;
  return [...keyStats.entries()]
    .map(([key, stat]) => ({
      key,
      fill_rate: Math.round((stat.count / total) * 100) / 100,
      typical_values: [...stat.values].slice(0, 8),
      weight: isCriticalSpecKey(key) ? 9 : 8
    }))
    .sort((a, b) => b.fill_rate - a.fill_rate);
}

function isCriticalSpecKey(key) {
  const critical = [
    'Opacity', 'Size', 'Enclosure Material', 'Fabric Type', 'Lining Description',
    'Weave Type', 'Product Features', 'Fits Rod Size', 'Number of Items', 'Unit Count'
  ];
  return critical.includes(key);
}

function detectFlagshipAttribute(specUnion) {
  const opacity = specUnion.find((s) => s.key === 'Opacity' && (s.typical_values || []).length);
  if (opacity) {
    return {
      key: 'Opacity',
      tiers: [...new Set(opacity.typical_values)].slice(0, 6)
    };
  }

  const ranked = [...specUnion]
    .filter((s) => (s.typical_values || []).length > 0)
    .sort((a, b) => b.fill_rate - a.fill_rate);

  const top = ranked.find((s) => s.fill_rate >= 0.5) || ranked[0];
  if (!top) {
    return { key: 'Item Type Name', tiers: ['unknown'] };
  }
  return { key: top.key, tiers: top.typical_values.slice(0, 6) };
}

function buildDeterministicStandard(competitors, competitorMetrics) {
  const norms = aggregateNorms(competitorMetrics);
  const specUnion = buildSpecUnion(competitors);
  const flagship = detectFlagshipAttribute(specUnion);

  const categoryNodes = [...new Set(competitorMetrics.map((m) => m.category_node).filter(Boolean))];
  const bsrRanks = competitorMetrics
    .filter((m) => Number.isFinite(m.bsr_rank))
    .sort((a, b) => a.bsr_rank - b.bsr_rank);
  const topBsr = bsrRanks[0] || null;

  const priceByPanel = {};
  for (const m of competitorMetrics) {
    if (m.price_per_panel) {
      const key = m.pack_count ? `${m.pack_count}-panel` : 'unknown';
      if (!priceByPanel[key]) {
        priceByPanel[key] = [];
      }
      priceByPanel[key].push(m.price_per_panel);
    }
  }

  const normalizedPerPanel = {};
  for (const [key, values] of Object.entries(priceByPanel)) {
    normalizedPerPanel[key] = {
      min: Math.min(...values),
      median: median(values),
      max: Math.max(...values)
    };
  }

  return {
    spec_union: specUnion,
    flagship_attribute: flagship,
    price_band: {
      currency: 'INR',
      per_set: norms.price_inr,
      normalized_per_panel: normalizedPerPanel
    },
    gallery_standard: {
      median_images: norms.image_count.median,
      min_images: norms.image_count.min,
      max_images: norms.image_count.max
    },
    aplus_standard: {
      median_modules: norms.aplus_image_count.median,
      median_text_blocks: norms.aplus_text_count.median,
      presence_rate: Math.round(norms.aplus_presence_rate * 100) / 100
    },
    reviews_norm: {
      rating_band: [norms.rating.min, norms.rating.max],
      median_volume: norms.review_count.median
    },
    category_node: categoryNodes[0] || metaCategoryFallback(competitors),
    bsr_top_rank: Number.isFinite(topBsr?.bsr_rank) ? topBsr.bsr_rank : 1,
    bsr_node: topBsr?.bsr_node || categoryNodes[0] || 'Best Sellers',
    title_norms: {
      median_length: norms.title_length.median,
      min_length: norms.title_length.min,
      max_length: norms.title_length.max
    },
    bullet_norms: {
      median_count: norms.bullet_count.median,
      median_avg_length: norms.bullet_avg_length.median
    }
  };
}

function metaCategoryFallback(competitors) {
  return competitors.find((p) => p.category)?.category
    || competitors.find((p) => p.product_details?.['Item Type Name'])?.product_details?.['Item Type Name']
    || 'unknown';
}

async function buildLlmStandard({ llm, config, competitors, category }) {
  const titles = formatLeaderTitles(competitors);
  const listings = formatListingCopy(competitors);

  return llm.completeTool({
    system: 'You analyze Amazon category leader listings and extract reusable catalog standards.',
    tool: STANDARDS_LLM_TOOL,
    user: `Category: ${category}

Leader titles:
${compactJson(titles)}

Leader listings (title, bullets, A+, catalog specs only):
${compactJson(listings)}`
  });
}

async function buildCategoryStandard({ llm, config, competitors, competitorMetrics, category }) {
  const deterministic = buildDeterministicStandard(competitors, competitorMetrics);
  const llmPart = await buildLlmStandard({ llm, config, competitors, category });

  requireFields(llmPart, {
    values: ['title', 'keyword_map'],
    arrays: ['bullet_topics'],
    strings: ['bullet_framing_pattern']
  }, 'standards LLM response');
  requireFields(llmPart.title, {
    strings: ['template'],
    arrays: ['required_tokens', 'mobile_first_75_chars']
  }, 'standards LLM response title');
  // vernacular / occasion are often empty outside localized categories — allow empty
  if (!llmPart.keyword_map || typeof llmPart.keyword_map !== 'object') {
    throw new Error('Missing required value: standards LLM response.keyword_map');
  }
  for (const key of ['head', 'long_tail', 'vernacular', 'occasion']) {
    if (!Array.isArray(llmPart.keyword_map[key])) {
      llmPart.keyword_map[key] = [];
    }
  }
  if (!llmPart.keyword_map.head.length && !llmPart.keyword_map.long_tail.length) {
    throw new Error('standards LLM response.keyword_map needs at least one head or long_tail term');
  }

  const titleMedian = deterministic.title_norms.median_length;
  if (!Number.isFinite(titleMedian)) {
    throw new Error('Missing required number: title median length');
  }

  return {
    title: {
      template: llmPart.title.template,
      required_tokens: llmPart.title.required_tokens,
      median_length: titleMedian,
      mobile_first_75_chars: llmPart.title.mobile_first_75_chars
    },
    keyword_map: llmPart.keyword_map,
    bullet_topics: llmPart.bullet_topics,
    bullet_framing_pattern: llmPart.bullet_framing_pattern,
    bullet_norms: deterministic.bullet_norms,
    spec_union: deterministic.spec_union,
    flagship_attribute: deterministic.flagship_attribute,
    price_band: deterministic.price_band,
    gallery_standard: deterministic.gallery_standard,
    aplus_standard: deterministic.aplus_standard,
    reviews_norm: deterministic.reviews_norm,
    category_node: deterministic.category_node,
    bsr_top_rank: deterministic.bsr_top_rank,
    bsr_node: deterministic.bsr_node
  };
}

module.exports = {
  buildCategoryStandard
};
