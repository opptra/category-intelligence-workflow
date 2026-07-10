const path = require('path');
const { PACKAGE_ROOT, resolveDatasetPaths, DEFAULT_CATEGORY_SLUG } = require('./paths');

function parseArgs(argv) {
  const args = {
    categorySlug: DEFAULT_CATEGORY_SLUG,
    competitors: null,
    ours: null,
    output: null,
    refresh: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--category' && argv[i + 1]) {
      args.categorySlug = argv[++i];
    } else if (arg === '--competitors' && argv[i + 1]) {
      args.competitors = path.resolve(argv[++i]);
    } else if (arg === '--ours' && argv[i + 1]) {
      args.ours = path.resolve(argv[++i]);
    } else if (arg === '--output' && argv[i + 1]) {
      args.output = path.resolve(argv[++i]);
    } else if (arg === '--refresh') {
      args.refresh = true;
    }
  }

  return args;
}

function loadConfig(argv = process.argv) {
  const args = parseArgs(argv);
  const paths = resolveDatasetPaths({
    categorySlug: args.categorySlug,
    competitors: args.competitors,
    ours: args.ours,
    output: args.output
  });
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

  return {
    ...args,
    ...paths,
    packageRoot: PACKAGE_ROOT,
    cacheDir: path.join(PACKAGE_ROOT, '.cache'),
    model,
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    reviewSamplePerStar: 30,
    maxNegativeReviews: 80,
    maxPositiveReviews: 40,
    // Product gallery: square grid, aspect ratio preserved via fit:inside
    montageCellSize: 512,
    montageMaxCells: 12,
    // A+ content: landscape strips stacked vertically, aspect ratio preserved
    aplusCellMaxWidth: 800,
    aplusCellMaxHeight: 360,
    aplusMaxCells: 10,
    // Max vision calls to run in parallel within a gallery pass (caps API concurrency)
    visionConcurrency: 6,
    // Output token budget for vision montage classification calls
    visionMaxTokens: 20000
  };
}

module.exports = { loadConfig, parseArgs };
