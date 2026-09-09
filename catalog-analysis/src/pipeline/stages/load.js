const {
  requireNonEmptyString,
  requireNonEmptyArray,
  requireFields
} = require('../../utils/assert');
const {
  parsePriceText,
  parseRatingText,
  parseReviewCount,
  parseBestSellersRank,
  parseDimensions,
  parsePackCount
} = require('../../utils/parsers');
const { normalizeCorpusSource } = require('../../domain/corpus-wording');

function normalizeProduct(product, { isOurs }) {
  const price = parsePriceText(product.price_text)
    ?? product.list_price_inr
    ?? null;
  const rating = parseRatingText(product.rating_label)
    ?? product.list_rating
    ?? null;
  const reviewCount = parseReviewCount(product.review_count_text)
    ?? product.list_review_count
    ?? product.reviews?.total_fetched
    ?? null;
  const packCount = parsePackCount(product);
  const bsr = parseBestSellersRank(product.product_details?.['Best Sellers Rank']);
  const dimensions = parseDimensions(product);

  return {
    ...product,
    is_ours: isOurs,
    is_competitor: !isOurs,
    normalized: {
      price_inr: price,
      price_per_panel: price && packCount ? Math.round(price / packCount) : price,
      rating,
      review_count: reviewCount,
      pack_count: packCount,
      bsr_rank: bsr.rank,
      bsr_node: bsr.node,
      bsr_raw: bsr.raw,
      dimensions,
      spec_keys: Object.keys(product.product_details || {}),
      title_length: (product.title || '').length,
      title_mobile_75: (product.title || '').slice(0, 75),
      bullet_count: (product.feature_bullets || []).length,
      bullet_lengths: (product.feature_bullets || []).map((b) => b.length),
      description_present: Boolean(product.description),
      image_count: (product.product_images || []).length,
      aplus_image_count: (product.aplus_images || []).length,
      aplus_text_count: (product.aplus_text_blocks || []).length,
      aplus_text_chars: (product.aplus_text_blocks || []).join(' ').length,
      aplus_present: (product.aplus_images || []).length > 0 || (product.aplus_text_blocks || []).length > 0,
      category_node: product.product_details?.['Item Type Name'] || product.category || null
    }
  };
}

function parseDataset(raw, { isOurs, label, allowEmpty = false }) {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Invalid ${label} dataset: expected an object`);
  }
  if (!Array.isArray(raw.products)) {
    throw new Error(`${label} products must be an array`);
  }
  if (!allowEmpty) {
    requireNonEmptyArray(raw.products, `${label} products`);
  }
  return raw.products.map((p) => normalizeProduct(p, { isOurs }));
}

function loadDatasetsFromInput(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Analysis input is required: { our_products, top_sellers }');
  }

  requireFields(input, {
    values: ['our_products', 'top_sellers']
  }, 'analysis input');

  const { our_products, top_sellers } = input;
  requireNonEmptyString(top_sellers.category, 'top_sellers.category');

  const oursRaw = {
    ...our_products,
    products: Array.isArray(our_products.products) ? our_products.products : []
  };

  if (
    oursRaw.products.length > 0
    && oursRaw.category
    && oursRaw.category !== top_sellers.category
  ) {
    throw new Error(
      `Category mismatch: our_products.category (${oursRaw.category}) !== top_sellers.category (${top_sellers.category})`
    );
  }

  const competitors = parseDataset(top_sellers, { isOurs: false, label: 'top_sellers' });
  const ours = parseDataset(oursRaw, { isOurs: true, label: 'our_products', allowEmpty: true });

  const domain = top_sellers.domain || our_products.domain;
  requireNonEmptyString(domain, 'domain');

  return {
    meta: {
      category: top_sellers.category,
      domain,
      competitor_count: competitors.length,
      our_count: ours.length,
      corpus_source: normalizeCorpusSource(input.corpus_source, {
        topSellersSource: top_sellers.source
      })
    },
    competitors,
    ours,
    all: [...competitors, ...ours]
  };
}

module.exports = {
  loadDatasetsFromInput
};
