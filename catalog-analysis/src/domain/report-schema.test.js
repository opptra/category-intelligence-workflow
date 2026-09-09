const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validateReport, SCHEMA_VERSION, REQUIRED_TOPIC_NAMES } = require('./report-schema');

function slot() {
  return {
    role: 'hero',
    kind: 'photo',
    pattern: 'product on white',
    content: 'product-forward opening shot',
    priority: 'core',
    order: 1,
    max_callouts: 0,
    feature_priority: []
  };
}

function imageTrack() {
  return {
    observed: { image_count: { min: 6, median: 8, max: 12 } },
    build_rationale: 'median of the competitive set',
    recommended_build: 1,
    slots: [slot()]
  };
}

function baseReport(overrides = {}) {
  const topics = REQUIRED_TOPIC_NAMES.map((name) => ({
    name,
    observations: `Observed pattern for ${name}.`,
    actions: [`Apply ${name} guidance from the competitive set.`]
  }));

  return {
    meta: {
      schema_version: SCHEMA_VERSION,
      category: 'Kitchen Rugs',
      marketplace: 'www.amazon.in',
      generated_at: '2026-09-02T00:00:00.000Z',
      competitor_count: 8,
      our_count: 0,
      corpus_source: 'user_selected',
      model: 'test'
    },
    summary: 'This user-selected competitive set wins on cushioning claims and size callouts.',
    category_lexicon: {
      observations: 'Listings lean on anti-fatigue and non-slip vocabulary.',
      terms: [{ term: 'anti fatigue', relevance: 'high' }]
    },
    voice_of_customer: {
      observations: 'Buyers praise cushioning and complain about colour fade.',
      signals: [{ phrase: 'fades after wash', sentiment: 'complaint', relevance: 'high', mention_count: 4 }]
    },
    catalog_gaps: {
      applicable: false,
      reason: 'no_own_listings',
      summary: 'No own listings were provided; gaps vs a baseline were not computed.',
      metric_deltas: [],
      missing_visual_roles: [],
      missing_spec_keys: [],
      missing_lexicon_terms: [],
      our_norms: null,
      leader_norms: { image_count: { min: 6, median: 8, max: 12 } }
    },
    backend_keywords: {
      marketplace_limit_bytes: 200,
      used_bytes: 12,
      terms: ['kitchen mat'],
      excluded_because_already_in_copy: []
    },
    image_plan: {
      gallery: imageTrack(),
      aplus: imageTrack()
    },
    topics,
    ...overrides
  };
}

describe('validateReport schema 2.5', () => {
  it('accepts our_count 0 with corpus_source and not-applicable gaps', () => {
    const report = validateReport(baseReport());
    assert.equal(report.meta.schema_version, '2.5');
    assert.equal(report.meta.our_count, 0);
    assert.equal(report.catalog_gaps.applicable, false);
  });

  it('rejects our_count 0 when corpus_source is missing', () => {
    const report = baseReport();
    delete report.meta.corpus_source;
    assert.throws(() => validateReport(report), /corpus_source/);
  });

  it('rejects our_count 0 when catalog_gaps.applicable is missing', () => {
    const report = baseReport();
    delete report.catalog_gaps.applicable;
    assert.throws(() => validateReport(report), /applicable/);
  });

  it('rejects empty metric_deltas when gaps are applicable', () => {
    const report = baseReport({
      meta: {
        ...baseReport().meta,
        our_count: 1
      },
      catalog_gaps: {
        applicable: true,
        reason: null,
        summary: 'Gaps vs our listing.',
        metric_deltas: [],
        missing_visual_roles: [],
        missing_spec_keys: [],
        missing_lexicon_terms: [],
        our_norms: { image_count: { min: 4, median: 4, max: 4 } },
        leader_norms: { image_count: { min: 6, median: 8, max: 12 } }
      }
    });
    assert.throws(() => validateReport(report), /metric_deltas must be a non-empty array when applicable/);
  });
});
