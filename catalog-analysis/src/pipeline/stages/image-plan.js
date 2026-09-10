const { normalizeRoleKey } = require('./visual-summary');
const { toolDefinition, strictToolDefinition } = require('../../utils/schema-tools');
const { compactJson } = require('../../utils/prompt-data');
const { mapWithConcurrency } = require('./images');

// Strict mode grammar-constrains the composition output so a surface with
// evidence can never come back with an empty slots[] (schema minItems:1).
const COMPOSITION_TOOL = strictToolDefinition(
  'image-plan-composition',
  'Decide gallery and A+ slot composition from observed evidence (counts, roles, priorities)'
);

const BRIEF_TOOL = toolDefinition(
  'image-plan-brief',
  'Write pattern and a generic theme-family content brief for one image slot'
);

const MAX_PATTERN = 120;
const MAX_CONTENT = 220;
const MAX_FEATURES = 8;
const PROMPT_PREFIX_RE = /^(generate|create|make|produce|render|draw|design an? image|midjourney|dall[- ]?e)\b[:\s-]*/i;
const MEASUREMENT_RE = /\b\d+(?:[.,]\d+)?(?:\s*[x×*]\s*\d+(?:[.,]\d+)?){1,2}(?:\s*(?:cm|mm|inch(?:es)?|in|ft))?\b|\b\d+(?:[.,]\d+)?\s*(?:cm|mm|inch(?:es)?|ft|kg|g|lb|oz)\b/gi;
const QUOTED_SLOGAN_RE = /[“”"'‘’][^“”"'‘’]{1,80}[“”"'‘’]/g;

function sanitizeBrief(text, softMax) {
  let cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(PROMPT_PREFIX_RE, '').trim();
  // Soft safety cap only for pathological output — never ellipsis-trim normal briefs.
  if (Number.isFinite(softMax) && cleaned.length > softMax * 3) {
    return cleaned.slice(0, softMax * 3);
  }
  return cleaned;
}

