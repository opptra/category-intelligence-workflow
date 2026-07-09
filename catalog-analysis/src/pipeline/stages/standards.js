const { withCache } = require('../../services/cache');
const { aggregateNorms, median, collectTextCorpus } = require('./metrics');

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
  const opacity = specUnion.find((s) => s.key === 'Opacity');
  if (opacity) {
    return {
      key: 'Opacity',
      tiers: [...new Set(opacity.typical_values)].slice(0, 6)
    };
  }

  const top = specUnion.find((s) => s.fill_rate >= 0.7);
  return top
    ? { key: top.key, tiers: top.typical_values.slice(0, 6) }
    : { key: null, tiers: [] };
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
    category_node: categoryNodes[0] || null,
    bsr_top_rank: topBsr?.bsr_rank ?? null,
    bsr_node: topBsr?.bsr_node ?? null,
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

async function buildLlmStandard({ llm, config, competitors, category }) {
  const titles = competitors.map((p) => ({ asin: p.asin, title: p.title }));
  const textSample = collectTextCorpus(competitors).slice(0, 12000);

  const cacheInput = {
    model: config.model,
    category,
    titles,
    textSampleLength: textSample.length
  };

  return withCache({
    cacheDir: config.cacheDir,
    stage: 'standards-llm',
    input: cacheInput,
    refresh: config.refresh,
    fn: async () => llm.completeJson({
      system: 'You analyze Amazon category leader listings and extract reusable catalog standards.',
      user: `Category: ${category}

Leader titles:
${JSON.stringify(titles, null, 2)}

Leader copy sample (titles, bullets, A+, specs):
${textSample}

Return JSON:
{
  "title": {
    "template": "token order formula",
    "required_tokens": ["list of token types every winning title should include"],
    "mobile_first_75_chars": ["tokens that must appear in first 75 chars"]
  },
  "keyword_map": {
    "head": [],
    "long_tail": [],
    "vernacular": [],
    "occasion": []
  },
  "bullet_topics": ["recurring bullet topics across leaders"],
  "bullet_framing_pattern": "benefit framing pattern leaders use"
}`
    })
  });
}

async function buildCategoryStandard({ llm, config, competitors, competitorMetrics, category }) {
  const deterministic = buildDeterministicStandard(competitors, competitorMetrics);
  const llmPart = await buildLlmStandard({ llm, config, competitors, category });

  return {
    title: {
      template: llmPart.title?.template || 'Brand + Key Attribute + Product Type + Size + Pack + Benefits + Room + Dimensions + Color',
      required_tokens: llmPart.title?.required_tokens || [],
      median_length: deterministic.title_norms.median_length,
      mobile_first_75_chars: llmPart.title?.mobile_first_75_chars || []
    },
    keyword_map: llmPart.keyword_map || { head: [], long_tail: [], vernacular: [], occasion: [] },
    bullet_topics: llmPart.bullet_topics || [],
    bullet_framing_pattern: llmPart.bullet_framing_pattern || 'CAPITALIZED HOOK: spec → benefit → who it helps',
    spec_union: deterministic.spec_union,
    flagship_attribute: deterministic.flagship_attribute,
    price_band: deterministic.price_band,
    gallery_standard: deterministic.gallery_standard,
    aplus_standard: deterministic.aplus_standard,
    reviews_norm: deterministic.reviews_norm,
    category_node: deterministic.category_node,
    bsr_top_rank: deterministic.bsr_top_rank
  };
}

module.exports = {
  buildCategoryStandard,
  buildDeterministicStandard,
  buildSpecUnion
};
