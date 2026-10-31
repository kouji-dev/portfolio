// node --test scripts/middleware.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// middleware.js is ESM for Vercel while package.json is CommonJS: load its source as a module
const src = readFileSync(new URL('../middleware.js', import.meta.url), 'utf8');
const { default: middleware, config } = await import('data:text/javascript,' + encodeURIComponent(src));

test('Accept: text/markdown at / rewrites to index.md', () => {
  const res = middleware(new Request('https://www.kouji.dev/', { headers: { accept: 'text/markdown, text/html;q=0.8' } }));
  assert.equal(res.headers.get('x-middleware-rewrite'), 'https://www.kouji.dev/index.md');
  assert.match(res.headers.get('vary'), /Accept/);
  assert.deepEqual(config, { matcher: '/' });
});

test('browsers asking for HTML pass through', () => {
  assert.equal(middleware(new Request('https://www.kouji.dev/', { headers: { accept: 'text/html,*/*' } })), undefined);
  assert.equal(middleware(new Request('https://www.kouji.dev/')), undefined);
});
