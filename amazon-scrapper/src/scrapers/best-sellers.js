const { BrowserSession } = require('../lib/browser-session');
const { PAGE_TIMEOUT_MS } = require('../lib/constants');

class BestSellersScraper {
  constructor(options = {}) {
    if (!options.categoryUrl || typeof options.categoryUrl !== 'string' || !options.categoryUrl.trim()) {
      throw new Error('categoryUrl is required (Amazon bestsellers category URL)');
    }

    this.domain = options.domain || 'www.amazon.in';
    this.categoryUrl = options.categoryUrl.trim();
    this.categoryName = typeof options.categoryName === 'string' && options.categoryName.trim()
      ? options.categoryName.trim()
      : null;
    this.limit = options.limit || 10;
    this.session = new BrowserSession({
      cookiesPath: options.cookiesPath,
      delayMs: options.delayMs,
      headless: options.headless
    });
  }

  isGenericCategoryName(name) {
    if (!name || typeof name !== 'string') return true;
    const cleaned = name.replace(/\s+/g, ' ').trim();
    if (!cleaned) return true;
    if (/^undefined$/i.test(cleaned)) return true;
    if (/^best\s*sellers?$/i.test(cleaned)) return true;
    if (/^amazon(\.in)?\s+best\s*sellers?$/i.test(cleaned)) return true;
    return false;
  }

