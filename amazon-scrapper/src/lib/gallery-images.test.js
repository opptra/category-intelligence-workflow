const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  extractColorImagesInitial,
  assembleGalleryImageUrls,
  mapGalleryAlts,
  dedupeImageUrls,
  imageIdFromUrl
} = require('./gallery-images');

function colorImagesSnippet(items) {
  const encoded = items.map((item) => {
    const mainUrl = item.hiRes || item.large || item.thumb;
    return (
      `{"hiRes":${item.hiRes ? `"${item.hiRes}"` : 'null'},`
      + `"thumb":"${item.thumb || item.hiRes}",`
      + `"large":"${item.large || item.hiRes}",`
      + `"main":{"${mainUrl}":[]},`
      + `"variant":"${item.variant || 'MAIN'}" }`
    );
  });
  return `'colorImages' : { 'initial': [${encoded.join(',')}] }, 'colorToAsin':`;
}

const HERO_HI = 'https://m.media-amazon.com/images/I/71heroAAAA._SL1500_.jpg';
const HERO_THUMB = 'https://m.media-amazon.com/images/I/41heroTHMB._AC_US40_.jpg';
const SIZE_HI = 'https://m.media-amazon.com/images/I/51sizeBBBB._SL1500_.jpg';
const SIZE_THUMB = 'https://m.media-amazon.com/images/I/41sizeTHMB._AC_US40_.jpg';
const ROOM_HI = 'https://m.media-amazon.com/images/I/61roomCCCC._SL1500_.jpg';
const GROMMET_HI = 'https://m.media-amazon.com/images/I/41gromDDDD._SL1500_.jpg';
const BLACKOUT_HI = 'https://m.media-amazon.com/images/I/81bkoutEEE._SL1500_.jpg';
const DETAIL_HI = 'https://m.media-amazon.com/images/I/71detailFF._SL1500_.jpg';
const PLEAT_HI = 'https://m.media-amazon.com/images/I/41pleatGGG._SL1500_.jpg';
const SWATCH_HI = 'https://m.media-amazon.com/images/I/31swatchHH._SL1500_.jpg';

const EIGHT_SLOTS = [
  { hiRes: HERO_HI, thumb: HERO_THUMB, large: HERO_HI.replace('._SL1500_.', '._SY879_.') },
  { hiRes: SIZE_HI, thumb: SIZE_THUMB, large: SIZE_HI },
  { hiRes: ROOM_HI, large: ROOM_HI },
  { hiRes: GROMMET_HI, large: GROMMET_HI },
  { hiRes: BLACKOUT_HI, large: BLACKOUT_HI },
  { hiRes: DETAIL_HI, large: DETAIL_HI },
  { hiRes: PLEAT_HI, large: PLEAT_HI },
  { hiRes: SWATCH_HI, large: SWATCH_HI }
];

describe('extractColorImagesInitial', () => {
  it('returns one URL per gallery slot, preferring hiRes over large', () => {
    const urls = extractColorImagesInitial([colorImagesSnippet(EIGHT_SLOTS)]);
    assert.equal(urls.length, 8);
    assert.equal(urls[0], HERO_HI);
    assert.equal(urls[1], SIZE_HI);
  });

  it('does not emit both hiRes and large for the same slot', () => {
    const urls = extractColorImagesInitial([colorImagesSnippet(EIGHT_SLOTS)]);
    const ids = urls.map((url) => imageIdFromUrl(url));
    assert.equal(new Set(ids).size, 8);
  });

  it('skips VIDEO variants', () => {
    const snippet = colorImagesSnippet([
      { hiRes: HERO_HI },
      { hiRes: 'https://m.media-amazon.com/images/I/play-button._SL1500_.jpg', variant: 'VIDEO' },
      { hiRes: SIZE_HI }
    ]);
    const urls = extractColorImagesInitial([snippet]);
    assert.deepEqual(urls, [HERO_HI, SIZE_HI]);
  });

  it('falls back to large when hiRes is null', () => {
    const snippet = `'colorImages' : { 'initial': [`
      + `{"hiRes":null,"large":"${SIZE_HI}","thumb":"${SIZE_THUMB}","main":{},"variant":"MAIN"}`
      + `] }, 'colorToAsin':`;
    const urls = extractColorImagesInitial([snippet]);
    assert.deepEqual(urls, [SIZE_HI]);
  });
});

describe('assembleGalleryImageUrls', () => {
  it('does not merge DOM thumbs with colorImages (different Amazon ids for the same photos)', () => {
    const gallery = assembleGalleryImageUrls({
      colorImagesSnippet: colorImagesSnippet(EIGHT_SLOTS),
      altImageUrls: EIGHT_SLOTS.map((item) => item.thumb),
      landingImageUrl: HERO_HI,
      imgTagUrl: HERO_THUMB
    });
    assert.equal(gallery.length, 8);
    assert.equal(imageIdFromUrl(gallery[0]), '71heroAAAA');
  });

  it('falls back to one URL per altImages thumb when colorImages is missing', () => {
    const gallery = assembleGalleryImageUrls({
      colorImagesSnippet: '',
      altImageUrls: [HERO_THUMB, SIZE_THUMB, HERO_THUMB],
      landingImageUrl: HERO_HI
    });
    assert.equal(gallery.length, 2);
    assert.equal(imageIdFromUrl(gallery[0]), '41heroTHMB');
  });

  it('falls back to landing image only when thumbs and scripts are empty', () => {
    const gallery = assembleGalleryImageUrls({
      landingImageUrl: HERO_HI,
      imgTagUrl: HERO_HI
    });
    assert.deepEqual(gallery, [toHiRes(HERO_HI)]);
  });
});

function toHiRes(url) {
  return dedupeImageUrls([url])[0];
}

describe('mapGalleryAlts', () => {
  it('zips alt text by gallery order', () => {
    const alts = mapGalleryAlts(['a', 'b', 'c'], ['Hero', 'Size guide']);
    assert.deepEqual(alts, ['Hero', 'Size guide', '']);
  });
});
