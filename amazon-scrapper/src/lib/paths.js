const path = require('path');

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..');
const OUTPUT_DIR = path.join(REPO_ROOT, 'output');
const CONFIG_DIR = path.join(PACKAGE_ROOT, 'config');

const FILE_NAMES = {
  OUR_PRODUCTS_INPUT: 'our-products.json',
  OUR_PRODUCTS_LIST: 'our-products-list.json',
  OUR_PRODUCTS_DETAILS: 'our-products-product-details.json',
  bestSellers: (slug) => `${slug}-best-sellers.json`,
  productDetails: (slug) => `${slug}-product-details.json`
};

const DEFAULT_CATEGORY_SLUG = 'curtains-drapes';

function outputPath(filename) {
  return path.join(OUTPUT_DIR, filename);
}

function configPath(filename) {
  return path.join(CONFIG_DIR, filename);
}

function cookiesPath() {
  return path.join(PACKAGE_ROOT, 'amazon_cookies.json');
}

module.exports = {
  PACKAGE_ROOT,
  REPO_ROOT,
  OUTPUT_DIR,
  CONFIG_DIR,
  FILE_NAMES,
  DEFAULT_CATEGORY_SLUG,
  outputPath,
  configPath,
  cookiesPath
};
