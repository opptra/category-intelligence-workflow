const fs = require('fs');
const path = require('path');
const { cookiesPath } = require('./paths');
const puppeteer = require('puppeteer');
const { PAGE_TIMEOUT_MS, PROTOCOL_TIMEOUT_MS } = require('./constants');

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

class BrowserSession {
  constructor(options = {}) {
    this.browser = null;
    this.cookiesPath = options.cookiesPath || cookiesPath();
    this.delayMs = options.delayMs || 1500;
    this.headless = options.headless ?? 'new';
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: this.headless,
      protocolTimeout: PROTOCOL_TIMEOUT_MS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });
  }

  async setupPage(page) {
    page.setDefaultTimeout(PAGE_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS);
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-IN', 'en'] });
      window.chrome = { runtime: {} };
    });

    await page.setUserAgent(DEFAULT_USER_AGENT);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-IN,en;q=0.9' });
    await page.setViewport({ width: 1366, height: 768 });
  }

  cookieDomain(domain) {
    return domain.startsWith('www.') ? domain.slice(4) : domain;
  }

  loadCookieFile() {
    if (!fs.existsSync(this.cookiesPath)) {
      return null;
    }

    try {
      const raw = JSON.parse(fs.readFileSync(this.cookiesPath, 'utf-8'));
      return Array.isArray(raw) ? raw : raw.cookies || null;
    } catch (error) {
      console.error(`Failed to read cookies file: ${error.message}`);
      return null;
    }
  }

  async applyCookies(page, domain) {
    const cookies = this.loadCookieFile();
    if (!cookies?.length) {
      return false;
    }

    const cookieDomain = `.${this.cookieDomain(domain)}`;
    await page.goto(`https://${domain}/`, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });

    const normalizedCookies = cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain || cookieDomain,
      path: cookie.path || '/',
      secure: cookie.secure !== false,
      httpOnly: cookie.httpOnly || false,
      sameSite: cookie.sameSite || 'Lax'
    }));

    await page.setCookie(...normalizedCookies);
    console.log(`Loaded ${normalizedCookies.length} cookies from ${path.basename(this.cookiesPath)}`);
    return true;
  }

  async newPage() {
    if (!this.browser) {
      await this.init();
    }

    const page = await this.browser.newPage();
    await this.setupPage(page);
    return page;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = { BrowserSession, DEFAULT_USER_AGENT };
