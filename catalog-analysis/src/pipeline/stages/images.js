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
const {
  buildTrackSummary,
  requiredRolesFromSummary,
  missingRolesVsLeaders
} = require('./visual-summary');
const { buildRoleTaxonomy } = require('./role-taxonomy');

const VISION_PRODUCT_TOOL = toolDefinition(
  'vision-product',
  'Classify Amazon listing images attached as separate photos and extract board facts when text is present'
);

/** Map galleryType to durable track id used end-to-end. */
function trackFromGalleryType(galleryType) {
  return galleryType === 'aplus' ? 'aplus' : 'pdp';
}

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

async function prepareImageBuffer(buffer, config) {
  const maxSide = config.visionImageMaxSide || 1400;
  const quality = config.visionJpegQuality || 85;
  return sharp(buffer)
    .rotate()
    .resize(maxSide, maxSide, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();
}

function buildGalleryVisionPrompt({ imageCount }) {
  return {
    system:
      'You classify Amazon PDP product-gallery images attached as separate photos in order. '
      + '"Lifestyle" means a styled room/setting — not a person. '
      + 'Tag a human in content_tags only if a person (or body part such as a hand/face) is visibly present. '
      + 'Prefer functional role families over angle/crop variants of the same function. '
      + 'When text_present is true, fill board with the actual printed facts.',
    user: `You are given ${imageCount} PDP product-gallery images as separate attachments, in gallery order (image 0 first). Classify every attached image and summarize gallery-level conventions.`
  };
}

function buildAplusVisionPrompt({ imageCount }) {
  return {
    system:
      'You classify Amazon A+ Content module images attached as separate photos in order. '
      + '"Lifestyle" means a styled setting — not automatically a person. '
      + 'Tag a human in content_tags only if a person (or body part such as a hand/face) is visibly present. '
      + 'Prefer functional role families over angle/crop variants of the same function. '
      + 'When text_present is true, fill board with the actual printed facts.',
    user: `You are given ${imageCount} A+ Content images as separate attachments, in module order (image 0 first). Classify every attached image.`
  };
}

function normalizeContentTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((t) => String(t || '').trim()).filter(Boolean))];
}

function normalizeBoard(board, textPresent) {
  if (!textPresent || !board || typeof board !== 'object') {
    return null;
  }
  const facts = Array.isArray(board.facts)
    ? [...new Set(board.facts.map((f) => String(f || '').trim()).filter(Boolean))]
    : [];
  return {
    board_type: String(board.board_type || '').trim() || 'text board',
    facts,
    layout: String(board.layout || '').trim() || '',
    text_density: String(board.text_density || '').trim() || 'medium'
  };
}

/**
 * Normalize LLM multi-image response into the durable cells[] shape used downstream,
 * ensuring every attachment position is represented.
 */
function normalizeVisionAnalysis(analysis, { asin, galleryType, imageCount }) {
  const labelPrefix = `vision for ${asin} (${galleryType})`;
  requireNonEmptyArrayKeys(analysis, ['images', 'present_roles'], labelPrefix);

  const byPosition = new Map();
  for (const img of analysis.images || []) {
    const position = Number(img.position);
    if (!Number.isInteger(position) || position < 0 || position >= imageCount) continue;
    byPosition.set(position, img);
  }

  const cells = [];
  for (let position = 0; position < imageCount; position++) {
    const img = byPosition.get(position);
    if (!img) {
      cells.push({
        cell: position + 1,
        position,
        role: 'unclassified',
        kind: 'supporting',
        content_tags: [],
        text_present: false,
        board: null
      });
      continue;
    }

    requireNonEmptyString(
      img.role,
      `vision image role for ${asin} (${galleryType}) position ${position}`
    );
    const textPresent = Boolean(img.text_present);
    cells.push({
      cell: position + 1,
      position,
      role: String(img.role).trim(),
      kind: String(img.kind || 'supporting').trim() || 'supporting',
      content_tags: normalizeContentTags(img.content_tags),
      text_present: textPresent,
      board: normalizeBoard(img.board, textPresent)
    });
  }

  const presentRoles = [
    ...new Set(
      [
        ...(analysis.present_roles || []),
        ...cells.map((c) => c.role)
      ]
        .map((r) => String(r || '').trim())
        .filter((r) => r && r !== 'unclassified')
    )
  ];

  if (!presentRoles.length) {
    throw new Error(`${labelPrefix}: no usable present_roles after normalization`);
  }

  const qualityNotes = Array.isArray(analysis.quality_notes) ? analysis.quality_notes : [];
  const result = {
    cells,
    present_roles: presentRoles,
    quality_notes: qualityNotes,
    missing_roles: Array.isArray(analysis.missing_roles) ? analysis.missing_roles : []
  };

  if (galleryType === 'product') {
    result.hero_conventions = Array.isArray(analysis.hero_conventions)
      ? analysis.hero_conventions
      : [];
  }

  return result;
}

