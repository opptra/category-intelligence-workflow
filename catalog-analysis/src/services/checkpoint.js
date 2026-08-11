const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf-8');
}

/**
 * Analysis-side checkpoint helper. Writes stage envelopes under tempDir.
 * Safe no-op when tempDir is not provided (in-memory / unit usage).
 */
function createCheckpoint(tempDir) {
  if (!tempDir) {
    return {
      enabled: false,
      has: () => false,
      load: () => null,
      save: async () => {},
      pathFor: () => null
    };
  }

  ensureDir(tempDir);

  return {
    enabled: true,
    pathFor(stage) {
      return path.join(tempDir, `${stage}.json`);
    },
    has(stage) {
      return fs.existsSync(path.join(tempDir, `${stage}.json`));
    },
    load(stage) {
      const envelope = readJson(path.join(tempDir, `${stage}.json`), null);
      return envelope ? envelope.data : null;
    },
    save(stage, data) {
      writeJson(path.join(tempDir, `${stage}.json`), {
        stage,
        saved_at: new Date().toISOString(),
        data
      });
    }
  };
}

/**
 * Load checkpoint if present; otherwise run `fn`, save, return.
 */
async function checkpointed(checkpoint, stage, fn, { log } = {}) {
  if (checkpoint?.has?.(stage)) {
    if (log) log(stage, `Resuming from checkpoint (${stage})`);
    return checkpoint.load(stage);
  }
  const data = await fn();
  if (checkpoint?.save) checkpoint.save(stage, data);
  return data;
}

module.exports = {
  createCheckpoint,
  checkpointed,
  readJson,
  writeJson
};
