function isVideoUrl(url) {
  if (!url) {
    return true;
  }

  return /play-button|\.mp4(?:\?|$)|\/video\/|PKplay|videoBlock|vse-vms/i.test(url);
}

function isPlaceholderUrl(url) {
  if (!url) {
    return true;
  }

  return /grey-pixel|transparent-pixel|\/G\/01\/x-locale\/common\/|spacer\.gif|data:image/i.test(url);
}

function toHiResImageUrl(url) {
  if (!url || isVideoUrl(url) || isPlaceholderUrl(url)) {
    return null;
  }

  return url
    .replace(/\._[A-Z]{2}[0-9]+_[^.]+\./, '._AC_SL1500_.')
    .replace(/\._SS\d+_\./, '._AC_SL1500_.')
    .replace(/\._SX\d+_\./, '._AC_SL1500_.')
    .replace(/\._SY\d+_\./, '._AC_SL1500_.')
    .replace(/\._AC_UL\d+_SR\d+,\d+_\./, '._AC_SL1500_.');
}

function imageIdFromUrl(url) {
  const match = url?.match(/\/images\/I\/([A-Za-z0-9+._-]+)/);
  return match ? match[1].split('.')[0] : null;
}

function dedupeImageUrls(urls) {
  const seen = new Set();
  const result = [];

  for (const rawUrl of urls) {
    const url = toHiResImageUrl(rawUrl);
    if (!url) {
      continue;
    }

    const imageId = imageIdFromUrl(url) || url;
    if (seen.has(imageId)) {
      continue;
    }

    seen.add(imageId);
    result.push(url);
  }

  return result;
}

function extractImageUrlsFromScripts(scriptsText) {
  const urls = [];

  for (const text of scriptsText) {
    for (const match of text.matchAll(/"(?:hiRes|large)":"(https:[^"\\]+)"/g)) {
      urls.push(match[1].replace(/\\u002F/g, '/'));
    }
  }

  return dedupeImageUrls(urls);
}

function isAplusMediaUrl(url) {
  return /aplus-media-library-service-media/i.test(url || '');
}

function parseAplusCropDimensions(url) {
  const match = url?.match(/__CR\d+,(\d+),(\d+),(\d+)/);
  if (!match) {
    return null;
  }

  return {
    offsetX: parseInt(match[1], 10),
    width: parseInt(match[2], 10),
    height: parseInt(match[3], 10)
  };
}

function isLandscapeAplusImage(url, options = {}) {
  const minWidth = options.minWidth ?? 800;

  if (!isAplusMediaUrl(url)) {
    return false;
  }

  const dims = parseAplusCropDimensions(url);
  if (!dims) {
    return true;
  }

  return dims.width >= dims.height && dims.width >= minWidth;
}

function isEmbeddedProductThumb(url) {
  if (!url || !/\/images\/I\//i.test(url)) {
    return false;
  }

  return /\._AC_SR\d+,\d+___\.|__AC_SR\d+,\d+___\./i.test(url);
}

function normalizeAplusImageUrl(url) {
  if (!url || isVideoUrl(url) || isPlaceholderUrl(url)) {
    return null;
  }

  if (!isAplusMediaUrl(url) || isEmbeddedProductThumb(url)) {
    return null;
  }

  try {
    return decodeURIComponent(url).split('?')[0];
  } catch {
    return url.split('?')[0];
  }
}

function dedupeAplusImageUrls(urls, options = {}) {
  const seen = new Set();
  const result = [];

  for (const rawUrl of urls) {
    const url = normalizeAplusImageUrl(rawUrl);
    if (!url || !isLandscapeAplusImage(url, options)) {
      continue;
    }

    const mediaId = url.match(/aplus-media-library-service-media\/([^./?]+)/)?.[1] || url;
    if (seen.has(mediaId)) {
      continue;
    }

    seen.add(mediaId);
    result.push(url);
  }

  return result;
}

module.exports = {
  isVideoUrl,
  isPlaceholderUrl,
  toHiResImageUrl,
  imageIdFromUrl,
  dedupeImageUrls,
  extractImageUrlsFromScripts,
  isAplusMediaUrl,
  parseAplusCropDimensions,
  isLandscapeAplusImage,
  isEmbeddedProductThumb,
  normalizeAplusImageUrl,
  dedupeAplusImageUrls
};
