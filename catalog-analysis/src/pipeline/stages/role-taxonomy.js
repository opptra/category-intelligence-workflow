const { toolDefinition } = require('../../utils/schema-tools');
const { compactJson } = require('../../utils/prompt-data');

const ROLE_TAXONOMY_TOOL = toolDefinition(
  'role-taxonomy',
  'Cluster free-text vision roles into canonical functional families'
);

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

/**
 * Collect distinct raw role strings with occurrence counts across per-product vision results.
 */
function collectRawRoleFrequency(results = []) {
  const map = new Map();

  for (const result of results) {
    for (const cell of result.cells || []) {
      const role = String(cell.role || '').trim();
      if (!role || role === 'unclassified' || role === 'other') continue;
      const key = role.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { role, occurrences: 0, listings: new Set() });
      }
      const entry = map.get(key);
      entry.occurrences += 1;
      if (result.asin) entry.listings.add(result.asin);
    }
    for (const role of result.present_roles || []) {
      const text = String(role || '').trim();
      if (!text || text === 'unclassified' || text === 'other') continue;
      const key = text.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { role: text, occurrences: 0, listings: new Set() });
      }
    }
  }

  return [...map.values()]
    .map((entry) => ({
      role: entry.role,
      occurrences: entry.occurrences,
      listings: entry.listings.size
    }))
    .sort((a, b) => b.occurrences - a.occurrences || a.role.localeCompare(b.role));
}

function buildFallbackTaxonomy(rawRoles) {
  const byKey = new Map();
  for (const entry of rawRoles) {
    const key = normalizeRoleKey(entry.role) || entry.role.toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, {
        canonical: entry.role,
        kind: 'supporting',
        members: []
      });
    }
    byKey.get(key).members.push(entry.role);
  }
  return [...byKey.values()];
}

function buildRoleLookup(canonicalRoles) {
  const lookup = new Map();
  const byCanonical = new Map();

  for (const family of canonicalRoles) {
    const canonical = String(family.canonical || '').trim();
    const kind = String(family.kind || 'supporting').trim() || 'supporting';
    if (!canonical) continue;

    byCanonical.set(canonical.toLowerCase(), { canonical, kind, members: family.members || [] });

    for (const member of family.members || []) {
      const raw = String(member || '').trim();
      if (!raw) continue;
      lookup.set(raw.toLowerCase(), { canonical, kind });
      lookup.set(normalizeRoleKey(raw), { canonical, kind });
    }
    lookup.set(canonical.toLowerCase(), { canonical, kind });
    lookup.set(normalizeRoleKey(canonical), { canonical, kind });
  }

  return { lookup, byCanonical };
}

/**
 * Ensure every observed raw role maps somewhere. Unmapped roles fall back to normalizeRoleKey.
 */
function sealTaxonomy(canonicalRoles, rawRoles) {
  const sealed = (canonicalRoles || [])
    .map((family) => ({
      canonical: String(family.canonical || '').trim(),
      kind: String(family.kind || 'supporting').trim() || 'supporting',
      members: [...new Set((family.members || []).map((m) => String(m || '').trim()).filter(Boolean))]
    }))
    .filter((family) => family.canonical && family.members.length);

  const { lookup } = buildRoleLookup(sealed);
  for (const entry of rawRoles) {
    const raw = entry.role;
    if (lookup.has(raw.toLowerCase()) || lookup.has(normalizeRoleKey(raw))) continue;
    const fallback = normalizeRoleKey(raw) || raw.toLowerCase();
    const existing = sealed.find((f) => normalizeRoleKey(f.canonical) === fallback);
    if (existing) {
      existing.members.push(raw);
    } else {
      sealed.push({
        canonical: raw,
        kind: 'supporting',
        members: [raw]
      });
    }
  }

  return sealed;
}

async function buildRoleTaxonomy({ llm, results, track, category }) {
  const rawRoles = collectRawRoleFrequency(results);
  if (!rawRoles.length) {
    return {
      track,
      canonical_roles: [],
      lookup: new Map(),
      byCanonical: new Map()
    };
  }

  let llmFamilies = [];
  try {
    const response = await llm.completeTool({
      system:
        'You cluster free-text Amazon listing image roles into canonical functional families. '
        + 'Angle, view, and crop variants of the same function belong in one family. '
        + 'Do not invent roles that are not in the input. No fixed enum.',
      tool: ROLE_TAXONOMY_TOOL,
      user: `Category: ${category}
Track: ${track}

Observed raw roles (with occurrence counts):
${compactJson(rawRoles)}

Cluster these roles into canonical families.
Each member string must be copied exactly from the input roles.
Prefer functional families (what the image is for) over framing variants.`,
      maxTokens: 4096
    });
    llmFamilies = response?.canonical_roles || [];
  } catch (_) {
    llmFamilies = [];
  }

  if (!llmFamilies.length) {
    llmFamilies = buildFallbackTaxonomy(rawRoles);
  }

  const canonicalRoles = sealTaxonomy(llmFamilies, rawRoles);
  const { lookup, byCanonical } = buildRoleLookup(canonicalRoles);

  return {
    track,
    canonical_roles: canonicalRoles,
    lookup,
    byCanonical
  };
}

function resolveCanonicalRole(rawRole, taxonomy) {
  const text = String(rawRole || '').trim();
  if (!text) return null;
  const lookup = taxonomy?.lookup;
  if (!lookup) {
    return { canonical: text, kind: 'supporting' };
  }
  return (
    lookup.get(text.toLowerCase())
    || lookup.get(normalizeRoleKey(text))
    || { canonical: text, kind: 'supporting' }
  );
}

module.exports = {
  normalizeRoleKey,
  collectRawRoleFrequency,
  buildRoleTaxonomy,
  resolveCanonicalRole,
  buildRoleLookup,
  sealTaxonomy
};
