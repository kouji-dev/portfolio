// Frame cost of the 3D painting, reference (A) against work in progress (B), in the installed Chrome (real GPU; the
// Playwright browser misleads).
//   node scripts/frame-bench.cjs [--a http://localhost:4174] [--b http://localhost:4173] [--rounds 12] [--frames 40]
//        [--at 2026-10-27T15:00:00+01:00] [--profile] [--live] [--only a|b]
// This laptop's clocks drift by ±30 % from one minute to the next, so A and B stay open side by side and take turns:
// each round renders `frames` frames on A then B (B then A on odd rounds). Each frame is timed alone and waited for on the
// GPU (a 1-pixel read). Reported: p50 / p90 / mean ms per frame over all frames, and the median of the per-round
// differences B − A (the robust number), with how many rounds B was faster.
// Counts per frame (exact, clock-free): draw calls, uniform uploads, texture and vertex-buffer upload MB, matrices
// recomposed, CSS reads.
// --profile: one CPU profile per origin, three.js swapped for its unminified build: inclusive ms per frame by phase
// --live: the real frame loop in a visible window for 6 s: fps, frame p50 / p90, long animation frames
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', 'node_modules', '@playwright/test'));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes('--' + k);
const A = arg('a', 'http://localhost:4174'), B = arg('b', 'http://localhost:4173'), only = arg('only', '');
const ROUNDS = +arg('rounds', 12), FRAMES = +arg('frames', 40), AT = arg('at', '2026-10-27T15:00:00+01:00');
const origins = [['A', A], ['B', B]].filter(([k]) => !only || only.toUpperCase() === k);
const PHASES = ['update', 'sync', 'gate', 'paintFrame', 'skyPass', 'reflect', 'frontPass', 'syncGroup', 'layerM', 'batchSync', 'check', 'drain', 'bake',
  'renderObjects', 'setProgram', 'projectObject', 'updateMatrixWorld', 'uploadTexture', 'renderBufferDirect'];

// the scene in manual mode (frames only when we ask), moments off, the handle on window.__gl
function hook(manual) {
  let real; Object.defineProperty(window, 'Paris3D', { configurable: true, get: () => real, set: (v) => {
    real = v; const m = v.mountAsync; if (!m || m.__w) return;
    v.mountAsync = async (c, o) => { const h = await m(c, Object.assign({}, o, manual ? { manual: true, state: () => Object.assign(o.state(), { moment: '' }) } : {})); window.__gl = h; return h; };
    v.mountAsync.__w = 1;
  } });
  try { sessionStorage.setItem('dn-sky-q', 'full'); } catch (e) {}
}
async function page(b, origin, manual, unminified) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Europe/Paris' });
  const p = await ctx.newPage();
  // the real high-resolution timer, kept before Playwright's clock (which pins the date) replaces it with a coarse one
  await p.addInitScript(() => { window.__now = performance.now.bind(performance); });
  await p.clock.setFixedTime(new Date(AT)); await p.addInitScript(hook, manual);
  if (unminified) await p.route(/three@[\d.]+\/build\/three\.module\.min\.js/, (r) => r.continue({ url: r.request().url().replace('.min.js', '.js') }));
  // the same scene on every load (traffic, people, events are random): the scene's Math.random seeded, as in scene-diff
  await p.addInitScript(() => { let s = 12345; window.__R = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; });
  await p.route(/paris3d(\/[^?]*)?\.js/, async (r) => { const resp = await r.fetch(); r.fulfill({ response: resp, body: (await resp.text()).replace(/Math\.random/g, '__R') }); });
  await p.goto(origin + '/');
  await p.waitForFunction(() => window.__gl, null, { timeout: 180000, polling: 200 });
  if (manual) await p.evaluate(async () => { const h = window.__gl; for (let i = 0; i < 40; i++) h.renderOnce(0.016); if (h.whenReady) await h.whenReady(); await new Promise((r) => setTimeout(r, 1500)); });
  return { ctx, p };
}
// n frames, each timed alone, CPU and GPU (the pixel read waits for the GPU to finish it): the frame times
const forced = (n) => { const h = window.__gl, gl = h.renderer.getContext(), px = new Uint8Array(4), t = [], now = window.__now;
  for (let i = 0; i < n; i++) { const t0 = now(); h.renderOnce(0.016); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); t.push(now() - t0); }
  return t; };
