const path = require('path');
const { fetchCatalogData } = require('amazon-scrapper');
const { runAnalysis, slugifyCategory } = require('catalog-analysis');
const {
  createOrLoadJob,
  hasStage,
  saveStage,
  loadStage,
  failJob,
  completeJob,
  updateJobMeta,
  writeJson
} = require('./job-store');

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
  includeReviews,
  concurrency,
  jobId = null
} = {}) {
  const { jobId: resolvedJobId, paths, meta, isResume } = createOrLoadJob({
    outputRoot: outputDir,
    jobId,
    seed: {
      category_url: categoryUrl || null,
      our_product_urls: ourProductUrls || [],
      top_n: topN
    }
  });

  console.log('='.repeat(60));
  console.log(`ORCHESTRATOR — JOB ${resolvedJobId}${isResume ? ' (resume)' : ' (new)'}`);
  console.log(`Temp:    ${paths.tempDir}`);
  console.log(`Output:  ${paths.outputDir}`);
  console.log('='.repeat(60));

  const resolvedCategoryUrl = categoryUrl || meta.category_url;
  const resolvedOurUrls = (ourProductUrls && ourProductUrls.length)
    ? ourProductUrls
    : (meta.our_product_urls || []);
  const resolvedTopN = requirePositiveInt(topN || meta.top_n, 'topN', 10);

  if (!resolvedCategoryUrl || typeof resolvedCategoryUrl !== 'string' || !resolvedCategoryUrl.trim()) {
    throw new Error('categoryUrl is required (or resume a job that already has scrape data)');
  }

  let scrapeResult;
  let currentStage = 'scrape';

  try {
    if (hasStage(paths, 'scrape')) {
      console.log('\n[scrape] Resuming from checkpoint');
      scrapeResult = loadStage(paths, 'scrape');
    } else {
      if (!Array.isArray(resolvedOurUrls) || resolvedOurUrls.length === 0) {
        throw new Error('ourProductUrls must be a non-empty array');
      }

      console.log('\n' + '='.repeat(60));
      console.log('ORCHESTRATOR — SCRAPE');
      console.log('='.repeat(60));

      scrapeResult = await fetchCatalogData({
        ourProductUrls: resolvedOurUrls,
        categoryUrl: resolvedCategoryUrl.trim(),
        topN: resolvedTopN,
        cookiesPath,
        headless,
        reviewsPerStar,
        maxReviews,
        includeReviews,
        concurrency
      });
      saveStage(paths, 'scrape', scrapeResult);
      updateJobMeta(paths, {
        category_url: resolvedCategoryUrl.trim(),
        our_product_urls: resolvedOurUrls,
        top_n: resolvedTopN
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('ORCHESTRATOR — ANALYZE');
    console.log('='.repeat(60));

    currentStage = 'analyze';
    const { report } = await runAnalysis({
      input: scrapeResult,
      checkpointDir: paths.tempDir
    });

    const slug = slugifyCategory(report.meta.category);
    const analysisPath = path.join(paths.outputDir, `${slug}-analysis.json`);
    const scrapePath = path.join(paths.outputDir, `${slug}-scrape.json`);
    writeJson(analysisPath, report);
    writeJson(scrapePath, scrapeResult);
    completeJob(paths, { slug, scrapePath, analysisPath });

    // Also keep convenience copies at the job root for quick access.
    writeJson(path.join(paths.root, `${slug}-analysis.json`), report);
    writeJson(path.join(paths.root, `${slug}-scrape.json`), scrapeResult);

    console.log(`\nWrote analysis report to ${analysisPath}`);
    console.log(`Wrote scrape data to ${scrapePath}`);
    console.log(`Job folder: ${paths.root}`);
    console.log(`Temp checkpoints retained at: ${paths.tempDir}`);

    return {
      report,
      outputPath: analysisPath,
      scrapePath,
      scrapeResult,
      jobId: resolvedJobId,
      jobDir: paths.root
    };
  } catch (err) {
    failJob(paths, currentStage, err);
    err.message = `${err.message} (job=${resolvedJobId}; resume with --job-id ${resolvedJobId})`;
    throw err;
  }
}

module.exports = { runCatalogPipeline, OUTPUT_DIR };
