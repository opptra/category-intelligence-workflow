const { cookiesPath } = require('./paths');

function resolveCookiesPath(customPath) {
  return customPath || cookiesPath();
}

module.exports = { resolveCookiesPath, cookiesPath };