function stripSpecifics(text) {
  return String(text || '')
    .replace(QUOTED_SLOGAN_RE, ' ')
    .replace(MEASUREMENT_RE, ' ')
    .replace(/(?:[,;]\s*){2,}/g, ', ')
    .replace(/\s+([,;:.])/g, '$1')
    .replace(/^[,;.\s]+|[,;.\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDegradedContent(text) {
  if (!text) return true;
  if (/(?:[,;]\s*){2,}/.test(text)) return true;
  if (/\b(?:including|text)\s*[,:.]?\s*$/i.test(text)) return true;
  if ((text.match(/;/g) || []).length >= 2) return true;
  return false;
}

function fallbackContent(slot) {
  const role = String(slot?.role || 'this role').trim();
  const kind = String(slot?.kind || '').toLowerCase();
  if (kind === 'infographic' || kind === 'feature_banner') {
    return `Shows ${role} information with product feature themes such as quality and durability.`;
  }
  if (kind === 'hero' || kind === 'lifestyle') {
    return `Shows the product in a typical ${role} setting.`;
  }
  if (kind === 'detail' || kind === 'comparison') {
    return `Shows ${role} details at a theme level, without listing specific measurements or claims.`;
  }
  return `Shows typical elements of a ${role} frame.`;
}

function finalizeContent(text, slot) {
  const raw = sanitizeBrief(text, MAX_CONTENT);
  if (!raw) return fallbackContent(slot);
  const cleaned = stripSpecifics(raw);
  if (isDegradedContent(cleaned)) return fallbackContent(slot);
  const rawNorm = raw.replace(/[.,;]+$/g, '').trim();
  const cleanedNorm = cleaned.replace(/[.,;]+$/g, '').trim();
  // Measurements or slogans mean the model ignored the generic-content contract.
  if (rawNorm !== cleanedNorm) return fallbackContent(slot);
  return cleaned;
}

function overlayCapForKind(kind, surface) {
  const k = String(kind || '').toLowerCase();
  if (k === 'hero') return surface === 'aplus' ? 1 : 0;
  if (k === 'lifestyle') return 1;
  if (k === 'comparison') return 1;
  if (k === 'detail') return 2;
  if (k === 'feature_banner') return surface === 'aplus' ? 5 : 3;
  if (k === 'infographic') return 5;
  return 3;
}

function deriveMaxCallouts({
  kind,
  surface,
  textPresentRate,
  medianFactCount,
  featureCount
}) {
  const cap = overlayCapForKind(kind, surface);
  const k = String(kind || '').toLowerCase();
  const rate = Number.isFinite(textPresentRate) ? textPresentRate : 0;
  const observed = Number.isFinite(medianFactCount) ? Math.max(0, Math.round(medianFactCount)) : 0;
  const features = Number.isFinite(featureCount) ? Math.max(0, featureCount) : 0;

  if (cap <= 0) return 0;

  // Gallery hero/lifestyle with only a logo or headline is photo-first, not a feature grid.
  if (surface === 'gallery' && (k === 'hero' || k === 'lifestyle') && observed <= 1) {
    return 0;
  }

  if (rate < 0.3 && observed <= 0) return 0;

  let n = Math.min(cap, observed, 8);
  if (features > 0) n = Math.min(n, features);
  return Math.max(0, n);
}

function normalizeFeaturePriority(raw, { photoOnly = false } = {}) {
  if (photoOnly) return [];
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    const text = sanitizeBrief(item, 40);
    if (!text || text.length > 48) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= MAX_FEATURES) break;
  }
  return out;
}

function isPhotoOnlySlot(slot, surface) {
  const kind = String(slot.kind || '').toLowerCase();
  const medianFacts = Number(slot._median_fact_count) || 0;
  const rate = Number(slot._text_present_rate) || 0;
  if (overlayCapForKind(slot.kind, surface) === 0) return true;
  if (rate < 0.3 && medianFacts <= 0) return true;
  if (surface === 'gallery' && (kind === 'hero' || kind === 'lifestyle') && medianFacts <= 1) {
    return true;
  }
  return false;
}

function fallbackFeaturePriority(slot, { photoOnly = false } = {}) {
  if (photoOnly) return [];
  return normalizeFeaturePriority(slot._board_facts || []);
}

function roleEvidenceFromSummary(summary) {
  return (summary?.roles || []).map((r) => ({
    canonical: r.role,
    kind: r.kind || 'supporting',
    prevalence: r.prevalence,
    per_listing: r.typical_per_listing,
    occurrences: r.total_cells,
    typical_position: r.typical_position,
    text_present_rate: r.text_present_rate ?? ((r.board_facts || []).length ? 1 : 0),
    median_fact_count: Number.isFinite(r.median_fact_count)
      ? r.median_fact_count
      : Math.min(5, (r.board_facts || []).length),
    content_tags: (r.content_tags || []).slice(0, 12),
    board_facts: (r.board_facts || []).slice(0, 20),
    board_layouts: (r.board_layouts || []).slice(0, 6),
    board_types: (r.board_types || []).slice(0, 6)
  }));
}

function buildEvidencePayload(visualStandard) {
  const pdp = visualStandard?.pdp_summary || {};
  const aplus = visualStandard?.aplus_summary || {};
  return {
    gallery: {
      listings_analyzed: pdp.n_analyzed || 0,
      image_count: pdp.image_count || {
        min: null,
        median: pdp.median_image_count ?? null,
        max: null
      },
      roles: roleEvidenceFromSummary(pdp)
    },
    aplus: {
      modules_analyzed: aplus.n_analyzed || 0,
      module_count: aplus.image_count || {
        min: null,
        median: aplus.median_image_count ?? null,
        max: null
      },
      roles: roleEvidenceFromSummary(aplus)
    }
  };
}

function indexRolesByKey(roles) {
  const map = new Map();
  for (const role of roles || []) {
    const key = normalizeRoleKey(role.canonical || role.role);
    if (!key) continue;
    map.set(key, role);
  }
  return map;
}

function slotFromMatchedRole(matched, priority, order) {
  return {
    role: matched.canonical,
    kind: matched.kind || 'supporting',
    priority: priority === 'extended' ? 'extended' : 'core',
    order,
    evidence: {
      prevalence: matched.prevalence,
      per_listing: matched.per_listing,
      typical_position: matched.typical_position
    },
    _content_tags: matched.content_tags || [],
    _board_facts: matched.board_facts || [],
    _board_layouts: matched.board_layouts || [],
    _board_types: matched.board_types || [],
    _text_present_rate: matched.text_present_rate ?? 0,
    _median_fact_count: matched.median_fact_count ?? 0
  };
}

function describeTrack(track) {
  if (track == null) return 'missing';
  if (Array.isArray(track)) return `array(len=${track.length})`;
  if (typeof track !== 'object') return typeof track;
  const slots = track.slots;
  return (
    `{keys=[${Object.keys(track).join(',')}]`
    + `; recommended_build=${track.recommended_build ?? 'n/a'}`
    + `; slots=${Array.isArray(slots) ? `array(${slots.length})` : String(typeof slots)}}`
  );
}

function describeComposition(composition) {
  if (!composition || typeof composition !== 'object') {
    return `type=${typeof composition}`;
  }
  return (
    `keys=[${Object.keys(composition).join(',')}]`
    + `; gallery=${describeTrack(composition.gallery)}`
    + `; aplus=${describeTrack(composition.aplus)}`
  );
}

function requireCompositionTracks(composition) {
  const gallery = composition?.gallery;
  const aplus = composition?.aplus;
  const gallerySlots = Array.isArray(gallery?.slots) ? gallery.slots.length : 0;
  const aplusSlots = Array.isArray(aplus?.slots) ? aplus.slots.length : 0;
  if (gallerySlots > 0 && aplusSlots > 0) return;

  throw new Error(
    'image_plan composition tool payload is missing gallery/aplus slots'
    + ` (${describeComposition(composition)}).`
    + ' This is a tool-payload shape/parse failure, not a category with zero image roles.'
  );
}

function emptyTrackPlan(surface, reason) {
  const observedKey = surface === 'gallery' ? 'listings_analyzed' : 'modules_analyzed';
  const countKey = surface === 'gallery' ? 'image_count' : 'module_count';
  return {
    observed: {
      [observedKey]: 0,
      [countKey]: { min: null, median: null, max: null }
    },
    recommended_build: 0,
    build_rationale: reason,
    slots: [],
    reason
  };
}

function attachObserved(trackPlan, evidenceSurface, surface) {
  const observedKey = surface === 'gallery' ? 'listings_analyzed' : 'modules_analyzed';
  const countKey = surface === 'gallery' ? 'image_count' : 'module_count';
  return {
    ...trackPlan,
    observed: {
      [observedKey]: evidenceSurface?.[observedKey] || 0,
      [countKey]: evidenceSurface?.[countKey] || { min: null, median: null, max: null }
    }
  };
}

async function writeSlotBrief({ llm, category, surface, slot }) {
  const response = await llm.completeTool({
    system:
      'You write a short slot brief for one Amazon listing image idea. '
      + 'Describe the observed pattern, then name generic theme families that belong inside. '
      + 'Never copy printed measurements, SKUs, slogans, brand names, or exact feature names. '
      + 'Never write image-generation prompts, camera settings, or Midjourney/DALL-E language.',
    tool: BRIEF_TOOL,
    user: `Category: ${category}
Surface: ${surface}

Slot:
${compactJson({
    role: slot.role,
    kind: slot.kind,
    priority: slot.priority,
    order: slot.order,
    evidence: slot.evidence
  })}

Evidence from competitor images of this role only (scene and layout — not printed copy):
${compactJson({
    content_tags: slot._content_tags || [],
    board_layouts: slot._board_layouts || [],
    board_types: slot._board_types || []
  })}

Write the slot brief from this role's competitor evidence only.
content: one generic sentence naming theme families (e.g. "Shows dimensions and product features such as quality and durability."). Do not list exact sizes, materials, slogans, or feature names from listings.
feature_priority: ranked short claim families this slot may print (e.g. "anti-slip", "easy clean"). Empty array when the slot is photo-only with no overlay.
Do not copy long slogans, brand names, or SKU-specific numbers into feature_priority.`,
    maxTokens: 1024
  });

  const photoOnly = isPhotoOnlySlot(slot, surface);

  const feature_priority = normalizeFeaturePriority(response?.feature_priority, { photoOnly });
  const features = feature_priority.length
    ? feature_priority
    : fallbackFeaturePriority(slot, { photoOnly });

  return {
    pattern: sanitizeBrief(response?.pattern || slot.role, MAX_PATTERN),
    content: finalizeContent(response?.content, slot),
    feature_priority: features,
    max_callouts: deriveMaxCallouts({
      kind: slot.kind,
      surface,
      textPresentRate: slot._text_present_rate,
      medianFactCount: slot._median_fact_count,
      featureCount: features.length
    })
  };
}

async function enrichSlotsWithBriefs({ llm, category, surface, slots }) {
  if (!slots.length) return [];

  const briefs = await mapWithConcurrency(slots, Math.min(12, slots.length), async (slot) => {
    try {
      return await writeSlotBrief({ llm, category, surface, slot });
    } catch (_) {
      const photoOnly = isPhotoOnlySlot(slot, surface);
      const feature_priority = fallbackFeaturePriority(slot, { photoOnly });
      return {
        pattern: sanitizeBrief(slot.role, MAX_PATTERN),
        content: fallbackContent(slot),
        feature_priority,
        max_callouts: deriveMaxCallouts({
          kind: slot.kind,
          surface,
          textPresentRate: slot._text_present_rate,
          medianFactCount: slot._median_fact_count,
          featureCount: feature_priority.length
        })
      };
    }
  });

  return slots.map((slot, index) => {
    const {
      _content_tags,
      _board_facts,
      _board_layouts,
      _board_types,
      _text_present_rate,
      _median_fact_count,
      ...rest
    } = slot;
    return {
      ...rest,
      order: index + 1,
      pattern: briefs[index].pattern,
      content: briefs[index].content,
      feature_priority: briefs[index].feature_priority || [],
      max_callouts: briefs[index].max_callouts ?? 0
    };
  });
}

function finalizeCompositionTrack(rawTrack, evidenceSurface, surface) {
  const roles = evidenceSurface?.roles || [];
  if (!roles.length) {
    return emptyTrackPlan(
      surface,
      `No usable ${surface} roles observed; emitting empty plan rather than inventing slots.`
    );
  }

  const roleMap = indexRolesByKey(roles);
  const accepted = [];
  const dropped = [];

  const orderedRaw = [...(rawTrack?.slots || [])].sort((a, b) => {
    const ao = Number.isFinite(a.order) ? a.order : 999;
    const bo = Number.isFinite(b.order) ? b.order : 999;
    return ao - bo;
  });

  const acceptedKeys = new Set();
  for (const raw of orderedRaw) {
    const key = normalizeRoleKey(raw?.role);
    const matched = roleMap.get(key);
    if (!matched) {
      if (raw?.role) dropped.push(String(raw.role));
      continue;
    }
    if (acceptedKeys.has(key)) continue;
    acceptedKeys.add(key);
    accepted.push(slotFromMatchedRole(matched, raw.priority, accepted.length + 1));
  }

  if (!accepted.length) {
    const rawRoles = (rawTrack?.slots || []).map((s) => s?.role).filter(Boolean);
    throw new Error(
      `image_plan ${surface}: composition returned no slots that match observed roles`
      + ` (raw_slots=${rawRoles.length || 0}`
      + `; dropped=[${dropped.slice(0, 12).join('; ')}]`
      + `; observed_roles=${roles.length}`
      + `; recommended_build=${rawTrack?.recommended_build ?? 'n/a'}`
      + `; track_shape=${describeTrack(rawTrack)})`
    );
  }

  const coreCount = accepted.filter((s) => s.priority === 'core').length;
  let recommended_build = Number.isFinite(rawTrack?.recommended_build)
    ? Math.max(0, Math.round(rawTrack.recommended_build))
    : coreCount;
  if (recommended_build > accepted.length) recommended_build = accepted.length;
  if (recommended_build === 0 && accepted.length) {
    recommended_build = Math.min(accepted.length, Math.max(coreCount, 1));
  }

  let cores = accepted.filter((s) => s.priority === 'core').length;
  if (cores < recommended_build) {
    for (const slot of accepted) {
      if (cores >= recommended_build) break;
      if (slot.priority !== 'core') {
        slot.priority = 'core';
        cores += 1;
      }
    }
  }

  return attachObserved({
    recommended_build,
    build_rationale: sanitizeBrief(
      rawTrack?.build_rationale
        || `Composition for ${accepted.length} ${surface} slots`,
      240
    ),
    slots: accepted,
    _dropped_roles: dropped
  }, evidenceSurface, surface);
}

async function buildImagePlan({ llm, visualStandard, category }) {
  const evidence = buildEvidencePayload(visualStandard);

  let composition = {
    gallery: { recommended_build: 0, build_rationale: '', slots: [] },
    aplus: { recommended_build: 0, build_rationale: '', slots: [] }
  };

  if (evidence.gallery.roles.length || evidence.aplus.roles.length) {
    composition = await llm.completeTool({
      system:
        'You decide Amazon PDP gallery and A+ image slot composition from observed evidence. '
        + 'Read the leverage in the category. Justify every slot from the numbers given. '
        + 'Do not invent roles. Prefer splitting work between gallery and A+ instead of duplicating. '
        + 'You are not told how many slots to produce — decide from the evidence.',
      tool: COMPOSITION_TOOL,
      user: `Category: ${category}

Evidence for both surfaces:
${compactJson(evidence)}

Decide gallery and A+ slot composition from this evidence.
- role must be copied exactly from that surface's roles[].canonical
- Prefer splitting work between gallery and A+ instead of duplicating
- Do not invent roles that are not in the evidence`,
      maxTokens: 4096
    });
    requireCompositionTracks(composition);
  }

  const galleryDraft = finalizeCompositionTrack(
    composition?.gallery,
    evidence.gallery,
    'gallery'
  );
  const aplusDraft = finalizeCompositionTrack(
    composition?.aplus,
    evidence.aplus,
    'aplus'
  );

  const [gallerySlots, aplusSlots] = await Promise.all([
    enrichSlotsWithBriefs({
      llm,
      category,
      surface: 'gallery',
      slots: galleryDraft.slots
    }),
    enrichSlotsWithBriefs({
      llm,
      category,
      surface: 'aplus',
      slots: aplusDraft.slots
    })
  ]);

  const { _dropped_roles: _gDrop, ...galleryRest } = galleryDraft;
  const { _dropped_roles: _aDrop, ...aplusRest } = aplusDraft;

  return {
    gallery: {
      ...galleryRest,
      slots: gallerySlots
    },
    aplus: {
      ...aplusRest,
      slots: aplusSlots
    }
  };
}

module.exports = {
  buildImagePlan,
  buildEvidencePayload,
  finalizeCompositionTrack,
  requireCompositionTracks,
  describeComposition,
  sanitizeBrief,
  stripSpecifics,
  fallbackContent,
  finalizeContent,
  deriveMaxCallouts,
  overlayCapForKind,
  normalizeFeaturePriority
};
