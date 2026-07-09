const { withCache } = require('../../services/cache');
const { SCOPED_ATTRIBUTES } = require('../../domain/attributes');

function buildDeterministicRecommendation(attr, ctx) {
  const { categoryStandard, voiceOfCustomer, visualStandard } = ctx;
  const std = categoryStandard;
  const voc = voiceOfCustomer;
  const gallery = visualStandard?.gallery_standard || std.gallery_standard || {};

  const base = {
    attribute_id: attr.id,
    attribute: attr.attribute,
    pillar: attr.pillar,
    weight: attr.weight,
    required_elements: [],
    checklist: [],
    common_pitfalls: ctx.pitfallsByAttribute[attr.id] || []
  };

  switch (attr.id) {
    case '1.1':
      return {
        ...base,
        standard: `Leaders use a title template around: ${std.title?.template || 'brand + key attribute + type + size + pack'}. Median length ~${std.title?.median_length || 'N/A'} chars.`,
        rule: 'Build every title from the learned template. Front-load decisive tokens in the first 75 characters for mobile truncation.',
        required_elements: std.title?.required_tokens || [],
        checklist: [
          'Keep within ~150 characters where possible',
          'Place opacity, product type, size, and pack before mobile truncation',
          'Avoid keyword stuffing; keep claims accurate'
        ]
      };

    case '1.2':
      return {
        ...base,
        standard: `Leaders use ~${std.bullet_norms?.median_count || 5} bullets with benefit-led framing: ${std.bullet_framing_pattern || 'hook → spec → benefit'}.`,
        rule: 'Cover the canonical bullet topic set. Lead each bullet with a benefit hook, then substantiate with a spec.',
        required_elements: std.bullet_topics || [
          'light blocking', 'thermal insulation', 'privacy', 'installation', 'care', 'room versatility'
        ],
        checklist: [
          'Use labeled benefit hooks',
          'Cover all recurring category topics',
          'Weave vernacular and occasion terms naturally'
        ]
      };

    case '1.4':
      return {
        ...base,
        standard: 'Leaders cover a broad keyword cloud across title, bullets, A+, and specs.',
        rule: 'Weave the category keyword map into all text surfaces without stuffing.',
        required_elements: [
          ...(std.keyword_map?.head || []).slice(0, 8),
          ...(std.keyword_map?.vernacular || []).slice(0, 5),
          ...(std.keyword_map?.occasion || []).slice(0, 4)
        ],
        checklist: [
          'Include head terms in title',
          'Add long-tail and vernacular in bullets',
          'Mirror customer phrases from reviews where natural'
        ]
      };

    case '2.1':
      return {
        ...base,
        standard: `Winning hero images: ${(gallery.hero_conventions || []).join('; ') || 'crisp, high-resolution, color-true product shot with visible fabric fall'}.`,
        rule: 'Match leader hero composition: clean framing, true color, full panel visible, zoom-eligible resolution.',
        checklist: [
          'Use high-resolution source (≥1500px where possible)',
          'Show fabric fall and accurate color',
          'Avoid clutter; hero must read at thumbnail size'
        ]
      };

    case '2.2':
      return {
        ...base,
        standard: `Leaders use ~${std.gallery_standard?.median_images || 12} gallery images (range ${std.gallery_standard?.min_images || ''}-${std.gallery_standard?.max_images || ''}).`,
        rule: 'Fill available gallery slots with distinct, purposeful shots — not near-duplicates.',
        checklist: [
          `Target at least ${Math.round(std.gallery_standard?.median_images || 12)} images`,
          'Each slot should answer a different buyer question',
          'Avoid redundant angles'
        ]
      };

    case '2.3':
      return {
        ...base,
        standard: `Required gallery roles: ${(gallery.required_roles || []).join(', ')}.`,
        rule: 'Structure the gallery as a visual argument: hero → lifestyle → texture → demo → size/fit → callouts.',
        required_elements: gallery.required_roles || ['hero', 'lifestyle', 'texture', 'demo', 'size_guide', 'infographic'],
        checklist: [
          'Include every required role at least once',
          'Order shots to follow the buyer decision journey',
          'Ensure performance claims have a visual proof shot'
        ]
      };

    case '2.4':
      return {
        ...base,
        standard: 'Leaders stage curtains in relatable room contexts (living room, bedroom, large windows).',
        rule: 'Include lifestyle shots that let shoppers imagine the product in their own space.',
        checklist: [
          'Show product in primary room contexts for the category',
          'Use locally relatable staging',
          'Ensure lifestyle shots are distinct from hero shots'
        ]
      };

    case '2.5':
      return {
        ...base,
        standard: 'Leaders include measurement diagrams and feature-callout infographics to prevent fit confusion.',
        rule: 'Add a size/measurement guide and infographic callouts for flagship claims.',
        checklist: [
          'Diagram panel dimensions in feet and cm',
          'Show rod/grommet compatibility where relevant',
          'Label flagship claims in-image for skim readers'
        ]
      };

    case '3.1':
      return {
        ...base,
        standard: `A+ presence among leaders: ~${Math.round((std.aplus_standard?.presence_rate || 0.8) * 100)}%.`,
        rule: 'Treat A+ as required for every SKU in the category.',
        checklist: [
          'Every SKU must have A+ content',
          'A+ should render on mobile',
          'Pair visuals with extractable text'
        ]
      };

    case '3.2':
      return {
        ...base,
        standard: `Leaders ship ~${std.aplus_standard?.median_modules || 10} A+ image modules.`,
        rule: 'Match leader A+ depth — multiple well-designed modules, not a single banner.',
        checklist: [
          `Target ${Math.round(std.aplus_standard?.median_modules || 10)}+ modules`,
          'Use comparison tables and feature grids where leaders do',
          'Design for mobile legibility'
        ]
      };

    case '3.3':
      return {
        ...base,
        standard: `Leaders cover recurring A+ topics and include ~${std.aplus_standard?.median_text_blocks || 20} text blocks.`,
        rule: 'Give each flagship claim its own A+ module; include heading + body text for every visual.',
        required_elements: std.aplus_standard?.topics || visualStandard?.aplus_topics_from_vision || [],
        checklist: [
          'One module per major claim or objection',
          'Include brand story where leaders do',
          'Add extractable text, not image-only A+'
        ]
      };

    case '4.1':
      return {
        ...base,
        standard: `Target spec schema: ${std.spec_union?.length || 0} fields observed across leaders.`,
        rule: 'Populate the full spec union for every SKU; blank fields forfeit filter discoverability.',
        required_elements: (std.spec_union || []).filter((s) => s.fill_rate >= 0.5).map((s) => s.key).slice(0, 20),
        checklist: [
          'Fill every applicable spec key from the union',
          'Use specific values, not vague placeholders',
          'Keep values consistent with title and bullets'
        ]
      };

    case '4.2':
      return {
        ...base,
        standard: `Category-critical specs include: ${(std.spec_union || []).filter((s) => s.weight >= 9).map((s) => s.key).join(', ') || 'opacity, material, lining, size, features'}.`,
        rule: 'Declare every decision-critical attribute with specific, credible values.',
        required_elements: ['Opacity', 'Size', 'Enclosure Material', 'Fabric Type', 'Product Features', 'Fits Rod Size'],
        checklist: [
          'Quantify flagship attributes where leaders do',
          'Corroborate claims with imagery and reviews',
          'Avoid vague or missing critical fields'
        ]
      };

    case '4.3':
      return {
        ...base,
        standard: 'Leaders state dimensions in multiple units and surfaces (feet, cm, inches; title + spec + image).',
        rule: 'Present size consistently across title, specs, bullets, and size-guide imagery.',
        checklist: [
          'State panel W×H in feet and cm',
          'Align title size claim with spec Size field',
          'Pre-empt fit confusion with a measurement diagram'
        ]
      };

    case '4.4':
      return {
        ...base,
        standard: `Common materials: ${(std.spec_union?.find((s) => s.key === 'Enclosure Material')?.typical_values || []).join(', ') || 'faux silk, polyester, linen blends'}.`,
        rule: 'State material/composition precisely in specs and reinforce attractively in copy.',
        checklist: [
          'Populate Enclosure Material and Fabric Type',
          'Match material claims in bullets to spec values',
          'Use texture imagery to support material claims'
        ]
      };

    case '4.5':
      return {
        ...base,
        standard: `Opacity tiers in category: ${(std.flagship_attribute?.tiers || []).join(', ') || '100% blackout, room darkening, sheer'}.`,
        rule: 'Choose the honest opacity tier per SKU and prove it visually; never over-claim.',
        checklist: [
          'Pick the correct tier for the product',
          'State the same opacity everywhere',
          'Include a blackout/performance demo image'
        ]
      };

    case '5.1':
      return {
        ...base,
        standard: `Price band per set: ₹${std.price_band?.per_set?.min || '?'}-₹${std.price_band?.per_set?.max || '?'} (median ₹${std.price_band?.per_set?.median || '?'}).`,
        rule: 'Position each SKU within the category band based on its spec depth, content richness, and review strength.',
        checklist: [
          'Normalize price per panel when comparing pack sizes',
          'Align price with perceived quality signals',
          'Calibrate claims to price to protect rating'
        ]
      };

    case '6.1':
      return {
        ...base,
        standard: `Leader rating band: ${std.reviews_norm?.rating_band?.[0] || 4.0}-${std.reviews_norm?.rating_band?.[1] || 4.3}.`,
        rule: 'Target the competitive rating band; prioritize fixes surfaced by negative reviews.',
        checklist: [
          'Benchmark against category band',
          'Read rating together with review volume',
          'Address systematic causes of low stars'
        ]
      };

    case '6.2':
      return {
        ...base,
        standard: `Median leader review volume: ~${std.reviews_norm?.median_volume || 'N/A'}.`,
        rule: 'Build review velocity over time; consider variant/family aggregation where applicable.',
        checklist: [
          'Plan long-term social-proof strategy',
          'Consolidate variants where platform allows',
          'Maintain listing quality to protect review sentiment'
        ]
      };

    case '6.3':
      return {
        ...base,
        standard: 'A heavy 1-2 star tail signals a systematic defect, not random noise.',
        rule: 'Monitor star distribution shape; mine the negative tail for root causes.',
        checklist: [
          'Check negative-tail percentage',
          'Read 1-2 star text for recurring themes',
          'Distinguish listing gaps from product defects'
        ]
      };

    case '6.5':
      return {
        ...base,
        standard: `Top praise themes: ${(voc.praise || []).slice(0, 3).map((p) => p.theme).join('; ') || 'blocks light, premium look, easy install'}.`,
        rule: 'Amplify consistent praise themes in bullets, A+ headings, and image callouts using customer language.',
        required_elements: (voc.phrase_bank || []).slice(0, 10),
        checklist: [
          'Surface top praise themes in copy',
          'Use phrase bank for headlines and callouts',
          'Match claims to what reviewers confirm'
        ]
      };

    case '6.6':
      return {
        ...base,
        standard: `Top complaints: ${(voc.complaints || []).slice(0, 3).map((c) => c.theme).join('; ') || 'misleading opacity, thin fabric, color mismatch'}.`,
        rule: 'Fix product issues where needed; pre-empt remaining complaints in copy, specs, and imagery.',
        checklist: [
          'Map each complaint cluster to a content or product action',
          'Add size guides for fit complaints',
          'Honest claims for opacity/color complaints'
        ]
      };

    case '6.7':
      return {
        ...base,
        standard: 'Reviews corroborate or dispute listing claims — especially opacity, size, and material.',
        rule: 'Calibrate every major claim to what reviewers confirm; downgrade over-claims.',
        checklist: [
          'Cross-check opacity claims against review language',
          'Verify size and pack claims',
          'Adjust copy when reviews dispute a claim'
        ]
      };

    case '7.1':
      return {
        ...base,
        standard: `Top competitor rank in category: #${std.bsr_top_rank || 'N/A'} in ${std.bsr_node || std.category_node || 'category'}.`,
        rule: 'Study top-ranked listings as the highest-confidence templates for catalog quality.',
        checklist: [
          'Confirm correct category node and item type',
          'Emulate patterns from top BSR listings',
          'Keep compliance and content depth competitive'
        ]
      };

    case '8.4':
      return {
        ...base,
        standard: 'One coherent value per attribute across title, bullets, specs, images, and A+.',
        rule: 'Reconcile every attribute to a single honest value on all surfaces before publishing.',
        checklist: [
          'Audit opacity, size, pack, and material across all surfaces',
          'Fix contradictions before go-live',
          'Use review corroboration as the tie-breaker'
        ]
      };

    case '8.5':
      return {
        ...base,
        standard: 'Clean copy is table stakes; typos and template artifacts erode trust and indexing.',
        rule: 'Proofread every surface for spelling, brand integrity, and foreign-market leftovers.',
        checklist: [
          'Spell-check material and technical terms',
          'Verify brand name consistency',
          'Remove template copy from other markets'
        ]
      };

    default:
      return {
        ...base,
        standard: 'Follow leader patterns for this attribute.',
        rule: 'Apply the category standard consistently across all SKUs.',
        checklist: []
      };
  }
}

