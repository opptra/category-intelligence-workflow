const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  parseLinksFile,
  collectFromCsvOrLines,
  collectFromJson,
  dedupeAndValidate,
  entryFromValue,
  MIN_COMPETITIVE_SET
} = require('./links-file');

const URL_A = 'https://www.amazon.in/Foo-Mat/dp/B0AAAAAA01/ref=sr_1';
const URL_B = 'https://www.amazon.in/Bar-Mat/dp/B0AAAAAA02';
const URL_C = 'https://www.amazon.in/dp/B0AAAAAA03';
const URL_US = 'https://www.amazon.com/dp/B0AAAAAA04';

function writeTemp(name, contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'links-file-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, contents, 'utf-8');
  return { dir, file };
}

describe('entryFromValue', () => {
  it('normalizes messy Amazon PDP URLs to /dp/ASIN', () => {
    const entry = entryFromValue(URL_A);
    assert.equal(entry.asin, 'B0AAAAAA01');
    assert.equal(entry.domain, 'www.amazon.in');
    assert.equal(entry.url, 'https://www.amazon.in/dp/B0AAAAAA01');
  });

  it('returns null for junk', () => {
    assert.equal(entryFromValue('not-a-url'), null);
    assert.equal(entryFromValue(''), null);
  });
});

describe('collectFromCsvOrLines', () => {
  it('reads a header CSV with url and label', () => {
    const rows = collectFromCsvOrLines(
      'url,label\n'
      + `${URL_A},Mat A\n`
      + `${URL_B},"Mat, B"\n`
    );
    assert.equal(rows.length, 2);
    assert.equal(rows[0].url, URL_A);
    assert.equal(rows[0].label, 'Mat A');
    assert.equal(rows[1].label, 'Mat, B');
  });

  it('treats headerless files as one URL per line', () => {
    const rows = collectFromCsvOrLines(`${URL_A}\n${URL_B}\n# comment\n`);
    assert.equal(rows.length, 2);
    assert.equal(rows[0], URL_A);
  });
});

describe('collectFromJson', () => {
  it('accepts products, urls, items, or a raw array', () => {
    assert.deepEqual(collectFromJson({ urls: [URL_A] }), [URL_A]);
    assert.deepEqual(collectFromJson({ products: [{ url: URL_A }] }), [{ url: URL_A }]);
    assert.deepEqual(collectFromJson({ items: [URL_A] }), [URL_A]);
    assert.deepEqual(collectFromJson([URL_A]), [URL_A]);
  });

  it('rejects objects without a list', () => {
    assert.throws(() => collectFromJson({ category: 'Rugs' }), /products, urls, or items/);
  });
});

describe('dedupeAndValidate', () => {
  it('dedupes by ASIN and skips junk', () => {
    const result = dedupeAndValidate(
      [URL_A, URL_A, 'nope', URL_B, URL_C],
      { minProducts: MIN_COMPETITIVE_SET, maxProducts: 20 }
    );
    assert.equal(result.entries.length, 3);
    assert.equal(result.skipped, 2);
    assert.equal(result.truncated, 0);
    assert.equal(result.domain, 'www.amazon.in');
  });

  it('fails on mixed marketplaces', () => {
    assert.throws(
      () => dedupeAndValidate([URL_A, URL_B, URL_US], { minProducts: 3, maxProducts: 20 }),
      /mixes marketplaces/
    );
  });

  it('fails below the minimum unique ASIN count', () => {
    assert.throws(
      () => dedupeAndValidate([URL_A, URL_B], { minProducts: 3, maxProducts: 20 }),
      /at least 3/
    );
  });

  it('caps at maxProducts', () => {
    const extra = 'https://www.amazon.in/dp/B0AAAAAA05';
    const result = dedupeAndValidate(
      [URL_A, URL_B, URL_C, extra],
      { minProducts: 3, maxProducts: 3 }
    );
    assert.equal(result.entries.length, 3);
    assert.equal(result.truncated, 1);
  });
});

describe('parseLinksFile', () => {
  const temps = [];
  after(() => {
    for (const dir of temps) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('parses a CSV file from disk', () => {
    const { dir, file } = writeTemp(
      'rivals.csv',
      `url,label\n${URL_A},A\n${URL_B},B\n${URL_C},C\n`
    );
    temps.push(dir);
    const parsed = parseLinksFile(file);
    assert.equal(parsed.entries.length, 3);
    assert.equal(parsed.entries[0].label, 'A');
  });

  it('parses a JSON url list', () => {
    const { dir, file } = writeTemp(
      'rivals.json',
      JSON.stringify({ urls: [URL_A, URL_B, URL_C] })
    );
    temps.push(dir);
    const parsed = parseLinksFile(file);
    assert.equal(parsed.entries.map((e) => e.asin).join(','), 'B0AAAAAA01,B0AAAAAA02,B0AAAAAA03');
  });
});
