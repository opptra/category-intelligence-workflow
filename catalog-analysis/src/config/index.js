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

function resolveLlmSettings() {
  const llmProvider = (process.env.LLM_PROVIDER || 'openrouter').toLowerCase();

  if (llmProvider === 'anthropic') {
    return {
      llmProvider,
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      openRouterSiteUrl: '',
      openRouterAppName: ''
    };
  }

  return {
    llmProvider: 'openrouter',
    model: process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4.5',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    openRouterSiteUrl: process.env.OPENROUTER_SITE_URL || '',
    openRouterAppName: process.env.OPENROUTER_APP_NAME || 'scrapper-agent-workflow'
  };
}

function buildAnalysisConfig(overrides = {}) {
  const llm = resolveLlmSettings();

  return {
    packageRoot: PACKAGE_ROOT,
    cacheDir: path.join(PACKAGE_ROOT, '.cache'),
    ...llm,
    reviewSamplePerStar: 30,
    maxNegativeReviews: 80,
    maxPositiveReviews: 40,
    visionImageMaxSide: 1400,
    visionJpegQuality: 85,
    visionConcurrency: 8,
    downloadConcurrency: 20,
    visionMaxTokens: 20000,
    marketplace: process.env.MARKETPLACE || 'IN',
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
