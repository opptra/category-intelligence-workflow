const { CLEAN_REVIEW_TEXT_FN } = require('../lib/review-text-utils');
const { runWithConcurrency } = require('../lib/concurrency');
const { CONCURRENCY, PAGE_TIMEOUT_MS } = require('../lib/constants');

const STAR_FILTERS = [
  { key: 'five_star', rating: 5 },
  { key: 'four_star', rating: 4 },
  { key: 'three_star', rating: 3 },
  { key: 'two_star', rating: 2 },
  { key: 'one_star', rating: 1 }
];

const DEFAULT_LIMITS = {
  perStar: 50,
  maxTotal: 250,
  sortBy: 'recent'
};

class ReviewsScraper {
  constructor(options = {}) {
    this.delayMs = options.delayMs || 1500;
    this.limits = {
      perStar: options.maxPerStar ?? DEFAULT_LIMITS.perStar,
      maxTotal: options.maxTotalReviews ?? DEFAULT_LIMITS.maxTotal,
      sortBy: options.sortBy || DEFAULT_LIMITS.sortBy
    };
  }

  buildReviewListingUrl(domain, asin, starFilter, sortBy) {
    const params = new URLSearchParams({
      ie: 'UTF8',
      reviewerType: 'all_reviews',
      sortBy,
      pageNumber: '1'
    });

    if (starFilter) {
      params.set('filterByStar', starFilter);
    }

    return (
      `https://${domain}/product-reviews/${asin}/ref=cm_cr_arp_d_viewopt_srt` +
      `?${params.toString()}`
    );
  }

  async getListingPageMeta(page) {
    return page.evaluate(() => {
      const bodyText = document.body.innerText;

      return {
        isSignIn: bodyText.includes('Sign in or create account'),
        reviewCount: document.querySelectorAll('[data-hook="review"]').length
      };
    });
  }

  async parseReviewsFromPage(page) {
    return page.evaluate((cleanFnSource) => {
      eval(cleanFnSource);

      const getReviewText = (element) => {
        const textSpan = element.querySelector(
          '[data-hook="review-body"] span[data-hook="review-body-text"], [data-hook="reviewText"] > span'
        );
        if (textSpan?.textContent?.trim()) {
          return cleanReviewText(textSpan.textContent);
        }

        const bodyEl = element.querySelector('[data-hook="review-body"], [data-hook="reviewText"]');
        if (!bodyEl) {
          return '';
        }

        const hasVideo = element.querySelector(
          '[data-hook="review-video"], video, [data-action*="vse"], [class*="vse-"]'
        );

        if (hasVideo) {
          const clone = bodyEl.cloneNode(true);
          clone
            .querySelectorAll(
              'video, script, [data-hook="review-video"], [data-action*="vse"], [class*="vse-"], [class*="video-player"]'
            )
            .forEach((node) => node.remove());
          return cleanReviewText(clone.textContent || '');
        }

        return cleanReviewText(bodyEl.textContent || '');
      };

      const reviews = [];
      document.querySelectorAll('[data-hook="review"]').forEach((element) => {
        const ratingEl = element.querySelector(
          '[data-hook="review-star-rating"] .a-icon-alt, [data-hook="cmps-review-star-rating"] .a-icon-alt'
        );
        const ratingMatch = ratingEl?.textContent?.match(/([\d.]+)/);
        const helpfulMatch = element.textContent.match(/(\d+)\s+(?:people|person)\s+found this helpful/i);
        const titleEl = element.querySelector(
          '[data-hook="review-title"] span:not(.a-icon-alt), [data-hook="reviewTitle"]'
        );
        const hasVideo = !!element.querySelector(
          '[data-hook="review-video"], video, [data-action*="vse"], [class*="vse-"]'
        );

        reviews.push({
          review_id: element.id || null,
          reviewer: element.querySelector('.a-profile-name')?.textContent?.trim() || 'Anonymous',
          rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
          title: cleanReviewText(titleEl?.textContent || ''),
          review_text: getReviewText(element),
          has_video: hasVideo,
          verified: !!element.querySelector('[data-hook="avp-badge"]') ||
            element.textContent.includes('Verified Purchase'),
          date: element.querySelector('[data-hook="review-date"]')?.textContent?.trim() || '',
          helpful_count: helpfulMatch ? parseInt(helpfulMatch[1], 10) : 0
        });
      });

      return reviews;
    }, CLEAN_REVIEW_TEXT_FN);
  }

  reviewKey(review) {
    if (review.review_id) {
      return review.review_id;
    }

    return `${review.reviewer}|${review.title}|${review.date}`;
  }

  mergeReviews(existing, incoming, maxCount) {
    const seen = new Set(existing.map((review) => this.reviewKey(review)));

    for (const review of incoming) {
      if (existing.length >= maxCount) {
        break;
      }

      const key = this.reviewKey(review);
      if (seen.has(key)) {
        continue;
      }

      if (!review.review_text?.trim()) {
        continue;
      }

      seen.add(key);
      existing.push(review);
    }

    return existing;
  }

