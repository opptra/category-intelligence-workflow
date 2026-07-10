const { ProductDetailsScraper } = require('../scrapers/product-details');

async function scrapeProductDetailsAndReviews(items, options) {
  const scraper = new ProductDetailsScraper({
    cookiesPath: options.cookiesPath,
    headless: options.headless,
    includeReviews: options.includeReviews !== false,
    maxPerStar: options.reviewsPerStar,
    maxTotalReviews: options.maxReviews
  });

  try {
    console.log('\n' + '='.repeat(60));
    console.log(options.stepLabel || 'PRODUCT DETAILS + REVIEWS');
    console.log('='.repeat(60));
    console.log(`Scraping ${items.length} products`);
    if (options.includeReviews !== false) {
      console.log(`Reviews: ${options.reviewsPerStar}/star, ${options.maxReviews} total max`);
    }
    console.log('');

    const result = await scraper.scrape(items, {
      limit: items.length,
      includeReviews: options.includeReviews !== false
    });

    const output = {
      source: options.source || 'best-sellers',
      source_file: options.sourceFile || null,
      category: options.category || result.category || null,
      review_limits:
        options.includeReviews !== false
          ? {
              per_star: options.reviewsPerStar,
              max_total: options.maxReviews,
              sort_by: 'recent'
            }
          : null,
      ...result
    };

    console.log(`\nScraped ${result.products.length} products`);

    for (const product of result.products) {
      if (product.error) {
        console.log(`\n  ${product.asin}: FAILED — ${product.error}`);
        continue;
      }

      const label = product.label ? ` (${product.label})` : '';
      console.log(`\n  #${product.rank ?? '?'} ${product.asin}${label}`);
      console.log(
        `     Gallery: ${product.product_images.length} | A+: ${product.aplus_images.length} | Reviews: ${product.reviews?.total_fetched ?? 0}`
      );
    }

    return output;
  } finally {
    await scraper.close();
  }
}

function printSummary({ title, listFile, outputFile, finalOutput, elapsed }) {
  const totalReviews = finalOutput.products.reduce(
    (sum, product) => sum + (product.reviews?.total_fetched || 0),
    0
  );

  console.log('\n' + '='.repeat(60));
  console.log('DONE');
  console.log('='.repeat(60));
  console.log(title);
  if (listFile) {
    console.log(`Product list:  ${listFile}`);
  }
  if (outputFile) {
    console.log(`Full output:   ${outputFile}`);
  }
  console.log(`Products:      ${finalOutput.products.length}`);
  console.log(`Total reviews: ${totalReviews}`);
  console.log(`Time:          ${elapsed}s`);
}

module.exports = { scrapeProductDetailsAndReviews, printSummary };
