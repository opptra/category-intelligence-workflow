const { runAnalysis } = require('./pipeline/run');
const { slugifyCategory } = require('./pipeline/stages/assemble');

module.exports = {
  runAnalysis,
  slugifyCategory
};
