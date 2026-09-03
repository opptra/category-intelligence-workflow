const path = require('path');
const { readFileSync } = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { runAnalysis } = require('./pipeline/run');
const { loadConfig } = require('./config');

function readEnvelope(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

async function main() {
  const config = loadConfig();
  const top_sellers = readEnvelope(config.competitors);
  const our_products = config.ours
    ? readEnvelope(config.ours)
    : {
      source: 'our-products',
      category: top_sellers.category,
      domain: top_sellers.domain,
      products: []
    };
  const input = {
    corpus_source: top_sellers.source === 'user-selected' ? 'user_selected' : 'bestsellers',
    top_sellers,
    our_products
  };

  const { report } = await runAnalysis({ ...config, input });
  console.log('Analysis complete (report returned in-memory; not written to disk).');
  console.log(JSON.stringify({
    category: report.meta.category,
    topics: report.topics.length,
    lexicon_terms: report.category_lexicon.terms.length
  }, null, 2));
}

main().catch((err) => {
  console.error('Analysis failed:', err.message);
  process.exit(1);
});
