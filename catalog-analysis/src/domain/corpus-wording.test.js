const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeCorpusSource,
  competitiveSetNoun,
  summarySystemPrompt,
  vocUserRules,
  topicActionRule
} = require('./corpus-wording');

describe('corpus-wording', () => {
  it('maps envelope sources to corpus_source', () => {
    assert.equal(normalizeCorpusSource(undefined, { topSellersSource: 'user-selected' }), 'user_selected');
    assert.equal(normalizeCorpusSource(undefined, { topSellersSource: 'best-sellers' }), 'bestsellers');
    assert.equal(normalizeCorpusSource('user_selected'), 'user_selected');
  });

  it('does not call a user-selected corpus top sellers', () => {
    const noun = competitiveSetNoun('user_selected');
    assert.match(noun, /user-selected competitive set/);
    assert.doesNotMatch(noun, /top sellers/i);
    assert.doesNotMatch(summarySystemPrompt('user_selected'), /top sellers/i);
  });

  it('skips our-catalog merge language when n_ours is 0', () => {
    assert.match(vocUserRules(0), /Do not invent an "our catalog" comparison/);
    assert.match(topicActionRule(0), /no own listings were provided/i);
  });
});
