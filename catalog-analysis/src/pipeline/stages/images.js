const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { withCache, cachePath, hashInput } = require('../../services/cache');

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

async function buildMontage(imageBuffers, cellSize, maxCells) {
  const { cols, rows, capped } = gridLayout(imageBuffers.length, maxCells);
  const used = imageBuffers.slice(0, capped);
  const composites = [];

  for (let i = 0; i < used.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * cellSize;
    const y = row * cellSize;

    const resized = await sharp(used[i])
      .resize(cellSize - 8, cellSize - 8, { fit: 'inside', background: '#ffffff' })
      .toBuffer();

    const labelSvg = Buffer.from(
      `<svg width="${cellSize}" height="${cellSize}">
        <rect x="4" y="4" width="28" height="22" fill="black" opacity="0.7"/>
        <text x="18" y="20" font-size="14" fill="white" text-anchor="middle" font-family="Arial">${i + 1}</text>
      </svg>`
    );

    composites.push({ input: resized, left: x + 4, top: y + 4 });
    composites.push({ input: labelSvg, left: x, top: y });
  }

  const width = cols * cellSize;
  const height = rows * cellSize;

  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: '#f5f5f5'
    }
  })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toBuffer();
}

async function analyzeGalleryMontage({ llm, config, montageBuffer, imageCount, galleryType }) {
  const base64 = montageBuffer.toString('base64');
  return llm.completeVisionJson({
    system: 'You classify Amazon listing images from a numbered gallery montage.',
    user: `This is a numbered ${galleryType} gallery montage with ${imageCount} images.
Classify each visible cell and summarize category visual standards.

Return JSON:
{
  "hero_conventions": ["what winning hero images do"],
  "cells": [{ "cell": 1, "role": "hero|lifestyle|texture|demo|size_guide|infographic|hardware|swatch|other" }],
  "present_roles": [],
  "missing_roles": [],
  "quality_notes": []
}`,
    imageBase64: base64,
    mediaType: 'image/jpeg'
  });
}

async function analyzeProductGalleries({ llm, config, products, galleryType = 'product' }) {
  const results = [];

  for (const product of products) {
    const urls = galleryType === 'aplus'
      ? (product.aplus_images || [])
      : (product.product_images || []);

    if (!urls.length) {
      continue;
    }

    const cacheInput = {
      model: config.model,
      asin: product.asin,
      galleryType,
      urls
    };

    const analysis = await withCache({
      cacheDir: config.cacheDir,
      stage: `vision-${galleryType}`,
      input: cacheInput,
      refresh: config.refresh,
      fn: async () => {
        const buffers = [];
        for (const url of urls.slice(0, config.montageMaxCells)) {
          try {
            buffers.push(await downloadImage(url, config.cacheDir));
          } catch {
            // skip failed downloads
          }
        }

        if (!buffers.length) {
          return {
            cells: [],
            present_roles: [],
            missing_roles: [],
            hero_conventions: [],
            quality_notes: ['No images could be downloaded']
          };
        }

        const montage = await buildMontage(buffers, config.montageCellSize, config.montageMaxCells);
        return analyzeGalleryMontage({
          llm,
          config,
          montageBuffer: montage,
          imageCount: buffers.length,
          galleryType
        });
      }
    });

    results.push({
      asin: product.asin,
      image_count: urls.length,
      ...analysis
    });
  }

  return results;
}

function aggregateVisualStandard(galleryResults, aplusResults) {
  const roleCounts = new Map();
  const heroConventions = new Set();
  const qualityNotes = new Set();
  const aplusTopics = new Set();

  for (const result of galleryResults) {
    for (const role of result.present_roles || []) {
      roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    }
    for (const cell of result.cells || []) {
      if (cell.role) {
        roleCounts.set(cell.role, (roleCounts.get(cell.role) || 0) + 1);
      }
    }
    for (const note of result.hero_conventions || []) {
      heroConventions.add(note);
    }
    for (const note of result.quality_notes || []) {
      qualityNotes.add(note);
    }
  }

  const competitorCount = galleryResults.length || 1;
  const requiredRoles = [...roleCounts.entries()]
    .filter(([, count]) => count / competitorCount >= 0.5)
    .map(([role]) => role)
    .filter((role) => role !== 'other');

  const canonicalRoles = [
    'hero', 'lifestyle', 'texture', 'demo', 'size_guide', 'infographic', 'hardware'
  ];
  const missingRoles = canonicalRoles.filter((role) => !requiredRoles.includes(role));

  for (const result of aplusResults) {
    for (const note of result.quality_notes || []) {
      aplusTopics.add(note);
    }
    for (const cell of result.cells || []) {
      if (cell.role && cell.role !== 'other') {
        aplusTopics.add(cell.role);
      }
    }
  }

  return {
    gallery_standard: {
      required_roles: requiredRoles.length ? requiredRoles : canonicalRoles,
      hero_conventions: [...heroConventions],
      quality_notes: [...qualityNotes]
    },
    aplus_topics_from_vision: [...aplusTopics],
    per_product_gallery: galleryResults,
    per_product_aplus: aplusResults
  };
}

async function buildVisualStandard({ llm, config, competitors, ours, skipVision }) {
  if (skipVision || !config.apiKey) {
    return {
      gallery_standard: {
        required_roles: ['hero', 'lifestyle', 'texture', 'demo', 'size_guide', 'infographic'],
        hero_conventions: ['High-resolution product-on-white or lightly styled hero with visible fabric fall'],
        quality_notes: ['Vision analysis skipped']
      },
      aplus_topics_from_vision: [],
      per_product_gallery: [],
      per_product_aplus: [],
      our_gallery_internal: []
    };
  }

  const competitorGallery = await analyzeProductGalleries({
    llm,
    config,
    products: competitors,
    galleryType: 'product'
  });
  const competitorAplus = await analyzeProductGalleries({
    llm,
    config,
    products: competitors.filter((p) => (p.aplus_images || []).length > 0),
    galleryType: 'aplus'
  });

  const ourGalleryInternal = await analyzeProductGalleries({
    llm,
    config,
    products: ours,
    galleryType: 'product'
  });

  const aggregated = aggregateVisualStandard(competitorGallery, competitorAplus);

  return {
    ...aggregated,
    our_gallery_internal: ourGalleryInternal
  };
}

module.exports = {
  buildVisualStandard,
  analyzeProductGalleries,
  aggregateVisualStandard,
  buildMontage,
  downloadImage
};
