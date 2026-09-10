const { BrowserSession } = require('../lib/browser-session');
const { extractASIN, extractDomain } = require('../lib/amazon-utils');
const { assembleGalleryImageUrls, mapGalleryAlts } = require('../lib/gallery-images');
const { ReviewsScraper } = require('./reviews');
const { runWithConcurrency } = require('../lib/concurrency');
const { CONCURRENCY, PAGE_TIMEOUT_MS } = require('../lib/constants');

const APLUS_SELECTORS = [
  '#aplus',
  '#aplus_feature_div',
  '#aplusBrandStory_feature_div',
  '.aplus-module'
].join(', ');

class ProductDetailsScraper {
  constructor(options = {}) {
    this.domain = options.domain || 'www.amazon.in';
    this.delayMs = options.delayMs || 2000;
    this.concurrency = options.concurrency ?? CONCURRENCY;
    this.session = new BrowserSession({
      cookiesPath: options.cookiesPath,
      delayMs: options.delayMs,
      headless: options.headless
    });
    this.includeReviews = options.includeReviews ?? true;
    this.reviewsScraper = new ReviewsScraper({
      delayMs: options.delayMs || 2000,
      maxPerStar: options.maxPerStar || 50,
      maxTotalReviews: options.maxTotalReviews || 250,
      sortBy: options.reviewSortBy || 'recent',
      concurrency: this.concurrency
    });
  }

  buildProductUrl(asin, domain = this.domain) {
    return `https://${domain}/dp/${asin}`;
  }

  normalizeItemInput(item) {
    const url = item.url || item.product_url;
    const asin = (item.asin || extractASIN(url) || '').toUpperCase();
    const domain = item.domain || extractDomain(url) || this.domain;

    return {
      ...item,
      asin,
      domain,
      url: url || this.buildProductUrl(asin, domain)
    };
  }

