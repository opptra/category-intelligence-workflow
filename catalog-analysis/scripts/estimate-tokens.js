/* Read-only token estimator. Reconstructs the synthesis research from a job's
 * temp checkpoints and measures the prompt size per LLM call. No API/network. */
const fs = require('fs');
const path = require('path');

const jobDir = process.argv[2]
  || path.join(__dirname, '../../output/job-20260811200045-49ab7c');
const tempDir = path.join(jobDir, 'temp');

const load = (name) => JSON.parse(fs.readFileSync(path.join(tempDir, `${name}.json`), 'utf-8')).data;

const { loadDatasetsFromInput } = require('../src/pipeline/stages/load');
const { computeCorpusMetrics } = require('../src/pipeline/stages/metrics');
const { buildSynthesisResearch, scopeResearchForTopics, compactJson } = require('../src/utils/prompt-data');

// Rebuild inputs exactly as run.js does.
const scrape = load('scrape');
const { competitors } = loadDatasetsFromInput(scrape);
const competitorMetrics = computeCorpusMetrics(competitors);
const categoryStandard = load('s2_standards');
const voiceOfCustomer = load('s3_voc');
const visualStandard = load('s4_visual');
const catalogGaps = load('s4b_gaps');
const core = load('s5_core');

// Mirror buildMetricsContext from synthesize-report.js
const metricsContext = {
  title_len: categoryStandard.title?.median_length,
  title_limit_chars: 75,
  item_highlights_limit_chars: 125,
  bullets: categoryStandard.bullet_norms?.median_count,
  images: categoryStandard.gallery_standard?.median_images,
  aplus_rate: categoryStandard.aplus_standard?.presence_rate,
  aplus_modules: categoryStandard.aplus_standard?.median_modules,
  price_inr: categoryStandard.price_band?.per_set,
  rating: categoryStandard.reviews_norm?.rating_band,
  reviews: categoryStandard.reviews_norm?.median_volume,
  node: categoryStandard.category_node
};

const research = buildSynthesisResearch({
  category: 'Bedding Duvet Cover Sets',
  competitors,
  ours: [],
  categoryStandard,
  voiceOfCustomer,
  visualStandard,
  metricsContext,
  catalogGaps
});

const tok = (s) => Math.round(s.length / 4);
const kb = (s) => (s.length / 1024).toFixed(1);
const row = (label, str) => {
  console.log(
    `${label.padEnd(34)} ${kb(str).padStart(8)} KB   ~${String(tok(str)).padStart(6)} tokens`
  );
};

console.log(`\nLeaders analyzed: ${competitors.length}\n`);
console.log('=== Per-call USER payload (compactJson of scoped research + core) ===');

const coreCtx = compactJson({ summary: core.summary, lexicon: core.category_lexicon.observations });
row('core context (summary+lexicon)', coreCtx);

const batches = {
  'copy': ['title', 'item_highlights', 'bullets', 'keywords'],
  'commerce': ['specs', 'pricing', 'reviews_and_trust', 'consistency_and_hygiene'],
  'gallery_images': ['gallery_images'],
  'aplus': ['aplus']
};

console.log('\n-- topic batches (research portion only) --');
for (const [label, names] of Object.entries(batches)) {
  const scoped = compactJson(scopeResearchForTopics(research, names));
  row(`topics:${label}`, scoped);
}

console.log('\n-- core synthesis sub-calls (slimmed research per call) --');
// Mirror the slimmers in synthesize-report.js
const rSummary = {
  category: research.category, n_leaders: research.n_leaders, n_ours: research.n_ours,
  metrics: research.metrics, catalog_gaps: research.catalog_gaps,
  copy: { title_pattern: research.copy?.title_pattern, bullet_topics: research.copy?.bullet_topics, keywords: research.copy?.keywords },
  vision: {
    pdp_gallery: research.vision?.pdp_gallery ? { n_analyzed: research.vision.pdp_gallery.n_analyzed, median_image_count: research.vision.pdp_gallery.median_image_count, roles: (research.vision.pdp_gallery.roles || []).slice(0, 8) } : null,
    aplus: research.vision?.aplus ? { n_analyzed: research.vision.aplus.n_analyzed, median_image_count: research.vision.aplus.median_image_count, roles: (research.vision.aplus.roles || []).slice(0, 8) } : null
  }
};
const rLexicon = {
  category: research.category, n_leaders: research.n_leaders, titles: research.titles,
  listings: (research.listings || []).map((l) => ({ title: l.title, bullets: l.bullets, item_highlights: l.item_highlights })),
  copy: research.copy, catalog_gaps: { missing_lexicon_terms: research.catalog_gaps?.missing_lexicon_terms || [] }
};
const rVoc = { category: research.category, n_leaders: research.n_leaders, n_ours: research.n_ours, voice: research.voice, catalog_gaps: { summary: research.catalog_gaps?.summary || null } };
row('core:summary', compactJson(rSummary));
row('core:lexicon', compactJson(rLexicon));
row('core:voc', compactJson(rVoc));

console.log('\n-- reference --');
row('full research object', compactJson(research));

console.log('\n-- component breakdown of full research --');
for (const key of Object.keys(research)) {
  row(`  research.${key}`, compactJson(research[key]));
}
