const fs = require('fs');
const path = require('path');
const { fetchCatalogData, fetchCompetitiveSetData, parseLinksFile } = require('amazon-scrapper');
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

function inferCorpusSource(scrapeResult) {
  if (scrapeResult?.corpus_source === 'user_selected' || scrapeResult?.corpus_source === 'bestsellers') {
    return scrapeResult.corpus_source;
  }
  if (scrapeResult?.top_sellers?.source === 'user-selected') {
    return 'user_selected';
  }
  return 'bestsellers';
}

function persistScrapeFiles(paths, scrapeResult) {
  const category = scrapeResult?.top_sellers?.category
    || scrapeResult?.our_products?.category
    || 'category';
  const slug = slugifyCategory(category);
  const scrapePath = path.join(paths.outputDir, `${slug}-scrape.json`);
  writeJson(scrapePath, scrapeResult);
  writeJson(path.join(paths.root, `${slug}-scrape.json`), scrapeResult);
  console.log(`Saved scrape JSON: ${scrapePath}`);
  return scrapePath;
}

function loadScrapeEnvelope(scrapeFile) {
  const scrapePath = path.resolve(scrapeFile);
  if (!fs.existsSync(scrapePath)) {
    throw new Error(`Scrape file not found: ${scrapePath}`);
  }
  const scrapeResult = JSON.parse(fs.readFileSync(scrapePath, 'utf-8'));
  if (!scrapeResult?.our_products || !scrapeResult?.top_sellers) {
    throw new Error('--scrape-file must contain { our_products, top_sellers }');
  }
  if (!Array.isArray(scrapeResult.our_products.products)) {
    scrapeResult.our_products.products = [];
  }
  scrapeResult.corpus_source = inferCorpusSource(scrapeResult);
  return scrapeResult;
}

async function scrapeFromLinksFile({
  linksFile,
  ourProductUrls,
  categoryName,
  maxProducts,
  cookiesPath,
  headless,
  reviewsPerStar,
  maxReviews,
  includeReviews,
  concurrency,
  onCheckpoint
}) {
  const parsed = parseLinksFile(linksFile, { maxProducts });
  if (parsed.skipped) {
    console.log(`[scrape] Skipped ${parsed.skipped} invalid or duplicate URL(s)`);
  }
  if (parsed.truncated) {
    console.log(`[scrape] Capped competitive set at ${parsed.entries.length} (dropped ${parsed.truncated})`);
  }

  return fetchCompetitiveSetData({
    competitorUrls: parsed.entries,
    ourProductUrls: ourProductUrls || [],
    categoryName,
    cookiesPath,
    headless,
    reviewsPerStar,
    maxReviews,
    includeReviews,
    concurrency,
    onCheckpoint
  });
}

async function runCatalogPipeline({
  ourProductUrls,
  categoryUrl,
  linksFile,
  categoryName,
  maxProducts = 20,
  scrapeFile,
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
      links_file: linksFile || null,
      category_name: categoryName || null,
      max_products: maxProducts,
      our_product_urls: ourProductUrls || [],
      corpus_source: linksFile ? 'user_selected' : (categoryUrl ? 'bestsellers' : null),
      top_n: topN
    }
  });

  if (scrapeFile && !hasStage(paths, 'scrape')) {
    saveStage(paths, 'scrape', loadScrapeEnvelope(scrapeFile));
    console.log(`Loaded scrape file into job: ${scrapeFile}`);
  }

  console.log('='.repeat(60));
  console.log(`ORCHESTRATOR — JOB ${resolvedJobId}${isResume ? ' (resume)' : ' (new)'}`);
  console.log(`Temp:    ${paths.tempDir}`);
  console.log(`Output:  ${paths.outputDir}`);
  console.log('='.repeat(60));

  const resolvedCategoryUrl = categoryUrl || meta.category_url;
  const resolvedLinksFile = linksFile || meta.links_file;
  const resolvedCategoryName = categoryName || meta.category_name || null;
  const resolvedOurUrls = (ourProductUrls && ourProductUrls.length)
    ? ourProductUrls
    : (meta.our_product_urls || []);
  const resolvedTopN = requirePositiveInt(topN || meta.top_n, 'topN', 10);
  const resolvedMaxProducts = requirePositiveInt(maxProducts || meta.max_products, 'maxProducts', 20);

  let scrapeResult;
  let currentStage = 'scrape';

  try {
    if (hasStage(paths, 'scrape')) {
      console.log('\n[scrape] Resuming from checkpoint');
      scrapeResult = loadStage(paths, 'scrape');
      scrapeResult.corpus_source = inferCorpusSource(scrapeResult);
    } else {
      const scrapeOpts = {
        cookiesPath,
        headless,
        reviewsPerStar,
        maxReviews,
        includeReviews,
        concurrency,
        onCheckpoint: async (step, payload) => {
          saveStage(paths, step, payload);
          console.log(`[scrape] checkpoint saved: ${step}`);
        }
      };

      console.log('\n' + '='.repeat(60));
      console.log('ORCHESTRATOR — SCRAPE');
      console.log('='.repeat(60));

      if (resolvedLinksFile) {
        scrapeResult = await scrapeFromLinksFile({
          linksFile: resolvedLinksFile,
          ourProductUrls: resolvedOurUrls,
          categoryName: resolvedCategoryName,
          maxProducts: resolvedMaxProducts,
          ...scrapeOpts
        });
        updateJobMeta(paths, {
          links_file: resolvedLinksFile,
          category_name: resolvedCategoryName,
          our_product_urls: resolvedOurUrls,
          max_products: resolvedMaxProducts,
          corpus_source: 'user_selected'
        });
      } else {
        if (!resolvedCategoryUrl || typeof resolvedCategoryUrl !== 'string' || !resolvedCategoryUrl.trim()) {
          throw new Error('categoryUrl is required (or pass --links-file / --scrape-file / --job-id with saved scrape data)');
        }
        if (!Array.isArray(resolvedOurUrls) || resolvedOurUrls.length === 0) {
          throw new Error('ourProductUrls must be a non-empty array when using --category-url');
        }

        scrapeResult = await fetchCatalogData({
          ourProductUrls: resolvedOurUrls,
          categoryUrl: resolvedCategoryUrl.trim(),
          topN: resolvedTopN,
          ...scrapeOpts
        });
        updateJobMeta(paths, {
          category_url: resolvedCategoryUrl.trim(),
          our_product_urls: resolvedOurUrls,
          top_n: resolvedTopN,
          corpus_source: 'bestsellers'
        });
      }
      saveStage(paths, 'scrape', scrapeResult);
    }

    persistScrapeFiles(paths, scrapeResult);

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
    if (scrapeResult) {
      try {
        persistScrapeFiles(paths, scrapeResult);
      } catch (_) {
        // keep the original analysis/scrape error
      }
    }
    failJob(paths, currentStage, err);
    err.message = `${err.message} (job=${resolvedJobId}; resume with --job-id ${resolvedJobId})`;
    throw err;
  }
}

module.exports = { runCatalogPipeline, OUTPUT_DIR, inferCorpusSource };
