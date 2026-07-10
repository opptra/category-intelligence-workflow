const path = require('path');

const PACKAGE_ROOT = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..');
const OUTPUT_DIR = path.join(REPO_ROOT, 'output');

module.exports = {
  PACKAGE_ROOT,
  REPO_ROOT,
  OUTPUT_DIR
};
