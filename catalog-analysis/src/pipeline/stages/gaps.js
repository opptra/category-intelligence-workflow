const { SCOPED_ATTRIBUTES } = require('../../domain/attributes');

function avg(values) {
  const nums = values.filter(Number.isFinite);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function gapRatio(oursValue, standardValue, higherIsBetter = true) {
  if (!Number.isFinite(oursValue) || !Number.isFinite(standardValue) || standardValue === 0) {
    return 0;
  }
  if (higherIsBetter) {
    return Math.max(0, Math.min(1, (standardValue - oursValue) / standardValue));
  }
  return Math.max(0, Math.min(1, (oursValue - standardValue) / Math.max(oursValue, standardValue)));
}

function detectHygieneIssues(products) {
  const issues = [];
  const patterns = [
    { regex: /polyster/i, label: 'misspelled material terms (e.g. Polyster)' },
    { regex: /windowd/i, label: 'typos in common words' },
    { regex: /corttina/i, label: 'brand-name misspellings in specs' },
    { regex: /fall decor/i, label: 'leftover foreign-market copy' },
    { regex: /tripe weave/i, label: 'misspelled technical terms' }
  ];

  for (const product of products) {
    const text = [
      product.title,
      ...(product.feature_bullets || []),
      product.description,
      ...(product.aplus_text_blocks || []),
      JSON.stringify(product.product_details || {})
    ].filter(Boolean).join(' ');

    for (const { regex, label } of patterns) {
      if (regex.test(text) && !issues.includes(label)) {
        issues.push(label);
      }
    }
  }

  return issues;
}

function detectClaimInconsistencies(products) {
  const pitfalls = [];
  for (const product of products) {
    const title = product.title || '';
    const bullets = (product.feature_bullets || []).join(' ');
    const opacitySpec = product.product_details?.Opacity || '';
    const titleOpacity = title.match(/\d{1,3}%|blackout|room darkening/i);
    const bulletOpacity = bullets.match(/100%|block[s]?\s+\d+%/i);

    if (titleOpacity && bulletOpacity && titleOpacity[0] !== bulletOpacity[0]) {
      if (!pitfalls.includes('opacity stated inconsistently across title and bullets')) {
        pitfalls.push('opacity stated inconsistently across title and bullets');
      }
    }
    if (opacitySpec && bulletOpacity && !String(opacitySpec).includes('100') && /100%/.test(bullets)) {
      if (!pitfalls.includes('bullet claims stronger opacity than spec field')) {
        pitfalls.push('bullet claims stronger opacity than spec field');
      }
    }
  }
  return pitfalls;
}

function computeInternalGaps({ ourMetrics, categoryStandard, visualStandard, ourProducts }) {
  const ourAvg = {
    title_length: avg(ourMetrics.map((m) => m.title_length)),
    bullet_count: avg(ourMetrics.map((m) => m.bullet_count)),
    image_count: avg(ourMetrics.map((m) => m.image_count)),
    aplus_image_count: avg(ourMetrics.map((m) => m.aplus_image_count)),
    aplus_text_count: avg(ourMetrics.map((m) => m.aplus_text_count)),
    spec_key_count: avg(ourMetrics.map((m) => m.spec_key_count)),
    rating: avg(ourMetrics.map((m) => m.rating)),
    review_count: avg(ourMetrics.map((m) => m.review_count)),
    aplus_presence: ourMetrics.filter((m) => m.aplus_present).length / (ourMetrics.length || 1)
  };

  const std = categoryStandard;
  const emphasis = {};
  const pitfallsByAttribute = {};

  function setGap(attrId, score, pitfalls = []) {
    emphasis[attrId] = Math.max(emphasis[attrId] || 0, score);
    if (pitfalls.length) {
      pitfallsByAttribute[attrId] = [...new Set([...(pitfallsByAttribute[attrId] || []), ...pitfalls])];
    }
  }

  setGap('1.1', gapRatio(ourAvg.title_length, std.title?.median_length), [
    'opacity/size missing before mobile cut-off',
    'inconsistent pack wording in title'
  ]);

  setGap('1.2', gapRatio(ourAvg.bullet_count, std.bullet_norms?.median_count || 5), [
    'bullets repeat specs without benefit framing',
    'missing recurring topic coverage'
  ]);

  setGap('1.4', 0.3, ['vernacular and occasion keywords underused']);

  setGap('2.1', 0.4);
  setGap('2.2', gapRatio(ourAvg.image_count, std.gallery_standard?.median_images), [
    'gallery underuses available image slots'
  ]);
  setGap('2.3', 0.5, ['missing mandatory shot roles in gallery mix']);
  setGap('2.4', 0.4, ['insufficient lifestyle context shots']);
  setGap('2.5', 0.5, ['no size/measurement guide image']);

  setGap('3.1', gapRatio(ourAvg.aplus_presence, std.aplus_standard?.presence_rate || 0.8, true), [
    'A+ content absent on some SKUs'
  ]);
  setGap('3.2', gapRatio(ourAvg.aplus_image_count, std.aplus_standard?.median_modules), [
    'thin A+ with too few modules'
  ]);
  setGap('3.3', gapRatio(ourAvg.aplus_text_count, std.aplus_standard?.median_text_blocks), [
    'A+ lacks extractable text layer'
  ]);

  setGap('4.1', gapRatio(ourAvg.spec_key_count, std.spec_union?.length * 0.6), [
    'blank spec fields drop listings from filters'
  ]);
  setGap('4.2', 0.4);
  setGap('4.3', 0.3, ['size not stated consistently across title, spec, and imagery']);
  setGap('4.4', 0.3);
  setGap('4.5', 0.6);

  setGap('5.1', 0.2);
  setGap('6.1', gapRatio(ourAvg.rating, std.reviews_norm?.rating_band?.[1] || 4.2));
  setGap('6.2', gapRatio(ourAvg.review_count, std.reviews_norm?.median_volume || 1000));
  setGap('6.3', 0.3);
  setGap('6.5', 0.2);
  setGap('6.6', 0.5);
  setGap('6.7', 0.6);
  setGap('7.1', 0.3);
  setGap('8.4', 0.7, detectClaimInconsistencies(ourProducts));
  setGap('8.5', detectHygieneIssues(ourProducts).length ? 0.8 : 0.2, detectHygieneIssues(ourProducts));

  if (visualStandard?.our_gallery_internal?.length) {
    const ourMissing = new Set();
    for (const g of visualStandard.our_gallery_internal) {
      for (const role of g.missing_roles || []) {
        ourMissing.add(role);
      }
    }
    if (ourMissing.size) {
      setGap('2.3', 0.6, [`missing gallery roles: ${[...ourMissing].join(', ')}`]);
    }
  }

  const prioritizedAttributes = SCOPED_ATTRIBUTES.map((attr) => ({
    ...attr,
    emphasis: emphasis[attr.id] || 0,
    common_pitfalls: pitfallsByAttribute[attr.id] || []
  })).sort((a, b) => {
    const priorityA = a.weight * (1 + a.emphasis);
    const priorityB = b.weight * (1 + b.emphasis);
    return priorityB - priorityA;
  });

  return {
    emphasis,
    pitfallsByAttribute,
    prioritizedAttributes
  };
}

module.exports = { computeInternalGaps };
