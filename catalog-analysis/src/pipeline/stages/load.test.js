const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadDatasetsFromInput } = require('./load');

function product(asin) {
  return {
    asin,
    title: 'Anti fatigue kitchen mat',
    domain: 'www.amazon.in',
    category: 'Kitchen Rugs',
    product_details: { Brand: 'Acme' },
    feature_bullets: ['Non slip'],
    product_images: ['https://example.com/1.jpg'],
    aplus_images: [],
    aplus_text_blocks: []
  };
}

function envelope(products, source) {
  return {
    source,
    category: 'Kitchen Rugs',
    domain: 'www.amazon.in',
    products
  };
}

describe('loadDatasetsFromInput', () => {
  it('allows an empty our_products list and stamps user_selected', () => {
    const datasets = loadDatasetsFromInput({
      corpus_source: 'user_selected',
      top_sellers: envelope([product('B0AAAAAAA1'), product('B0AAAAAAA2')], 'user-selected'),
      our_products: envelope([], 'our-products')
    });

    assert.equal(datasets.ours.length, 0);
    assert.equal(datasets.competitors.length, 2);
    assert.equal(datasets.meta.our_count, 0);
    assert.equal(datasets.meta.corpus_source, 'user_selected');
    assert.equal(datasets.meta.category, 'Kitchen Rugs');
  });

  it('infers user_selected from top_sellers.source when corpus_source is omitted', () => {
    const datasets = loadDatasetsFromInput({
      top_sellers: envelope([product('B0AAAAAAA1')], 'user-selected'),
      our_products: { source: 'our-products', category: 'Kitchen Rugs', domain: 'www.amazon.in' }
    });
    assert.equal(datasets.meta.corpus_source, 'user_selected');
    assert.equal(datasets.ours.length, 0);
  });

  it('still requires a non-empty competitive set', () => {
    assert.throws(
      () => loadDatasetsFromInput({
        corpus_source: 'user_selected',
        top_sellers: envelope([], 'user-selected'),
        our_products: envelope([], 'our-products')
      }),
      /top_sellers products/
    );
  });

  it('keeps bestsellers labeling for the existing envelope source', () => {
    const datasets = loadDatasetsFromInput({
      top_sellers: envelope([product('B0AAAAAAA1')], 'best-sellers'),
      our_products: envelope([product('B0OURS00001')], 'our-products')
    });
    assert.equal(datasets.meta.corpus_source, 'bestsellers');
    assert.equal(datasets.meta.our_count, 1);
  });
});
