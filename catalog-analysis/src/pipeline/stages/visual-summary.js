const { detectSignalsFromCells, SIGNAL_DETECTORS } = require('../../domain/vision-signals');

/**
 * Normalize free-text roles so near-duplicates merge
 * (e.g. "Hero Lifestyle Shot" vs "Hero / Main Lifestyle Shot").
 */
function normalizeRoleKey(role) {
  return String(role || '')
    .toLowerCase()
    .replace(/[/_·•\-–—]+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(main|primary|secondary|the|a|an|and|or|with)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function frequencyList(countMap, n, { labelKey = 'label' } = {}) {
  return [...countMap.entries()]
    .map(([key, entry]) => ({
      [labelKey]: entry.label,
      count: entry.count,
      prevalence: n > 0 ? round2(entry.count / n) : 0
    }))
    .sort((a, b) => b.count - a.count || String(a[labelKey]).localeCompare(String(b[labelKey])));
}

/**
 * Pure track summary: role frequency + derived signals + note frequency.
 * Call once per track (pdp / aplus). Never merge tracks into one bucket.
 */
function buildTrackSummary(results = [], { track } = {}) {
  if (!track || (track !== 'pdp' && track !== 'aplus')) {
    throw new Error('buildTrackSummary requires track: "pdp" | "aplus"');
  }

  const n = results.length;
  const roleMap = new Map();
  const noteMap = new Map();
  const signalCounts = Object.fromEntries(Object.keys(SIGNAL_DETECTORS).map((k) => [k, 0]));
  const imageCounts = [];

  for (const result of results) {
    if (Number.isFinite(result.image_count)) {
      imageCounts.push(result.image_count);
    }

    const rolesSeen = new Set();
    for (const role of result.present_roles || []) {
      rolesSeen.add(role);
    }
    for (const cell of result.cells || []) {
      if (cell.role) rolesSeen.add(cell.role);
    }

    for (const role of rolesSeen) {
      if (!role || role === 'other') continue;
      const key = normalizeRoleKey(role);
      if (!key) continue;
      if (!roleMap.has(key)) {
        roleMap.set(key, { label: role, count: 0 });
      }
      roleMap.get(key).count += 1;
    }

    for (const note of result.quality_notes || []) {
      const text = String(note || '').trim();
      if (!text) continue;
      const key = text.toLowerCase();
      if (!noteMap.has(key)) {
        noteMap.set(key, { label: text, count: 0 });
      }
      noteMap.get(key).count += 1;
    }

    for (const note of result.hero_conventions || []) {
      const text = String(note || '').trim();
      if (!text) continue;
      const key = `hero:${text.toLowerCase()}`;
      if (!noteMap.has(key)) {
        noteMap.set(key, { label: text, count: 0 });
      }
      noteMap.get(key).count += 1;
    }

    const signals = detectSignalsFromCells(result.cells || []);
    for (const [name, present] of Object.entries(signals)) {
      if (present) signalCounts[name] += 1;
    }
  }

  const sortedImages = [...imageCounts].sort((a, b) => a - b);
  const mid = Math.floor(sortedImages.length / 2);
  const median_image_count = sortedImages.length
    ? (sortedImages.length % 2
      ? sortedImages[mid]
      : (sortedImages[mid - 1] + sortedImages[mid]) / 2)
    : null;

  return {
    track,
    n_analyzed: n,
    median_image_count,
    roles: frequencyList(roleMap, n, { labelKey: 'role' }),
    signals: Object.entries(signalCounts)
      .map(([signal, count]) => ({
        signal,
        count,
        prevalence: n > 0 ? round2(count / n) : 0
      }))
      .sort((a, b) => b.count - a.count || a.signal.localeCompare(b.signal)),
    notes: frequencyList(noteMap, n, { labelKey: 'note' })
  };
}

function requiredRolesFromSummary(summary, { threshold = 0.5, fallbackLimit = 6 } = {}) {
  const roles = summary?.roles || [];
  let required = roles
    .filter((r) => r.prevalence >= threshold)
    .map((r) => r.role);

  if (!required.length) {
    required = roles.slice(0, fallbackLimit).map((r) => r.role);
  }

  if (!required.length) {
    required = ['hero'];
  }

  return required;
}

/**
 * Catalog-level: which leader-required roles are rare/missing in our PDP galleries.
 */
function missingRolesVsLeaders(ourSummary, requiredRoles) {
  const ourRates = new Map((ourSummary?.roles || []).map((r) => [normalizeRoleKey(r.role), r.prevalence]));
  return (requiredRoles || []).filter((role) => {
    const rate = ourRates.get(normalizeRoleKey(role)) || 0;
    return rate < 0.5;
  });
}

module.exports = {
  normalizeRoleKey,
  buildTrackSummary,
  requiredRolesFromSummary,
  missingRolesVsLeaders
};
