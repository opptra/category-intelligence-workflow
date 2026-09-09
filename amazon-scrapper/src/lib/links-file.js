const fs = require('fs');
const path = require('path');
const { extractASIN, extractDomain } = require('./amazon-utils');

const MIN_COMPETITIVE_SET = 3;
const DEFAULT_MAX_PRODUCTS = 20;

const URL_HEADERS = new Set(['url', 'link', 'product_url']);
const LABEL_HEADERS = new Set(['label', 'name', 'title']);

function normalizeProductUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  const asin = extractASIN(trimmed);
  if (!asin) {
    return null;
  }

  const domain = extractDomain(trimmed);
  return {
    url: `https://${domain}/dp/${asin}`,
    asin,
    domain
  };
}

function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === ',') {
      cells.push(current);
      current = '';
    } else if (ch === '"') {
      inQuotes = true;
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function nonEmptyLines(text) {
  return String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

function looksLikeUrlHeader(cells) {
  return cells.some((cell) => URL_HEADERS.has(cell.toLowerCase()));
}

function headerIndex(cells, allowed) {
  return cells.findIndex((cell) => allowed.has(cell.toLowerCase()));
}

function entryFromValue(value) {
  if (typeof value === 'string') {
    const normalized = normalizeProductUrl(value);
    if (!normalized) return null;
    return { ...normalized, label: null };
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const url = value.url || value.link || value.product_url;
  const normalized = normalizeProductUrl(url);
  if (!normalized) return null;
  return {
    ...normalized,
    label: typeof value.label === 'string' && value.label.trim() ? value.label.trim() : null
  };
}

function collectFromJson(raw) {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.products)) return raw.products;
    if (Array.isArray(raw.urls)) return raw.urls;
    if (Array.isArray(raw.items)) return raw.items;
  }
  throw new Error('JSON links file must be an array or an object with products, urls, or items');
}

function collectFromCsvOrLines(text) {
  const lines = nonEmptyLines(text);
  if (!lines.length) {
    return [];
  }

  const firstCells = splitCsvLine(lines[0]);
  if (looksLikeUrlHeader(firstCells)) {
    const urlIdx = headerIndex(firstCells, URL_HEADERS);
    const labelIdx = headerIndex(firstCells, LABEL_HEADERS);
    const rows = [];
    for (const line of lines.slice(1)) {
      const cells = splitCsvLine(line);
      const url = cells[urlIdx] || '';
      const label = labelIdx >= 0 ? (cells[labelIdx] || '') : '';
      rows.push({ url, label: label || null });
    }
    return rows;
  }

  return lines.map((line) => {
    const firstCell = splitCsvLine(line)[0];
    return firstCell || line;
  });
}

function dedupeAndValidate(rawEntries, { minProducts, maxProducts }) {
  const entries = [];
  const seen = new Set();
  let skipped = 0;

  for (const raw of rawEntries) {
    const entry = entryFromValue(raw);
    if (!entry) {
      skipped += 1;
      continue;
    }
    if (seen.has(entry.asin)) {
      skipped += 1;
      continue;
    }
    seen.add(entry.asin);
    entries.push(entry);
  }

  if (!entries.length) {
    throw new Error('No valid Amazon product URLs found in links file');
  }

  const domain = entries[0].domain;
  const mixed = entries.filter((entry) => entry.domain !== domain);
  if (mixed.length) {
    const sample = mixed.slice(0, 3).map((entry) => `${entry.asin} (${entry.domain})`).join(', ');
    throw new Error(
      `Links file mixes marketplaces (expected ${domain}). Move each marketplace to its own run. Sample: ${sample}`
    );
  }

  if (entries.length < minProducts) {
    throw new Error(
      `Links file has ${entries.length} unique valid ASIN(s); at least ${minProducts} are required`
    );
  }

  let truncated = 0;
  let kept = entries;
  if (Number.isInteger(maxProducts) && maxProducts > 0 && entries.length > maxProducts) {
    truncated = entries.length - maxProducts;
    kept = entries.slice(0, maxProducts);
  }

  return {
    entries: kept,
    skipped,
    truncated,
    domain
  };
}

/**
 * Parse a competitive-set links file (CSV, newline URLs, or JSON).
 * Returns unique PDP entries, capped at maxProducts.
 */
function parseLinksFile(filePath, {
  minProducts = MIN_COMPETITIVE_SET,
  maxProducts = DEFAULT_MAX_PRODUCTS
} = {}) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Links file not found: ${resolved}`);
  }

  const rawText = fs.readFileSync(resolved, 'utf-8');
  const ext = path.extname(resolved).toLowerCase();

  let rawEntries;
  if (ext === '.json') {
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      throw new Error(`Links file is not valid JSON: ${err.message}`);
    }
    rawEntries = collectFromJson(parsed);
  } else {
    rawEntries = collectFromCsvOrLines(rawText);
  }

  return dedupeAndValidate(rawEntries, { minProducts, maxProducts });
}

module.exports = {
  MIN_COMPETITIVE_SET,
  DEFAULT_MAX_PRODUCTS,
  parseLinksFile,
  splitCsvLine,
  entryFromValue,
  collectFromJson,
  collectFromCsvOrLines,
  dedupeAndValidate,
  normalizeProductUrl
};
