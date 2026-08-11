const { BrowserSession } = require('../lib/browser-session');
const { extractASIN, extractDomain } = require('../lib/amazon-utils');
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
    return page.evaluate((aplusSelectors) => {
      const isVideoUrl = (url) =>
        !url || /play-button|\.mp4(?:\?|$)|\/video\/|PKplay|videoBlock|vse-vms/i.test(url);

      const isPlaceholderUrl = (url) =>
        !url ||
        /grey-pixel|transparent-pixel|\/G\/01\/x-locale\/common\/|spacer\.gif|data:image|\.svg(?:\?|$)/i.test(
          url
        );

      const isGalleryImageUrl = (url) =>
        /\/images\/I\//i.test(url) && /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url);

      const toHiResImageUrl = (url) => {
        if (!url || isVideoUrl(url) || isPlaceholderUrl(url)) {
          return null;
        }

        return url
          .replace(/\._[A-Z]{2}[0-9]+_[^.]+\./, '._AC_SL1500_.')
          .replace(/\._SS\d+_\./, '._AC_SL1500_.')
          .replace(/\._SX\d+_\./, '._AC_SL1500_.')
          .replace(/\._SY\d+_\./, '._AC_SL1500_.')
          .replace(/\._AC_UL\d+_SR\d+,\d+_\./, '._AC_SL1500_.');
      };

      const imageIdFromUrl = (url) => {
        const match = url?.match(/\/images\/I\/([A-Za-z0-9+._-]+)/);
        return match ? match[1].split('.')[0] : null;
      };

      const dedupeImageUrls = (urls) => {
        const seen = new Set();
        const result = [];

        for (const rawUrl of urls) {
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
      };

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

      const extractGalleryImagesFromScripts = (scriptTexts) => {
        const urls = [];

        for (const text of scriptTexts) {
          const colorImagesMatch = text.match(/'colorImages'\s*:\s*\{[\s\S]*?\}\s*,\s*'/);
          if (!colorImagesMatch) {
            continue;
          }

          const block = colorImagesMatch[0];
          for (const match of block.matchAll(/"(?:hiRes|large)":"(https:[^"\\]+)"/g)) {
            urls.push(match[1].replace(/\\u002F/g, '/'));
          }
        }

        return urls;
      };
      const collectImageSources = (root, selector) =>
        Array.from(root.querySelectorAll(selector)).flatMap((el) => {
          if (el.closest('.videoBlock, .vse-video, [data-video-url]')) {
            return [];
          }

          const values = [
            el.src,
            el.getAttribute('data-src'),
            el.getAttribute('data-old-hires'),
            el.getAttribute('data-a-hires')
          ];

          const style = el.getAttribute('style') || '';
          const bgMatch = style.match(/url\(["']?(https:[^"')]+)["']?\)/i);
          if (bgMatch) {
            values.push(bgMatch[1]);
          }

          return values.filter(Boolean);
        });

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

      const galleryImageUrls = dedupeImageUrls([
        document.querySelector('#landingImage')?.src,
        document.querySelector('#imgTagWrapperId img')?.src,
        ...collectImageSources(document, '#altImages img'),
        ...extractGalleryImagesFromScripts(scriptTexts)
      ]);

      const aplusRoots = Array.from(document.querySelectorAll(aplusSelectors));
      const aplusImageUrls = dedupeAplusImageUrls(
        aplusRoots.flatMap((root) => collectAplusImageSources(root))
      );

      const aplusTextBlocks = aplusRoots
        .flatMap((root) =>
          Array.from(root.querySelectorAll('p, h1, h2, h3, h4, h5, li')).map((el) =>
            el.textContent.replace(/\s+/g, ' ').trim()
          )
        )
        .filter((text) => text.length > 20 && !isVideoText(text));

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

      return {
        title,
        brand,
        feature_bullets: featureBullets,
        description,
        product_details: productDetails,
        price_text: priceText,
        rating_label: ratingLabel,
        review_count_text: reviewCountText,
        product_images: galleryImageUrls,
        aplus_images: aplusImageUrls,
        aplus_text_blocks: [...new Set(aplusTextBlocks)]
      };
    }, APLUS_SELECTORS);
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
        '[data-a-expander-name="product_description"] a, #productDescription_feature_div .a-expander-prompt, #productFactsDesktopExpander .a-expander-prompt'
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
