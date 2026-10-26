// node --test scripts/build-sky.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, skins } from './build-sky.mjs';

test('build fills the root holes and turns inner holes into hooks', () => {
  const out = build('x<!--PT--><div class="pt" style="{{ ptStyle }}" data-sky="{{ sky }}" data-event="{{ event }}"><path d="{{ moonD }}"></path><text>Bonne année {{ year }}</text></div><!--/PT-->y');
  assert.equal(out, '<div class="pt" style="" data-sky="night" data-event=""><path d="" data-h-d="moonD"></path><text>Bonne année <tspan data-h="year"></tspan></text></div>');
  assert.throws(() => build('<!--PT--><div {{ nope }}><!--/PT-->'), /unknown painting hole/);
  assert.throws(() => build('no markers'), /markers/);
});

test('skins reads the moments / shapes blob', () => {
  assert.deepEqual(skins('SK = /*SKINDATA*/{"moments":{},"shapes":{"":["star"]}}/*/SKINDATA*/;'), { moments: {}, shapes: { '': ['star'] } });
});
