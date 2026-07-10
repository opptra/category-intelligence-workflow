/**
 * Scrape top best-selling products for a category from Amazon.
 */

const fs = require('fs');
const path = require('path');
const { BestSellersScraper } = require('../src/scrapers/best-sellers');
const { resolveCookiesPath } = require('../src/lib/resolve-cookies');
const { outputPath, FILE_NAMES } = require('../src/lib/paths');
const { slugify } = require('../src/lib/slugify');

function parseArgs(argv) {
  const options = {
    categoryUrl: null,
    limit: 10,
    output: null,
    cookiesPath: resolveCookiesPath(),
    headless: 'new'
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--category-url' && argv[i + 1]) {
      options.categoryUrl = argv[++i];
    } else if (arg === '--limit' && argv[i + 1]) {
      options.limit = parseInt(argv[++i], 10);
    } else if (arg === '--output' && argv[i + 1]) {
      options.output = path.resolve(argv[++i]);
    } else if (arg === '--cookies' && argv[i + 1]) {
      options.cookiesPath = path.resolve(argv[++i]);
    } else if (arg === '--headed') {
      options.headless = false;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv);
  if (!options.categoryUrl) {
    throw new Error('--category-url is required');
  }

  const scraper = new BestSellersScraper({
    categoryUrl: options.categoryUrl,
    cookiesPath: options.cookiesPath,
    limit: options.limit,
    headless: options.headless
  });

  try {
    console.log(`Scraping top ${options.limit} best sellers...\n`);
    console.log(`Category URL: ${options.categoryUrl}\n`);

    const result = await scraper.scrape({ limit: options.limit });

    const output = options.output || outputPath(FILE_NAMES.bestSellers(slugify(result.category)));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`\nSaved ${result.items.length} items to ${output}\n`);
    console.log('='.repeat(60));
    console.log(`TOP BEST SELLERS — ${result.category}`);
    console.log('='.repeat(60));

    for (const item of result.items) {
      console.log(`\n#${item.rank} ${item.title}`);
      console.log(`   ASIN: ${item.asin}`);
      console.log(`   Price: ${item.price_inr != null ? `₹${item.price_inr}` : 'N/A'}`);
      console.log(`   Rating: ${item.rating ?? 'N/A'} (${item.review_count ?? 0} reviews)`);
      console.log(`   URL: ${item.url}`);
    }
  } catch (error) {
    console.error('Scrape failed:', error.message);
    process.exitCode = 1;
  } finally {
    await scraper.close();
  }
}

main();
