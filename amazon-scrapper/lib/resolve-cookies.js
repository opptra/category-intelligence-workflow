const path = require('path');

function resolveCookiesPath() {
  return path.join(__dirname, '..', 'amazon_cookies.json');
}

module.exports = { resolveCookiesPath };
