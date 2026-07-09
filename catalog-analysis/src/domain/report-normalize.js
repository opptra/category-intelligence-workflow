const RELEVANCE_RANK = { high: 0, medium: 1, low: 2 };
const SENTIMENT_RANK = { complaint: 0, objection: 1, praise: 2, neutral: 3 };

const MAX_LEXICON_OUTPUT = 50;
const MAX_SIGNALS_OUTPUT = 40;

function filterLexiconTerms(terms) {
  return terms
    .filter((t) => t.relevance === 'high' || t.relevance === 'medium')
    .sort((a, b) => {
      const rank = (RELEVANCE_RANK[a.relevance] ?? 9) - (RELEVANCE_RANK[b.relevance] ?? 9);
      if (rank !== 0) return rank;
      return a.term.localeCompare(b.term);
    })
    .slice(0, MAX_LEXICON_OUTPUT)
    .map((t) => ({
      term: t.term,
      relevance: t.relevance
    }));
}

function filterVoiceSignals(signals) {
  return signals
    .filter((s) => s.relevance === 'high' || s.relevance === 'medium')
    .sort((a, b) => {
      const rel = (RELEVANCE_RANK[a.relevance] ?? 9) - (RELEVANCE_RANK[b.relevance] ?? 9);
      if (rel !== 0) return rel;
      const mentions = (b.mention_count || 0) - (a.mention_count || 0);
      if (mentions !== 0) return mentions;
      return (SENTIMENT_RANK[a.sentiment] ?? 9) - (SENTIMENT_RANK[b.sentiment] ?? 9);
    })
    .slice(0, MAX_SIGNALS_OUTPUT)
    .map((s) => ({
      phrase: s.phrase,
      sentiment: s.sentiment,
      relevance: s.relevance,
      mention_count: s.mention_count
    }));
}

function normalizeReportSections({ category_lexicon, voice_of_customer }) {
  return {
    category_lexicon: {
      observations: category_lexicon.observations,
      terms: filterLexiconTerms(category_lexicon.terms)
    },
    voice_of_customer: {
      observations: voice_of_customer.observations,
      signals: filterVoiceSignals(voice_of_customer.signals)
    }
  };
}

module.exports = {
  filterLexiconTerms,
  filterVoiceSignals,
  normalizeReportSections,
  MAX_LEXICON_OUTPUT,
  MAX_SIGNALS_OUTPUT
};
