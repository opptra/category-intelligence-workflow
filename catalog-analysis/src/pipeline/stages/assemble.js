const { SCHEMA_VERSION, validateReport } = require('../../domain/report-schema');
const { normalizeReportSections } = require('../../domain/report-normalize');

function slugifyCategory(category) {
  return String(category)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function assembleReport({ meta, config, synthesized, imagePlan, backendKeywords }) {
  const normalized = normalizeReportSections({
    category_lexicon: synthesized.category_lexicon,
    voice_of_customer: synthesized.voice_of_customer
  });

  const report = {
    meta: {
      schema_version: SCHEMA_VERSION,
      category: meta.category,
      marketplace: meta.domain,
      generated_at: new Date().toISOString(),
      competitor_count: meta.competitor_count,
      our_count: meta.our_count,
      corpus_source: meta.corpus_source,
      model: config.model
    },
    summary: synthesized.summary,
    category_lexicon: normalized.category_lexicon,
    voice_of_customer: normalized.voice_of_customer,
    catalog_gaps: synthesized.catalog_gaps,
    backend_keywords: backendKeywords,
    image_plan: imagePlan,
    topics: synthesized.topics
  };

  return validateReport(report);
}

module.exports = {
  assembleReport,
  slugifyCategory
};
