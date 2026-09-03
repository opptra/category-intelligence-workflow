const CORPUS_SOURCES = Object.freeze({
  BESTSELLERS: 'bestsellers',
  USER_SELECTED: 'user_selected'
});

function normalizeCorpusSource(value, { topSellersSource } = {}) {
  if (value === CORPUS_SOURCES.USER_SELECTED || value === CORPUS_SOURCES.BESTSELLERS) {
    return value;
  }
  if (topSellersSource === 'user-selected') {
    return CORPUS_SOURCES.USER_SELECTED;
  }
  return CORPUS_SOURCES.BESTSELLERS;
}

function competitiveSetNoun(corpusSource) {
  return corpusSource === CORPUS_SOURCES.USER_SELECTED
    ? 'this user-selected competitive set'
    : 'category leaders / top sellers';
}

function competitiveSetShort(corpusSource) {
  return corpusSource === CORPUS_SOURCES.USER_SELECTED
    ? 'the competitive set'
    : 'category leaders';
}

function summarySystemPrompt(corpusSource) {
  if (corpusSource === CORPUS_SOURCES.USER_SELECTED) {
    return 'You write a concise Amazon category intelligence summary focused on how this user-selected competitive set wins.';
  }
  return 'You write a concise Amazon category intelligence summary focused on how top sellers win.';
}

function summaryUserRules(corpusSource, nOurs) {
  const setNoun = competitiveSetNoun(corpusSource);
  const lines = [
    `Write a category summary from the research.`,
    `- Primary: how ${setNoun} win (patterns, vocabulary, buyer expectations)`,
    nOurs > 0
      ? '- Secondary: catalog-level gaps vs that bar when supported'
      : '- Do not invent gaps vs our listings; no own listings were provided',
    '- No ASINs, no framework IDs'
  ];
  if (corpusSource === CORPUS_SOURCES.USER_SELECTED) {
    lines.push('- Do not call this corpus top sellers, best sellers, or Amazon rank leaders unless the research itself states BSR ranks');
  }
  return lines.join('\n');
}

function vocUserRules(nOurs) {
  if (nOurs > 0) {
    return `- voice_of_customer.observations: required non-empty narrative merging leader/our mines (write this BEFORE signals; no leaders/ours buckets)
- voice_of_customer.signals: buyer phrases with sentiment (praise, complaint, objection, neutral), relevance, and approximate mention_count; include complaints and objections, not only praise; prefer ~25–40 when the sample supports it
- No ASINs, no source labels`;
  }
  return `- voice_of_customer.observations: required non-empty narrative from the competitive-set review mine only (write this BEFORE signals). Do not invent an "our catalog" comparison.
- voice_of_customer.signals: buyer phrases with sentiment (praise, complaint, objection, neutral), relevance, and approximate mention_count; include complaints and objections, not only praise; prefer ~25–40 when the sample supports it
- No ASINs, no source labels`;
}

function topicActionRule(nOurs) {
  if (nOurs > 0) {
    return '- actions are category-wide, not our-SKU specific';
  }
  return '- actions are category listing guidance for this competitive set, not gaps vs our SKUs (no own listings were provided)';
}

function visualSurfaceLabel(corpusSource) {
  return corpusSource === CORPUS_SOURCES.USER_SELECTED
    ? 'competitive-set'
    : 'leader';
}

module.exports = {
  CORPUS_SOURCES,
  normalizeCorpusSource,
  competitiveSetNoun,
  competitiveSetShort,
  summarySystemPrompt,
  summaryUserRules,
  vocUserRules,
  topicActionRule,
  visualSurfaceLabel
};
