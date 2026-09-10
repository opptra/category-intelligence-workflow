const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { finalizeCompositionTrack, requireCompositionTracks } = require('./image-plan');

function role(canonical, extras = {}) {
  return {
    canonical,
    kind: extras.kind || 'supporting',
    prevalence: extras.prevalence ?? 1,
    per_listing: extras.per_listing ?? 1,
    typical_position: extras.typical_position ?? 0,
    content_tags: [],
    board_facts: [],
    board_layouts: [],
    board_types: [],
    text_present_rate: 0,
    median_fact_count: 0
  };
}

describe('finalizeCompositionTrack', () => {
  it('throws when the model returns no slots instead of inventing a fallback', () => {
    assert.throws(
      () => finalizeCompositionTrack(
        { slots: [], recommended_build: 0 },
        { roles: [role('styled_room', { kind: 'hero' })] },
        'gallery'
      ),
      /no slots that match observed roles/
    );
  });

  it('does not clone the same canonical role into two slots', () => {
    const plan = finalizeCompositionTrack(
      {
        recommended_build: 2,
        slots: [
          { role: 'styled_room', priority: 'core', order: 1 },
          { role: 'styled_room', priority: 'core', order: 2 }
        ]
      },
      { roles: [role('styled_room', { kind: 'hero', per_listing: 2.5 })] },
      'gallery'
    );
    assert.equal(plan.slots.length, 1);
    assert.equal(plan.slots[0].role, 'styled_room');
  });
});

describe('requireCompositionTracks', () => {
  it('rejects a payload with no gallery track (the n/a recommended_build case)', () => {
    assert.throws(
      () => requireCompositionTracks({ aplus: { recommended_build: 3, slots: [{ role: 'Brand Hero', priority: 'core', order: 1 }] } }),
      /tool payload is missing gallery\/aplus slots/
    );
  });

  it('rejects empty gallery slots even if the gallery object exists', () => {
    assert.throws(
      () => requireCompositionTracks({
        gallery: { recommended_build: 0, build_rationale: '', slots: [] },
        aplus: { recommended_build: 1, slots: [{ role: 'Brand Hero', priority: 'core', order: 1 }] }
      }),
      /missing gallery\/aplus slots/
    );
  });
});