async function analyzeProductImages({ llm, config, imageBuffers, galleryType, asin }) {
  const images = [];
  for (const buffer of imageBuffers) {
    const prepared = await prepareImageBuffer(buffer, config);
    images.push({
      base64: prepared.toString('base64'),
      mediaType: 'image/jpeg'
    });
  }

  const prompt = galleryType === 'aplus'
    ? buildAplusVisionPrompt({ imageCount: images.length })
    : buildGalleryVisionPrompt({ imageCount: images.length });

  const analysis = await llm.completeVisionTool({
    system: prompt.system,
    tool: VISION_PRODUCT_TOOL,
    user: prompt.user,
    images,
    maxTokens: config.visionMaxTokens
  });

  return normalizeVisionAnalysis(analysis, {
    asin,
    galleryType,
    imageCount: images.length
  });
}

async function prefetchProductImages({ products, galleryType, config }) {
  const downloadTasks = [];
  for (const product of products) {
    const urls = galleryType === 'aplus'
      ? (product.aplus_images || [])
      : (product.product_images || []);
    if (!urls.length) continue;
    downloadTasks.push({ product, urls });
  }

  const byAsin = new Map();
  await mapWithConcurrency(
    downloadTasks,
    config.downloadConcurrency || 20,
    async ({ product, urls }) => {
      const buffers = await mapWithConcurrency(
        urls,
        Math.min(8, config.downloadConcurrency || 20),
        async (url) => downloadImage(url, config.cacheDir)
      );
      byAsin.set(product.asin, { product, urls, buffers });
    }
  );
  return byAsin;
}

async function analyzeProductGalleries({
  llm,
  config,
  products,
  galleryType = 'product',
  label = `${galleryType} gallery`,
  log
}) {
  const track = trackFromGalleryType(galleryType);
  const downloaded = await prefetchProductImages({ products, galleryType, config });
  const tasks = [...downloaded.values()];
  const total = tasks.length;
  if (!total) {
    return [];
  }

  let completed = 0;

  return mapWithConcurrency(tasks, config.visionConcurrency, async ({ product, urls, buffers }) => {
    requireNonEmptyArray(buffers, `downloaded images for ${product.asin} (${galleryType})`);

    const analysis = await analyzeProductImages({
      llm,
      config,
      imageBuffers: buffers,
      galleryType,
      asin: product.asin
    });

    completed += 1;
    if (log) {
      log('S4', `${label} ${completed}/${total} done (asin=${product.asin}, images=${buffers.length})`);
    }

    return {
      asin: product.asin,
      track,
      image_count: urls.length,
      ...analysis
    };
  });
}

/**
 * Aggregate our PDP galleries vs leader-required roles (catalog-level, no ASINs).
 */
function aggregateOursVsLeaders(ourGalleryResults, requiredRoles, taxonomy = null) {
  const ourSummary = buildTrackSummary(ourGalleryResults, { track: 'pdp', taxonomy });
  const n = ourSummary.n_analyzed;

  if (!n) {
    return {
      galleries_analyzed: 0,
      role_rates: [],
      missing_vs_leader_required: [...(requiredRoles || [])],
      median_image_count: null,
      signals: ourSummary.signals
    };
  }

  return {
    galleries_analyzed: n,
    role_rates: ourSummary.roles.map((r) => ({
      role: r.role,
      presence_rate: r.prevalence
    })),
    missing_vs_leader_required: missingRolesVsLeaders(ourSummary, requiredRoles),
    median_image_count: ourSummary.median_image_count,
    signals: ourSummary.signals
  };
}

