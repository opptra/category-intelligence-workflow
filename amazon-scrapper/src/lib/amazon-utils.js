function extractASIN(url) {
  const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
  return asinMatch ? asinMatch[1].toUpperCase() : null;
}

function extractDomain(url) {
  const domainMatch = url.match(/https?:\/\/(www\.amazon\.[a-z.]+)/i);
  return domainMatch ? domainMatch[1] : 'www.amazon.in';
}

function isGenericBreadcrumbLabel(name) {
  if (!name || typeof name !== 'string') return true;
  const cleaned = name.replace(/\s+/g, ' ').trim();
  if (!cleaned) return true;
  if (/^undefined$/i.test(cleaned)) return true;
  if (/^(home|amazon|all departments|departments)$/i.test(cleaned)) return true;
  if (/^best\s*sellers?$/i.test(cleaned)) return true;
  if (/^amazon(\.in)?\s+best\s*sellers?$/i.test(cleaned)) return true;
  return false;
}

/**
 * Leaf breadcrumb on a PDP is the browse-node category (e.g. "Duvet Cover Sets").
 * Prefer majority vote across products so one mis-scraped crumb doesn't win.
 */
function categoryFromBreadcrumbs(products = []) {
  const counts = new Map();

  for (const product of products) {
    if (!product || product.error) continue;
    const crumbs = Array.isArray(product.breadcrumbs) ? product.breadcrumbs : [];
    for (let i = crumbs.length - 1; i >= 0; i--) {
      const label = String(crumbs[i] || '').replace(/\s+/g, ' ').trim();
      if (isGenericBreadcrumbLabel(label)) continue;
      counts.set(label, (counts.get(label) || 0) + 1);
      break;
    }
  }

  let best = null;
  let bestCount = 0;
  for (const [label, count] of counts.entries()) {
    if (count > bestCount || (count === bestCount && (!best || label.localeCompare(best) < 0))) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

module.exports = {
  extractASIN,
  extractDomain,
  isGenericBreadcrumbLabel,
  categoryFromBreadcrumbs
};
