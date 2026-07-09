const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function hashInput(payload) {
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

function cachePath(cacheDir, stage, key) {
  return path.join(cacheDir, stage, `${key}.json`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readCache(cacheDir, stage, key) {
  const file = cachePath(cacheDir, stage, key);
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    throw new Error(`Corrupt cache file ${file}: ${err.message}`);
  }
}

function writeCache(cacheDir, stage, key, value) {
  const file = cachePath(cacheDir, stage, key);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf-8');
}

async function withCache({ cacheDir, stage, input, refresh, fn }) {
  const key = hashInput(input);
  if (!refresh) {
    const cached = readCache(cacheDir, stage, key);
    if (cached !== null) {
      return cached;
    }
  }

  const result = await fn();
  writeCache(cacheDir, stage, key, result);
  return result;
}

module.exports = {
  hashInput,
  readCache,
  writeCache,
  withCache,
  cachePath
};
