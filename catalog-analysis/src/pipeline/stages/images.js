const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { cachePath, hashInput } = require('../../services/cache');
const {
  requireNonEmptyArray,
  requireNonEmptyString,
  requireNonEmptyArrayKeys
} = require('../../utils/assert');
const { toolDefinition } = require('../../utils/schema-tools');
const VISION_GALLERY_TOOL = toolDefinition(
  'vision-gallery',
  'Classify numbered Amazon listing image montage cells and summarize visual standards'
);

const PADDING = 8;
const LABEL_HEIGHT = 24;
const ROW_GAP = 12;

async function downloadImage(url, cacheDir) {
  const key = hashInput(url);
  const file = cachePath(cacheDir, 'images', key);
  if (fs.existsSync(file)) {
    return fs.readFileSync(file);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${url} (${response.status})`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buffer);
  return buffer;
}

function gridLayout(count, maxCells) {
  const capped = Math.min(count, maxCells);
  const cols = Math.ceil(Math.sqrt(capped));
  const rows = Math.ceil(capped / cols);
  return { cols, rows, capped };
}

function cellLabelSvg(width, number) {
  return Buffer.from(
    `<svg width="${width}" height="${LABEL_HEIGHT}">
      <rect x="0" y="0" width="32" height="${LABEL_HEIGHT}" fill="black" opacity="0.75"/>
      <text x="16" y="17" font-size="13" fill="white" text-anchor="middle" font-family="Arial">${number}</text>
    </svg>`
  );
}

async function resizePreservingAspect(buffer, maxWidth, maxHeight) {
  return sharp(buffer)
    .resize(maxWidth, maxHeight, { fit: 'inside', background: '#ffffff' })
    .toBuffer();
}

/** Square grid for product gallery images (mostly square / mixed aspect). */
async function buildProductMontage(imageBuffers, cellSize, maxCells) {
  const { cols, rows, capped } = gridLayout(imageBuffers.length, maxCells);
  const used = imageBuffers.slice(0, capped);
  const composites = [];
  const innerSize = cellSize - PADDING * 2;

  for (let i = 0; i < used.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellSize;
    const y = row * cellSize;

    const resized = await resizePreservingAspect(used[i], innerSize, innerSize);
    const meta = await sharp(resized).metadata();

    const offsetX = x + PADDING + Math.floor((innerSize - meta.width) / 2);
    const offsetY = y + PADDING + Math.floor((innerSize - meta.height) / 2);

    composites.push({ input: resized, left: offsetX, top: offsetY });
    composites.push({ input: cellLabelSvg(cellSize, i + 1), left: x, top: y });
  }

  return sharp({
    create: {
      width: cols * cellSize,
      height: rows * cellSize,
      channels: 3,
      background: '#f5f5f5'
    }
  })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toBuffer();
}

/** Vertical landscape strips for A+ banners — preserves each image's native aspect ratio. */
async function buildAplusMontage(imageBuffers, maxWidth, maxHeight, maxCells) {
  const used = imageBuffers.slice(0, maxCells);
  const rows = [];

  for (const buffer of used) {
    const resized = await resizePreservingAspect(buffer, maxWidth, maxHeight);
    const meta = await sharp(resized).metadata();
    rows.push({ buffer: resized, width: meta.width, height: meta.height });
  }

  const canvasWidth = maxWidth + PADDING * 2;
  const canvasHeight = rows.reduce(
    (sum, row) => sum + LABEL_HEIGHT + row.height + PADDING + ROW_GAP,
    PADDING
  );

  const composites = [];
  let y = PADDING;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const offsetX = PADDING + Math.floor((maxWidth - row.width) / 2);

    composites.push({ input: cellLabelSvg(canvasWidth, i + 1), left: 0, top: y });
    y += LABEL_HEIGHT;

    composites.push({ input: row.buffer, left: offsetX, top: y });
    y += row.height + PADDING + ROW_GAP;
  }

  return sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background: '#f5f5f5'
    }
  })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toBuffer();
}

async function buildMontageForType(buffers, config, galleryType) {
  if (galleryType === 'aplus') {
    return buildAplusMontage(
      buffers,
      config.aplusCellMaxWidth,
      config.aplusCellMaxHeight,
      config.aplusMaxCells
    );
  }

  return buildProductMontage(buffers, config.montageCellSize, config.montageMaxCells);
}

function maxCellsForType(config, galleryType) {
  return galleryType === 'aplus' ? config.aplusMaxCells : config.montageMaxCells;
}

/**
 * Runs `worker` over `items` with at most `limit` promises in flight at once.
 * Results preserve input order; workers start in order but resolve as they finish.
 */
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runner() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await worker(items[current], current);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, runner));
  return results;
}

function validateVisionAnalysis(analysis, { asin, galleryType }) {
  const labelPrefix = `vision for ${asin} (${galleryType})`;
  const keys = ['cells', 'present_roles', 'quality_notes'];
  if (galleryType === 'product') {
    keys.splice(2, 0, 'hero_conventions');
  }
  requireNonEmptyArrayKeys(analysis, keys, labelPrefix);

  for (const cell of analysis.cells) {
    requireNonEmptyString(cell.role, `vision cell role for ${asin} (${galleryType}) cell ${cell.cell}`);
  }

  return analysis;
}

async function analyzeGalleryMontage({ llm, config, montageBuffer, imageCount, galleryType, asin }) {
  const base64 = montageBuffer.toString('base64');
  const layoutHint = galleryType === 'aplus'
    ? 'Landscape A+ banners are stacked vertically; each keeps its original aspect ratio.'
    : 'Product gallery uses a square grid; each image keeps its original aspect ratio within its cell.';

  const analysis = await llm.completeVisionTool({
    system: 'You classify Amazon listing images from a numbered montage.',
    tool: VISION_GALLERY_TOOL,
    user: `This is a numbered ${galleryType} montage with ${imageCount} images.
${layoutHint}

Classify each numbered item and summarize category visual standards.
hero_conventions applies to product galleries only.`,
    imageBase64: base64,
    mediaType: 'image/jpeg',
    maxTokens: config.visionMaxTokens
  });

  return validateVisionAnalysis(analysis, { asin, galleryType });
}

async function analyzeProductGalleries({
  llm,
  config,
  products,
  galleryType = 'product',
  label = `${galleryType} gallery`,
  log
}) {
  const maxCells = maxCellsForType(config, galleryType);

  const tasks = [];
  for (const product of products) {
    const urls = galleryType === 'aplus'
      ? (product.aplus_images || [])
      : (product.product_images || []);
    if (urls.length) {
      tasks.push({ product, urls });
    }
  }

  const total = tasks.length;
  if (!total) {
    return [];
  }

  let completed = 0;

  return mapWithConcurrency(tasks, config.visionConcurrency, async ({ product, urls }) => {
    const buffers = [];
    for (const url of urls.slice(0, maxCells)) {
      buffers.push(await downloadImage(url, config.cacheDir));
    }
    requireNonEmptyArray(buffers, `downloaded images for ${product.asin} (${galleryType})`);

    const montage = await buildMontageForType(buffers, config, galleryType);
    const analysis = await analyzeGalleryMontage({
      llm,
      config,
      montageBuffer: montage,
      imageCount: buffers.length,
      galleryType,
      asin: product.asin
    });

    completed += 1;
    if (log) {
      log('S4', `${label} ${completed}/${total} done (asin=${product.asin})`);
    }

    return {
      asin: product.asin,
      image_count: urls.length,
      ...analysis
    };
  });
}

function aggregateVisualStandard(galleryResults, aplusResults) {
  requireNonEmptyArray(galleryResults, 'competitor product gallery vision results');

  const roleCounts = new Map();
  const heroConventions = new Set();
  const qualityNotes = new Set();
  const aplusTopics = new Set();

  for (const result of galleryResults) {
    for (const role of result.present_roles) {
      roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    }
    for (const cell of result.cells) {
      roleCounts.set(cell.role, (roleCounts.get(cell.role) || 0) + 1);
    }
    for (const note of result.hero_conventions) {
      heroConventions.add(note);
    }
    for (const note of result.quality_notes) {
      qualityNotes.add(note);
    }
  }

  const competitorCount = galleryResults.length;
  const requiredRoles = [...roleCounts.entries()]
    .filter(([, count]) => count / competitorCount >= 0.5)
    .map(([role]) => role)
    .filter((role) => role !== 'other');

  requireNonEmptyArray(requiredRoles, 'aggregated gallery required_roles');
  requireNonEmptyArray([...heroConventions], 'aggregated gallery hero_conventions');

  for (const result of aplusResults) {
    for (const note of result.quality_notes) {
      aplusTopics.add(note);
    }
    for (const cell of result.cells) {
      if (cell.role && cell.role !== 'other') {
        aplusTopics.add(cell.role);
      }
    }
  }

  return {
    gallery_standard: {
      required_roles: requiredRoles,
      hero_conventions: [...heroConventions],
      quality_notes: [...qualityNotes]
    },
    aplus_topics_from_vision: [...aplusTopics],
    per_product_gallery: galleryResults,
    per_product_aplus: aplusResults
  };
}

async function buildVisualStandard({ llm, config, competitors, ours, log }) {
  const competitorGallery = await analyzeProductGalleries({
    llm,
    config,
    products: competitors,
    galleryType: 'product',
    label: 'competitor gallery',
    log
  });
  const competitorsWithAplus = competitors.filter((p) => (p.aplus_images || []).length > 0);
  const competitorAplus = competitorsWithAplus.length
    ? await analyzeProductGalleries({
      llm,
      config,
      products: competitorsWithAplus,
      galleryType: 'aplus',
      label: 'competitor A+',
      log
    })
    : [];

  const ourGalleryInternal = await analyzeProductGalleries({
    llm,
    config,
    products: ours,
    galleryType: 'product',
    label: 'our gallery',
    log
  });

  const aggregated = aggregateVisualStandard(competitorGallery, competitorAplus);

  return {
    ...aggregated,
    our_gallery_internal: ourGalleryInternal
  };
}

module.exports = {
  buildVisualStandard
};
