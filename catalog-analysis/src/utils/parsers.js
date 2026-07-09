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

function parseBestSellersRank(text) {
  if (!text) {
    return { rank: null, node: null, raw: null };
  }

  const matches = [...text.matchAll(/#(\d[\d,]*)\s+in\s+([^(#]+)/gi)];
  if (!matches.length) {
    return { rank: null, node: null, raw: text };
  }

  const last = matches[matches.length - 1];
  const rank = parseInt(last[1].replace(/,/g, ''), 10);
  const node = last[2].trim();

  return { rank, node, raw: text };
}

function parseDimensions(product) {
  const details = product.product_details || {};
  const sizeText = details.Size || '';
  const dimsText = details['Item Dimensions L x W'] || '';

  const feetMatch = sizeText.match(/(\d+(?:\.\d+)?)\s*(?:feet|ft|Feet|FT)/i)
    || product.title?.match(/(\d+(?:\.\d+)?)\s*(?:feet|ft|Feet|FT)/i);
  const cmMatch = dimsText.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:cm|meters?|m)/i)
    || product.title?.match(/(\d+)\s*[xX×]\s*(\d+)\s*cm/i);
  const inchMatch = product.title?.match(/(\d+)\s*[xX×]\s*(\d+)\s*inch/i);

  return {
    size_label: sizeText || null,
    feet: feetMatch ? parseFloat(feetMatch[1]) : null,
    width_m: cmMatch ? parseFloat(cmMatch[2]) : null,
    length_m: cmMatch ? parseFloat(cmMatch[1]) : null,
    width_in: inchMatch ? parseInt(inchMatch[1], 10) : null,
    length_in: inchMatch ? parseInt(inchMatch[2], 10) : null,
    raw_dimensions: dimsText || null
  };
}

function parsePackCount(product) {
  const details = product.product_details || {};
  const candidates = [
    details['Number of Items'],
    details['Unit Count'],
    details['Included Components'],
    product.title
  ].filter(Boolean);

  for (const text of candidates) {
    const match = String(text).match(/(?:set of|pack of)\s*(\d+)/i)
      || String(text).match(/^(\d+)(?:\.\d+)?\s*(?:piece|count|panel)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return null;
}

module.exports = {
  parsePriceText,
  parseRatingText,
  parseReviewCount,
  parseBestSellersRank,
  parseDimensions,
  parsePackCount
};
