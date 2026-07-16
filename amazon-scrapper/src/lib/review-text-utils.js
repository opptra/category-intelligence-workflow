/**
 * Inline cleanReviewText for Puppeteer page.evaluate.
 */
const CLEAN_REVIEW_TEXT_FN = `function cleanReviewText(text) {
  if (!text) return '';
  let cleaned = text
    .replace(/Brief content visible, double tap to read full content\\./g, '')
    .replace(/Full content visible, double tap to read brief content\\./g, '')
    .replace(/Read moreRead less/g, '');
  if (
    cleaned.includes('clickstreamNexusMetricsConfig') ||
    cleaned.includes('vsemetrics_playercards') ||
    cleaned.includes('Video Player is loading')
  ) {
    cleaned = cleaned.replace(
      /^\\{[\\s\\S]*?\\}(?=\\s*(?:The video|The |I |It |Very |Not |Good |Bad |Great |Poor |Cloth|Product|Nice|Fake|After|One |Both|Quality|Material|We |My |They|These|This|Overall|Highly|Does|Don't|Didn't|Would|Could|Should|Absolutely|Terrible|Horrible|Excellent|Disappointed|Satisfied|Unsatisfied|Returned|Return|Refund|Waste|Money|Price|Value|Color|Size|Fabric|Stitching|Curtain))/i,
      ''
    );
    const modalMarker = 'This is a modal window.';
    const modalIdx = cleaned.indexOf(modalMarker);
    if (modalIdx !== -1) cleaned = cleaned.slice(modalIdx + modalMarker.length);
  }
  const uiPatterns = [
    /The video showcases the product in use\\./gi,
    /The video guides you through product setup\\./gi,
    /The video compares multiple products\\./gi,
    /The video shows the product being unpacked\\./gi,
    /Video Player is loading\\./gi,
    /Click to play video/gi,
    /This is a modal window\\./gi,
    /PlayMute/gi,
    /Current Time [\\d:.]+/gi,
    /Duration [\\d:.]+/gi,
    /Loaded: [\\d.]+%/gi,
    /Stream Type LIVE/gi,
    /Seek to live, currently behind live/gi,
    /\\bLIVE\\b/g,
    /Remaining Time -?[\\d:.]+/gi,
    /Playback Rate/gi,
    /\\bChapters\\b/gi,
    /Descriptionsdescriptions off, selected/gi,
    /Captions off, selected/gi,
    /English \\(Automated\\)/gi,
    /Audio Trackdefault, selected/gi,
    /\\bFullscreen\\b/gi,
    /\\bMute\\b/gi,
    /\\bPlay\\b/gi
  ];
  for (const pattern of uiPatterns) cleaned = cleaned.replace(pattern, ' ');
  return cleaned.replace(/[\\d:.]+\\/[\\d:.]+[\\d.]+%[\\d:.]*/g, ' ').replace(/\\s+/g, ' ').trim();
}`;

module.exports = {
  CLEAN_REVIEW_TEXT_FN
};
