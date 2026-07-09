const fs = require('fs');
const {
  parsePriceText,
  parseRatingText,
  parseReviewCount,
  parseBestSellersRank,
  parseDimensions,
  parsePackCount
} = require('../../utils/parsers');

function readJson(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!Array.isArray(raw.products)) {
    throw new Error(`No products array in ${filePath}`);
  }
  return raw;
}

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

function loadDatasets(config) {
  const competitorRaw = readJson(config.competitors);
  const oursRaw = readJson(config.ours);

  const competitors = competitorRaw.products.map((p) => normalizeProduct(p, { isOurs: false }));
  const ours = oursRaw.products.map((p) => normalizeProduct(p, { isOurs: true }));

  const category = oursRaw.category
    || competitorRaw.products[0]?.category
    || 'Unknown Category';
  const domain = oursRaw.domain || competitorRaw.domain || 'www.amazon.in';

  return {
    meta: {
      category,
      domain,
      competitor_count: competitors.length,
      our_count: ours.length
    },
    competitors,
    ours,
    all: [...competitors, ...ours]
  };
}

module.exports = {
  loadDatasets,
  normalizeProduct
};
