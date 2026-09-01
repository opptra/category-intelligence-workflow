const { BestSellersScraper } = require('./scrapers/best-sellers');
const { scrapeProductDetailsAndReviews } = require('./lib/scrape-pipeline');
const { urlsToItems } = require('./lib/product-input');
const { resolveCookiesPath } = require('./lib/resolve-cookies');
const { categoryFromBreadcrumbs } = require('./lib/amazon-utils');
const { CONCURRENCY } = require('./lib/constants');

const PENDING_CATEGORY = '__pending_category__';

function requirePositiveInt(value, label, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return n;
}

function stampCategory(envelope, category) {
  if (!envelope || typeof envelope !== 'object') return envelope;
  const products = Array.isArray(envelope.products)
    ? envelope.products.map((p) => (p && !p.error ? { ...p, category } : p))
    : envelope.products;
  return { ...envelope, category, products };
}

/**
 * Resolve a human category name.
 * Priority: bestsellers page → our PDP breadcrumbs → top-seller PDP breadcrumbs.
 */
function resolveCatalogCategory({ bestsellersName, ourProducts, topSellers }) {
  if (bestsellersName && typeof bestsellersName === 'string' && bestsellersName.trim()
    && bestsellersName !== PENDING_CATEGORY) {
    return { category: bestsellersName.trim(), source: 'bestsellers_page' };
  }

  const fromOurs = categoryFromBreadcrumbs(ourProducts?.products || []);
  if (fromOurs) {
    return { category: fromOurs, source: 'our_product_breadcrumbs' };
  }

  const fromTops = categoryFromBreadcrumbs(topSellers?.products || []);
  if (fromTops) {
    return { category: fromTops, source: 'top_seller_breadcrumbs' };
  }

  return { category: null, source: null };
}

/**
 * Fetch our products + top-N category sellers as in-memory envelopes.
 * Optional onCheckpoint(step, payload) lets the caller persist each major scrape step.
 */
async function fetchCatalogData({
  ourProductUrls,
  categoryUrl,
  topN = 10,
  cookiesPath,
  headless = 'new',
  reviewsPerStar = 50,
  maxReviews = 250,
  includeReviews = true,
  concurrency,
  onCheckpoint
} = {}) {
  if (!categoryUrl || typeof categoryUrl !== 'string' || !categoryUrl.trim()) {
    throw new Error('categoryUrl is required');
  }
  if (!Array.isArray(ourProductUrls) || ourProductUrls.length === 0) {
    throw new Error('ourProductUrls must be a non-empty array');
  }

  const limit = requirePositiveInt(topN, 'topN', 10);
  const resolvedConcurrency = requirePositiveInt(concurrency, 'concurrency', CONCURRENCY);
  const resolvedCookies = cookiesPath || resolveCookiesPath();

  const bestSellersScraper = new BestSellersScraper({
    categoryUrl: categoryUrl.trim(),
    cookiesPath: resolvedCookies,
    limit,
    headless
  });

  let bestSellers;
  try {
    console.log('='.repeat(60));
    console.log('FETCH CATALOG DATA — BEST SELLERS');
    console.log('='.repeat(60));
    console.log(`Category URL: ${categoryUrl}`);
    console.log(`Top N: ${limit}`);
    console.log(`Concurrency: ${resolvedConcurrency}\n`);

    bestSellers = await bestSellersScraper.scrape({ limit });
    if (typeof onCheckpoint === 'function') {
      await onCheckpoint('best-sellers', bestSellers);
    }
  } finally {
    await bestSellersScraper.close();
  }

  // Category may still be unknown (numeric bestsellers nodes often have no slug).
  // Product PDP breadcrumbs are the reliable source — stamp after scrape.
  const provisionalCategory = (bestSellers.category && String(bestSellers.category).trim())
    || PENDING_CATEGORY;

  const ourItems = urlsToItems(ourProductUrls, provisionalCategory);
  if (ourItems.length === 0) {
    throw new Error('No valid product URLs found in ourProductUrls');
  }

  const sharedOpts = {
    cookiesPath: resolvedCookies,
    headless,
    reviewsPerStar,
    maxReviews,
    includeReviews,
    concurrency: resolvedConcurrency,
    category: provisionalCategory
  };

  console.log('\n' + '='.repeat(60));
  console.log('FETCH CATALOG DATA — TOP SELLERS + OUR PRODUCTS (PARALLEL)');
  console.log('='.repeat(60));

  const [top_sellers, our_products] = await Promise.all([
    scrapeProductDetailsAndReviews(bestSellers.items, {
      ...sharedOpts,
      source: 'best-sellers',
      stepLabel: 'TOP SELLERS — PRODUCT DETAILS + REVIEWS'
    }).then(async (payload) => {
      if (typeof onCheckpoint === 'function') {
        await onCheckpoint('top-sellers', payload);
      }
      return payload;
    }),
    scrapeProductDetailsAndReviews(ourItems, {
      ...sharedOpts,
      source: 'our-products',
      stepLabel: 'OUR PRODUCTS — PRODUCT DETAILS + REVIEWS'
    }).then(async (payload) => {
      if (typeof onCheckpoint === 'function') {
        await onCheckpoint('our-products', payload);
      }
      return payload;
    })
  ]);

  const resolved = resolveCatalogCategory({
    bestsellersName: bestSellers.category,
    ourProducts: our_products,
    topSellers: top_sellers
  });

  if (!resolved.category) {
    const sampleCrumbs = [...(our_products.products || []), ...(top_sellers.products || [])]
      .filter((p) => p && !p.error && Array.isArray(p.breadcrumbs) && p.breadcrumbs.length)
      .slice(0, 3)
      .map((p) => `${p.asin}: ${JSON.stringify(p.breadcrumbs)}`);
    throw new Error(
      'Could not resolve category name from bestsellers page or product breadcrumbs'
      + ` (bestsellers_url=${categoryUrl}`
      + `; sample_breadcrumbs=${sampleCrumbs.length ? sampleCrumbs.join(' | ') : 'none'})`
    );
  }

  console.log(`\nCategory resolved from ${resolved.source}: ${resolved.category}`);

  return {
    our_products: stampCategory(our_products, resolved.category),
    top_sellers: stampCategory(top_sellers, resolved.category)
  };
}

module.exports = { fetchCatalogData, categoryFromBreadcrumbs, resolveCatalogCategory };
