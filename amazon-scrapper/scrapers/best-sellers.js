const { BrowserSession } = require('../lib/browser-session');
const { PAGE_TIMEOUT_MS } = require('../lib/constants');

const DEFAULT_CATEGORY = {
  name: 'Curtains & Drapes',
  browseNodeId: '1380479031',
  url: 'https://www.amazon.in/gp/bestsellers/kitchen/1380479031'
};

class BestSellersScraper {
  constructor(options = {}) {
    this.domain = options.domain || 'www.amazon.in';
    this.category = options.category || DEFAULT_CATEGORY;
    this.limit = options.limit || 10;
    this.session = new BrowserSession({
      cookiesPath: options.cookiesPath,
      delayMs: options.delayMs,
      headless: options.headless
    });
  }

  buildCategoryUrl() {
    return this.category.url ||
      `https://${this.domain}/gp/bestsellers/kitchen/${this.category.browseNodeId}`;
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

      const categoryUrl = this.buildCategoryUrl();
      console.log(`Loading best sellers: ${categoryUrl}`);

      await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
      await this.session.sleep(this.session.delayMs);

      const pageTitle = await page.title();
      if (pageTitle.toLowerCase().includes('page not found')) {
        throw new Error(`Category page not found: ${categoryUrl}`);
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

      const items = await this.parseBestSellersFromPage(page);
      const topItems = items.slice(0, limit).map((item, index) => ({
        ...item,
        rank: item.rank || index + 1,
        category: this.category.name,
        scraped_at: new Date().toISOString()
      }));

      return {
        domain: this.domain,
        category: this.category.name,
        category_url: categoryUrl,
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

module.exports = { BestSellersScraper, DEFAULT_CATEGORY };