async function refineRecommendationsWithLlm({ llm, config, recommendations, category }) {
  const cacheInput = {
    model: config.model,
    category,
    ids: recommendations.map((r) => r.attribute_id)
  };

  return withCache({
    cacheDir: config.cacheDir,
    stage: 'recommend-refine',
    input: cacheInput,
    refresh: config.refresh,
    fn: async () => {
      const result = await llm.completeJson({
        system: 'You refine catalog-building recommendations into crisp, reusable rules. Do not include ASINs, review IDs, or fabricated example listing copy.',
        user: `Category: ${category}

Refine these draft recommendations. Keep the same attribute_ids. Improve clarity of standard, rule, checklist, and common_pitfalls.

Draft:
${JSON.stringify(recommendations.map((r) => ({
  attribute_id: r.attribute_id,
  standard: r.standard,
  rule: r.rule,
  required_elements: r.required_elements,
  checklist: r.checklist,
  common_pitfalls: r.common_pitfalls
})), null, 2)}

Return JSON: { "recommendations": [ same shape, no evidence fields ] }`
      });

      const refined = result.recommendations || [];
      const byId = new Map(refined.map((r) => [r.attribute_id, r]));

      return recommendations.map((rec) => {
        const patch = byId.get(rec.attribute_id);
        if (!patch) {
          return rec;
        }
        return {
          ...rec,
          standard: patch.standard || rec.standard,
          rule: patch.rule || rec.rule,
          required_elements: patch.required_elements || rec.required_elements,
          checklist: patch.checklist || rec.checklist,
          common_pitfalls: patch.common_pitfalls || rec.common_pitfalls
        };
      });
    }
  });
}

