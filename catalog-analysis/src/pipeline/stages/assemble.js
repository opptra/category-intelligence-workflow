const { FUTURE_NEEDS_COLLECTION } = require('../../domain/attributes');
const { outputPath, FILE_NAMES } = require('../../config/paths');

function slugifyCategory(category) {
  return String(category)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function assemblePlaybook({
  meta,
  config,
  categoryStandard,
  voiceOfCustomer,
  recommendations
}) {
  const galleryStandard = {
    median_images: categoryStandard.gallery_standard?.median_images,
    required_roles: categoryStandard.gallery_standard?.required_roles
      || ['hero', 'lifestyle', 'texture', 'demo', 'size_guide', 'infographic'],
    hero_conventions: categoryStandard.gallery_standard?.hero_conventions || []
  };

  const aplusStandard = {
    median_modules: categoryStandard.aplus_standard?.median_modules,
    topics: categoryStandard.aplus_standard?.topics
      || categoryStandard.aplus_topics
      || []
  };

  return {
    meta: {
      category: meta.category,
      domain: meta.domain,
      generated_at: new Date().toISOString(),
      run_scope: 'category',
      model: config.model,
      competitor_count: meta.competitor_count,
      framework_version: '1.0'
    },
    category_standard: {
      title: {
        template: categoryStandard.title?.template,
        required_tokens: categoryStandard.title?.required_tokens || [],
        median_length: categoryStandard.title?.median_length,
        mobile_first_75_chars: categoryStandard.title?.mobile_first_75_chars || []
      },
      keyword_map: categoryStandard.keyword_map || {
        head: [],
        long_tail: [],
        vernacular: [],
        occasion: []
      },
      spec_union: (categoryStandard.spec_union || []).map((s) => ({
        key: s.key,
        fill_rate: s.fill_rate,
        typical_values: s.typical_values,
        weight: s.weight
      })),
      flagship_attribute: categoryStandard.flagship_attribute || { key: null, tiers: [] },
      price_band: categoryStandard.price_band || { currency: 'INR', per_set: {}, normalized_per_panel: {} },
      gallery_standard: galleryStandard,
      aplus_standard: aplusStandard,
      reviews_norm: categoryStandard.reviews_norm || { rating_band: [], median_volume: null },
      category_node: categoryStandard.category_node || null
    },
    voice_of_customer: {
      praise: (voiceOfCustomer.praise || []).map((p) => ({
        theme: p.theme,
        frequency: p.frequency,
        phrases: p.phrases || [],
        weight: p.weight || 9
      })),
      complaints: (voiceOfCustomer.complaints || []).map((c) => ({
        theme: c.theme,
        frequency: c.frequency,
        severity: c.severity || 'medium',
        weight: c.weight || 9
      })),
      objections: voiceOfCustomer.objections || [],
      phrase_bank: voiceOfCustomer.phrase_bank || []
    },
    recommendations: recommendations.map((r) => ({
      attribute_id: r.attribute_id,
      attribute: r.attribute,
      pillar: r.pillar,
      weight: r.weight,
      priority: r.priority,
      standard: r.standard,
      rule: r.rule,
      required_elements: r.required_elements || [],
      checklist: r.checklist || [],
      common_pitfalls: r.common_pitfalls || []
    })),
    future_needs_collection: FUTURE_NEEDS_COLLECTION
  };
}

function resolveOutputPath(config, category) {
  if (config.output) {
    return config.output;
  }
  const slug = slugifyCategory(category);
  return outputPath(FILE_NAMES.analysis(slug));
}

module.exports = {
  assemblePlaybook,
  resolveOutputPath,
  slugifyCategory
};
