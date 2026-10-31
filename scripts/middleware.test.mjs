// node --test scripts/middleware.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// middleware.js is ESM for Vercel while package.json is CommonJS: load its source as a module
const src = readFileSync(new URL('../middleware.js', import.meta.url), 'utf8');
const { default: middleware, config } = await import('data:text/javascript,' + encodeURIComponent(src));
const md = (path) => middleware(new Request('https://www.kouji.dev' + path, { headers: { accept: 'text/markdown, text/html;q=0.8' } }));

test('Accept: text/markdown at / rewrites to index.md', () => {
  const res = md('/');
  assert.equal(res.headers.get('x-middleware-rewrite'), 'https://www.kouji.dev/index.md');
  assert.match(res.headers.get('vary'), /Accept/);
});

test('an unknown path asked for in markdown gets a markdown 404 that points at the sitemap and llms.txt', async () => {
  const res = md('/__probe-404');
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /^text\/markdown/);
  const body = await res.text();
  assert.match(body, /sitemap\.xml/);
  assert.match(body, /llms\.txt/);
});

test('real pages and browsers pass through', () => {
  for (const p of ['/blogs', '/about', '/contact', '/privacy', '/about/']) assert.equal(md(p), undefined, p);
  assert.equal(middleware(new Request('https://www.kouji.dev/', { headers: { accept: 'text/html,*/*' } })), undefined);
  assert.equal(middleware(new Request('https://www.kouji.dev/nope')), undefined);
});

test('the matcher skips files (anything with a dot)', () => {
  const re = new RegExp('^' + config.matcher + '$');
  for (const p of ['/', '/nope', '/a/b']) assert.ok(re.test(p), p);
  for (const p of ['/llms.txt', '/home.css', '/assets/cv.pdf']) assert.ok(!re.test(p), p);
});
