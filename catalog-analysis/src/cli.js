const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { runAnalysis } = require('./pipeline/run');

runAnalysis()
  .then(({ outputPath }) => {
    console.log(`Analysis complete: ${outputPath}`);
  })
  .catch((err) => {
    console.error('Analysis failed:', err.message);
    process.exit(1);
  });
