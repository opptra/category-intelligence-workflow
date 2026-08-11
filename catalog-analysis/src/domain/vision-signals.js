/**
 * Pluggable derived signals from open-vocabulary content_tags.
 * Add a new detector here — no schema, prompt, or pipeline changes elsewhere.
 */

function tagsText(tags) {
  return (Array.isArray(tags) ? tags : []).map((t) => String(t || '').toLowerCase()).join(' ');
}

const SIGNAL_DETECTORS = {
  human_presence: (tags) =>
    /human|person|people|model|hand|family|face|child|woman|man|buyer|customer/.test(tagsText(tags))
};

function detectSignals(tags) {
  const result = {};
  for (const [name, detector] of Object.entries(SIGNAL_DETECTORS)) {
    result[name] = Boolean(detector(tags));
  }
  return result;
}

function detectSignalsFromCells(cells = []) {
  const allTags = cells.flatMap((cell) => cell.content_tags || []);
  return detectSignals(allTags);
}

module.exports = {
  SIGNAL_DETECTORS,
  detectSignals,
  detectSignalsFromCells
};