/**
 * Keep PDP and A+ summaries separate with frequency preserved.
 * When taxonomies are provided, roles are canonicalized before aggregation.
 */
function aggregateVisualStandard(galleryResults, aplusResults, {
  pdpTaxonomy = null,
  aplusTaxonomy = null
} = {}) {
  requireNonEmptyArray(galleryResults, 'competitor product gallery vision results');

  const pdpSummary = buildTrackSummary(galleryResults, { track: 'pdp', taxonomy: pdpTaxonomy });
  const aplusSummary = buildTrackSummary(aplusResults, { track: 'aplus', taxonomy: aplusTaxonomy });
  // Gap-report knob only (not a planning rule): roles seen in >=50% of leader galleries.
  const requiredRoles = requiredRolesFromSummary(pdpSummary);

  const heroConventions = (pdpSummary.notes || [])
    .map((n) => n.note)
    .filter(Boolean)
    .slice(0, 12);
  if (!heroConventions.length) {
    heroConventions.push('clean product-forward hero on simple background');
  }

  return {
    pdp_summary: pdpSummary,
    aplus_summary: aplusSummary,
    pdp_taxonomy: pdpTaxonomy
      ? { track: 'pdp', canonical_roles: pdpTaxonomy.canonical_roles }
      : null,
    aplus_taxonomy: aplusTaxonomy
      ? { track: 'aplus', canonical_roles: aplusTaxonomy.canonical_roles }
      : null,
    gallery_standard: {
      required_roles: requiredRoles,
      hero_conventions: heroConventions,
      quality_notes: (pdpSummary.notes || []).map((n) => n.note).slice(0, 20)
    },
    aplus_topics_from_vision: (aplusSummary.roles || []).map((r) => r.role),
    aplus_topics_with_counts: (aplusSummary.roles || []).map((r) => ({
      topic: r.role,
      count: r.count,
      prevalence: r.prevalence,
      typical_per_listing: r.typical_per_listing
    })),
    per_product_gallery: galleryResults,
    per_product_aplus: aplusResults
  };
}

async function buildVisualStandard({ llm, config, competitors, ours, category, log }) {
  const competitorGallery = await analyzeProductGalleries({
    llm,
    config,
    products: competitors,
    galleryType: 'product',
    label: 'competitor PDP gallery',
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

  if (log) log('S4', 'Building canonical role taxonomies...');
  const [pdpTaxonomy, aplusTaxonomy] = await Promise.all([
    buildRoleTaxonomy({
      llm,
      results: competitorGallery,
      track: 'pdp',
      category: category || 'category'
    }),
    competitorAplus.length
      ? buildRoleTaxonomy({
        llm,
        results: competitorAplus,
        track: 'aplus',
        category: category || 'category'
      })
      : Promise.resolve({
        track: 'aplus',
        canonical_roles: [],
        lookup: new Map(),
        byCanonical: new Map()
      })
  ]);

  const ourGalleryInternal = await analyzeProductGalleries({
    llm,
    config,
    products: ours,
    galleryType: 'product',
    label: 'our PDP gallery',
    log
  });

  const aggregated = aggregateVisualStandard(competitorGallery, competitorAplus, {
    pdpTaxonomy,
    aplusTaxonomy
  });
  const ours_vs_leaders = aggregateOursVsLeaders(
    ourGalleryInternal,
    aggregated.gallery_standard.required_roles,
    pdpTaxonomy
  );

  return {
    ...aggregated,
    our_gallery_internal: ourGalleryInternal,
    our_pdp_summary: buildTrackSummary(ourGalleryInternal, {
      track: 'pdp',
      taxonomy: pdpTaxonomy
    }),
    ours_vs_leaders
  };
}

module.exports = {
  buildVisualStandard,
  aggregateOursVsLeaders,
  aggregateVisualStandard,
  trackFromGalleryType,
  buildGalleryVisionPrompt,
  buildAplusVisionPrompt,
  mapWithConcurrency
};