  countByStar(items) {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const review of items) {
      const star = Math.round(review.rating);
      if (counts[star] != null) {
        counts[star]++;
      }
    }
    return counts;
  }

  buildReviewResult(reviews, authStatus) {
    return {
      auth_status: authStatus,
      limits: {
        per_star: this.limits.perStar,
        max_total: this.limits.maxTotal,
        sort_by: this.limits.sortBy
      },
      total_fetched: reviews.length,
      by_star: this.countByStar(reviews),
      items: reviews
    };
  }

  async clickShowMoreReviews(page, asin, rating) {
    const showMoreButton = await page.$('[data-hook="show-more-button"]');
    if (!showMoreButton) {
      return false;
    }

    const beforeCount = await page.evaluate(
      () => document.querySelectorAll('[data-hook="review"]').length
    );

    await showMoreButton.click();
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));

    const afterCount = await page.evaluate(
      () => document.querySelectorAll('[data-hook="review"]').length
    );

    if (afterCount > beforeCount) {
      console.log(`  [${asin}]   loaded ${afterCount} reviews so far (${rating}-star)`);
    }

    return afterCount > beforeCount;
  }

  async loadReviewsInBucket(page, domain, asin, starFilter, maxPerStar, rating) {
    const reviewUrl = this.buildReviewListingUrl(domain, asin, starFilter, this.limits.sortBy);
    console.log(`  [${asin}] Loading ${rating}-star page...`);
    await page.goto(reviewUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const initialState = await this.getListingPageMeta(page);
    if (initialState.isSignIn) {
      return { reviews: [], needsAuth: true, clicks: 0 };
    }

    if (initialState.reviewCount === 0) {
      console.log(`  [${asin}]   no ${rating}-star reviews found`);
      return { reviews: [], needsAuth: false, clicks: 0 };
    }

    let clicks = 0;
    const maxClicks = Math.ceil(maxPerStar / 8);

    while (clicks < maxClicks) {
      const currentCount = await page.evaluate(
        () => document.querySelectorAll('[data-hook="review"]').length
      );

      if (currentCount >= maxPerStar) {
        break;
      }

      const loadedMore = await this.clickShowMoreReviews(page, asin, rating);
      if (!loadedMore) {
        break;
      }

      clicks++;
    }

    const reviews = (await this.parseReviewsFromPage(page))
      .filter((review) => review.review_text?.trim())
      .slice(0, maxPerStar);

    return { reviews, needsAuth: false, clicks };
  }

  async getEmbeddedReviews(page, domain, asin) {
    const productUrl = `https://${domain}/dp/${asin}`;
    console.log(`  [${asin}] Falling back to embedded product-page reviews...`);
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });

    await page.evaluate(() => {
      document
        .querySelector('#customerReviews, [data-hook="reviews-medley-widget"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    try {
      await page.waitForSelector('[data-hook="review"]', { timeout: 10000 });
    } catch {
      return [];
    }

    await page.evaluate(() => {
      document
        .querySelectorAll('[data-hook="review-expand"], [data-action="a-expander-toggle"]')
        .forEach((button) => button.click());
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return (await this.parseReviewsFromPage(page)).filter((review) => review.review_text?.trim());
  }

  async scrapeStarBuckets(session, asin, domain) {
    const page = await session.newPage();
    const reviews = [];
    let authStatus = 'authenticated';

    try {
      for (const { key, rating } of STAR_FILTERS) {
        if (reviews.length >= this.limits.maxTotal) {
          break;
        }

        const remainingTotal = this.limits.maxTotal - reviews.length;
        const bucketLimit = Math.min(this.limits.perStar, remainingTotal);

        console.log(`  [${asin}] Reviews: ${rating}-star (max ${bucketLimit})`);

        const result = await this.loadReviewsInBucket(page, domain, asin, key, bucketLimit, rating);

        if (result.needsAuth) {
          authStatus = 'expired';
          console.log(`  [${asin}]   session expired — sign in required`);
          break;
        }

        const beforeCount = reviews.length;
        this.mergeReviews(reviews, result.reviews, this.limits.maxTotal);
        const added = reviews.length - beforeCount;

        console.log(`  [${asin}]   +${added} reviews (${result.clicks || 0} show-more clicks)`);
      }

      return { reviews, authStatus };
    } finally {
      await page.close().catch(() => {});
    }
  }

  async scrapeForProduct(session, asin, domain) {
    console.log(`\nFetching reviews for ${asin}...`);

    const bucketResult = await this.scrapeStarBuckets(session, asin, domain);

    if (bucketResult.reviews.length > 0) {
      console.log(
        `  ✓ ${asin}: ${bucketResult.reviews.length} reviews (${bucketResult.authStatus})`
      );
      return this.buildReviewResult(bucketResult.reviews, bucketResult.authStatus);
    }

    const page = await session.newPage();
    try {
      const embedded = await this.getEmbeddedReviews(page, domain, asin);
      const reviews = [];
      this.mergeReviews(reviews, embedded.slice(0, this.limits.maxTotal), this.limits.maxTotal);
      console.log(`  ✓ ${asin}: ${reviews.length} reviews (embedded fallback)`);
      return this.buildReviewResult(reviews, bucketResult.authStatus);
    } finally {
      await page.close().catch(() => {});
    }
  }

  async scrapeMany(session, products) {
    const targets = products.filter((product) => product.asin && !product.error);

    const authPage = await session.newPage();
    let cookiesApplied = false;
    try {
      if (targets.length > 0) {
        const domain = targets[0].domain || 'www.amazon.in';
        cookiesApplied = await session.applyCookies(authPage, domain);
      }
    } finally {
      await authPage.close().catch(() => {});
    }

    if (!cookiesApplied && targets.length > 0) {
      console.warn('No cookies loaded — review counts may be limited');
    }

    console.log(`\nFetching reviews for ${targets.length} products (${CONCURRENCY} at a time)...\n`);

    await runWithConcurrency(targets, CONCURRENCY, async (product) => {
      const domain = product.domain || 'www.amazon.in';
      product.reviews = await this.scrapeForProduct(session, product.asin, domain);
      product.scraped_at = new Date().toISOString();
    });

    return products;
  }
}

module.exports = { ReviewsScraper };
