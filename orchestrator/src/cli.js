const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'catalog-analysis', '.env') });

const { runCatalogPipeline } = require('./run');

function parseArgs(argv) {
  const options = {
    categoryUrl: null,
    ourProductUrls: [],
    topN: 10,
    cookiesPath: null,
    headless: 'new',
    reviewsPerStar: 50,
    maxReviews: 250,
    concurrency: null,
    jobId: null
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--category-url' && argv[i + 1]) {
      options.categoryUrl = argv[++i];
    } else if (arg === '--url' && argv[i + 1]) {
      options.ourProductUrls.push(argv[++i]);
    } else if (arg === '--top-n' && argv[i + 1]) {
      options.topN = parseInt(argv[++i], 10);
    } else if (arg === '--cookies' && argv[i + 1]) {
      options.cookiesPath = path.resolve(argv[++i]);
    } else if (arg === '--reviews-per-star' && argv[i + 1]) {
      options.reviewsPerStar = parseInt(argv[++i], 10);
    } else if (arg === '--max-reviews' && argv[i + 1]) {
      options.maxReviews = parseInt(argv[++i], 10);
    } else if (arg === '--concurrency' && argv[i + 1]) {
      options.concurrency = parseInt(argv[++i], 10);
    } else if ((arg === '--job-id' || arg === '--job') && argv[i + 1]) {
      options.jobId = argv[++i];
    } else if (arg === '--headed') {
      options.headless = false;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage:
  node src/cli.js --category-url <bestsellers-url> --url <product-url> [--url ...] [options]
  node src/cli.js --job-id <existing-job-id>   # resume a failed/partial run

Required (new job):
  --category-url <url>   Amazon bestsellers category URL
  --url <url>            Our product URL (repeatable)

Resume:
  --job-id <id>          Resume from output/<job-id>/temp checkpoints
                         (category/urls optional if scrape already saved)

Optional:
  --top-n <n>            Number of top sellers to fetch (default: 10)
  --concurrency <n>      Parallel products per browser (default: 10; lower if Amazon blocks)
  --cookies <path>       Path to amazon cookies JSON
  --reviews-per-star <n> Reviews per star bucket (default: 50; lower = faster)
  --max-reviews <n>      Max reviews per product (default: 250; lower = faster)
  --headed               Run browser headed

Job layout:
  output/<job-id>/
    meta.json
    temp/                # stage checkpoints (survive failures)
    output/              # final scrape + analysis when complete
`);
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    printHelp();
    return;
  }

  if (!options.jobId) {
    if (!options.categoryUrl) {
      throw new Error('--category-url is required (or pass --job-id to resume)');
    }
    if (options.ourProductUrls.length === 0) {
      throw new Error('At least one --url is required (or pass --job-id to resume)');
    }
  }

  const { outputPath, scrapePath, report, jobId, jobDir } = await runCatalogPipeline(options);
  console.log('\nPipeline complete.');
  console.log(`Job:      ${jobId}`);
  console.log(`Job dir:  ${jobDir}`);
  console.log(`Category: ${report.meta.category}`);
  console.log(`Analysis: ${outputPath}`);
  console.log(`Scrape:   ${scrapePath}`);
}

main().catch((err) => {
  console.error('\nPipeline failed:', err.message);
  process.exitCode = 1;
});
