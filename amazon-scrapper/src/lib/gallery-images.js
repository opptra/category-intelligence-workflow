function isVideoUrl(url) {
  return !url || /play-button|\.mp4(?:\?|$)|\/video\/|PKplay|videoBlock|vse-vms/i.test(url);
}

function isPlaceholderUrl(url) {
  return (
    !url
    || /grey-pixel|transparent-pixel|\/G\/01\/x-locale\/common\/|spacer\.gif|data:image|\.svg(?:\?|$)/i.test(
      url
    )
  );
}

function isGalleryImageUrl(url) {
  return /\/images\/I\//i.test(url) && /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url);
}

function unescapeAmazonUrl(url) {
  return String(url || '')
    .replace(/\\u002F/g, '/')
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"');
}

function toHiResImageUrl(url) {
  if (!url || isVideoUrl(url) || isPlaceholderUrl(url)) {
    return null;
  }

  return unescapeAmazonUrl(url)
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

  for (const rawUrl of urls || []) {
    const url = toHiResImageUrl(rawUrl);
    if (!url || !isGalleryImageUrl(url)) {
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

function extractBalanced(text, startIdx, openChar, closeChar) {
  let depth = 0;
  let inString = false;
  let quote = null;
  let escaped = false;

  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === quote) {
        inString = false;
        quote = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      continue;
    }

    if (ch === openChar) {
      depth += 1;
    } else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIdx, i + 1);
      }
    }
  }

  return null;
}

function findColorImagesInitialArray(text) {
  if (!text) return null;
  const startMatch = text.match(/['"]colorImages['"]\s*:\s*\{\s*['"]initial['"]\s*:\s*\[/);
  if (!startMatch || startMatch.index == null) {
    return null;
  }
  const bracketStart = startMatch.index + startMatch[0].length - 1;
  return extractBalanced(text, bracketStart, '[', ']');
}

function splitTopLevelObjects(arrayStr) {
  if (!arrayStr || arrayStr[0] !== '[') return [];
  const inner = arrayStr.slice(1, -1);
  const objects = [];
  let i = 0;

  while (i < inner.length) {
    const start = inner.indexOf('{', i);
    if (start < 0) break;
    const obj = extractBalanced(inner, start, '{', '}');
    if (!obj) break;
    objects.push(obj);
    i = start + obj.length;
  }

  return objects;
}

function quotedHttpUrl(objStr, key) {
  const match = objStr.match(new RegExp(`"${key}"\\s*:\\s*"(https:[^"]*)"`));
  if (!match?.[1] || match[1] === 'null') {
    return null;
  }
  return unescapeAmazonUrl(match[1]);
}

function pickUrlFromColorImageObject(objStr) {
  if (!objStr || /"variant"\s*:\s*"VIDEO"/i.test(objStr)) {
    return null;
  }

  const hiRes = quotedHttpUrl(objStr, 'hiRes');
  if (hiRes && !isVideoUrl(hiRes) && !isPlaceholderUrl(hiRes)) {
    return hiRes;
  }

  const large = quotedHttpUrl(objStr, 'large');
  if (large && !isVideoUrl(large) && !isPlaceholderUrl(large)) {
    return large;
  }

  const thumb = quotedHttpUrl(objStr, 'thumb');
  if (thumb && !isVideoUrl(thumb) && !isPlaceholderUrl(thumb)) {
    return thumb;
  }

  return null;
}

/**
 * One URL per colorImages.initial slot (hiRes, else large, else thumb).
 * Never unions hiRes + large as separate gallery images.
 */
function extractColorImagesInitial(scriptTexts) {
  const texts = Array.isArray(scriptTexts) ? scriptTexts : [scriptTexts];

  for (const text of texts) {
    const arrayStr = findColorImagesInitialArray(text);
    if (!arrayStr) continue;

    const urls = [];
    for (const obj of splitTopLevelObjects(arrayStr)) {
      const url = pickUrlFromColorImageObject(obj);
      if (url) urls.push(url);
    }

    if (urls.length) {
      return urls;
    }
  }

  return [];
}

/**
 * Prefer the PDP colorImages.initial list. Fall back to #altImages (one URL
 * per thumb). Never merge those sources — thumbs and hi-res use different
 * Amazon image IDs for the same photo, which previously doubled the gallery.
 */
function assembleGalleryImageUrls({
  scriptTexts,
  colorImagesSnippet,
  altImageUrls,
  landingImageUrl,
  imgTagUrl
} = {}) {
  const fromScripts = extractColorImagesInitial(
    colorImagesSnippet ? [colorImagesSnippet] : scriptTexts
  );
  if (fromScripts.length) {
    return dedupeImageUrls(fromScripts);
  }

  const fromAlt = dedupeImageUrls(altImageUrls || []);
  if (fromAlt.length) {
    return fromAlt;
  }

  return dedupeImageUrls([landingImageUrl, imgTagUrl]);
}

function mapGalleryAlts(galleryUrls, altTextsInOrder = []) {
  return (galleryUrls || []).map((_, index) => {
    const alt = altTextsInOrder[index];
    return typeof alt === 'string' ? alt.replace(/\s+/g, ' ').trim() : '';
  });
}

module.exports = {
  isVideoUrl,
  isPlaceholderUrl,
  isGalleryImageUrl,
  toHiResImageUrl,
  imageIdFromUrl,
  dedupeImageUrls,
  extractColorImagesInitial,
  assembleGalleryImageUrls,
  mapGalleryAlts,
  findColorImagesInitialArray,
  pickUrlFromColorImageObject
};
