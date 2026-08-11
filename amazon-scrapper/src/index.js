const { BestSellersScraper } = require('./scrapers/best-sellers');
const { scrapeProductDetailsAndReviews } = require('./lib/scrape-pipeline');
const { urlsToItems } = require('./lib/product-input');
const { resolveCookiesPath } = require('./lib/resolve-cookies');
const { CONCURRENCY } = require('./lib/constants');

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

/**
 * Fetch our products + top-N category sellers as in-memory envelopes.
 * Does not write intermediate JSON files.
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
  concurrency
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
  } finally {
    await bestSellersScraper.close();
  }

  const ourItems = urlsToItems(ourProductUrls, bestSellers.category);
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
    category: bestSellers.category
  };

  console.log('\n' + '='.repeat(60));
  console.log('FETCH CATALOG DATA — TOP SELLERS + OUR PRODUCTS (PARALLEL)');
  console.log('='.repeat(60));

  const [top_sellers, our_products] = await Promise.all([
    scrapeProductDetailsAndReviews(bestSellers.items, {
      ...sharedOpts,
      source: 'best-sellers',
      stepLabel: 'TOP SELLERS — PRODUCT DETAILS + REVIEWS'
    }),
    scrapeProductDetailsAndReviews(ourItems, {
      ...sharedOpts,
      source: 'our-products',
      stepLabel: 'OUR PRODUCTS — PRODUCT DETAILS + REVIEWS'
    })
  ]);

  return { our_products, top_sellers };
}

module.exports = { fetchCatalogData };
