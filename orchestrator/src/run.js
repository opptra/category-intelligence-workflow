const fs = require('fs');
const path = require('path');
const { fetchCatalogData } = require('amazon-scrapper');
const { runAnalysis, slugifyCategory } = require('catalog-analysis');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(REPO_ROOT, 'output');

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

function writeJson(filePath, data, label) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Saved ${label}: ${filePath}`);
  return filePath;
}

function categoryFromScrape(scrapeResult) {
  return scrapeResult?.top_sellers?.category
    || scrapeResult?.our_products?.category
    || 'category';
}

function loadScrapeFile(scrapeFile) {
  const scrapePath = path.resolve(scrapeFile);
  if (!fs.existsSync(scrapePath)) {
    throw new Error(`Scrape file not found: ${scrapePath}`);
  }

  const scrapeResult = JSON.parse(fs.readFileSync(scrapePath, 'utf-8'));
  if (!scrapeResult?.our_products || !scrapeResult?.top_sellers) {
    throw new Error('--scrape-file must contain { our_products, top_sellers }');
  }

  return { scrapeResult, scrapePath };
}

async function scrapeCatalog({
  ourProductUrls,
  categoryUrl,
  topN,
  outputDir,
  cookiesPath,
  headless,
  reviewsPerStar,
  maxReviews,
  includeReviews,
  concurrency
}) {
  let slug = 'category';

  const scrapeResult = await fetchCatalogData({
    ourProductUrls,
    categoryUrl: categoryUrl.trim(),
    topN,
    cookiesPath,
    headless,
    reviewsPerStar,
    maxReviews,
    includeReviews,
    concurrency,
    onCheckpoint: async (step, payload) => {
      const category = payload.category || slug;
      slug = slugifyCategory(category) || slug;
      writeJson(path.join(outputDir, `${slug}-${step}.json`), payload, step);
    }
  });

  slug = slugifyCategory(categoryFromScrape(scrapeResult)) || slug;
  const scrapePath = writeJson(
    path.join(outputDir, `${slug}-scrape.json`),
    scrapeResult,
    'combined scrape'
  );

  return { scrapeResult, scrapePath, slug };
}

async function runCatalogPipeline({
  ourProductUrls,
  categoryUrl,
  scrapeFile,
  topN = 10,
  outputDir = OUTPUT_DIR,
  cookiesPath,
  headless,
  reviewsPerStar,
  maxReviews,
  includeReviews,
  concurrency
} = {}) {
  fs.mkdirSync(outputDir, { recursive: true });

  let scrapeResult;
  let scrapePath;
  let slug;

  if (scrapeFile) {
    console.log('='.repeat(60));
    console.log('ORCHESTRATOR — LOAD SAVED SCRAPE');
    console.log('='.repeat(60));
    ({ scrapeResult, scrapePath } = loadScrapeFile(scrapeFile));
    slug = slugifyCategory(categoryFromScrape(scrapeResult)) || 'category';
    console.log(`Loaded scrape: ${scrapePath}`);
  } else {
    if (!categoryUrl || typeof categoryUrl !== 'string' || !categoryUrl.trim()) {
      throw new Error('categoryUrl is required');
    }
    if (!Array.isArray(ourProductUrls) || ourProductUrls.length === 0) {
      throw new Error('ourProductUrls must be a non-empty array');
    }

    console.log('='.repeat(60));
    console.log('ORCHESTRATOR — SCRAPE');
    console.log('='.repeat(60));

    ({ scrapeResult, scrapePath, slug } = await scrapeCatalog({
      ourProductUrls,
      categoryUrl,
      topN: requirePositiveInt(topN, 'topN', 10),
      outputDir,
      cookiesPath,
      headless,
      reviewsPerStar,
      maxReviews,
      includeReviews,
      concurrency
    }));
  }

  console.log('\n' + '='.repeat(60));
  console.log('ORCHESTRATOR — ANALYZE');
  console.log('='.repeat(60));

  const { report } = await runAnalysis({ input: scrapeResult });
  slug = slugifyCategory(report.meta.category) || slug;
  const outputPath = writeJson(
    path.join(outputDir, `${slug}-analysis.json`),
    report,
    'analysis report'
  );

  return { report, outputPath, scrapePath, scrapeResult };
}

module.exports = { runCatalogPipeline };
