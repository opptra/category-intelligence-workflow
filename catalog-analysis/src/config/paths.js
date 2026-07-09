const fs = require('fs');
const path = require('path');

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..');
const OUTPUT_DIR = path.join(REPO_ROOT, 'output');

const DEFAULT_CATEGORY_SLUG = 'curtains-drapes';

const FILE_NAMES = {
  OUR_PRODUCTS: 'our-products-product-details.json',
  competitors: (slug) => `${slug}-product-details.json`,
  analysis: (slug) => `${slug}-analysis.json`,
  bestSellers: (slug) => `${slug}-best-sellers.json`,
  ourProductsList: 'our-products-list.json'
};

function outputPath(filename) {
  return path.join(OUTPUT_DIR, filename);
}

function requireOutputFile(filename) {
  const filePath = outputPath(filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected file not found in output/: ${filename} (${filePath})`);
  }
  return filePath;
}

function resolveDatasetPaths({ categorySlug = DEFAULT_CATEGORY_SLUG, competitors, ours, output } = {}) {
  const slug = categorySlug;
  return {
    repoRoot: REPO_ROOT,
    outputDir: OUTPUT_DIR,
    categorySlug: slug,
    competitors: competitors || requireOutputFile(FILE_NAMES.competitors(slug)),
    ours: ours || requireOutputFile(FILE_NAMES.OUR_PRODUCTS),
    output: output || outputPath(FILE_NAMES.analysis(slug))
  };
}

module.exports = {
  PACKAGE_ROOT,
  REPO_ROOT,
  OUTPUT_DIR,
  DEFAULT_CATEGORY_SLUG,
  FILE_NAMES,
  outputPath,
  requireOutputFile,
  resolveDatasetPaths
};
