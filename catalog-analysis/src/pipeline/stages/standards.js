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

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function deriveTitleFallback(competitors) {
  const titles = formatLeaderTitles(competitors);
  const tokens = [];
  for (const title of titles.slice(0, 5)) {
    for (const part of title.split(/[|\-–,]/).map((p) => p.trim()).filter((p) => p.length > 2)) {
      if (!tokens.includes(part) && tokens.length < 8) {
        tokens.push(part);
      }
    }
  }

  const within75 = titles.filter((title) => title.length <= 75);
  const compliantRate = titles.length ? within75.length / titles.length : 0;
  const mobile = (within75.length ? within75 : titles)
    .map((title) => title.slice(0, 75).trim())
    .filter(Boolean)
    .slice(0, 5);

  const highlightSeeds = titles
    .map((title) => {
      if (title.length <= 75) return '';
      return title.slice(75).replace(/^[\s|\-–,]+/, '').trim().slice(0, 125);
    })
    .filter(Boolean)
    .slice(0, 5);

  return {
    template: titles[0]
      ? `Brand + Product Type + Key Spec (≤75 chars; pattern from leaders e.g. "${titles[0].slice(0, 75)}")`
      : 'Brand + Product Type + Key Spec (≤75 chars)',
    required_tokens: tokens.length ? tokens : ['Brand', 'Product Type', 'Size'],
    mobile_first_75_chars: mobile.length ? mobile : ['Brand Product Type Key Spec'],
    title_limit_chars: 75,
    leaders_within_75_rate: Math.round(compliantRate * 100) / 100,
    item_highlights: {
      template: highlightSeeds[0]
        ? `Key benefit + material/spec + pack detail (≤125 chars; e.g. "${highlightSeeds[0]}")`
        : 'Key benefit + material/spec + pack detail (≤125 chars)',
      limit_chars: 125,
      examples: highlightSeeds
    }
  };
}

function deriveKeywordFallback(competitors) {
  const titles = formatLeaderTitles(competitors);
  const head = [];
  for (const title of titles) {
    const words = title.split(/\s+/).filter((w) => w.length > 3).slice(0, 4);
    for (const word of words) {
      const cleaned = word.replace(/[^a-zA-Z0-9]/g, '');
      if (cleaned && !head.includes(cleaned) && head.length < 10) {
        head.push(cleaned);
      }
    }
  }
  return {
    head: head.length ? head : ['duvet', 'cover', 'set'],
    long_tail: titles.slice(0, 5).map((t) => t.slice(0, 60)),
    vernacular: [],
    occasion: []
  };
}

/**
 * Coerce common LLM shape mistakes / empty required fields so a flaky
 * tool response does not fail the whole pipeline.
 */
