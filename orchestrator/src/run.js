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

async function runCatalogPipeline({
  ourProductUrls,
  categoryUrl,
  topN = 10,
  outputDir = OUTPUT_DIR,
  cookiesPath,
  headless,
  reviewsPerStar,
  maxReviews,
  includeReviews
} = {}) {
  if (!categoryUrl || typeof categoryUrl !== 'string' || !categoryUrl.trim()) {
    throw new Error('categoryUrl is required');
  }
  if (!Array.isArray(ourProductUrls) || ourProductUrls.length === 0) {
    throw new Error('ourProductUrls must be a non-empty array');
  }

  const resolvedTopN = requirePositiveInt(topN, 'topN', 10);

  console.log('='.repeat(60));
  console.log('ORCHESTRATOR — SCRAPE');
  console.log('='.repeat(60));

  const scrapeResult = await fetchCatalogData({
    ourProductUrls,
    categoryUrl: categoryUrl.trim(),
    topN: resolvedTopN,
    cookiesPath,
    headless,
    reviewsPerStar,
    maxReviews,
    includeReviews
  });

  console.log('\n' + '='.repeat(60));
  console.log('ORCHESTRATOR — ANALYZE');
  console.log('='.repeat(60));

  const { report } = await runAnalysis({ input: scrapeResult });

  const slug = slugifyCategory(report.meta.category);
  const outputPath = path.join(outputDir, `${slug}-analysis.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log(`\nWrote analysis report to ${outputPath}`);

  return { report, outputPath, scrapeResult };
}

module.exports = { runCatalogPipeline };
