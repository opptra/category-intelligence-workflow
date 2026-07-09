/**
 * One-time helper: opens Amazon in a browser so you can log in,
 * then saves session cookies to amazon_cookies.json for the scraper.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const readline = require('readline');
const { cookiesPath } = require('../src/lib/paths');

async function waitForEnter(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise((resolve) => rl.question(prompt, () => { rl.close(); resolve(); }));
}

async function main() {
  const domain = process.argv[2] || 'www.amazon.in';
  const outputFile = cookiesPath();
  const cookieDomain = domain.replace('www.', '');

  console.log(`Opening https://${domain}`);
  console.log('1. Log in to your Amazon account in the browser window');
  console.log('2. After login succeeds, return here and press Enter\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(`https://${domain}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  await waitForEnter('Press Enter after you are logged in... ');

  const cookies = await page.cookies(`https://${domain}/`);
  const amazonCookies = cookies.filter((cookie) => cookie.domain.includes(cookieDomain));

  if (amazonCookies.length === 0) {
    console.error('No Amazon cookies found. Make sure you completed login.');
    await browser.close();
    process.exit(1);
  }

  fs.writeFileSync(outputFile, JSON.stringify(amazonCookies, null, 2), 'utf-8');
  console.log(`\nSaved ${amazonCookies.length} cookies to ${outputFile}`);
  console.log('You can now run: npm run scrape:best-sellers');

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