function normalizeStandardsLlmPart(raw, competitors) {
  const part = raw && typeof raw === 'object' ? { ...raw } : {};
  const titleFallback = deriveTitleFallback(competitors);

  if (typeof part.title === 'string') {
    part.title = {
      template: part.title,
      required_tokens: [],
      mobile_first_75_chars: []
    };
  } else if (!part.title || typeof part.title !== 'object') {
    part.title = {};
  } else {
    part.title = { ...part.title };
  }

  part.title.template =
    nonEmptyString(part.title.template)
    || nonEmptyString(part.title.pattern)
    || nonEmptyString(part.title.format)
    || nonEmptyString(part.title.structure)
    || titleFallback.template;

  part.title.required_tokens = asStringArray(part.title.required_tokens);
  if (!part.title.required_tokens.length) {
    part.title.required_tokens = titleFallback.required_tokens;
  }

  part.title.mobile_first_75_chars = asStringArray(part.title.mobile_first_75_chars);
  if (!part.title.mobile_first_75_chars.length) {
    part.title.mobile_first_75_chars = titleFallback.mobile_first_75_chars;
  }

  if (typeof part.item_highlights === 'string') {
    part.item_highlights = { template: part.item_highlights, examples: [] };
  } else if (!part.item_highlights || typeof part.item_highlights !== 'object') {
    part.item_highlights = {};
  } else {
    part.item_highlights = { ...part.item_highlights };
  }
  part.item_highlights.template =
    nonEmptyString(part.item_highlights.template)
    || titleFallback.item_highlights.template;
  part.item_highlights.examples = asStringArray(part.item_highlights.examples);
  if (!part.item_highlights.examples.length) {
    part.item_highlights.examples = titleFallback.item_highlights.examples;
  }
  part.item_highlights.limit_chars = 125;

  if (!part.keyword_map || typeof part.keyword_map !== 'object') {
    part.keyword_map = deriveKeywordFallback(competitors);
  } else {
    part.keyword_map = { ...part.keyword_map };
    for (const key of ['head', 'long_tail', 'vernacular', 'occasion']) {
      part.keyword_map[key] = asStringArray(part.keyword_map[key]);
    }
    if (!part.keyword_map.head.length && !part.keyword_map.long_tail.length) {
      const fallback = deriveKeywordFallback(competitors);
      part.keyword_map.head = fallback.head;
      part.keyword_map.long_tail = fallback.long_tail;
    }
  }

  part.bullet_topics = asStringArray(part.bullet_topics);
  if (!part.bullet_topics.length) {
    part.bullet_topics = [
      'Material & fabric feel',
      'Fit & size coverage',
      'Care & durability',
      'Design / print',
      'Pack contents'
    ];
  }

  part.bullet_framing_pattern =
    nonEmptyString(part.bullet_framing_pattern)
    || 'Benefit-first: lead with customer outcome, then proof (material/spec), then use case';

  return part;
}

async function buildLlmStandard({ llm, competitors, category }) {
  const titles = formatLeaderTitles(competitors);
  const listings = formatListingCopy(competitors);
  const user = `Category: ${category}

Leader titles:
${compactJson(titles)}

Leader listings (title, bullets, A+, catalog specs only):
${compactJson(listings)}

Return Amazon 2026 listing standards derived from these leaders: mobile-first titles (75-character limit) and searchable item highlights (125-character limit).`;

  let raw;
  try {
    raw = await llm.completeTool({
      system:
        'You analyze Amazon category leader listings and extract reusable catalog standards. Always fill every required string field with concrete non-empty values derived from the listings.',
      tool: STANDARDS_LLM_TOOL,
      user
    });
  } catch (err) {
    console.warn(`[standards] LLM tool call failed (${err.message}); using deterministic fallbacks`);
    raw = {};
  }

  return normalizeStandardsLlmPart(raw, competitors);
}

async function buildCategoryStandard({ llm, config, competitors, competitorMetrics, category }) {
  const deterministic = buildDeterministicStandard(competitors, competitorMetrics);
  const llmPart = await buildLlmStandard({ llm, competitors, category });

  requireFields(llmPart, {
    values: ['title', 'keyword_map'],
    arrays: ['bullet_topics'],
    strings: ['bullet_framing_pattern']
  }, 'standards LLM response');
  requireFields(llmPart.title, {
    strings: ['template'],
    arrays: ['required_tokens', 'mobile_first_75_chars']
  }, 'standards LLM response title');
  if (!llmPart.keyword_map.head.length && !llmPart.keyword_map.long_tail.length) {
    throw new Error('standards LLM response.keyword_map needs at least one head or long_tail term');
  }

  const titleMedian = deterministic.title_norms.median_length;
  if (!Number.isFinite(titleMedian)) {
    throw new Error('Missing required number: title median length');
  }

  const titleFallbackMeta = deriveTitleFallback(competitors);

  return {
    title: {
      template: llmPart.title.template,
      required_tokens: llmPart.title.required_tokens,
      median_length: titleMedian,
      limit_chars: 75,
      leaders_within_75_rate: titleFallbackMeta.leaders_within_75_rate,
      mobile_first_75_chars: llmPart.title.mobile_first_75_chars
    },
    item_highlights: {
      template: llmPart.item_highlights.template,
      limit_chars: 125,
      examples: llmPart.item_highlights.examples || []
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