// exact counts over n frames (wrappers installed for the count only), per frame
const counts = (n) => {
  const h = window.__gl, G = WebGL2RenderingContext.prototype, c = { draws: 0, uniforms: 0, textureMB: 0, bufferMB: 0, matrices: 0, cssReads: 0 }, undo = [];
  const wrap = (o, k, f) => { const orig = o[k]; o[k] = function () { f(arguments); return orig.apply(this, arguments); }; undo.push(() => { o[k] = orig; }); };
  Object.getOwnPropertyNames(G).forEach((k) => {
    if (/^draw(Arrays|Elements)(Instanced)?$/.test(k)) wrap(G, k, () => c.draws++);
    else if (/^uniform(\d|Matrix)/.test(k)) wrap(G, k, () => c.uniforms++);
    // bufferData(t, src | size, usage) / bufferSubData(t, offset, src)
    else if (/^buffer(Sub)?Data$/.test(k)) wrap(G, k, (a) => { const s = k === 'bufferData' ? a[1] : a[2]; c.bufferMB += (typeof s === 'number' ? s : s && s.byteLength || 0) / 1048576; });
    // texImage2D(t, l, if, w, h, b, f, ty, px) / texSubImage2D(t, l, x, y, w, h, f, ty, px), or a source (canvas, image) last
    else if (/^tex(Sub)?Image2D$/.test(k)) wrap(G, k, (a) => { const s = a[a.length - 1], w = k === 'texImage2D' ? 3 : 4;
      c.textureMB += s && s.width ? s.width * s.height * 4 / 1048576 : a.length >= 9 ? a[w] * a[w + 1] * 4 / 1048576 : 0; });
  });
  wrap(window.THREE.Matrix4.prototype, 'compose', () => c.matrices++);   // matrices actually recomposed
  wrap(window, 'getComputedStyle', () => c.cssReads++);
  try { for (let i = 0; i < n; i++) h.renderOnce(0.016); } finally { undo.forEach((u) => u()); }
  for (const k in c) c[k] = +(c[k] / n).toFixed(/MB$/.test(k) ? 2 : 0);
  return c;
};
const q = (a, f) => { const s = a.slice().sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(s.length * f))].toFixed(2); };
const mean = (a) => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);

(async () => {
  const out = {};
  let b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const P = {};
  for (const [k, o] of origins) { P[k] = await page(b, o, true, false); out[k] = { origin: o, frames: [], rounds: [] }; }
  for (let r = 0; r < ROUNDS; r++) for (const k of (r % 2 ? origins.slice().reverse() : origins).map((x) => x[0])) {
    const t = await P[k].p.evaluate(forced, FRAMES); out[k].frames.push(...t); out[k].rounds.push(mean(t));
  }
  for (const [k] of origins) {
    const f = out[k].frames; Object.assign(out[k], { p50: q(f, 0.5), p90: q(f, 0.9), mean: mean(f), counts: await P[k].p.evaluate(counts, 32) });
    delete out[k].frames; await P[k].ctx.close();
  }
  if (has('profile')) for (const [k, o] of origins) {
    const { ctx, p } = await page(b, o, true, true), cdp = await ctx.newCDPSession(p);
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
    const n = 120; await p.evaluate(forced, n);
    const { profile } = await cdp.send('Profiler.stop');
    const byId = new Map(profile.nodes.map((x) => [x.id, x])), parent = new Map(), incl = {};
    profile.nodes.forEach((x) => (x.children || []).forEach((c) => parent.set(c, x.id)));
    profile.samples.forEach((id, i) => {
      const dt = (profile.timeDeltas[i] || 0) / 1000, seen = new Set();
      for (let x = id; x != null; x = parent.get(x)) { const fn = byId.get(x).callFrame.functionName; if (PHASES.includes(fn) && !seen.has(fn)) { seen.add(fn); incl[fn] = (incl[fn] || 0) + dt; } }
    });
    out[k].profile = Object.fromEntries(Object.entries(incl).sort((x, y) => y[1] - x[1]).map(([f, v]) => [f, +(v / n).toFixed(2)]));
    await ctx.close();
  }
  await b.close();
  if (has('live')) {
    b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--enable-gpu', '--ignore-gpu-blocklist', '--window-size=1460,980'] });
    for (const [k, o] of origins) {
      const { ctx, p } = await page(b, o, false, false);
      await p.waitForFunction(() => document.querySelector('.pt[data-loaded="1"]'), null, { timeout: 120000 }); await p.waitForTimeout(4000);
      out[k].live = await p.evaluate(() => new Promise((ok) => {
        const L = []; const po = new PerformanceObserver((l) => l.getEntries().forEach((e) => L.push(e))); po.observe({ type: 'long-animation-frame' });
        const d = []; let prev = 0; const t0 = performance.now();
        requestAnimationFrame(function f(n) { if (prev) d.push(n - prev); prev = n; if (performance.now() - t0 < 6000) requestAnimationFrame(f); else {
          po.disconnect(); const s = (performance.now() - t0) / 1000; d.sort((x, y) => x - y);
          ok({ fps: +(d.length / s).toFixed(1), p50: +d[d.length >> 1].toFixed(1), p90: +d[Math.floor(d.length * 0.9)].toFixed(1), longFramesPerS: +(L.length / s).toFixed(1),
            longScriptMsPerS: Math.round(L.reduce((a, e) => a + e.scripts.reduce((x, y) => x + y.duration, 0), 0) / s) });
        } });
      }));
      await ctx.close();
    }
    await b.close();
  }
  for (const [k] of origins) { const r = out[k].rounds; out[k].rounds = r.map((x) => +x.toFixed(1)).join(' '); }
  console.log(JSON.stringify(out, null, 1));
  if (out.A && out.B) {
    const d = out.A.rounds.split(' ').map((a, i) => +out.B.rounds.split(' ')[i] - +a), faster = d.filter((x) => x < 0).length;
    console.log('B vs A, median of per-round differences: ' + (q(d, 0.5) >= 0 ? '+' : '') + q(d, 0.5) + ' ms per frame (' + (q(d, 0.5) / out.A.mean * 100).toFixed(1) +
      '%); B faster in ' + faster + '/' + d.length + ' rounds; p90 ' + out.A.p90 + ' → ' + out.B.p90 + ' ms');
  }
})();
