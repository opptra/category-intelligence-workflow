const crypto = require('crypto');
const path = require('path');

function hashInput(payload) {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

function cachePath(cacheDir, stage, key) {
  return path.join(cacheDir, stage, `${key}.json`);
}

module.exports = {
  hashInput,
  cachePath
};
