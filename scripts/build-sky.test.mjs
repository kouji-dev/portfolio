// node --test scripts/build-sky.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from './build-sky.mjs';

test('build extracts the painting and fills its holes', () => {
  const out = build('x<!--PT--><div class="pt" data-sky="{{ sky }}" data-focus="{{ focus }}"></div><!--/PT-->y');
  assert.equal(out, '<div class="pt" data-sky="night" data-focus=""></div>');
  assert.throws(() => build('<!--PT-->{{ nope }}<!--/PT-->'), /unknown painting hole/);
  assert.throws(() => build('no markers'), /markers/);
});
