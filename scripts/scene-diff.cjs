// Compares the 3D scene on two served copies of the site at one fixed instant: same seeded random, CSS animations frozen,
// manual frames. Writes <out>/<tag>-A.png, -B.png and -diff.png (red = channel difference > 8) and prints a JSON summary,
// with B's console errors (shader errors with the source lines around them) and the materials three can't draw.
// A lock folder lets only one browser run at a time across worktrees (several agents may call this).
//   node scripts/scene-diff.cjs --b http://localhost:4181 [--a http://localhost:4174] [--at 2026-10-27T15:00:00+01:00]
//        [--tag run] [--moment ''] [--out <dir>]
const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require(path.join(__dirname, '..', 'node_modules', '@playwright/test'));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const A = arg('a', 'http://localhost:4174'), B = arg('b'), at = arg('at', '2026-10-27T15:00:00+01:00'), tag = arg('tag', 'run'), moment = arg('moment', '');
const out = arg('out', path.join(os.tmpdir(), 'scene-diff')); fs.mkdirSync(out, { recursive: true });
if (!B) { console.error('--b <origin> is required'); process.exit(2); }

const LOCK = path.join(os.tmpdir(), 'paris3d-browser.lock');
async function lock() {
  for (;;) {
    try { fs.mkdirSync(LOCK); fs.writeFileSync(path.join(LOCK, 'pid'), String(process.pid)); return; } catch (e) {
      try { if (Date.now() - fs.statSync(LOCK).mtimeMs > 15 * 60e3) fs.rmSync(LOCK, { recursive: true, force: true }); } catch (e2) {}
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
function unlock() { try { fs.rmSync(LOCK, { recursive: true, force: true }); } catch (e) {} }
process.on('exit', unlock); process.on('SIGINT', () => process.exit(130));

async function shot(b, origin, ab) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Europe/Paris' });
  const p = await ctx.newPage(); await p.clock.setFixedTime(new Date(at));
  const errs = new Map(), note = (k) => errs.set(k, (errs.get(k) || 0) + 1);
  p.on('pageerror', (e) => note('pageerror: ' + (e.stack || e.message).slice(0, 600)));
  p.on('console', async (m) => {
    if (!/error|warning/.test(m.type())) return;
    const t = m.text();
    if (/woff2|preload|crossorigin/.test(t)) return;
    if (/Shader Error|not compiled/.test(t)) {
      const all = (await Promise.all(m.args().map((a) => a.jsonValue().catch(() => '')))).join('\n'), L = all.split('\n');
      const ln = +((/ERROR: \d+:(\d+)/.exec(all) || [])[1] || 0), i = L.findIndex((l) => new RegExp('^\\s*>?\\s*' + ln + ':').test(l));
      note('shader: ' + ((all.match(/ERROR: .*/g) || []).slice(0, 3).join(' | ')) + '\n' + (i >= 0 ? L.slice(Math.max(0, i - 8), i + 2).join('\n') : ''));
    } else note(m.type() + ': ' + t.slice(0, 300));
  });
  await p.route(/paris3d(\/[^?]*)?\.js/, async (r) => { const resp = await r.fetch(); r.fulfill({ response: resp, body: (await resp.text()).replace(/Math\.random/g, '__R') }); });
  await p.addInitScript((moment) => {
    sessionStorage.setItem('dn-sky-q', 'full');
    let s = 12345; window.__seed = () => { s = 12345; }; window.__R = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    let real; Object.defineProperty(window, 'Paris3D', { configurable: true, get: () => real, set: (v) => {
      real = v; const m = v.mountAsync || v.mount;
      v.mountAsync = async (c, o) => { window.__seed(); const h = await m(c, Object.assign({}, o, { manual: true, state: () => Object.assign(o.state(), { moment: moment }) })); window.__gl = h; return h; };
    } });
  }, moment);
  await p.goto(origin + '/');
  try { await p.waitForFunction(() => window.__gl && document.querySelector('.pt[data-gl="1"]'), null, { timeout: 120000, polling: 500 }); }
  catch (e) { console.error('the scene did not mount on ' + ab + ':' + String.fromCharCode(10) + [...errs].map(([k, n]) => (n > 1 ? n + 'x ' : '') + k).join(String.fromCharCode(10))); throw e; }
  const r = await p.evaluate(async () => {
    const h = window.__gl, cv = document.querySelector('.pt3d');
    // the page's own moments start on a random timer a few seconds after load: none in the captured frames (the scene
    // mirrors the painting's CSS, so a moment the page shows would show in 3D too)
    const pt = document.querySelector('.pt'); if (pt) pt.setAttribute('data-moment', '');
    document.getAnimations().forEach((x) => { try { x.pause(); x.currentTime = 0; } catch (e) {} });
    await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
    h.U.uTime.value = 20; for (let i = 0; i < 4; i++) h.renderOnce(0.016);
    if (h.whenReady) await h.whenReady();
    // every painted layer drawn: the raster queue works within a time budget per frame, so how much of it is done by a given
    // frame depends on the machine's speed at that moment; frames until it is empty, then back to the captured instant
    const v = h.ctx && h.ctx.vec;
    // (a microsecond a frame: the cars and the fountain do not move meanwhile)
    for (let i = 0; i < 600 && v && v.scanned && !v.scanned(); i++) h.renderOnce(1e-6);
    h.U.uTime.value = 20; for (let i = 0; i < 4; i++) h.renderOnce(0.016);
    h.renderOnce(0.016);
    // what three can't draw on this renderer: GLSL materials (ShaderMaterial, onBeforeCompile) of visible objects, by name
    const left = {};
    if (h.renderer.isWebGPURenderer) h.scene.traverse((o) => {
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      if (ms.some((m) => m.isShaderMaterial || (m.onBeforeCompile && m.onBeforeCompile !== Object.getPrototypeOf(m).onBeforeCompile && !m.isNodeMaterial))) {
        const k = (o.name || o.type) + ' (' + ms.map((m) => m.type).join() + ')'; left[k] = (left[k] || 0) + 1;
      }
    });
    const info = h.renderer.info;
    return { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height, renderer: h.renderer.isWebGPURenderer ? (h.renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGPURenderer/WebGL2') : 'WebGLRenderer',
      calls: info.render.calls, programs: info.programs ? info.programs.length : undefined, glslLeft: left };
  });
  fs.writeFileSync(path.join(out, tag + '-' + ab + '.png'), Buffer.from(r.url.split(',')[1], 'base64'));
  await ctx.close();
  delete r.url; r.errors = [...errs].map(([k, n]) => (n > 1 ? n + '× ' : '') + k);
  return r;
}

(async () => {
  await lock();
  const b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-unsafe-webgpu'] });
  try {
    const ra = await shot(b, A, 'A'), rb = await shot(b, B, 'B');
    const p = await (await b.newContext()).newPage();
    const d = await p.evaluate(async ([a, c]) => {
      const load = (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = u; });
      const [ia, ib] = await Promise.all([load(a), load(c)]);
      const w = ia.width, h = ia.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, w, h).data; g.clearRect(0, 0, w, h); g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, w, h).data;
      const o = g.createImageData(w, h); let n8 = 0, n24 = 0, sum = 0;
      for (let i = 0; i < da.length; i += 4) {
        const m = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]), Math.abs(da[i + 3] - db[i + 3]));
        sum += m; if (m > 8) n8++; if (m > 24) n24++;
        o.data[i] = m > 8 ? 255 : da[i] * 0.3; o.data[i + 1] = da[i + 1] * 0.3; o.data[i + 2] = da[i + 2] * 0.3; o.data[i + 3] = 255;
      }
      g.putImageData(o, 0, 0);
      return { px: w * h, over8: n8, over24: n24, meanDiff: +(sum / (w * h)).toFixed(3), diff: cv.toDataURL('image/png') };
    }, [path.join(out, tag + '-A.png'), path.join(out, tag + '-B.png')].map((f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')));
    fs.writeFileSync(path.join(out, tag + '-diff.png'), Buffer.from(d.diff.split(',')[1], 'base64')); delete d.diff;
    console.log(JSON.stringify({ A: ra, B: rb, diff: Object.assign(d, { pctOver8: +(100 * d.over8 / d.px).toFixed(3) }), images: path.join(out, tag + '-{A,B,diff}.png') }, null, 1));
  } finally { await b.close(); unlock(); }
})();
