/**
 * Scrape full product details for items from a best-sellers JSON file.
 */

const fs = require('fs');
const path = require('path');
const { ProductDetailsScraper } = require('../src/scrapers/product-details');
const { BrowserSession } = require('../src/lib/browser-session');
const { ReviewsScraper } = require('../src/scrapers/reviews');
const { resolveCookiesPath } = require('../src/lib/resolve-cookies');

function parseArgs(argv) {
  const options = {
    input: null,
    output: null,
    cookiesPath: resolveCookiesPath(),
    limit: null,
    headless: 'new',
    includeReviews: true,
    reviewsPerStar: 50,
    maxReviews: 250,
    reviewsOnly: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--input' && argv[i + 1]) {
      options.input = path.resolve(argv[++i]);
    } else if (arg === '--output' && argv[i + 1]) {
      options.output = path.resolve(argv[++i]);
    } else if (arg === '--cookies' && argv[i + 1]) {
      options.cookiesPath = path.resolve(argv[++i]);
    } else if (arg === '--limit' && argv[i + 1]) {
      options.limit = parseInt(argv[++i], 10);
    } else if (arg === '--reviews-per-star' && argv[i + 1]) {
      options.reviewsPerStar = parseInt(argv[++i], 10);
    } else if (arg === '--max-reviews' && argv[i + 1]) {
      options.maxReviews = parseInt(argv[++i], 10);
    } else if (arg === '--no-reviews') {
      options.includeReviews = false;
    } else if (arg === '--reviews-only') {
      options.reviewsOnly = true;
      options.includeReviews = true;
    } else if (arg === '--headed') {
      options.headless = false;
    }
  }

  return options;
}

function loadInputItems(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  if (Array.isArray(raw)) {
    return raw;
  }

  if (Array.isArray(raw.items)) {
    return raw.items;
  }

  if (Array.isArray(raw.products)) {
    return raw.products;
  }

  throw new Error(`No items array found in ${inputPath}`);
}

async function enrichWithReviews(products, options) {
  const session = new BrowserSession({
    cookiesPath: options.cookiesPath,
    delayMs: 1500,
    headless: options.headless
  });
  const reviewsScraper = new ReviewsScraper({
    maxPerStar: options.reviewsPerStar,
    maxTotalReviews: options.maxReviews
  });

  try {
    await reviewsScraper.scrapeMany(session, products);
  } finally {
    await session.close();
  }

  return products;
}

async function main() {
  const options = parseArgs(process.argv);

  if (!options.output) {
    throw new Error('--output is required');
  }

  if (options.reviewsOnly) {
    if (!fs.existsSync(options.output)) {
      throw new Error(`Product details file not found: ${options.output}`);
    }

    const existing = JSON.parse(fs.readFileSync(options.output, 'utf-8'));
    const products = existing.products || [];
    const limit = options.limit ?? products.length;
    const targets = products.slice(0, limit);

    console.log(`Adding reviews to ${targets.length} products in ${options.output}\n`);
    console.log(`Limits: ${options.reviewsPerStar}/star, ${options.maxReviews} total max\n`);

    await enrichWithReviews(targets, options);

    existing.products = products;
    existing.review_limits = {
      per_star: options.reviewsPerStar,
      max_total: options.maxReviews,
      sort_by: 'recent'
    };
    fs.writeFileSync(options.output, JSON.stringify(existing, null, 2), 'utf-8');
    console.log(`\nUpdated ${options.output}`);
    return;
  }

  if (!options.input) {
    throw new Error('--input is required (unless using --reviews-only)');
  }

  const items = loadInputItems(options.input);
  const limit = options.limit ?? items.length;

  const scraper = new ProductDetailsScraper({
    cookiesPath: options.cookiesPath,
    headless: options.headless,
    includeReviews: options.includeReviews,
    maxPerStar: options.reviewsPerStar,
    maxTotalReviews: options.maxReviews
  });

  try {
    console.log(`Scraping product details for ${Math.min(limit, items.length)} items...\n`);
    console.log(`Input: ${options.input}`);
    console.log(`Cookies: ${options.cookiesPath}`);
    if (options.includeReviews) {
      console.log(`Reviews: ${options.reviewsPerStar}/star, ${options.maxReviews} total max`);
    }
    console.log('');

    const result = await scraper.scrape(items, {
      limit,
      includeReviews: options.includeReviews
    });

    const output = {
      source_file: options.input,
      review_limits: options.includeReviews
        ? {
            per_star: options.reviewsPerStar,
            max_total: options.maxReviews,
            sort_by: 'recent'
          }
        : null,
      ...result
    };

    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`\nSaved ${result.products.length} products to ${options.output}`);

    for (const product of result.products) {
      if (product.error) {
        console.log(`\n${product.asin}: FAILED - ${product.error}`);
        continue;
      }

      console.log(`\n#${product.rank ?? '?'} ${product.title}`);
      console.log(`   ASIN: ${product.asin}`);
      console.log(`   Gallery images: ${product.product_images.length}`);
      console.log(`   A+ images: ${product.aplus_images.length}`);
      console.log(`   Bullets: ${product.feature_bullets.length}`);
      console.log(`   Description: ${product.description ? 'yes' : 'no'}`);
      if (product.reviews) {
        console.log(`   Reviews: ${product.reviews.total_fetched} (${JSON.stringify(product.reviews.by_star)})`);
      }
    }
  } catch (error) {
    console.error('Scrape failed:', error.message);
    process.exitCode = 1;
  } finally {
    await scraper.close();
  }
}

main().catch((error) => {
  console.error('Scrape failed:', error.message);
  process.exitCode = 1;
});
