import { EX, twv } from '../core/view.js';
import { rng } from '../core/util.js';

// ---------------------------------------------------------------- the window pane: a flat painted glass in front of the painting, only when the weather calls for it
// rain drops beaded on the pane (each holding a tiny upside-down view of the scene), drops joining and running down with a clear trail, streams in a storm;
// frost growing from the corners; flakes that stick and melt; the pane misting over in fog, wiped clear by the pointer; a leaf that hits the pane on a gust;
// a cobweb crack at Halloween; the lightning flash; a strong sun flare on hot afternoons. Never over the tower.
export function Glass(host, src, view) {
  var cv = document.createElement('canvas'); cv.className = 'pt-glass'; cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:30;';
  host.appendChild(cv);
  var g = cv.getContext('2d'), W = 0, H = 0, S = 1, R = rng(404);
  var drops = [], trails = [], flakes = [], leaves = [], wipe = null, mist = document.createElement('canvas'), mg = mist.getContext('2d'), frostC = document.createElement('canvas'), fg = frostC.getContext('2d');
  var st = { rain: 0, storm: 0, snow: 0, fog: 0, frost: 0, hw: 0, flash: 0, hot: 0, sunx: 0, suny: 0, sky: '#9fc0e0', sky2: '#d8e6f2', breath: 0, breathAt: 0, mistA: 0, frostA: 0, frostDrawn: -1, dryT: 0, active: false };
  var frostStrokes = [], frostMax = 1, lastPtr = null, evName = '', confs = [], metStreak = null, tint = null, conf = false;
  function px(x) { return (x - view.x0) * view.scale * S; }
  function py(y) { return (y - view.y0) * view.scale * S; }
  // the tower's outline on screen: drops, frost and mist keep clear of it
  function nearTower(x, y, pad) { var yy = y / (view.scale * S) + view.y0; if (yy < 200 || yy > 1030) return false; var hw = twv(Math.min(1012, yy)) * view.scale * S + (pad || 0); return Math.abs(x - px(EX)) < hw; }
  // prod: the host's size comes from a ResizeObserver; reading clientWidth every frame forced a style recalc of the whole painting
  var hw0 = host.clientWidth, hh0 = host.clientHeight, ro = window.ResizeObserver ? new ResizeObserver(function (es) { hw0 = es[0].contentRect.width; hh0 = es[0].contentRect.height; }) : null;
  if (ro) ro.observe(host);
  var cornerR = 0;
  function resize() {
    var w = Math.max(1, Math.round(hw0)), h = Math.max(1, Math.round(hh0)); S = Math.min(window.devicePixelRatio || 1, 1.5);
    // prod: compare rounded sizes; at a 125 % / 150 % screen scale w * S is fractional, so the design reallocated the
    // canvas and rebuilt the frost on every frame
    if (Math.round(w * S) === W && Math.round(h * S) === H) return; W = Math.round(w * S); H = Math.round(h * S); cv.width = W; cv.height = H;
    var pan = host.closest && host.closest('.sky'); cornerR = pan ? parseFloat(getComputedStyle(pan).borderBottomRightRadius) || 0 : 0;   // read on resize only
    mist.width = Math.max(2, W >> 2); mist.height = Math.max(2, H >> 2); mg.fillStyle = '#fff'; mg.fillRect(0, 0, mist.width, mist.height);
    frostC.width = W; frostC.height = H; buildFrost(); st.frostDrawn = -1;
  }
  // frost: branching crystal strokes from the four corners, kept in order of distance so the frost can grow
  function buildFrost() {
    frostStrokes = []; var RR = rng(909), D = Math.min(W, H);
    [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]].forEach(function (c) {
      function branch(x, y, a, len, d, depth) {
        if (depth > 5 || len < 3) return;
        var steps = 3 + Math.floor(RR() * 3), cx = x, cy = y;
        for (var i = 0; i < steps; i++) {
          var nx = cx + Math.cos(a) * len / steps, ny = cy + Math.sin(a) * len / steps; a += (RR() - 0.5) * 0.25;
          var dist = Math.hypot(nx - c[0], ny - c[1]); frostStrokes.push([cx, cy, nx, ny, dist, Math.max(0.5, 2.2 - depth * 0.35)]);
          if (RR() < 0.55) branch(nx, ny, a + (RR() < 0.5 ? -1 : 1) * (0.7 + RR() * 0.5), len * 0.45, dist, depth + 1);
          cx = nx; cy = ny;
        }
      }
      for (var k = 0; k < 9; k++) { var a = Math.atan2(c[3], c[2]) + (k / 8 - 0.5) * 1.5; branch(c[0], c[1], a, D * (0.18 + RR() * 0.14), 0, 0); }
    });
    frostStrokes.sort(function (a, b) { return a[4] - b[4]; }); frostMax = frostStrokes.length ? frostStrokes[frostStrokes.length - 1][4] : 1;
  }
  function drawFrost(amt) {
    fg.clearRect(0, 0, W, H); if (amt <= 0.01) return;
    var lim = amt * frostMax * 0.75, D = Math.min(W, H);
    // a soft white veil in each corner, then the crystal strokes
    [[0, 0], [W, 0], [0, H], [W, H]].forEach(function (c) { var gr = fg.createRadialGradient(c[0], c[1], 0, c[0], c[1], lim * 0.8 + 1); gr.addColorStop(0, 'rgba(235,244,255,.55)'); gr.addColorStop(1, 'rgba(235,244,255,0)'); fg.fillStyle = gr; fg.fillRect(0, 0, W, H); });
    fg.lineCap = 'round';
    for (var i = 0; i < frostStrokes.length; i++) { var s = frostStrokes[i]; if (s[4] > lim) break; fg.strokeStyle = 'rgba(250,253,255,' + (0.85 - 0.5 * s[4] / (lim + 1)).toFixed(3) + ')'; fg.lineWidth = s[5] * S; fg.beginPath(); fg.moveTo(s[0], s[1]); fg.lineTo(s[2], s[3]); fg.stroke(); }
    fg.globalCompositeOperation = 'destination-out'; for (var y = 0; y < H; y += 6) { var hw = nearTower(px(EX), y, 0) ? twv(Math.min(1012, y / (view.scale * S) + view.y0)) * view.scale * S + 12 * S : 0; if (hw) fg.fillRect(px(EX) - hw, y, hw * 2, 6); } fg.globalCompositeOperation = 'source-over';
  }
  function spawnDrop(r) {
    for (var tries = 0; tries < 6; tries++) { var x = R() * W, y = R() * H * 0.95; if (nearTower(x, y, 10 * S)) continue; drops.push({ x: x, y: y, r: r || (3 + R() * R() * 9) * S, vy: 0, run: !!r, wob: R() * 6, t: 0 }); return; }
  }
  function drawDrop(d) {
    var r = d.r; if (r < 0.6) return;
    g.save(); g.beginPath(); g.ellipse(d.x, d.y, r, r * (d.run ? 1.15 : 1), 0, 0, 6.2832); g.clip();
    var gr = g.createLinearGradient(0, d.y - r, 0, d.y + r); gr.addColorStop(0, st.sky2); gr.addColorStop(1, st.sky); g.fillStyle = gr; g.fillRect(d.x - r, d.y - r * 1.2, r * 2, r * 2.4);
    // the scene behind, upside-down and shrunk, as a real drop shows it
    var k = src.width / W, span = r * 4.5;
    try { g.translate(d.x, d.y); g.rotate(Math.PI); g.globalAlpha = 0.9; g.drawImage(src, Math.max(0, (d.x - span) * k), Math.max(0, (d.y - span * 1.4) * k), span * 2 * k, span * 2 * k, -r, -r * 1.1, r * 2, r * 2.2); } catch (e) {}
    g.restore();
    g.lineWidth = Math.max(0.8, 0.9 * S); g.strokeStyle = 'rgba(24,34,70,.55)'; g.beginPath(); g.ellipse(d.x, d.y, r, r * (d.run ? 1.15 : 1), 0, 0, 6.2832); g.stroke();
    g.fillStyle = 'rgba(20,30,60,.22)'; g.beginPath(); g.ellipse(d.x + r * 0.15, d.y + r * 0.55, r * 0.75, r * 0.32, 0, 0, 3.1416); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(d.x - r * 0.38, d.y - r * 0.4, r * 0.22, r * 0.16, -0.6, 0, 6.2832); g.fill();
  }
  function flakePath(x, y, s, a) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); for (var i = 0; i < 6; i++) { var an = i / 6 * 6.2832, c = Math.cos(an), sn = Math.sin(an); g.moveTo(0, 0); g.lineTo(c * s, sn * s); g.moveTo(c * s * 0.55, sn * s * 0.55); g.lineTo(c * s * 0.55 + Math.cos(an + 0.8) * s * 0.3, sn * s * 0.55 + Math.sin(an + 0.8) * s * 0.3); g.moveTo(c * s * 0.55, sn * s * 0.55); g.lineTo(c * s * 0.55 + Math.cos(an - 0.8) * s * 0.3, sn * s * 0.55 + Math.sin(an - 0.8) * s * 0.3); } g.restore(); }
  function leafPath(x, y, s, a, kind) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); if (kind === 'petal') { g.ellipse(0, 0, s * 0.55, s * 0.4, 0, 0, 6.2832); } else { g.moveTo(-s, 0); g.quadraticCurveTo(-s * 0.2, -s * 0.7, s, 0); g.quadraticCurveTo(-s * 0.2, s * 0.7, -s, 0); } g.restore(); }
  return {
    el: cv,
    poke: function (season, day) { if (!day) return; var kind = season === 'spring' ? 'petal' : 'leaf', col = season === 'spring' ? (R() < 0.5 ? '#ffd3e0' : '#fff6f8') : season === 'summer' ? '#6fb35a' : season === 'autumn' ? (R() < 0.5 ? '#e48a2c' : '#c4542a') : '#b9a27a';
      for (var t = 0; t < 6; t++) { var x = R() * W, y = (0.15 + R() * 0.6) * H; if (!nearTower(x, y, 30 * S)) { leaves.push({ x: x, y: y, s: (10 + R() * 6) * S, a: R() * 6, t: 0, vy: 0, kind: kind, col: col }); break; } } },
    update: function (dt, now, s, ptr, flags) {
      resize();
      var tr = function (v, to, rate) { return v + (to - v) * Math.min(1, dt * rate); };
      evName = flags.ev || ''; tint = flags.tint; metStreak = flags.met;
      if (flags.conf && !conf) { confs = []; for (var ci = 0; ci < 7; ci++) { var cx = R() * W, cy = (0.55 + R() * 0.4) * H; if (!nearTower(cx, cy, 20 * S)) confs.push({ x: cx, y: cy, a: R() * 6, c: ['#ffd166', '#ff4d6d', '#4fe3ff', '#6dff9a', '#ffffff', '#c8a0ff'][ci % 6], t: 0 }); } }
      conf = !!flags.conf; confs.forEach(function (c) { c.t += dt; }); if (!conf) confs = confs.filter(function (c) { return c.t < 40; });
      st.rain = flags.rain; st.storm = flags.storm; st.hw = flags.hw; st.hot = flags.hot; st.sunx = flags.sunx; st.suny = flags.suny; st.sky = flags.sky || st.sky; st.sky2 = flags.sky2 || st.sky2;
      st.flash = flags.flash;
      st.mistA = tr(st.mistA, flags.fog ? 0.62 : 0, 0.25);
      var frT = flags.snow ? 0.75 : flags.frost ? 0.38 : evName === 'christmas' ? 0.3 : 0; st.frostA = tr(st.frostA, frT, 0.08); if (flags.snap) { st.mistA = flags.fog ? 0.62 : 0; st.frostA = frT; }
      if (Math.abs(st.frostA - st.frostDrawn) > 0.012) { drawFrost(st.frostA); st.frostDrawn = st.frostA; }
      // rain: drops arrive, bead, join and run; a storm sends streams down the pane; after the rain they dry up within a minute
      if (st.rain) { st.dryT = 0; var rate = st.storm ? 9 : flags.shower ? 1.2 : 3.2; var n = rate * dt + (R() < (rate * dt) % 1 ? 1 : 0); for (var i = 0; i < n && drops.length < 90; i++) spawnDrop(); if (st.storm && R() < dt * 1.4) spawnDrop((7 + R() * 4) * S); if (flags.snap && drops.length < 30) for (i = 0; i < 30; i++) spawnDrop(); }
      else st.dryT += dt;
      var shrink = st.rain ? 0 : dt / 60;
      drops.forEach(function (d) {
        d.t += dt; if (shrink) d.r -= shrink * (d.r * 2 + 9 * S);
        if (!d.run && d.r > 6 * S && R() < dt * (st.storm ? 1.6 : 0.4)) d.run = true;
        if (d.run) { d.vy = Math.min(d.vy + dt * 260 * S, (st.storm ? 260 : 120) * S * (0.5 + d.r / (12 * S))); var oy = d.y; d.y += d.vy * dt; d.x += Math.sin(d.t * 3 + d.wob) * 6 * S * dt; trails.push({ x0: d.x, y0: oy, x1: d.x, y1: d.y, w: d.r * 0.7, a: 1, blur: st.storm }); d.r -= dt * 0.25 * S; }
      });
      // drops that touch join into one
      for (var a = 0; a < drops.length; a++) for (var b = a + 1; b < drops.length; b++) { var A = drops[a], B = drops[b]; if (A.dead || B.dead) continue; var dx = A.x - B.x, dy = A.y - B.y; if (dx * dx + dy * dy < (A.r + B.r) * (A.r + B.r) * 0.6) { var big = A.r >= B.r ? A : B, sm = big === A ? B : A; big.r = Math.sqrt(big.r * big.r + sm.r * sm.r); sm.dead = true; if (big.r > 6 * S) big.run = true; } }
      drops = drops.filter(function (d) { return !d.dead && d.r > 0.5 && d.y < H + 20; });
      trails.forEach(function (t) { t.a -= dt / (st.storm ? 1.5 : 3); }); trails = trails.filter(function (t) { return t.a > 0; }); if (trails.length > 900) trails.splice(0, trails.length - 900);
      // snow: a few flakes stick to the pane and melt into drops
      if (flags.snow && R() < dt * 0.6 && flakes.length < 14) { var fx = R() * W, fy = R() * H * 0.9; if (!nearTower(fx, fy, 20 * S)) flakes.push({ x: fx, y: fy, s: (4 + R() * 5) * S, a: R() * 6, t: 0, life: 5 + R() * 6 }); }
      flakes.forEach(function (f) { f.t += dt; if (f.t > f.life) { f.dead = true; drops.push({ x: f.x, y: f.y, r: f.s * 0.45, vy: 0, run: false, wob: R() * 6, t: 0 }); } }); flakes = flakes.filter(function (f) { return !f.dead; });
      // fog: the pane mists over again slowly; the pointer wipes a clear streak
      var mw = mist.width, mh = mist.height;
      if (st.mistA > 0.01) {
        mg.globalCompositeOperation = 'source-over'; mg.fillStyle = 'rgba(255,255,255,' + Math.min(1, dt / 9).toFixed(4) + ')'; mg.fillRect(0, 0, mw, mh);
        if (ptr && ptr.hover) { var x = (ptr.x * 0.5 + 0.5) * mw, y = (ptr.y * 0.5 + 0.5) * mh; mg.globalCompositeOperation = 'destination-out'; mg.lineCap = 'round'; mg.lineWidth = Math.max(4, mw * 0.07); mg.strokeStyle = 'rgba(0,0,0,1)'; mg.beginPath(); mg.moveTo(lastPtr ? lastPtr[0] : x, lastPtr ? lastPtr[1] : y); mg.lineTo(x, y); mg.stroke(); lastPtr = [x, y]; }
        else lastPtr = null;
      }
      // Halloween: now and then a ghostly breath fogs the pane
      if (st.hw && now - st.breathAt > 22) { st.breathAt = now; st.breath = 1; st.bx = R() < 0.5 ? W * 0.2 : W * 0.8; st.by = H * (0.55 + R() * 0.3); }
      st.breath = Math.max(0, st.breath - dt / 5);
      leaves.forEach(function (l) { l.t += dt; if (l.t > 1.2) { l.vy += dt * 300 * S; l.y += l.vy * dt; l.a += dt * 0.8; } }); leaves = leaves.filter(function (l) { return l.y < H + 40; });
      st.active = drops.length || trails.length || flakes.length || leaves.length || st.mistA > 0.01 || st.frostA > 0.01 || st.hw || st.breath > 0 || st.flash > 0.01 || st.hot > 0.02 || evName === 'christmas' || evName === 'valentine' || confs.length || metStreak || tint;
      cv.style.display = st.active ? '' : 'none';
    },
    draw: function () {
      if (!st.active) return;
      g.clearRect(0, 0, W, H);
      // the sun flare on a hot afternoon: soft rings strung from the sun toward the middle of the view
      if (st.hot > 0.02) { var sx = px(st.sunx), sy = py(st.suny), cx = W / 2, cy = H * 0.55;
        var gr0 = g.createRadialGradient(sx, sy, 0, sx, sy, W * 0.35); gr0.addColorStop(0, 'rgba(255,250,224,' + (0.8 * st.hot).toFixed(3) + ')'); gr0.addColorStop(0.18, 'rgba(255,244,200,' + (0.35 * st.hot).toFixed(3) + ')'); gr0.addColorStop(1, 'rgba(255,248,214,0)'); g.fillStyle = gr0; g.fillRect(0, 0, W, H);
        [[0.35, 26, 'rgba(255,220,150,'], [0.6, 14, 'rgba(180,230,255,'], [0.85, 40, 'rgba(255,190,140,'], [1.15, 20, 'rgba(200,255,220,']].forEach(function (f) { var x = sx + (cx - sx) * f[0] * 1.6, y = sy + (cy - sy) * f[0] * 1.6, r = f[1] * S; if (nearTower(x, y, r)) return; g.fillStyle = f[2] + (0.28 * st.hot).toFixed(3) + ')'; g.beginPath(); for (var i = 0; i < 6; i++) { var an = i / 6 * 6.2832; g.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); } g.closePath(); g.fill(); g.strokeStyle = f[2] + (0.45 * st.hot).toFixed(3) + ')'; g.lineWidth = S; g.stroke(); });
        g.save(); g.translate(sx, sy); g.strokeStyle = 'rgba(255,252,235,' + (0.55 * st.hot).toFixed(3) + ')'; g.lineCap = 'round'; for (var k = 0; k < 8; k++) { var an = k / 8 * 6.2832 + 0.2, L = (k % 2 ? 60 : 120) * S; g.lineWidth = (k % 2 ? 1.5 : 2.5) * S; g.beginPath(); g.moveTo(Math.cos(an) * 14 * S, Math.sin(an) * 14 * S); g.lineTo(Math.cos(an) * L, Math.sin(an) * L); g.stroke(); } g.restore(); }
      if (st.frostA > 0.01) g.drawImage(frostC, 0, 0);
      if (st.mistA > 0.01) {
        g.save(); g.globalAlpha = st.mistA; g.drawImage(mist, 0, 0, W, H); g.restore();
        g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = st.mistA * 0.75; try { g.filter = 'blur(' + (10 * S).toFixed(0) + 'px)'; } catch (e) {} g.beginPath(); for (var y = 0; y <= H; y += 12) { var hw = nearTower(px(EX), y, 0) ? twv(Math.min(1012, y / (view.scale * S) + view.y0)) * view.scale * S + 14 * S : 0; g.rect(px(EX) - hw, y, hw * 2, 12); } g.fill(); g.restore();
      }
      if (st.breath > 0) { var ba = Math.sin(Math.min(1, st.breath) * 3.1416); var grb = g.createRadialGradient(st.bx, st.by, 0, st.bx, st.by, 120 * S); grb.addColorStop(0, 'rgba(225,235,255,' + (0.6 * ba).toFixed(3) + ')'); grb.addColorStop(1, 'rgba(225,235,255,0)'); g.fillStyle = grb; g.fillRect(st.bx - 130 * S, st.by - 130 * S, 260 * S, 260 * S); }
      // trails left by running drops: a clear wet line with a few beads; in a storm the scene behind runs blurred
      g.lineCap = 'round';
      if (st.storm && trails.length) { try { g.save(); g.beginPath(); trails.forEach(function (t) { g.rect(t.x0 - t.w * 1.6, Math.min(t.y0, t.y1), t.w * 3.2, Math.abs(t.y1 - t.y0) + 1); }); g.clip(); g.filter = 'blur(' + (3 * S).toFixed(1) + 'px)'; g.globalAlpha = 0.85; g.drawImage(src, 0, 0, W, H); g.restore(); } catch (e) { g.restore(); } }
      trails.forEach(function (t) { g.strokeStyle = 'rgba(30,45,90,' + (0.22 * t.a).toFixed(3) + ')'; g.lineWidth = t.w + 1.6 * S; g.beginPath(); g.moveTo(t.x0, t.y0); g.lineTo(t.x1, t.y1); g.stroke(); });
      trails.forEach(function (t) { g.strokeStyle = 'rgba(240,248,255,' + (0.42 * t.a).toFixed(3) + ')'; g.lineWidth = t.w; g.beginPath(); g.moveTo(t.x0, t.y0); g.lineTo(t.x1, t.y1); g.stroke(); });
      drops.forEach(drawDrop);
      g.lineWidth = 1.2 * S; flakes.forEach(function (f) { var m = 1 - Math.max(0, f.t - f.life + 1.5) / 1.5; g.strokeStyle = 'rgba(255,255,255,' + (0.95 * m).toFixed(3) + ')'; flakePath(f.x, f.y, f.s, f.a); g.stroke(); g.strokeStyle = 'rgba(40,60,110,' + (0.35 * m).toFixed(3) + ')'; g.lineWidth = 0.6 * S; g.stroke(); g.lineWidth = 1.2 * S; });
      leaves.forEach(function (l) { var sc = Math.min(1, l.t / 0.15); leafPath(l.x, l.y, l.s * sc, l.a, l.kind); g.fillStyle = l.col; g.fill(); g.strokeStyle = 'rgba(30,30,40,.7)'; g.lineWidth = S; g.stroke(); if (l.kind !== 'petal') { g.beginPath(); g.moveTo(l.x - Math.cos(l.a) * l.s * sc, l.y - Math.sin(l.a) * l.s * sc); g.lineTo(l.x + Math.cos(l.a) * l.s * sc, l.y + Math.sin(l.a) * l.s * sc); g.stroke(); } });
      // Halloween: a cobweb crack in the lower right corner of the pane
      // prod: the hub sits just inside the panel's rounded corner (at 4 px it was clipped off by the radius)
      if (st.hw) { var hub = (4 + 0.42 * cornerR) * S, ox = W - hub, oy = H - hub, L = Math.min(W, H) * 0.22; g.strokeStyle = 'rgba(240,244,255,.75)'; g.lineWidth = 1.1 * S; g.beginPath(); var Rc = rng(13);
        var arms = []; for (var i = 0; i < 7; i++) { var an = Math.PI + (i / 6) * Math.PI / 2 + (Rc() - 0.5) * 0.15; arms.push(an); g.moveTo(ox, oy); var lx = ox, ly = oy; for (var k = 1; k <= 4; k++) { var rr = L * k / 4 * (0.85 + Rc() * 0.3); var nx = ox + Math.cos(an + (Rc() - 0.5) * 0.08) * rr, ny = oy + Math.sin(an + (Rc() - 0.5) * 0.08) * rr; g.lineTo(nx, ny); lx = nx; ly = ny; } }
        for (k = 1; k <= 4; k++) { var rr2 = L * k / 4.3; for (i = 0; i < arms.length - 1; i++) { var a0 = arms[i], a1 = arms[i + 1]; g.moveTo(ox + Math.cos(a0) * rr2, oy + Math.sin(a0) * rr2); g.quadraticCurveTo(ox + Math.cos((a0 + a1) / 2) * rr2 * 0.82, oy + Math.sin((a0 + a1) / 2) * rr2 * 0.82, ox + Math.cos(a1) * rr2, oy + Math.sin(a1) * rr2); } }
        g.stroke(); g.strokeStyle = 'rgba(30,20,60,.35)'; g.lineWidth = 0.5 * S; g.stroke(); }
      // a shape drawn with a finger in the condensation: a star at Christmas, a heart on Valentine's Day
      if (evName === 'christmas' || evName === 'valentine') {
        var mx = W * 0.16, my = H * 0.8, mr = Math.min(W, H) * 0.11;
        var gm = g.createRadialGradient(mx, my, mr * 0.2, mx, my, mr * 1.25); gm.addColorStop(0, 'rgba(236,242,250,.5)'); gm.addColorStop(0.75, 'rgba(236,242,250,.35)'); gm.addColorStop(1, 'rgba(236,242,250,0)'); g.fillStyle = gm; g.beginPath(); g.ellipse(mx, my, mr * 1.3, mr * 1.1, 0, 0, 6.2832); g.fill();
        g.save(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = 4.5 * S; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
        if (evName === 'christmas') { for (var sk = 0; sk <= 10; sk++) { var an = -Math.PI / 2 + sk * Math.PI / 5, rr = sk % 2 ? mr * 0.28 : mr * 0.7; g.lineTo(mx + Math.cos(an) * rr, my + Math.sin(an) * rr); } }
        else { var hs = mr * 0.62; g.moveTo(mx, my + hs * 0.75); g.bezierCurveTo(mx - hs * 1.25, my - hs * 0.05, mx - hs * 0.65, my - hs * 0.95, mx, my - hs * 0.42); g.bezierCurveTo(mx + hs * 0.65, my - hs * 0.95, mx + hs * 1.25, my - hs * 0.05, mx, my + hs * 0.75); }
        g.stroke(); g.restore();
        // a drip running down from the drawing
        g.strokeStyle = 'rgba(240,248,255,.45)'; g.lineWidth = 2 * S; g.beginPath(); g.moveTo(mx + mr * 0.2, my + mr * 0.7); g.lineTo(mx + mr * 0.22, my + mr * 1.25); g.stroke();
      }
      // New Year: a few pieces of confetti stuck on the glass
      confs.forEach(function (c) { g.save(); g.translate(c.x, c.y); g.rotate(c.a); g.fillStyle = c.c; g.fillRect(-4 * S, -8 * S, 8 * S, 16 * S); g.strokeStyle = 'rgba(30,30,50,.6)'; g.lineWidth = 1 * S; g.strokeRect(-4 * S, -8 * S, 8 * S, 16 * S); g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(-4 * S, -8 * S, 2.5 * S, 16 * S); g.restore(); });
      // the Perseids: a brief lens streak for the brightest one
      if (metStreak) { var lx = px(metStreak.x), ly = py(metStreak.y), la = metStreak.a; var lg = g.createLinearGradient(lx - W * 0.4, 0, lx + W * 0.4, 0); lg.addColorStop(0, 'rgba(190,220,255,0)'); lg.addColorStop(0.5, 'rgba(225,240,255,' + (0.7 * la).toFixed(3) + ')'); lg.addColorStop(1, 'rgba(190,220,255,0)'); g.fillStyle = lg; g.fillRect(lx - W * 0.4, ly - 1.2 * S, W * 0.8, 2.4 * S); }
      // fireworks: the burst's colour washes over the crowd below
      if (tint && tint.a > 0.02) { var tc = tint.c, ty0 = py(1135), ty1 = py(1190), tg = g.createLinearGradient(0, ty0, 0, ty1); var rgb = Math.round(tc.r * 255) + ',' + Math.round(tc.g * 255) + ',' + Math.round(tc.b * 255); tg.addColorStop(0, 'rgba(' + rgb + ',0)'); tg.addColorStop(0.55, 'rgba(' + rgb + ',' + (0.2 * tint.a).toFixed(3) + ')'); tg.addColorStop(1, 'rgba(' + rgb + ',0)'); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = tg; g.fillRect(0, ty0, W, ty1 - ty0); g.restore(); }
      // lightning: the whole view flashes for an instant
      if (st.flash > 0.01) { g.fillStyle = 'rgba(228,236,255,' + (0.5 * st.flash).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
    },
    dispose: function () { if (ro) ro.disconnect(); if (cv.parentNode) cv.parentNode.removeChild(cv); }
  };
}
