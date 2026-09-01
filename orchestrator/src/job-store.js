const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateJobId() {
  const ts = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `job-${ts}-${suffix}`;
}

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
 * Job layout:
 *   output/{jobId}/
 *     meta.json
 *     temp/     — intermediate stage artifacts (survive failures)
 *     output/   — final scrape + analysis when complete
 */
function resolveJobPaths(outputRoot, jobId) {
  const root = path.join(outputRoot, jobId);
  return {
    root,
    metaPath: path.join(root, 'meta.json'),
    tempDir: path.join(root, 'temp'),
    outputDir: path.join(root, 'output')
  };
}

function createOrLoadJob({ outputRoot, jobId = null, seed = {} }) {
  const id = jobId || generateJobId();
  const paths = resolveJobPaths(outputRoot, id);
  ensureDir(paths.root);
  ensureDir(paths.tempDir);
  ensureDir(paths.outputDir);

  let meta = readJson(paths.metaPath, null);
  const isResume = Boolean(meta);

  if (!meta) {
    meta = {
      job_id: id,
      status: 'running',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_stages: [],
      last_stage: null,
      error: null,
      ...seed
    };
    writeJson(paths.metaPath, meta);
  } else {
    meta.status = 'running';
    meta.updated_at = new Date().toISOString();
    meta.error = null;
    writeJson(paths.metaPath, meta);
  }

  return { jobId: id, paths, meta, isResume };
}

function updateJobMeta(paths, patch) {
  const meta = readJson(paths.metaPath, {});
  const next = {
    ...meta,
    ...patch,
    updated_at: new Date().toISOString()
  };
  writeJson(paths.metaPath, next);
  return next;
}

function markStageComplete(paths, stage) {
  const meta = readJson(paths.metaPath, { completed_stages: [] });
  const completed = new Set(meta.completed_stages || []);
  completed.add(stage);
  return updateJobMeta(paths, {
    completed_stages: [...completed],
    last_stage: stage
  });
}

function tempPath(paths, stage) {
  return path.join(paths.tempDir, `${stage}.json`);
}

function hasStage(paths, stage) {
  return fs.existsSync(tempPath(paths, stage));
}

function saveStage(paths, stage, data) {
  writeJson(tempPath(paths, stage), {
    stage,
    saved_at: new Date().toISOString(),
    data
  });
  markStageComplete(paths, stage);
}

function loadStage(paths, stage) {
  const envelope = readJson(tempPath(paths, stage), null);
  return envelope ? envelope.data : null;
}

function failJob(paths, stage, error) {
  return updateJobMeta(paths, {
    status: 'failed',
    last_stage: stage,
    error: {
      stage,
      message: error?.message || String(error),
      at: new Date().toISOString()
    }
  });
}

function completeJob(paths, { slug, scrapePath, analysisPath }) {
  return updateJobMeta(paths, {
    status: 'completed',
    last_stage: 'done',
    error: null,
    final: {
      slug,
      scrape_path: scrapePath,
      analysis_path: analysisPath
    }
  });
}

module.exports = {
  generateJobId,
  resolveJobPaths,
  createOrLoadJob,
  updateJobMeta,
  markStageComplete,
  hasStage,
  saveStage,
  loadStage,
  failJob,
  completeJob,
  writeJson,
  readJson
};