async function buildRecommendations({ llm, config, category, categoryStandard, voiceOfCustomer, visualStandard, gapAnalysis }) {
  const ctx = {
    categoryStandard: {
      ...categoryStandard,
      gallery_standard: {
        ...categoryStandard.gallery_standard,
        ...(visualStandard?.gallery_standard || {})
      },
      aplus_standard: {
        ...categoryStandard.aplus_standard,
        topics: visualStandard?.aplus_topics_from_vision || []
      }
    },
    voiceOfCustomer,
    visualStandard,
    pitfallsByAttribute: gapAnalysis.pitfallsByAttribute
  };

  const ordered = gapAnalysis.prioritizedAttributes.length
    ? gapAnalysis.prioritizedAttributes
    : SCOPED_ATTRIBUTES;

  let recommendations = ordered.map((attr) => {
    const rec = buildDeterministicRecommendation(attr, ctx);
    return {
      ...rec,
      priority: Math.round(attr.weight * (1 + (attr.emphasis || 0)))
    };
  });

  if (config.apiKey) {
    recommendations = await refineRecommendationsWithLlm({
      llm,
      config,
      recommendations,
      category
    });
  }

  recommendations.sort((a, b) => b.priority - a.priority);
  recommendations.forEach((rec, idx) => {
    rec.priority = idx + 1;
  });

  return recommendations;
}

module.exports = {
  buildRecommendations,
  buildDeterministicRecommendation
};
