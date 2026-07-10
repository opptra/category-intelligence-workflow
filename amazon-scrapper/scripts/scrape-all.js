/**
 * Full pipeline: best sellers → product details → reviews (optional file output).
 */

const fs = require('fs');
const path = require('path');
const { BestSellersScraper } = require('../src/scrapers/best-sellers');
const { resolveCookiesPath } = require('../src/lib/resolve-cookies');
const { scrapeProductDetailsAndReviews, printSummary } = require('../src/lib/scrape-pipeline');
const { outputPath, FILE_NAMES } = require('../src/lib/paths');
const { slugify } = require('../src/lib/slugify');

function parseArgs(argv) {
  const options = {
    categoryUrl: null,
    limit: 10,
    bestSellersOutput: null,
    output: null,
    cookiesPath: resolveCookiesPath(),
    headless: 'new',
    reviewsPerStar: 50,
    maxReviews: 250
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--category-url' && argv[i + 1]) {
      options.categoryUrl = argv[++i];
    } else if (arg === '--limit' && argv[i + 1]) {
      options.limit = parseInt(argv[++i], 10);
    } else if (arg === '--best-sellers-output' && argv[i + 1]) {
      options.bestSellersOutput = path.resolve(argv[++i]);
    } else if (arg === '--output' && argv[i + 1]) {
      options.output = path.resolve(argv[++i]);
    } else if (arg === '--cookies' && argv[i + 1]) {
      options.cookiesPath = path.resolve(argv[++i]);
    } else if (arg === '--reviews-per-star' && argv[i + 1]) {
      options.reviewsPerStar = parseInt(argv[++i], 10);
    } else if (arg === '--max-reviews' && argv[i + 1]) {
      options.maxReviews = parseInt(argv[++i], 10);
    } else if (arg === '--headed') {
      options.headless = false;
    }
  }

  return options;
}

async function scrapeBestSellers(options) {
  const scraper = new BestSellersScraper({
    categoryUrl: options.categoryUrl,
    cookiesPath: options.cookiesPath,
    limit: options.limit,
    headless: options.headless
  });

  try {
    console.log('='.repeat(60));
    console.log('STEP 1/2: BEST SELLERS');
    console.log('='.repeat(60));
    console.log(`Scraping top ${options.limit} best sellers...\n`);

    const result = await scraper.scrape({ limit: options.limit });

    if (options.bestSellersOutput) {
      fs.mkdirSync(path.dirname(options.bestSellersOutput), { recursive: true });
      fs.writeFileSync(options.bestSellersOutput, JSON.stringify(result, null, 2), 'utf-8');
      console.log(`\nSaved ${result.items.length} items to ${options.bestSellersOutput}`);
    } else {
      console.log(`\nScraped ${result.items.length} best sellers (not written to disk)`);
    }

    for (const item of result.items) {
      console.log(`  #${item.rank} ${item.asin} — ${item.title?.slice(0, 60)}...`);
    }

    return result;
  } finally {
    await scraper.close();
  }
}

async function main() {
  const options = parseArgs(process.argv);
  if (!options.categoryUrl) {
    throw new Error('--category-url is required');
  }

  const startedAt = Date.now();

  console.log('Amazon Best Sellers Pipeline\n');
  console.log(`Category URL: ${options.categoryUrl}`);
  console.log(`Limit: ${options.limit} products`);
  console.log(`Cookies: ${options.cookiesPath}\n`);

  const bestSellers = await scrapeBestSellers(options);

  if (!options.output) {
    const slug = slugify(bestSellers.category);
    options.output = outputPath(FILE_NAMES.productDetails(slug));
  }

  const finalOutput = await scrapeProductDetailsAndReviews(bestSellers.items, {
    cookiesPath: options.cookiesPath,
    headless: options.headless,
    reviewsPerStar: options.reviewsPerStar,
    maxReviews: options.maxReviews,
    source: 'best-sellers',
    sourceFile: options.bestSellersOutput,
    category: bestSellers.category,
    stepLabel: 'STEP 2/2: PRODUCT DETAILS + REVIEWS'
  });

  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, JSON.stringify(finalOutput, null, 2), 'utf-8');
  console.log(`\nSaved product details to ${options.output}`);

  printSummary({
    title: 'Best sellers pipeline complete',
    listFile: options.bestSellersOutput,
    outputFile: options.output,
    finalOutput,
    elapsed: Math.round((Date.now() - startedAt) / 1000)
  });
}

main().catch((error) => {
  console.error('\nPipeline failed:', error.message);
  process.exitCode = 1;
});
