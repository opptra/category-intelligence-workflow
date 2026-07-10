const { runAnalysis } = require('./pipeline/run');
const { loadDatasetsFromInput } = require('./pipeline/stages/load');
const { slugifyCategory } = require('./pipeline/stages/assemble');
const { buildAnalysisConfig } = require('./config');

module.exports = {
  runAnalysis,
  loadDatasetsFromInput,
  slugifyCategory,
  buildAnalysisConfig
};
