const BACKEND_KEYWORD_LIMIT_BYTES = {
  IN: 200,
  US: 249,
  EU: 249,
  DE: 249,
  UK: 249,
  GB: 249,
  JP: 500
};

const MAX_BACKEND_TERMS = 20;

function resolveMarketplaceLimit(marketplace) {
  const key = String(marketplace || 'IN').toUpperCase().replace(/^AMAZON\./, '');
  if (BACKEND_KEYWORD_LIMIT_BYTES[key]) return BACKEND_KEYWORD_LIMIT_BYTES[key];
  if (key.includes('IN')) return BACKEND_KEYWORD_LIMIT_BYTES.IN;
  if (key.includes('JP')) return BACKEND_KEYWORD_LIMIT_BYTES.JP;
  if (key.includes('US') || key.includes('EU') || key.includes('DE') || key.includes('UK') || key.includes('GB')) {
    return BACKEND_KEYWORD_LIMIT_BYTES.US;
  }
  return BACKEND_KEYWORD_LIMIT_BYTES.IN;
}

function normalizeTerm(term) {
  return String(term || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024f\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function termByteLength(term) {
  return Buffer.byteLength(term, 'utf8');
}

function wordsIn(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\u00C0-\u024f\s]/gi, ' ')
      .split(/\s+/)
      .filter(Boolean)
  );
}

function collectCandidateTerms({ categoryLexicon, keywordMap, missingLexiconTerms }) {
  const out = [];
  const seen = new Set();

  const push = (raw) => {
    const term = normalizeTerm(raw);
    if (!term || seen.has(term)) return;
    seen.add(term);
    out.push(term);
  };

  for (const entry of categoryLexicon?.terms || []) {
    push(entry.term || entry);
  }
  for (const term of missingLexiconTerms || []) {
    push(term);
  }
  for (const bucket of ['vernacular', 'long_tail', 'head', 'occasion']) {
    for (const term of keywordMap?.[bucket] || []) {
      push(term);
    }
  }

  return out;
}

function buildOurCopyBlob(ours = []) {
  return ours.map((p) => ([
    p.title,
    p.brand,
    ...(p.feature_bullets || []),
    ...(p.item_highlights || []),
    ...(p.aplus_text_blocks || []).slice(0, 4)
  ].filter(Boolean).join(' '))).join(' ');
}

/**
 * Build Seller Central-style backend keywords as an array with marketplace byte budget.
 * Terms already present in our visible copy are excluded (Amazon rejects duplicates).
 */
function buildBackendKeywords({
  marketplace,
  categoryLexicon,
  keywordMap,
  missingLexiconTerms,
  ours
}) {
  const limit = resolveMarketplaceLimit(marketplace);
  const ourCopy = buildOurCopyBlob(ours).toLowerCase();
  const ourWords = wordsIn(ourCopy);
  const candidates = collectCandidateTerms({
    categoryLexicon,
    keywordMap,
    missingLexiconTerms
  });

  const excluded = [];
  const accepted = [];
  let usedBytes = 0;
  const usedWords = new Set();

  for (const term of candidates) {
    if (accepted.length >= MAX_BACKEND_TERMS) break;

    // Exclude if the whole phrase already appears in visible copy.
    if (ourCopy.includes(term)) {
      excluded.push(term);
      continue;
    }

    const termWords = term.split(/\s+/).filter(Boolean);
    // Exclude if every word of the term is already somewhere in title/bullets/brand.
    if (termWords.length && termWords.every((w) => ourWords.has(w) || usedWords.has(w))) {
      excluded.push(term);
      continue;
    }

    // Skip terms that would introduce only already-used backend words (Seller Central rule).
    if (termWords.some((w) => usedWords.has(w))) {
      continue;
    }

    const nextBytes = usedBytes === 0
      ? termByteLength(term)
      : usedBytes + 1 + termByteLength(term); // single space separator for paste_string accounting
    if (nextBytes > limit) {
      continue;
    }

    accepted.push(term);
    usedBytes = nextBytes;
    for (const w of termWords) usedWords.add(w);
  }

  return {
    marketplace_limit_bytes: limit,
    used_bytes: usedBytes,
    terms: accepted,
    excluded_because_already_in_copy: excluded.slice(0, 30),
    paste_string: accepted.join(' ')
  };
}

module.exports = {
  BACKEND_KEYWORD_LIMIT_BYTES,
  resolveMarketplaceLimit,
  buildBackendKeywords
};