  categoryNameFromUrl(url) {
    try {
      const pathname = new URL(url).pathname;
      const parts = pathname.split('/').filter(Boolean);
      const skip = new Set([
        'gp',
        'bestsellers',
        'b',
        'ref',
        'dp',
        'product',
        'kitchen',
        'home-improvement',
        'electronics',
        'books',
        'computers',
        'apparel',
        'beauty',
        'toys',
        'automotive',
        'sports',
        'grocery',
        'hpc',
        'baby',
        'pets',
        'office-products',
        'industrial',
        'lawn-garden',
        'musical-instruments',
        'digital-text'
      ]);

      for (const part of parts) {
        if (/^\d+$/.test(part)) continue;
        if (skip.has(part.toLowerCase())) continue;
        if (!/[a-zA-Z]/.test(part)) continue;
        // Prefer multi-word Amazon category slugs (e.g. Home-Furnishing-Panels)
        if (!part.includes('-')) continue;
        return part
          .replace(/[-_]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
    } catch {
      // ignore invalid URLs
    }
    return null;
  }

  async resolveCategoryName(page) {
    if (this.categoryName && !this.isGenericCategoryName(this.categoryName)) {
      return this.categoryName.trim();
    }

    const name = await page.evaluate(() => {
      const clean = (value) => {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        if (!text) return null;
        if (/^undefined$/i.test(text)) return null;
        if (/^best\s*sellers?$/i.test(text)) return null;
        if (/^amazon(\.in)?\s+best\s*sellers?$/i.test(text)) return null;
        return text;
      };

      const fromBestSellersIn = (text) => {
        const match = String(text || '').match(/Best\s*Sellers?\s+in\s+(.+)/i);
        return match ? clean(match[1]) : null;
      };

      const heading =
        document.querySelector('#zg-right-col h1') ||
        document.querySelector('.zg-banner-text h1') ||
        document.querySelector('h1');
      const fromHeading =
        fromBestSellersIn(heading?.textContent) || clean(heading?.textContent);
      if (fromHeading) return fromHeading;

      const title = document.title || '';
      const titleMatch =
        title.match(/most popular items in\s+(.+?)(?:\s*\||$)/i) ||
        title.match(/Best\s*Sellers?:\s*(.+?)(?:\s*\||$)/i);
      const fromTitle = clean(titleMatch?.[1]);
      if (fromTitle) return fromTitle;

      const selected =
        document.querySelector('#zg_browseRoot .zg_selected') ||
        document.querySelector('#zg-left-col .zg_selected');
      const fromSelected = clean(selected?.textContent);
      if (fromSelected) return fromSelected;

      const crumbs = [...document.querySelectorAll('#zg_browseRoot li, #zg_browseRoot a, #zg_browseRoot span')]
        .map((el) => clean(el.textContent))
        .filter(Boolean);
      if (crumbs.length) {
        return crumbs[crumbs.length - 1];
      }

      return null;
    });

    if (name && !this.isGenericCategoryName(name)) {
      return name;
    }

    const fromUrl = this.categoryNameFromUrl(this.categoryUrl);
    if (fromUrl && !this.isGenericCategoryName(fromUrl)) {
      return fromUrl;
    }

    throw new Error(
      `Could not resolve category name from bestsellers page: ${this.categoryUrl}`
    );
  }

  async parseBestSellersFromPage(page) {
    return page.evaluate(() => {
      const parseRank = (root) => {
        const badge = root.querySelector('.zg-bdg-text, .zg-badge-text, .zg-badge');
        const match = badge?.textContent?.match(/#?\s*(\d+)/);
        return match ? parseInt(match[1], 10) : null;
      };

      const parseRating = (root) => {
        const reviewLink = root.querySelector('a[href*="/product-reviews/"]');
        const ariaLabel = reviewLink?.getAttribute('aria-label') || '';
        const ariaMatch = ariaLabel.match(/([\d.]+)\s+out of\s+5/i);
        if (ariaMatch) {
          return parseFloat(ariaMatch[1]);
        }

        const ratingEl = root.querySelector('.a-icon-alt');
        const match = ratingEl?.textContent?.match(/([\d.]+)\s+out of\s+5/i);
        return match ? parseFloat(match[1]) : null;
      };

      const parseReviewCount = (root) => {
        const reviewLink = root.querySelector('a[href*="/product-reviews/"]');
        const ariaLabel = reviewLink?.getAttribute('aria-label') || '';
        const ariaMatch = ariaLabel.match(/([\d,]+)\s+ratings?/i);
        if (ariaMatch) {
          return parseInt(ariaMatch[1].replace(/,/g, ''), 10);
        }

        const countEl = reviewLink?.querySelector('.a-size-small');
        if (countEl?.textContent) {
          return parseInt(countEl.textContent.replace(/,/g, ''), 10);
        }

        return null;
      };

      const parsePrice = (root) => {
        const priceEl =
          root.querySelector('[class*="p13n-sc-price"]') ||
          root.querySelector('.a-price .a-offscreen') ||
          root.querySelector('.a-color-price');

        if (!priceEl?.textContent) {
          return null;
        }

        const normalized = priceEl.textContent.replace(/[^\d.,]/g, '').replace(/,/g, '');
        const value = parseFloat(normalized);
        return Number.isFinite(value) ? value : null;
      };

      const parseTitle = (root) => {
        const titleEl =
          root.querySelector('[class*="p13n-sc-css-line-clamp"]') ||
          root.querySelector('div.p13n-sc-truncate');

        if (titleEl?.textContent?.trim()) {
          return titleEl.textContent.trim();
        }

        const imageEl = root.querySelector('img');
        return imageEl?.getAttribute('alt')?.trim() || '';
      };

      const itemRoots = Array.from(document.querySelectorAll('#gridItemRoot'));

      const items = [];

      for (const root of itemRoots) {
        const asin = root.querySelector('[data-asin]')?.getAttribute('data-asin') ||
          root.querySelector('[id^="B"]')?.id;

        const productLink = root.querySelector('a.a-link-normal[href*="/dp/"]');
        if (!productLink || !asin) {
          continue;
        }

        const href = productLink.href;
        const imageEl = root.querySelector('img.p13n-product-image, img');

        items.push({
          rank: parseRank(root),
          asin: asin.toUpperCase(),
          title: parseTitle(root),
          url: href.split('?')[0],
          price_inr: parsePrice(root),
          rating: parseRating(root),
          review_count: parseReviewCount(root),
          image_url: imageEl?.src || imageEl?.getAttribute('data-src') || null
        });
      }

      const seen = new Set();
      return items
        .filter((item) => item.asin && !seen.has(item.asin) && seen.add(item.asin))
        .sort((a, b) => (a.rank || 999) - (b.rank || 999));
    });
  }

  async scrape(options = {}) {
    const limit = options.limit || this.limit;
    const page = await this.session.newPage();

    try {
      await this.session.applyCookies(page, this.domain);

      console.log(`Loading best sellers: ${this.categoryUrl}`);

      await page.goto(this.categoryUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
      await this.session.sleep(this.session.delayMs);

      const pageTitle = await page.title();
      if (pageTitle.toLowerCase().includes('page not found')) {
        throw new Error(`Category page not found: ${this.categoryUrl}`);
      }

      const bodyText = await page.evaluate(() => document.body.innerText);
      if (bodyText.includes('Sign in or create account') && bodyText.includes('Sorry')) {
        console.warn('Amazon may be blocking the request. Try refreshing cookies.');
      }

      await page.waitForSelector('#gridItemRoot', {
        timeout: 20000
      }).catch(() => {
        console.warn('Best seller grid not found with expected selectors');
      });

      const categoryName = await this.resolveCategoryName(page);
      this.categoryName = categoryName;

      const items = await this.parseBestSellersFromPage(page);
      const topItems = items.slice(0, limit).map((item, index) => ({
        ...item,
        rank: item.rank || index + 1,
        category: categoryName,
        scraped_at: new Date().toISOString()
      }));

      return {
        domain: this.domain,
        category: categoryName,
        category_url: this.categoryUrl,
        total_found: items.length,
        items: topItems
      };
    } finally {
      await page.close();
    }
  }

  async close() {
    await this.session.close();
  }
}

module.exports = { BestSellersScraper };
