const { extractASIN, extractDomain } = require('./amazon-utils');

function normalizeProductUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  const asin = extractASIN(trimmed);
  if (!asin) {
    return null;
  }

  const domain = extractDomain(trimmed);
  const cleanUrl = `https://${domain}/dp/${asin}`;

  return { url: cleanUrl, asin, domain };
}

function entryToItem(entry, index, category, source = 'our-products') {
  if (!category || typeof category !== 'string' || !category.trim()) {
    throw new Error('category is required when building product list items');
  }

  const url = typeof entry === 'string'
    ? entry
    : (entry?.url || entry?.link || entry?.product_url);
  const normalized = normalizeProductUrl(url);

  if (!normalized) {
    return null;
  }

  return {
    rank: index + 1,
    asin: normalized.asin,
    url: normalized.url,
    domain: normalized.domain,
    category: (typeof entry === 'object' && entry.category) || category,
    label: typeof entry === 'object' && entry.label ? entry.label : null,
    source
  };
}

function urlsToItems(urls, category, source = 'our-products') {
  if (!category || typeof category !== 'string' || !category.trim()) {
    throw new Error('category is required for urlsToItems');
  }

  const items = [];

  for (let index = 0; index < urls.length; index++) {
    const item = entryToItem(urls[index], index, category, source);
    if (item) {
      items.push(item);
    }
  }

  return items;
}

function emptyProductsEnvelope({ source = 'our-products', category, domain }) {
  if (!category || typeof category !== 'string' || !category.trim()) {
    throw new Error('category is required for empty products envelope');
  }

  return {
    source,
    category,
    domain: domain || 'www.amazon.in',
    products: []
  };
}

function loadProductsFromFile(filePath) {
  const fs = require('fs');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Product list file not found: ${filePath}`);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const category = raw.category;
  if (!category || typeof category !== 'string' || !category.trim()) {
    throw new Error(`category is required in product list file: ${filePath}`);
  }

  let entries = [];
  if (Array.isArray(raw)) {
    entries = raw;
  } else if (Array.isArray(raw.products)) {
    entries = raw.products;
  } else if (Array.isArray(raw.urls)) {
    entries = raw.urls;
  } else if (Array.isArray(raw.items)) {
    entries = raw.items;
  } else {
    throw new Error(`No products, urls, or items array found in ${filePath}`);
  }

  const items = urlsToItems(entries, category);
  const skipped = entries.length - items.length;

  return {
    category,
    source: raw.source || 'our-products',
    items,
    skipped
  };
}

function buildProductListPayload(meta, items) {
  if (!meta.category || typeof meta.category !== 'string' || !meta.category.trim()) {
    throw new Error('category is required when building product list payload');
  }

  return {
    source: meta.source || 'our-products',
    category: meta.category,
    domain: items[0]?.domain || 'www.amazon.in',
    total_found: items.length,
    items: items.map((item) => ({
      ...item,
      scraped_at: new Date().toISOString()
    }))
  };
}

module.exports = {
  urlsToItems,
  loadProductsFromFile,
  buildProductListPayload,
  emptyProductsEnvelope,
  normalizeProductUrl
};
