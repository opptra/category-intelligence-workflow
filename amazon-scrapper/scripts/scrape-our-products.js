/**
 * Scrape your own products (from a URL list) with the same output as best sellers.
 */

const fs = require('fs');
const path = require('path');
const { resolveCookiesPath } = require('../src/lib/resolve-cookies');
const { loadProductsFromFile, buildProductListPayload } = require('../src/lib/product-input');
const { scrapeProductDetailsAndReviews, printSummary } = require('../src/lib/scrape-pipeline');
const { outputPath, configPath, FILE_NAMES } = require('../src/lib/paths');

function parseArgs(argv) {
  const options = {
    input: configPath(FILE_NAMES.OUR_PRODUCTS_INPUT),
    listOutput: outputPath(FILE_NAMES.OUR_PRODUCTS_LIST),
    output: outputPath(FILE_NAMES.OUR_PRODUCTS_DETAILS),
    cookiesPath: resolveCookiesPath(),
    headless: 'new',
    reviewsPerStar: 50,
    maxReviews: 250,
    urls: []
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--input' && argv[i + 1]) {
      options.input = path.resolve(argv[++i]);
    } else if (arg === '--list-output' && argv[i + 1]) {
      options.listOutput = path.resolve(argv[++i]);
    } else if (arg === '--output' && argv[i + 1]) {
      options.output = path.resolve(argv[++i]);
    } else if (arg === '--cookies' && argv[i + 1]) {
      options.cookiesPath = path.resolve(argv[++i]);
    } else if (arg === '--url' && argv[i + 1]) {
      options.urls.push(argv[++i]);
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

function loadProductItems(options) {
  if (options.urls.length > 0) {
    const { urlsToItems, DEFAULT_CATEGORY } = require('../src/lib/product-input');
    const items = urlsToItems(options.urls, DEFAULT_CATEGORY);
    return {
      category: DEFAULT_CATEGORY,
      source: 'our-products',
      items,
      skipped: options.urls.length - items.length
    };
  }

  return loadProductsFromFile(options.input);
}

async function main() {
  const options = parseArgs(process.argv);
  const startedAt = Date.now();

  console.log('Amazon — Our Products Scrape Pipeline\n');
  console.log(`Input: ${options.urls.length ? `${options.urls.length} CLI URLs` : options.input}`);
  console.log(`Cookies: ${options.cookiesPath}\n`);

  const loaded = loadProductItems(options);

  if (loaded.items.length === 0) {
    throw new Error(
      'No valid product URLs found. Add links to config/our-products.json or pass --url flags.'
    );
  }

  if (loaded.skipped > 0) {
    console.warn(`Skipped ${loaded.skipped} invalid URL(s)\n`);
  }

  console.log('='.repeat(60));
  console.log('STEP 1/2: PRODUCT LIST');
  console.log('='.repeat(60));
  console.log(`Loaded ${loaded.items.length} products (${loaded.category})\n`);

  const listPayload = buildProductListPayload(loaded, loaded.items);
  fs.mkdirSync(path.dirname(options.listOutput), { recursive: true });
  fs.writeFileSync(options.listOutput, JSON.stringify(listPayload, null, 2), 'utf-8');
  console.log(`Saved product list to ${options.listOutput}\n`);

  for (const item of loaded.items) {
    const label = item.label ? ` — ${item.label}` : '';
    console.log(`  #${item.rank} ${item.asin}${label}`);
    console.log(`     ${item.url}`);
  }

  const finalOutput = await scrapeProductDetailsAndReviews(loaded.items, {
    cookiesPath: options.cookiesPath,
    headless: options.headless,
    reviewsPerStar: options.reviewsPerStar,
    maxReviews: options.maxReviews,
    source: loaded.source,
    sourceFile: options.urls.length ? null : options.input,
    category: loaded.category,
    output: options.output,
    stepLabel: 'STEP 2/2: PRODUCT DETAILS + REVIEWS'
  });

  printSummary({
    title: 'Our products pipeline complete',
    listFile: options.listOutput,
    outputFile: options.output,
    finalOutput,
    elapsed: Math.round((Date.now() - startedAt) / 1000)
  });
}

main().catch((error) => {
  console.error('\nPipeline failed:', error.message);
  process.exitCode = 1;
});
