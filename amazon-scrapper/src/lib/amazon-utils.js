function extractASIN(url) {
  const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  return asinMatch ? asinMatch[1].toUpperCase() : null;
}

function extractDomain(url) {
  const domainMatch = url.match(/https?:\/\/(www\.amazon\.[a-z.]+)/i);
  return domainMatch ? domainMatch[1] : 'www.amazon.in';
}

module.exports = {
  extractASIN,
  extractDomain
};
