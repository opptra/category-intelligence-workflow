/**
 * Scrape top best-selling Curtains & Drapes from Amazon India.
 *
 * Usage:
 *   node scrape-best-sellers.js
 *   node scrape-best-sellers.js --limit 10 --output output/best-sellers.json
 */

const fs = require('fs');
const path = require('path');
const { BestSellersScraper } = require('./scrapers/best-sellers');
const { resolveCookiesPath } = require('./lib/resolve-cookies');

function parseArgs(argv) {
  const options = {
    limit: 10,
    output: path.join(__dirname, 'output', 'curtains-drapes-best-sellers.json'),
    cookiesPath: resolveCookiesPath(),
    headless: 'new'
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--limit' && argv[i + 1]) {
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
  const scraper = new BestSellersScraper({
    cookiesPath: options.cookiesPath,
    limit: options.limit,
    headless: options.headless
  });

  try {
    console.log(`Scraping top ${options.limit} best sellers for Curtains & Drapes...\n`);

    const result = await scraper.scrape({ limit: options.limit });

    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, JSON.stringify(result, null, 2), 'utf-8');

    console.log(`\nSaved ${result.items.length} items to ${options.output}\n`);
    console.log('='.repeat(60));
    console.log('TOP BEST SELLERS');
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
