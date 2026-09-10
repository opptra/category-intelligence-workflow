const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { coerceToolPayload, extractToolArguments } = require('./llm-openrouter');

describe('coerceToolPayload', () => {
  it('does not unwrap a tool-name wrapper when gallery/aplus are already at the top level', () => {
    const parsed = {
      gallery: { recommended_build: 4, slots: [{ role: 'styled_room', priority: 'core', order: 1 }] },
      aplus: { recommended_build: 2, slots: [{ role: 'Brand Hero', priority: 'core', order: 1 }] },
      image_plan_composition: { gallery: { slots: [] }, aplus: { slots: [] } }
    };
    const out = coerceToolPayload(parsed, 'image_plan_composition');
    assert.equal(out.gallery.slots.length, 1);
    assert.equal(out.gallery.slots[0].role, 'styled_room');
  });

  it('still unwraps { toolName: payload } when the outer object is only a wrapper', () => {
    const inner = { topics: [{ name: 'title' }] };
    const out = coerceToolPayload({ synthesize_topics: inner }, 'synthesize_topics');
    assert.deepEqual(out, inner);
  });
});

describe('extractToolArguments', () => {
  it('refuses truncated tool calls instead of repairing them into empty slots', () => {
    assert.throws(
      () => extractToolArguments({
        choices: [{
          finish_reason: 'length',
          message: {
            tool_calls: [{
              function: {
                name: 'image_plan_composition',
                arguments: '{"gallery":{'
              }
            }]
          }
        }]
      }, 'image_plan_composition'),
      /truncated/
    );
  });
});
