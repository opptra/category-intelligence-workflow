function extractASIN(url) {
  const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  return asinMatch ? asinMatch[1].toUpperCase() : null;
}

function extractDomain(url) {
  const domainMatch = url.match(/https?:\/\/(www\.amazon\.[a-z.]+)/i);
  return domainMatch ? domainMatch[1] : 'www.amazon.in';
}

function parsePriceText(text) {
  if (!text) {
    return null;
  }

  const normalized = text.replace(/[^\d.,]/g, '').replace(/,/g, '');
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseRatingText(text) {
  if (!text) {
    return null;
  }

  const match = text.match(/([\d.]+)\s+out of\s+5/i);
  return match ? parseFloat(match[1]) : null;
}

function parseReviewCount(text) {
  if (!text) {
    return null;
  }

  const match = text.replace(/,/g, '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

module.exports = {
  extractASIN,
  extractDomain,
  parsePriceText,
  parseRatingText,
  parseReviewCount
};
