const { detectSignalsFromCells, SIGNAL_DETECTORS } = require('../../domain/vision-signals');
const { resolveCanonicalRole, normalizeRoleKey } = require('./role-taxonomy');

function round1(n) {
  return Math.round(n * 10) / 10;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
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

function emptyRoleBucket(canonical, kind) {
  return {
    role: canonical,
    kind,
    listingAsins: new Set(),
    total_cells: 0,
    positions: [],
    tagCounts: new Map(),
    boardFacts: new Set(),
    boardLayouts: new Set(),
    boardTypes: new Set()
  };
}

/**
 * Pure track summary with optional canonical taxonomy.
 * Pass A: prevalence, total_cells, typical_per_listing, typical_position
 * Pass B: content_tags, board_facts, board_layouts, board_types per role
 */
function buildTrackSummary(results = [], { track, taxonomy = null } = {}) {
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

    for (const cell of result.cells || []) {
      const rawRole = cell.role;
      if (!rawRole || rawRole === 'other' || rawRole === 'unclassified') continue;

      const resolved = taxonomy
        ? resolveCanonicalRole(rawRole, taxonomy)
        : { canonical: rawRole, kind: cell.kind || 'supporting' };
      const canonical = resolved.canonical;
      const kind = resolved.kind || cell.kind || 'supporting';
      const key = normalizeRoleKey(canonical) || canonical.toLowerCase();
      rolesSeen.add(key);

      if (!roleMap.has(key)) {
        roleMap.set(key, emptyRoleBucket(canonical, kind));
      }
      const bucket = roleMap.get(key);
      bucket.total_cells += 1;
      if (result.asin) bucket.listingAsins.add(result.asin);

      const position = Number.isFinite(cell.position)
        ? cell.position
        : (Number.isFinite(cell.cell) ? cell.cell - 1 : null);
      if (Number.isFinite(position)) bucket.positions.push(position);

      for (const tag of cell.content_tags || []) {
        const t = String(tag || '').trim();
        if (!t) continue;
        bucket.tagCounts.set(t, (bucket.tagCounts.get(t) || 0) + 1);
      }

      if (cell.board) {
        for (const fact of cell.board.facts || []) {
          const f = String(fact || '').trim();
          if (f) bucket.boardFacts.add(f);
        }
        const layout = String(cell.board.layout || '').trim();
        if (layout) bucket.boardLayouts.add(layout);
        const boardType = String(cell.board.board_type || '').trim();
        if (boardType) bucket.boardTypes.add(boardType);
      }
    }

    // Include present_roles that may not appear as cells (legacy / summary-only).
    for (const role of result.present_roles || []) {
      if (!role || role === 'other' || role === 'unclassified') continue;
      const resolved = taxonomy
        ? resolveCanonicalRole(role, taxonomy)
        : { canonical: role, kind: 'supporting' };
      const key = normalizeRoleKey(resolved.canonical) || resolved.canonical.toLowerCase();
      rolesSeen.add(key);
      if (!roleMap.has(key)) {
        roleMap.set(key, emptyRoleBucket(resolved.canonical, resolved.kind));
      }
      if (result.asin) roleMap.get(key).listingAsins.add(result.asin);
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

  const roles = [...roleMap.values()]
    .map((bucket) => {
      const listings_containing = bucket.listingAsins.size;
      const content_tags = [...bucket.tagCounts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([tag]) => tag);
      return {
        role: bucket.role,
        kind: bucket.kind,
        count: listings_containing,
        prevalence: n > 0 ? round2(listings_containing / n) : 0,
        total_cells: bucket.total_cells,
        typical_per_listing: listings_containing > 0
          ? round1(bucket.total_cells / listings_containing)
          : 0,
        typical_position: median(bucket.positions),
        content_tags,
        board_facts: [...bucket.boardFacts],
        board_layouts: [...bucket.boardLayouts],
        board_types: [...bucket.boardTypes]
      };
    })
    .sort((a, b) => b.count - a.count || a.role.localeCompare(b.role));

  const imageStats = {
    min: imageCounts.length ? Math.min(...imageCounts) : null,
    median: median(imageCounts),
    max: imageCounts.length ? Math.max(...imageCounts) : null
  };

  return {
    track,
    n_analyzed: n,
    median_image_count: imageStats.median,
    image_count: imageStats,
    roles,
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

/**
 * Gap-report knob only (not a planning rule): roles with prevalence >= threshold.
 */
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