  async scrollToLoadLazyContent(page) {
    await page.evaluate(async () => {
      const step = 600;
      const delay = 180;
      const maxY = document.body.scrollHeight;

      for (let y = 0; y < maxY; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      window.scrollTo(0, 0);
    });
  }

  async extractProductData(page) {
    const details = await page.evaluate((aplusSelectors) => {
      const isVideoUrl = (url) =>
        !url || /play-button|\.mp4(?:\?|$)|\/video\/|PKplay|videoBlock|vse-vms/i.test(url);

      const isPlaceholderUrl = (url) =>
        !url ||
        /grey-pixel|transparent-pixel|\/G\/01\/x-locale\/common\/|spacer\.gif|data:image|\.svg(?:\?|$)/i.test(
          url
        );

      const cleanDetailValue = (value) => {
        if (!value) {
          return null;
        }

        const cleaned = value.replace(/\s+/g, ' ').trim();
        if (/P\.when\(|function\s*\(|var\s+dpAcr|\.execute\(/.test(cleaned)) {
          const ratingMatch = cleaned.match(/(\d(?:\.\d)?)\s+out of\s+5\s+stars/i);
          return ratingMatch ? `${ratingMatch[1]} out of 5 stars` : null;
        }

        return cleaned;
      };

      const isVideoText = (text) =>
        /^(descriptions off|captions off|this is a modal window)/i.test(text) ||
        /^<img\b/i.test(text);

      const isAplusMediaUrl = (url) => /aplus-media-library-service-media/i.test(url || '');

      const parseAplusCropDimensions = (url) => {
        const match = url?.match(/__CR\d+,(\d+),(\d+),(\d+)/);
        if (!match) {
          return null;
        }

        return {
          width: parseInt(match[2], 10),
          height: parseInt(match[3], 10)
        };
      };

      const isLandscapeAplusImage = (url) => {
        if (!isAplusMediaUrl(url)) {
          return false;
        }

        const dims = parseAplusCropDimensions(url);
        if (!dims) {
          return true;
        }

        return dims.width >= dims.height && dims.width >= 800;
      };

      const isEmbeddedProductThumb = (url) =>
        /\/images\/I\//i.test(url || '') &&
        /\._AC_SR\d+,\d+___\.|__AC_SR\d+,\d+___\./i.test(url);

      const normalizeAplusImageUrl = (url) => {
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
      };

      const dedupeAplusImageUrls = (urls) => {
        const seen = new Set();
        const result = [];

        for (const rawUrl of urls) {
          const url = normalizeAplusImageUrl(rawUrl);
          if (!url || !isLandscapeAplusImage(url)) {
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
      };

      const isExcludedAplusImageElement = (el) => {
        if (!el) {
          return true;
        }

        return !!el.closest('a[href*="/dp/"], a[href*="/gp/product/"]');
      };

      const getLoadedImageUrl = (el) => {
        const candidates = [
          el.getAttribute('data-src'),
          el.getAttribute('data-a-hires'),
          el.getAttribute('data-old-hires'),
          el.src
        ];

        for (const candidate of candidates) {
          if (candidate && !isPlaceholderUrl(candidate)) {
            return candidate;
          }
        }

        return null;
      };

      const collectAplusImageSources = (root) => {
        const urls = [];

        for (const img of root.querySelectorAll('img')) {
          if (isExcludedAplusImageElement(img)) {
            continue;
          }

          const url = getLoadedImageUrl(img);
          if (url && isAplusMediaUrl(url)) {
            urls.push(url);
          }
        }

        for (const el of root.querySelectorAll('[style*="background-image"], [style*="background:url"]')) {
          if (isExcludedAplusImageElement(el)) {
            continue;
          }

          const style = el.getAttribute('style') || '';
          const matches = style.matchAll(/url\(["']?(https:[^"')]+)["']?\)/gi);
          for (const match of matches) {
            if (isAplusMediaUrl(match[1])) {
              urls.push(match[1]);
            }
          }
        }

        return urls;
      };

      const title =
        document.querySelector('#productTitle')?.textContent?.trim() ||
        document.querySelector('#title span')?.textContent?.trim() ||
        '';

      const brand =
        document.querySelector('#bylineInfo')?.textContent?.trim() ||
        document.querySelector('a#bylineInfo')?.textContent?.trim() ||
        null;

      const featureBullets = Array.from(
        document.querySelectorAll('#feature-bullets li span.a-list-item')
      )
        .map((el) => el.textContent.replace(/\s+/g, ' ').trim())
        .filter((text) => text && !/^see more$/i.test(text));

      const itemHighlights = Array.from(
        document.querySelectorAll(
          '#productFactsDesktop_feature_div .a-unordered-list span.a-list-item, '
          + '#productFactsDesktop_feature_div li, '
          + '#poExpander .a-unordered-list span.a-list-item, '
          + '#poExpander li, '
          + '#productOverview_feature_div tr, '
          + '#productOverview_feature_div .a-spacing-small'
        )
      )
        .map((el) => {
          if (el.tagName === 'TR') {
            const key = el.querySelector('td:first-child, th')?.textContent?.replace(/\s+/g, ' ').trim();
            const value = el.querySelector('td:last-child')?.textContent?.replace(/\s+/g, ' ').trim();
            if (key && value && key !== value) return `${key}: ${value}`;
            return value || key || '';
          }
          return el.textContent.replace(/\s+/g, ' ').trim();
        })
        .filter((text) => text && text.length > 2 && !/^see more$/i.test(text));

      const breadcrumbs = Array.from(
        document.querySelectorAll('#wayfinding-breadcrumbs_feature_div ul li a, #wayfinding-breadcrumbs_feature_div a')
      )
        .map((el) => el.textContent.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

      const badges = {
        amazons_choice: Boolean(document.querySelector('#acBadge_feature_div, .ac-badge-wrapper')),
        best_seller: Boolean(
          document.querySelector('#zeitgeistBadge_feature_div, .p13n-best-seller-badge, #badge-link')
        ) || /best\s*seller/i.test(
          document.querySelector('#zeitgeistBadge_feature_div')?.textContent || ''
        ),
        climate_pledge: Boolean(
          document.querySelector('#climatePledgeFriendlyBadge, [data-csa-c-content-id*="climate"]')
        ) || /climate\s*pledge/i.test(document.body.innerText.slice(0, 5000))
      };

      const descriptionCandidates = [
        document.querySelector('#productDescription')?.innerText,
        document.querySelector('#productDescription_feature_div')?.innerText,
        document.querySelector('#aplusProductDescription_feature_div')?.innerText,
        document.querySelector('#productFactsDesktopExpander')?.innerText
      ]
        .map((text) => text?.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

      const description = descriptionCandidates[0] || null;

      const productDetails = {};
      for (const row of document.querySelectorAll(
        '#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, .prodDetTable tr'
      )) {
        const key = row.querySelector('th')?.textContent?.replace(/\s+/g, ' ').trim();
        const value = cleanDetailValue(row.querySelector('td')?.textContent);
        if (key && value) {
          productDetails[key] = value;
        }
      }

      for (const item of document.querySelectorAll('#detailBullets_feature_div li')) {
        const text = item.textContent.replace(/\s+/g, ' ').trim();
        const parts = text.split(':');
        if (parts.length >= 2) {
          const key = parts.shift().trim();
          const value = cleanDetailValue(parts.join(':'));
          if (key && value) {
            productDetails[key] = value;
          }
        }
      }

      const scriptTexts = Array.from(document.querySelectorAll('script')).map(
        (script) => script.textContent || ''
      );

      const colorImagesSnippet = scriptTexts.reduce((found, text) => {
        if (found) return found;
        const idx = text.search(/['"]colorImages['"]\s*:/);
        if (idx < 0) return '';
        return text.slice(idx, idx + 400000);
      }, '');

      const isGalleryThumb = (el) =>
        Boolean(el) && !el.closest('.videoBlock, .vse-video, [data-video-url], .videoThumbnail');

      const altThumbs = Array.from(document.querySelectorAll('#altImages img')).filter(isGalleryThumb);
      const pickThumbUrl = (el) =>
        el.getAttribute('data-old-hires')
        || el.getAttribute('data-a-hires')
        || el.getAttribute('data-src')
        || el.src
        || null;
      const altImageUrls = altThumbs.map(pickThumbUrl).filter(Boolean);
      const altTextsInOrder = altThumbs.map((el) =>
        (el.getAttribute('alt') || '').replace(/\s+/g, ' ').trim()
      );

      const hasVideo = Boolean(
        document.querySelector(
          '#altImages .videoBlock, #altImages .vse-video, #altImages [data-video-url], '
          + '#vse-player-container, .vjs-tech, video'
        )
      );

      let variations = {
        parent_asin: null,
        dimensions: {},
        dimension_values_display_data: null
      };
      for (const scriptText of scriptTexts) {
        if (!/dimensionValuesDisplayData|parentAsin/.test(scriptText)) continue;
        const parentMatch = scriptText.match(/"parentAsin"\s*:\s*"([A-Z0-9]{10})"/);
        if (parentMatch) variations.parent_asin = parentMatch[1];
        const dimMatch = scriptText.match(/"dimensionValuesDisplayData"\s*:\s*(\{[\s\S]*?\})\s*,\s*"/);
        if (dimMatch) {
          try {
            variations.dimension_values_display_data = JSON.parse(dimMatch[1]);
          } catch (_) {
            /* ignore malformed twister JSON */
          }
        }
        const dimensionsMatch = scriptText.match(/"dimensions"\s*:\s*(\[[\s\S]*?\])\s*,\s*"/);
        if (dimensionsMatch) {
          try {
            const dims = JSON.parse(dimensionsMatch[1]);
            if (Array.isArray(dims)) {
              variations.dimensions = Object.fromEntries(
                dims.map((name, index) => [String(name), index])
              );
            }
          } catch (_) {
            /* ignore */
          }
        }
        if (variations.parent_asin || variations.dimension_values_display_data) break;
      }

      const aplusRoots = Array.from(document.querySelectorAll(aplusSelectors));
      const aplusModules = aplusRoots.map((root, index) => {
        const className = String(root.className || '');
        const typeHint =
          root.getAttribute('data-cel-widget')
          || root.id
          || (className.match(/aplus-module-[^\s]+/i) || [])[0]
          || `aplus-module-${index + 1}`;
        const images = dedupeAplusImageUrls(collectAplusImageSources(root));
        const text = Array.from(root.querySelectorAll('p, h1, h2, h3, h4, h5, li'))
          .map((el) => el.textContent.replace(/\s+/g, ' ').trim())
          .filter((t) => t.length > 20 && !isVideoText(t));
        return {
          type_hint: typeHint,
          images,
          text: [...new Set(text)]
        };
      }).filter((mod) => mod.images.length || mod.text.length);

      const aplusImageUrls = dedupeAplusImageUrls(
        aplusModules.flatMap((mod) => mod.images)
      );

      const aplusTextBlocks = aplusModules.flatMap((mod) => mod.text);

      const priceText =
        document.querySelector('#corePrice_feature_div .a-offscreen')?.textContent?.trim() ||
        document.querySelector('#priceblock_ourprice')?.textContent?.trim() ||
        document.querySelector('.a-price .a-offscreen')?.textContent?.trim() ||
        null;

      const ratingLabel =
        document.querySelector('#acrPopover')?.getAttribute('title') ||
        document.querySelector('[data-hook="rating-out-of-text"]')?.textContent?.trim() ||
        null;

      const reviewCountText =
        document.querySelector('#acrCustomerReviewText')?.textContent?.trim() ||
        document.querySelector('[data-hook="total-review-count"]')?.textContent?.trim() ||
        null;

      const parsePriceNumber = (text) => {
        if (!text) return null;
        const cleaned = String(text).replace(/[^0-9.,]/g, '').replace(/,/g, '');
        const n = Number.parseFloat(cleaned);
        return Number.isFinite(n) ? n : null;
      };

      const parseRatingNumber = (text) => {
        if (!text) return null;
        const match = String(text).match(/(\d+(?:\.\d+)?)/);
        if (!match) return null;
        const n = Number.parseFloat(match[1]);
        return Number.isFinite(n) ? n : null;
      };

      const parseReviewCountNumber = (text) => {
        if (!text) return null;
        const match = String(text).replace(/,/g, '').match(/(\d+)/);
        if (!match) return null;
        const n = Number.parseInt(match[1], 10);
        return Number.isFinite(n) ? n : null;
      };

      return {
        title,
        brand,
        feature_bullets: featureBullets,
        item_highlights: [...new Set(itemHighlights)].slice(0, 20),
        breadcrumbs,
        badges,
        variations,
        description,
        product_details: productDetails,
        price_text: priceText,
        price: parsePriceNumber(priceText),
        rating_label: ratingLabel,
        rating: parseRatingNumber(ratingLabel),
        review_count_text: reviewCountText,
        review_count: parseReviewCountNumber(reviewCountText),
        product_images: [],
        product_image_alts: [],
        _gallerySources: {
          colorImagesSnippet,
          altImageUrls,
          altTextsInOrder,
          landingImageUrl: document.querySelector('#landingImage')?.src || null,
          imgTagUrl: document.querySelector('#imgTagWrapperId img')?.src || null
        },
        has_video: hasVideo,
        aplus_images: aplusImageUrls,
        aplus_modules: aplusModules,
        aplus_text_blocks: [...new Set(aplusTextBlocks)]
      };
    }, APLUS_SELECTORS);

    const sources = details._gallerySources || {};
    const product_images = assembleGalleryImageUrls(sources);
    const product_image_alts = mapGalleryAlts(product_images, sources.altTextsInOrder);
    delete details._gallerySources;

    return {
      ...details,
      product_images,
      product_image_alts
    };
  }

  async scrapeProduct(page, item, options = {}) {
    const normalized = this.normalizeItemInput(item);
    const productUrl = this.buildProductUrl(normalized.asin, normalized.domain);

    console.log(`  [${normalized.asin}] Loading product page...`);

    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
    await this.session.sleep(this.delayMs);

    const pageTitle = await page.title();
    if (pageTitle.toLowerCase().includes('page not found')) {
      throw new Error(`Product page not found: ${productUrl}`);
    }

    await page
      .waitForSelector('#productTitle, #title', { timeout: 20000 })
      .catch(() => {
        console.warn(`  Title not found for ${normalized.asin}`);
      });

    await page.evaluate(() => {
      const expanders = document.querySelectorAll(
        '[data-a-expander-name="product_description"] a, '
        + '#productDescription_feature_div .a-expander-prompt, '
        + '#productFactsDesktopExpander .a-expander-prompt, '
        + '#poExpander .a-expander-prompt, '
        + '#productFactsDesktop_feature_div .a-expander-prompt'
      );
      for (const expander of expanders) {
        expander.click();
      }
    });
    await this.session.sleep(500);

    await this.scrollToLoadLazyContent(page);
    await this.session.sleep(1000);

    const details = await this.extractProductData(page);

    return {
      rank: normalized.rank ?? null,
      asin: normalized.asin,
      domain: normalized.domain,
      label: normalized.label ?? null,
      url: productUrl,
      category: normalized.category ?? null,
      list_title: normalized.title ?? null,
      list_image_url: normalized.image_url ?? null,
      list_price_inr: normalized.price_inr ?? null,
      list_rating: normalized.rating ?? null,
      list_review_count: normalized.review_count ?? null,
      ...details,
      scraped_at: new Date().toISOString()
    };
  }

  async scrape(items, options = {}) {
    const inputItems = Array.isArray(items) ? items : [items];
    const limit = options.limit ?? inputItems.length;
    const targets = inputItems.slice(0, limit).map((item) => this.normalizeItemInput(item));
    const products = new Array(targets.length);
    const concurrency = options.concurrency ?? this.concurrency;
    const includeReviews = options.includeReviews ?? this.includeReviews;

    const authPage = await this.session.newPage();
    try {
      if (targets.length > 0) {
        await this.session.applyCookies(authPage, targets[0].domain || this.domain);
      }
    } finally {
      await authPage.close().catch(() => {});
    }

    console.log(
      `Scraping ${targets.length} products (${concurrency} at a time` +
        `${includeReviews ? ', details then reviews per product' : ''})...\n`
    );

    await runWithConcurrency(targets, concurrency, async (item, index) => {
      const page = await this.session.newPage();

      try {
        const product = await this.scrapeProduct(page, item, options);
        products[index] = product;
        console.log(
          `  ✓ ${product.asin}: ${product.product_images.length} gallery images, ${product.aplus_images.length} A+ images`
        );
      } catch (error) {
        console.error(`  ✗ ${item.asin}: ${error.message}`);
        products[index] = {
          asin: item.asin,
          url: item.url,
          error: error.message,
          scraped_at: new Date().toISOString()
        };
      } finally {
        await page.close().catch(() => {});
      }

      const product = products[index];
      if (includeReviews && product && !product.error) {
        try {
          product.reviews = await this.reviewsScraper.scrapeForProduct(
            this.session,
            product.asin,
            product.domain || this.domain
          );
          product.scraped_at = new Date().toISOString();
        } catch (error) {
          console.error(`  ✗ ${product.asin} reviews: ${error.message}`);
          product.reviews = {
            error: error.message,
            total_fetched: 0,
            items: []
          };
        }
      }
    });

    return {
      domain: targets[0]?.domain || this.domain,
      source_count: targets.length,
      scraped_count: products.filter((product) => product && !product.error).length,
      products
    };
  }

  async close() {
    await this.session.close();
  }
}

module.exports = { ProductDetailsScraper };
