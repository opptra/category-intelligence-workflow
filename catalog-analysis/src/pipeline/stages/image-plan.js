const { normalizeRoleKey } = require('./visual-summary');
const { toolDefinition } = require('../../utils/schema-tools');
const { compactJson } = require('../../utils/prompt-data');
const { mapWithConcurrency } = require('./images');

const COMPOSITION_TOOL = toolDefinition(
  'image-plan-composition',
  'Decide gallery and A+ slot composition from observed evidence (counts, roles, priorities)'
);

const BRIEF_TOOL = toolDefinition(
  'image-plan-brief',
  'Write pattern and content brief for one image slot from that slot\'s evidence only'
);

const MAX_PATTERN = 120;
const MAX_CONTENT = 220;
const PROMPT_PREFIX_RE = /^(generate|create|make|produce|render|draw|design an? image|midjourney|dall[- ]?e)\b[:\s-]*/i;

function sanitizeBrief(text, softMax) {
  let cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(PROMPT_PREFIX_RE, '').trim();
  // Soft safety cap only for pathological output — never ellipsis-trim normal briefs.
  if (Number.isFinite(softMax) && cleaned.length > softMax * 3) {
    return cleaned.slice(0, softMax * 3);
  }
  return cleaned;
}

function roleEvidenceFromSummary(summary) {
  return (summary?.roles || []).map((r) => ({
    canonical: r.role,
    kind: r.kind || 'supporting',
    prevalence: r.prevalence,
    per_listing: r.typical_per_listing,
    occurrences: r.total_cells,
    typical_position: r.typical_position,
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
      + 'Describe the observed pattern and what belongs inside. '
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

Evidence from competitor images of this role only:
${compactJson({
    content_tags: slot._content_tags || [],
    board_facts: slot._board_facts || [],
    board_layouts: slot._board_layouts || [],
    board_types: slot._board_types || []
  })}

Write the slot brief from this role's competitor evidence only.
For text boards, use the actual printed facts from evidence.`,
    maxTokens: 1024
  });

  return {
    pattern: sanitizeBrief(response?.pattern || slot.role, MAX_PATTERN),
    content: sanitizeBrief(
      response?.content
        || (slot._board_facts?.length
          ? slot._board_facts.slice(0, 8).join('; ')
          : `Include elements typical of leader "${slot.role}" frames.`),
      MAX_CONTENT
    )
  };
}

async function enrichSlotsWithBriefs({ llm, category, surface, slots }) {
  if (!slots.length) return [];

  const briefs = await mapWithConcurrency(slots, Math.min(12, slots.length), async (slot) => {
    try {
      return await writeSlotBrief({ llm, category, surface, slot });
    } catch (_) {
      return {
        pattern: sanitizeBrief(slot.role, MAX_PATTERN),
        content: sanitizeBrief(
          slot._board_facts?.length
            ? slot._board_facts.slice(0, 8).join('; ')
            : `Include elements typical of leader "${slot.role}" frames.`,
          MAX_CONTENT
        )
      };
    }
  });

  return slots.map((slot, index) => {
    const {
      _content_tags,
      _board_facts,
      _board_layouts,
      _board_types,
      ...rest
    } = slot;
    return {
      ...rest,
      order: index + 1,
      pattern: briefs[index].pattern,
      content: briefs[index].content
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

  for (const raw of orderedRaw) {
    const matched = roleMap.get(normalizeRoleKey(raw?.role));
    if (!matched) {
      if (raw?.role) dropped.push(String(raw.role));
      continue;
    }
    accepted.push({
      role: matched.canonical,
      kind: matched.kind || 'supporting',
      priority: raw.priority === 'extended' ? 'extended' : 'core',
      order: accepted.length + 1,
      evidence: {
        prevalence: matched.prevalence,
        per_listing: matched.per_listing,
        typical_position: matched.typical_position
      },
      _content_tags: matched.content_tags || [],
      _board_facts: matched.board_facts || [],
      _board_layouts: matched.board_layouts || [],
      _board_types: matched.board_types || []
    });
  }

  if (!accepted.length) {
    const sorted = [...roles].sort((a, b) => {
      const pa = Number.isFinite(a.typical_position) ? a.typical_position : 999;
      const pb = Number.isFinite(b.typical_position) ? b.typical_position : 999;
      return pa - pb || (b.prevalence || 0) - (a.prevalence || 0);
    });
    for (const role of sorted) {
      accepted.push({
        role: role.canonical,
        kind: role.kind || 'supporting',
        priority: 'extended',
        order: accepted.length + 1,
        evidence: {
          prevalence: role.prevalence,
          per_listing: role.per_listing,
          typical_position: role.typical_position
        },
        _content_tags: role.content_tags || [],
        _board_facts: role.board_facts || [],
        _board_layouts: role.board_layouts || [],
        _board_types: role.board_types || []
      });
    }
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
        || `Derived from ${roles.length} observed ${surface} roles`,
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
  sanitizeBrief
};
