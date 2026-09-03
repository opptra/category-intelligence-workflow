const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { buildCatalogGaps } = require('./catalog-gaps');
const { computeCorpusMetrics } = require('./metrics');
const { loadDatasetsFromInput } = require('./load');

function product(asin, extras = {}) {
  return {
    asin,
    title: 'Anti fatigue kitchen mat extra long',
    domain: 'www.amazon.in',
    category: 'Kitchen Rugs',
    price_text: '₹899',
    rating_label: '4.2 out of 5',
    review_count_text: '1,240 ratings',
    product_details: { Brand: 'Acme', Material: 'PVC' },
    feature_bullets: ['Non slip backing', 'Cushioned foam'],
    product_images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    aplus_images: [],
    aplus_text_blocks: [],
    ...extras
  };
}

function datasets(oursProducts) {
  return loadDatasetsFromInput({
    corpus_source: 'user_selected',
    top_sellers: {
      source: 'user-selected',
      category: 'Kitchen Rugs',
      domain: 'www.amazon.in',
      products: [product('B0AAAAAAA1'), product('B0AAAAAAA2')]
    },
    our_products: {
      source: 'our-products',
      category: 'Kitchen Rugs',
      domain: 'www.amazon.in',
      products: oursProducts
    }
  });
}

const categoryStandard = {
  spec_union: [{ key: 'Material', fill_rate: 1, typical_values: ['PVC'] }],
  keyword_map: { head: ['kitchen mat'], long_tail: [], vernacular: [], occasion: [] }
};

describe('buildCatalogGaps', () => {
  it('returns a not-applicable payload when no own listings exist', () => {
    const { competitors, ours } = datasets([]);
    const gaps = buildCatalogGaps({
      competitorMetrics: computeCorpusMetrics(competitors),
      ourMetrics: computeCorpusMetrics(ours),
      categoryStandard,
      ours,
      visualStandard: {
        ours_vs_leaders: {
          missing_vs_leader_required: ['hero', 'detail']
        }
      }
    });

    assert.equal(gaps.applicable, false);
    assert.equal(gaps.reason, 'no_own_listings');
    assert.deepEqual(gaps.metric_deltas, []);
    assert.deepEqual(gaps.missing_visual_roles, []);
    assert.equal(gaps.our_norms, null);
    assert.ok(gaps.leader_norms.image_count);
    assert.match(gaps.summary, /No own listings/);
  });

  it('still computes deltas when own listings exist', () => {
    const { competitors, ours } = datasets([product('B0OURS00001')]);
    const gaps = buildCatalogGaps({
      competitorMetrics: computeCorpusMetrics(competitors),
      ourMetrics: computeCorpusMetrics(ours),
      categoryStandard,
      ours,
      visualStandard: { ours_vs_leaders: { missing_vs_leader_required: [] } }
    });

    assert.equal(gaps.applicable, true);
    assert.ok(gaps.metric_deltas.length >= 1);
    assert.ok(gaps.our_norms);
  });
});
