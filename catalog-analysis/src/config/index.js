const path = require('path');
const { PACKAGE_ROOT } = require('./paths');

function parseArgs(argv) {
  const args = {
    competitors: null,
    ours: null,
    refresh: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--competitors' && argv[i + 1]) {
      args.competitors = path.resolve(argv[++i]);
    } else if (arg === '--ours' && argv[i + 1]) {
      args.ours = path.resolve(argv[++i]);
    } else if (arg === '--refresh') {
      args.refresh = true;
    }
  }

  return args;
}

const DEFAULT_OPENROUTER_MODEL = 'anthropic/claude-sonnet-4';
const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api';

function resolveOpenRouterModel(raw) {
  const model = (raw || DEFAULT_OPENROUTER_MODEL).trim();
  return model.includes('/') ? model : `anthropic/${model}`;
}

function buildAnalysisConfig(overrides = {}) {
  const model = resolveOpenRouterModel(process.env.OPENROUTER_MODEL);

  return {
    packageRoot: PACKAGE_ROOT,
    cacheDir: path.join(PACKAGE_ROOT, '.cache'),
    model,
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseURL: process.env.OPENROUTER_BASE_URL || DEFAULT_OPENROUTER_BASE_URL,
    reviewSamplePerStar: 30,
    maxNegativeReviews: 80,
    maxPositiveReviews: 40,
    montageCellSize: 512,
    montageMaxCells: 12,
    aplusCellMaxWidth: 800,
    aplusCellMaxHeight: 360,
    aplusMaxCells: 10,
    visionConcurrency: 6,
    visionMaxTokens: 20000,
    refresh: false,
    ...overrides
  };
}

function loadConfig(argv = process.argv) {
  const args = parseArgs(argv);
  if (!args.competitors || !args.ours) {
    throw new Error(
      'Debug CLI requires --competitors <path> and --ours <path>. Prefer the orchestrator for the full pipeline.'
    );
  }

  return buildAnalysisConfig(args);
}

module.exports = { loadConfig, buildAnalysisConfig };
