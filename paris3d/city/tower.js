import * as T from 'three';
import { TW_U, twv, towerW } from '../core/view.js';
import { clamp, lerp, rng } from '../core/util.js';
import { PB } from '../core/pb.js';
import { paintMaterial } from '../core/paint.js';

// ---------------------------------------------------------------- the Eiffel Tower, from the painted silhouette
export function rotY(p, k) { return p.map(function (q) { return k === 0 ? q : k === 1 ? [q[2], q[1], -q[0]] : k === 2 ? [-q[0], q[1], -q[2]] : [-q[2], q[1], q[0]]; }); }
PB.prototype.boxW = function (x0, y0, z0, x1, y1, z1, s, faces) {
  faces = faces || 'fbrlt'; function U(a, b) { return a / s; }
  if (faces.indexOf('f') >= 0) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0 / s, y0 / s, x1 / s, y0 / s, x1 / s, y1 / s, x0 / s, y1 / s]);
  if (faces.indexOf('b') >= 0) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [-x1 / s, y0 / s, -x0 / s, y0 / s, -x0 / s, y1 / s, -x1 / s, y1 / s]);
  if (faces.indexOf('r') >= 0) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [-z1 / s, y0 / s, -z0 / s, y0 / s, -z0 / s, y1 / s, -z1 / s, y1 / s]);
  if (faces.indexOf('l') >= 0) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [z0 / s, y0 / s, z1 / s, y0 / s, z1 / s, y1 / s, z0 / s, y1 / s]);
  if (faces.indexOf('t') >= 0) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [x0 / s, z1 / s, x1 / s, z1 / s, x1 / s, z0 / s, x0 / s, z0 / s]);
};
PB.prototype.disc = function (c, r, axis, seg) {
  seg = seg || 10;
  for (var i = 0; i < seg; i++) {
    var a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832;
    var p0 = axis === 'x' ? [c[0], c[1] + Math.sin(a0) * r, c[2] + Math.cos(a0) * r] : axis === 'y' ? [c[0] + Math.sin(a0) * r, c[1], c[2] + Math.cos(a0) * r] : [c[0] + Math.cos(a0) * r, c[1] + Math.sin(a0) * r, c[2]];
    var p1 = axis === 'x' ? [c[0], c[1] + Math.sin(a1) * r, c[2] + Math.cos(a1) * r] : axis === 'y' ? [c[0] + Math.sin(a1) * r, c[1], c[2] + Math.cos(a1) * r] : [c[0] + Math.cos(a1) * r, c[1] + Math.sin(a1) * r, c[2]];
    this.tri(c, p0, p1);
  }
};

export function buildTower(ctx) {
  var P = ctx.P, U = ctx.U, scene = ctx.scene, u = TW_U, i, k;
  var lat = new PB(P), sol = new PB(P), plat = new PB(P), rail = new PB(P), win = new PB(P), band = new PB(P), stone = new PB(P), flag = new PB(P);
  var H_TOP = 530 / 1.858, P1 = 104 / 1.858, P2 = 244 / 1.858, ARCH = 74 * u, TT = P1 + 40 * u;
  var arch = [];
  for (i = 0; i <= 60; i++) { var t = i / 60, ax = (1 - t) * (1 - t) * 46 + 2 * (1 - t) * t * 42, ay = 2 * (1 - t) * t * 66 + t * t * 74; arch.push([ay * u, ax * u]); }
  function archW(h) { var tb = P1 + 0.5, tt = TT; if (h > tb && h < tt) return 22 * u * (1 - (h - tb) / (tt - tb)); if (h >= ARCH) return 0; for (var i = 1; i < arch.length; i++) if (arch[i][0] >= h) { var a = arch[i - 1], b = arch[i], f = (h - a[0]) / Math.max(1e-6, b[0] - a[0]); return lerp(a[1], b[1], f); } return 0; }
  var W = towerW;

  // --- the lattice: rows of X cells whose size follows the tower's width; finer in the spandrels under the first floor
  lat.set('tw', 'twD', null, 'twD', 'twL');
  function chOf(h, fine) { return clamp(0.5 * W(h), 3.4, 12) * (fine ? 0.5 : 1); }
  function face(a, b, c, d, va, vb, cells) { lat.sc = cells; lat.quad(a, b, c, d, [0, va, cells, va, cells, vb, 0, vb]); }
  function row(h0, h1, v, legs, fine) {
    var hm = (h0 + h1) / 2, ch = chOf(hm, fine), cells = Math.max(1, Math.round((legs ? W(hm) - archW(hm) : 2 * W(hm)) / ch));
    var ns = Math.max(1, Math.ceil((h1 - h0) / 2.6));
    for (var j = 0; j < ns; j++) {
      var ha = lerp(h0, h1, j / ns), hb = lerp(h0, h1, (j + 1) / ns), va = v + j / ns, vb = v + (j + 1) / ns, W0 = W(ha), W1 = W(hb);
      if (legs) {
        var A0 = Math.max(0, archW(ha)), A1 = Math.max(0, archW(hb));
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s) {
          function c(h, Wd, A) { return [[s[0] * Wd, h, s[1] * Wd], [s[0] * A, h, s[1] * Wd], [s[0] * A, h, s[1] * A], [s[0] * Wd, h, s[1] * A]]; }
          var q0 = c(ha, W0, A0), q1 = c(hb, W1, A1), flip = s[0] * s[1] < 0;
          for (var k = 0; k < 4; k++) { var k1 = (k + 1) % 4; if (flip) face(q0[k1], q0[k], q1[k], q1[k1], va, vb, cells); else face(q0[k], q0[k1], q1[k1], q1[k], va, vb, cells); }
        });
      } else {
        var q0 = [[W0, ha, W0], [-W0, ha, W0], [-W0, ha, -W0], [W0, ha, -W0]], q1 = [[W1, hb, W1], [-W1, hb, W1], [-W1, hb, -W1], [W1, hb, -W1]];
        for (var k = 0; k < 4; k++) { var k1 = (k + 1) % 4; face(q0[k1], q0[k], q1[k], q1[k1], va, vb, cells); }
      }
    }
  }
  var v0 = 0;
  [[0, ARCH, 1, 0], [ARCH, P1, 0, 1], [P1, TT, 1, 0], [TT, P2, 0, 0], [P2, H_TOP, 0, 0]].forEach(function (sc) {
    var a = sc[0], b = sc[1], hs = [a], cs = [0], hh = a;
    while (hh < b - 1e-6) { var h2 = Math.min(b, hh + 0.25); cs.push(cs[cs.length - 1] + (h2 - hh) / chOf((hh + h2) / 2, sc[3])); hs.push(h2); hh = h2; }
    var n = cs[cs.length - 1], rows = Math.max(1, Math.round(n)), bounds = [a];
    for (var r = 1; r < rows; r++) { var tg = r * n / rows; for (var j = 1; j < cs.length; j++) if (cs[j] >= tg) { bounds.push(lerp(hs[j - 1], hs[j], (tg - cs[j - 1]) / (cs[j] - cs[j - 1]))); break; } }
    bounds.push(b);
    for (r = 0; r < rows; r++) row(bounds[r], bounds[r + 1], v0 + r, sc[2], sc[3]);
    v0 += rows;
  });

  // --- masonry feet: stone piers in three courses around the base of each leg
  var A0 = arch[0][1], W0 = W(0);
  stone.set('qw', 'qwS', 'qwL');
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s) {
    [[0, 2.6, 1.8], [2.6, 5, 1.2], [5, 6.4, 0.7]].forEach(function (c, ci) {
      var x0 = Math.min(s[0] * (A0 - c[2] * u), s[0] * (W0 + c[2] * u)), x1 = Math.max(s[0] * (A0 - c[2] * u), s[0] * (W0 + c[2] * u));
      var z0 = Math.min(s[1] * (A0 - c[2] * u), s[1] * (W0 + c[2] * u)), z1 = Math.max(s[1] * (A0 - c[2] * u), s[1] * (W0 + c[2] * u));
      if (ci === 2) stone.set('qwL', 'qwS', 'qwL'); else stone.set('qw', 'qwS', 'qwL');
      stone.boxW(x0, c[0] * u, z0, x1, c[1] * u, z1, 1.25 * u);
    });
    ctx.contacts.push([s[0] * (A0 + W0) / 2, s[1] * (A0 + W0) / 2, (W0 - A0) * 0.62, (W0 - A0) * 0.62]);
  });

  // --- a staircase zigzagging up inside the front-left leg (seen through the lattice)
  sol.set('twD', 'twD');
  var stp = []; for (var hs_ = 7 * u, z_ = 0; hs_ < ARCH - 6 * u; hs_ += 7 * u, z_++) {
    var A_ = archW(hs_), c_ = (W(hs_) + A_) / 2, o_ = (W(hs_) - A_) * 0.22 * (z_ % 2 ? 1 : -1);
    stp.push([-c_ + o_ * 0.7071, hs_, c_ + o_ * 0.7071]);
  }
  for (i = 0; i < stp.length - 1; i++) {
    sol.beam(stp[i], stp[i + 1], 0.55 * u);
    var q_ = stp[i + 1]; sol.box(q_[0] - 1.6 * u, q_[1] - 0.5 * u, q_[2] - 1.6 * u, q_[0] + 1.6 * u, q_[1], q_[2] + 1.6 * u);
    for (var st_ = 1; st_ < 6; st_++) { var p_ = [lerp(stp[i][0], stp[i + 1][0], st_ / 6), lerp(stp[i][1], stp[i + 1][1], st_ / 6), lerp(stp[i][2], stp[i + 1][2], st_ / 6)]; sol.box(p_[0] - 0.9 * u, p_[1] - 0.15 * u, p_[2] - 0.9 * u, p_[0] + 0.9 * u, p_[1] + 0.15 * u, p_[2] + 0.9 * u); }
  }

  // --- the four arches: a decorated band (curls in ink) with a shaded soffit under it
  var curve = [];
  for (i = 0; i <= 60; i++) curve.push([-arch[i][1], arch[i][0]]);
  for (i = 59; i >= 0; i--) curve.push([arch[i][1], arch[i][0]]);
  var bw = 6.5 * u, sArc = [0];
  for (i = 1; i < curve.length; i++) sArc.push(sArc[i - 1] + Math.hypot(curve[i][0] - curve[i - 1][0], curve[i][1] - curve[i - 1][1]) / bw);
  var nrm = curve.map(function (p, j) { var a = curve[Math.max(0, j - 1)], b = curve[Math.min(curve.length - 1, j + 1)], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; return [-ty / l, tx / l]; });
  band.set('twP', 'tw', null, 'twD', 'twL');
  var soff = new PB(P); soff.set('tw', 'twD', null, 'twD', null, null, 0.6);
  for (k = 0; k < 4; k++) {
    for (i = 0; i < curve.length - 1; i++) {
      var pa = curve[i], pb = curve[i + 1], na = nrm[i], nb = nrm[i + 1];
      var zA = W(pa[1]) + 0.3, zB = W(pb[1]) + 0.3;
      var ia = [pa[0], pa[1], zA], ib = [pb[0], pb[1], zB], oa = [pa[0] + na[0] * bw, pa[1] + na[1] * bw, W(pa[1] + na[1] * bw) + 0.3], ob = [pb[0] + nb[0] * bw, pb[1] + nb[1] * bw, W(pb[1] + nb[1] * bw) + 0.3];
      var q = rotY([ia, ib, ob, oa], k); band.quad(q[0], q[1], q[2], q[3], [sArc[i], 0, sArc[i + 1], 0, sArc[i + 1], 1, sArc[i], 1]);
      var e = 0.25, sa = [pa[0] - na[0] * e, pa[1] - na[1] * e], sb = [pb[0] - nb[0] * e, pb[1] - nb[1] * e];
      var fa = [sa[0], sa[1], zA], fb = [sb[0], sb[1], zB], ba = [sa[0], sa[1], zA - 5 * u], bb = [sb[0], sb[1], zB - 5 * u];
      q = rotY([fb, fa, ba, bb], k); soff.quad(q[0], q[1], q[2], q[3], [0, 1, 1, 1, 1, 0, 0, 0]);
    }
  }

  // --- platforms: frieze and restaurant windows on the sides, a lit edge, railings, little lamps at night
  var twGl = ctx.twGlints = [];
  function platform(pH, ext, mode) {
    var hw = (twv(1012 - pH / u) + ext) * u, y0 = pH - 8 * u, per = 2.6 * u, n = Math.round(2 * hw / per);
    sol.set('twD'); sol.box(-hw, y0, -hw, hw, y0 + 0.05, hw, 'u');
    plat.set('tw', 'twD', null, 'twD', 'wl', 'twL'); plat.sc = mode;
    for (var k = 0; k < 4; k++) { var c = rotY([[-hw, y0, hw], [hw, y0, hw], [hw, pH, hw], [-hw, pH, hw]], k); plat.quad(c[0], c[1], c[2], c[3], [0, 0, n, 0, n, 1, 0, 1]); }
    sol.set('twP'); sol.box(-hw - u, pH, -hw - u, hw + u, pH + 2 * u, hw + u, 'fbrlt');
    var ry = pH + 2 * u, rh = 2.3 * u, rw = hw + 0.5 * u, np = Math.round(2 * rw / (1.5 * u));
    rail.set('twD', 'twD', null, 'twD', 'twL');
    for (k = 0; k < 4; k++) { var q = rotY([[-rw, ry, rw], [rw, ry, rw], [rw, ry + rh, rw], [-rw, ry + rh, rw]], k); rail.quad(q[0], q[1], q[2], q[3], [0, 0, np, 0, np, 1, 0, 1]); }
    for (k = 0; k < Math.floor(2 * hw / (5 * u)); k++) ctx.glows.add([-hw + 3 * u + k * 5 * u, y0 + 4 * u, hw + 0.4], 5 * u, '#fff4dc', 1);
    return hw;
  }
  function glassBox(x0, y0, z0, x1, y1, z1, pane, faces) {
    win.set('tw', 'twD', null, 'twD', 'wl', 'twL');
    var ph = (y1 - y0) / 2, f = faces || 'fbrl';
    if (f.indexOf('f') >= 0) win.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0 / pane, 0, x1 / pane, 0, x1 / pane, 2, x0 / pane, 2]);
    if (f.indexOf('b') >= 0) win.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, (x1 - x0) / pane, 0, (x1 - x0) / pane, 2, 0, 2]);
    if (f.indexOf('r') >= 0) win.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [0, 0, (z1 - z0) / pane, 0, (z1 - z0) / pane, 2, 0, 2]);
    if (f.indexOf('l') >= 0) win.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [0, 0, (z1 - z0) / pane, 0, (z1 - z0) / pane, 2, 0, 2]);
    sol.set('twP'); sol.box(x0 - 0.4 * u, y1, z0 - 0.4 * u, x1 + 0.4 * u, y1 + 0.9 * u, z1 + 0.4 * u);
    void ph;
  }
  var hw1 = platform(P1, 10, 0), hw2 = platform(P2, 7, 1);
  // glass pavilions on the first floor, one along each side (a ✦ in their glass by day)
  for (k = 0; k < 4; k++) {
    var L_ = hw1 * 0.55, yb = P1 + 2 * u, yt = yb + 5.5 * u, zf = hw1 - 2.8 * u, zb = hw1 - 8 * u;
    var c4 = rotY([[-L_, yb, zb], [L_, yt, zf]], k), x0 = Math.min(c4[0][0], c4[1][0]), x1 = Math.max(c4[0][0], c4[1][0]), z0 = Math.min(c4[0][2], c4[1][2]), z1 = Math.max(c4[0][2], c4[1][2]);
    glassBox(x0, yb, z0, x1, yt, z1, 2.4 * u, k === 0 ? 'frl' : k === 1 ? 'rfb' : k === 2 ? 'brl' : 'lfb');
    if (k === 0) for (i = 0; i < 3; i++) twGl.push([-L_ * 0.6 + i * L_ * 0.6, yb + 3.4 * u, zf + 0.3]);
  }
  // the second floor's glass deck
  glassBox(-hw2 * 0.62, P2 + 2 * u, -hw2 * 0.62, hw2 * 0.62, P2 + 7 * u, hw2 * 0.62, 2.2 * u);
  twGl.push([hw2 * 0.3, P2 + 5 * u, hw2 * 0.62 + 0.3]);

  // tiny tourists along the front rails (a few cameras flash at night)
  var flashP = [], R = rng(41), coats = ['awR', 'sea', 'cart', 'umb', 'awG', 'white', 'h1', 'red'];
  [[P1, hw1, 18], [P2, hw2, 10]].forEach(function (pl) {
    var y = pl[0] + 2 * u, hw = pl[1];
    for (var j = 0; j < pl[2]; j++) {
      var x = -hw + 3 * u + (j + R() * 0.6) * (2 * hw - 6 * u) / pl[2], z = hw - 0.9 * u - R() * 0.8 * u, hgt = (1.7 + R() * 0.5) * u;
      sol.set(coats[Math.floor(R() * coats.length)]); sol.box(x - 0.45 * u, y, z - 0.3 * u, x + 0.45 * u, y + hgt, z + 0.3 * u);
      sol.set('skin'); sol.box(x - 0.32 * u, y + hgt, z - 0.3 * u, x + 0.32 * u, y + hgt + 0.65 * u, z + 0.3 * u);
      if (R() < 0.35) flashP.push(x, y + hgt + 0.4 * u, z + 0.6 * u);
    }
  });
  // small flags on the second floor's corners
  flag.set('tw');
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (s) {
    var fx = s[0] * (hw2 + 0.6 * u), fz = s[1] * (hw2 + 0.6 * u), y0 = P2 + 2 * u, y1 = y0 + 8 * u;
    sol.set('twD'); sol.box(fx - 0.2 * u, y0, fz - 0.2 * u, fx + 0.2 * u, y1, fz + 0.2 * u);
    ['sea', 'white', 'red'].forEach(function (tk, j) {
      var xa = fx + s[0] * j * 1.3 * u, xb = fx + s[0] * (j + 1) * 1.3 * u, wa = Math.sin(j * 1.4) * 0.5 * u, wb = Math.sin((j + 1) * 1.4) * 0.5 * u;
      flag.set(tk); flag.quad([xa, y1 - 2.6 * u, fz + wa], [xb, y1 - 2.6 * u, fz + wb], [xb, y1, fz + wb], [xa, y1, fz + wa]);
    });
  });

  // --- the top: platform, glazed cabin (lit at night), beacon house, antenna with dishes and crossbars, a tiny flag
  var et = H_TOP, cb0 = et + 4 * u, cb1 = et + 23 * u, BY = 559 / 1.858;
  sol.set('twD'); sol.box(-10 * u, et - 3 * u, -10 * u, 10 * u, et + 3 * u, 10 * u, 'fbrltu');
  sol.set('twP'); sol.box(-11 * u, et + 3 * u, -11 * u, 11 * u, et + 4.6 * u, 11 * u, 'fbrlt');
  rail.set('twD', 'twD', null, 'twD', 'twL');
  for (k = 0; k < 4; k++) { var qq = rotY([[-10.8 * u, et + 4.6 * u, 10.8 * u], [10.8 * u, et + 4.6 * u, 10.8 * u], [10.8 * u, et + 6.8 * u, 10.8 * u], [-10.8 * u, et + 6.8 * u, 10.8 * u]], k); rail.quad(qq[0], qq[1], qq[2], qq[3], [0, 0, 14, 0, 14, 1, 0, 1]); }
  var cab = [[5, 5], [-5, 5], [-5, -5], [5, -5]];
  win.set('tw', 'twD', null, 'twD', 'wl', 'twL');
  for (k = 0; k < 4; k++) { var a = cab[k], b = cab[(k + 1) % 4]; win.quad([b[0] * u, cb0, b[1] * u], [a[0] * u, cb0, a[1] * u], [a[0] * 0.68 * u, cb1, a[1] * 0.68 * u], [b[0] * 0.68 * u, cb1, b[1] * 0.68 * u], [0, 0, 4, 0, 4, 5, 0, 5]); }
  sol.set('twP'); sol.box(-5.5 * u, cb1, -5.5 * u, 5.5 * u, cb1 + 2 * u, 5.5 * u, 'fbrlt');
  sol.set('lampG'); sol.box(-4.2 * u, BY - 4.5 * u, -4.2 * u, 4.2 * u, BY + 4.5 * u, 4.2 * u, 'fbrl');
  sol.set('twD'); sol.box(-5.6 * u, BY + 4.5 * u, -5.6 * u, 5.6 * u, BY + 5.5 * u, 5.6 * u);
  sol.box(-2.2 * u, BY + 5.5 * u, -2.2 * u, 2.2 * u, BY + 9.5 * u, 2.2 * u);
  sol.box(-1.1 * u, BY + 9.5 * u, -1.1 * u, 1.1 * u, BY + 32 * u, 1.1 * u); sol.box(-0.55 * u, BY + 32 * u, -0.55 * u, 0.55 * u, BY + 54 * u, 0.55 * u);
  [18, 31, 42].forEach(function (y, j) { var r2 = (3.4 - j * 0.6) * u; sol.box(-r2, BY + y * u, -r2, r2, BY + y * u + 0.8 * u, r2); });
  [12, 25].forEach(function (y, j) { sol.box(-0.3 * u, BY + y * u, -(4 - j) * u, 0.3 * u, BY + y * u + 0.5 * u, (4 - j) * u); });
  sol.set('twP', 'twD');
  [[1.4, 14, 1, 2], [-1.4, 21, 1, 1.6], [0.8, 27, 1, 1.3]].forEach(function (d) { var y = BY + d[1] * u, x = d[0] * u; sol.cyl(x, y, 1.1 * u, d[3] * u, 0.4 * u, 0.9 * u, 10, 'z'); sol.disc([x, y, 1.1 * u + 0.01], d[3] * u, 'z', 10); });
  ['sea', 'white', 'red'].forEach(function (tk, j) { flag.set(tk); flag.quad([(0.6 + j * 1.2) * u, BY + 49 * u, 0], [(0.6 + (j + 1) * 1.2) * u, BY + 49 * u, 0.3 * u * (j % 2 ? -1 : 1)], [(0.6 + (j + 1) * 1.2) * u, BY + 51.8 * u, 0.3 * u * (j % 2 ? -1 : 1)], [(0.6 + j * 1.2) * u, BY + 51.8 * u, 0]); });

  // --- meshes
  function add(pb, opt, name, cast) { var m = new T.Mesh(pb.geo(), paintMaterial(U, opt)); m.name = 'tw-' + name; m.castShadow = cast !== false; m.receiveShadow = true; scene.add(m); return m; }
  add(lat, { pat: 'lat' }, 'lattice'); add(sol, {}, 'solid'); add(plat, { pat: 'plat' }, 'platform'); add(rail, { pat: 'rail', side: T.DoubleSide }, 'rail', false);
  add(win, { pat: 'win' }, 'glass'); add(band, { pat: 'band' }, 'band'); add(soff, { pat: 'soff' }, 'soffit'); add(stone, { pat: 'stone' }, 'stone'); add(flag, { side: T.DoubleSide }, 'flags', false);

  // --- lifts: two cabins sliding up and down the front legs on a slow timetable, cables drawn as thin lines
  function liftPath(h, sx) { var A = archW(h); if (h > P1) A = 0; return [sx * (W(h) + Math.max(0, A)) / 2, h, W(h) + 0.9 * u]; }
  var cabB = new PB(P), cabW = new PB(P);
  cabB.set('twP', 'tw'); cabB.box(-1.6 * u, -1.9 * u, -0.8 * u, 1.6 * u, 1.9 * u, 0.8 * u);
  cabB.set('twD'); cabB.box(-1.8 * u, 1.9 * u, -0.9 * u, 1.8 * u, 2.4 * u, 0.9 * u);
  cabW.set('tw', 'twD', null, 'twD', 'wl', 'twL'); cabW.quad([-1.2 * u, -0.2 * u, 0.82 * u], [1.2 * u, -0.2 * u, 0.82 * u], [1.2 * u, 1.5 * u, 0.82 * u], [-1.2 * u, 1.5 * u, 0.82 * u], [0, 0, 2, 0, 2, 1, 0, 1]);
  var gB = cabB.geo(), gW = cabW.geo(), mB = paintMaterial(U, {}), mW = paintMaterial(U, { pat: 'win' }), lifts = [];
  var cableMat = new T.LineBasicMaterial({ color: 0x000000 });
  [-1, 1].forEach(function (sx, j) {
    var g = new T.Group(); g.add(new T.Mesh(gB, mB), new T.Mesh(gW, mW)); g.children.forEach(function (m) { m.castShadow = true; }); scene.add(g);
    var pts = []; for (var h = 1; h <= P1 - 8 * u; h += 2) { var p = liftPath(h, sx); pts.push(new T.Vector3(p[0] + 2.1 * u * sx, p[1], p[2] - 0.2 * u)); }
    var cl = new T.Line(new T.BufferGeometry().setFromPoints(pts), cableMat); scene.add(cl);
    lifts.push({ g: g, sx: sx, ph: j * 23, gi: ctx.glows.add([0, 0, 0], 7 * u, '#ffd38a', 0.9) });
  });

  // --- night: floodlights at the feet, a warm glow on the ground around them and on the Champ de Mars
  ctx.glows.add([0, 170 * u, 60], 420 * u, '#ffd38a', 0.2);
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s) { ctx.glows.add([s[0] * W0 * 0.8, 0.6, s[1] * W0 * 0.8], 150 * u, '#ffc56a', 0.42); });
  ctx.glows.add([0, 0.6, -W0 * 2.4], 420 * u, '#ffc56a', 0.22);
  var floodM = new T.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uC: { value: new T.Color('#ffd27a') } },
    vertexShader: 'varying float vY; varying vec3 vN, vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uA; uniform vec3 uC; varying float vY; varying vec3 vN, vV; void main(){ float e = pow(abs(dot(vN, vV)), 1.6); float a = pow(1. - vY, 1.4) * e * uA * .45; gl_FragColor = vec4(uC, a);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false, side: T.DoubleSide
  });
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s) {
    var len = 150 * u, g = new T.CylinderGeometry(22 * u, 2.5 * u, len, 24, 1, true); g.translate(0, len / 2, 0);
    var uvs = g.attributes.uv; for (var j = 0; j < uvs.count; j++) uvs.setY(j, g.attributes.position.getY(j) / len);
    var m = new T.Mesh(g, floodM), base = new T.Vector3(s[0] * (W0 + 8 * u), 0.5, s[1] * (W0 + 8 * u)), tip = new T.Vector3(s[0] * 18 * u, 130 * u, s[1] * 18 * u);
    m.position.copy(base); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), tip.sub(base).normalize()); m.renderOrder = 4; m.frustumCulled = false; m.name = 'tw-flood'; scene.add(m);
  });

  // camera flashes: a tourist's flash pops now and then at night
  var fg = new T.BufferGeometry(); fg.setAttribute('position', new T.Float32BufferAttribute(flashP, 3));
  var flashM = new T.ShaderMaterial({
    uniforms: { uTime: U.uStep, uScale: U.uScale, uPn: U.uPn, uMap: { value: ctx.tex.star } },
    vertexShader: 'uniform float uTime, uScale, uPn; varying float vA; void main(){ float k = float(gl_VertexID); vA = uPn * step(.93, fract(sin(floor(uTime * 4.) * 12.9898 + k * 78.233) * 43758.5453));\n' +
      ' vec4 mv = modelViewMatrix * vec4(position, 1.); vec4 q = projectionMatrix * (mv + vec4(0., 0., 4., 0.)); gl_Position = projectionMatrix * mv; gl_Position.z = q.z / q.w * gl_Position.w;\n' +
      ' gl_PointSize = vA > .01 ? ' + (20 * u).toFixed(3) + ' * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uMap; varying float vA; void main(){ float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(1., 1., 1., a * vA);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false
  });
  var flashes = new T.Points(fg, flashM); flashes.name = 'tw-flash'; flashes.frustumCulled = false; flashes.renderOrder = 8; scene.add(flashes);

  // --- the sparkle: 4-point stars of three sizes on all four faces, following the curve, denser toward the top
  var Rs = rng(23), sp = [], sc = [];
  for (i = 0; i < 360; i++) {
    var hh = 6 + (et - 30) * Math.pow(Rs(), 0.7), Wd = W(hh), along = (Rs() * 2 - 1) * (Wd - 0.5), fk = i % 4, p4 = rotY([[along, hh, Wd + 0.5]], fk)[0];
    sp.push(p4[0], p4[1], p4[2]); sc.push(Rs(), Rs() < 0.6 ? 0 : Rs() < 0.75 ? 1 : 2);
  }
  var sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3)); sg.setAttribute('aR', new T.Float32BufferAttribute(sc, 2));
  var sparkM = new T.ShaderMaterial({
    uniforms: { uTime: U.uStep, uScale: U.uScale, uA: { value: 0 }, uC1: { value: new T.Color('#fff8ea') }, uC2: { value: new T.Color('#fff8ea') }, uMap: { value: ctx.tex.star }, uHeart: { value: 0 } },
    vertexShader: 'attribute vec2 aR; uniform float uTime, uScale, uA; varying float vOn; varying float vK;\n' +
      'void main(){ float per = .7 + fract(aR.x * 13.) * .6; vOn = step(.5, fract(uTime / per + aR.x)) * uA * (.6 + .4 * aR.x); vK = step(.5, fract(aR.x * 7.)); vec4 mv = modelViewMatrix * vec4(position, 1.);\n' +
      ' vec4 q = projectionMatrix * (mv + vec4(0., 0., 4., 0.)); gl_Position = projectionMatrix * mv; gl_Position.z = q.z / q.w * gl_Position.w;\n' +
      ' float sz = aR.y < .5 ? 8. : aR.y < 1.5 ? 12. : 18.; gl_PointSize = vOn > 0. ? sz * ' + u.toFixed(3) + ' * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform vec3 uC1, uC2; uniform sampler2D uMap; uniform float uHeart; varying float vOn; varying float vK; float dot2(vec2 v){ return dot(v, v); } float sdHeart(vec2 p){ p.x = abs(p.x); if (p.y + p.x > 1.) return sqrt(dot2(p - vec2(.25, .75))) - .35355; return sqrt(min(dot2(p - vec2(0., 1.)), dot2(p - .5 * max(p.x + p.y, 0.)))) * sign(p.x - p.y); }\nvoid main(){ float a = texture2D(uMap, gl_PointCoord).a;\n' +
      ' if (uHeart > .5 && vK > .5) { vec2 q = (gl_PointCoord - .5) * 2.4; q.y = -q.y + .55; float d = sdHeart(q * .95); a = 1. - smoothstep(-.03, .03, d); }\n' +
      ' gl_FragColor = vec4(mix(uC1, uC2, vK), a * vOn);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false
  });
  var sparkle = new T.Points(sg, sparkM); sparkle.name = 'tw-sparkle'; sparkle.frustumCulled = false; sparkle.renderOrder = 6; scene.add(sparkle);

  // --- the beacon: two wedges of light sweeping round, dust drifting in them; brighter where they cross a cloud; short and haloed in fog
  var beam = new T.Group(); beam.name = 'tw-beam'; beam.position.set(0, BY, 0);
  var L2 = 460 * u;
  var bm = new T.ShaderMaterial({
    uniforms: { uA: { value: 0 }, uFog: { value: 0 }, uCl: { value: [0, 1, 2, 3, 4, 5].map(function () { return new T.Vector4(-9999, -9999, 1, 1); }) }, uN: { value: 0 } },
    vertexShader: 'varying float vX; void main(){ vX = abs(position.x); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float uA, uFog; uniform vec4 uCl[6]; uniform int uN; varying float vX; void main(){ float f = vX / ' + L2.toFixed(2) + '; float a = pow(1. - f, mix(1., 2.2, uFog)) * mix(.32, .2, uFog) * uA;\n' +
      ' float k = 0.; for (int i = 0; i < 6; i++) { if (i >= uN) break; vec4 c = uCl[i]; k = max(k, 1. - smoothstep(.5, 1., length((gl_FragCoord.xy - c.xy) / c.zw))); }\n' +
      ' a *= 1. + 1.7 * k; gl_FragColor = vec4(mix(vec3(1., .945, .8), vec3(1.), .4 * k), a);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false, side: T.DoubleSide
  });
  var bg = new T.BufferGeometry();
  bg.setAttribute('position', new T.Float32BufferAttribute([0, -2 * u, 0, -L2, 2 * u, 0, -L2, 58 * u, 0, 0, -2 * u, 0, -L2, 58 * u, 0, 0, 2 * u, 0,
    0, -2 * u, 0, L2, 2 * u, 0, L2, 58 * u, 0, 0, -2 * u, 0, L2, 58 * u, 0, 0, 2 * u, 0], 3));
  var b1 = new T.Mesh(bg, bm); b1.frustumCulled = false; b1.renderOrder = 7; beam.add(b1);
  var b2 = new T.Mesh(bg, bm); b2.frustumCulled = false; b2.renderOrder = 7; b2.rotation.y = Math.PI / 2; beam.add(b2);
  var Rd = rng(77), dp = [], dr = [];
  for (i = 0; i < 260; i++) { dp.push(0, 0, 0); dr.push(Rd(), Rd(), i % 4, Rd()); }
  var dg = new T.BufferGeometry(); dg.setAttribute('position', new T.Float32BufferAttribute(dp, 3)); dg.setAttribute('aD', new T.Float32BufferAttribute(dr, 4));
  var dustM = new T.ShaderMaterial({
    uniforms: { uTime: U.uTime, uA: { value: 0 }, uPx: U.uPx },
    vertexShader: 'attribute vec4 aD; uniform float uTime, uA, uPx; varying float vA; void main(){ float f = fract(aD.x + uTime * (.004 + .006 * aD.w)); float sx = (mod(aD.z, 2.) < .5 ? -1. : 1.) * f * ' + L2.toFixed(2) + ';\n' +
      ' float y0 = mix(' + (-2 * u).toFixed(2) + ', ' + (2 * u).toFixed(2) + ', f), y1 = mix(' + (2 * u).toFixed(2) + ', ' + (58 * u).toFixed(2) + ', f); float y = mix(y0, y1, .1 + .8 * aD.y) + sin(uTime * .7 + aD.w * 30.) * .6;\n' +
      ' vec3 p = aD.z < 1.5 ? vec3(sx, y, 0.) : vec3(0., y, -sx); vA = uA * (1. - f) * (.4 + .6 * sin(uTime * 2. + aD.w * 40.) * sin(uTime * 2. + aD.w * 40.)) * smoothstep(0., .04, f);\n' +
      ' gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); gl_PointSize = vA > .01 ? (1.4 + 1.4 * aD.w) * uPx : 0.; }',
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - .5) * 2.; gl_FragColor = vec4(1., .96, .86, (1. - smoothstep(.4, 1., d)) * vA * .9);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false
  });
  var dust = new T.Points(dg, dustM); dust.name = 'tw-dust'; dust.frustumCulled = false; dust.renderOrder = 8; beam.add(dust);
  scene.add(beam);
  ctx.glows.add([0, BY, 4 * u], 56 * u, '#ffd38a', 0.85);
  ctx.glows.add([0, BY, 4 * u], 30 * u, '#ffffff', 0.9);
  var haloI = ctx.glows.add([0, BY, 5 * u], 190 * u, '#fff1d0', 0);
  var redI = [ctx.glows.add([0, BY + 54 * u, 1.5], 12 * u, '#ff5a66', 1, 'blink'), ctx.glows.add([0, BY + 32 * u, 1.5], 12 * u, '#ff5a66', 1, 'blink')];

  // --- birds circling the top by day, bats at Halloween, nothing at night
  var NB = 8, Rb = rng(5), birds = [];
  for (i = 0; i < NB; i++) birds.push({ r: (45 + Rb() * 70) * u, y: (440 + Rb() * 110) * u, w: (0.12 + Rb() * 0.1) * (Rb() < 0.5 ? -1 : 1), ph: Rb() * 6.28, fl: 6 + Rb() * 3, s: (4.2 + Rb() * 1.8) * u });
  var bgeo = new T.BufferGeometry(), bpos = new Float32Array(NB * 8 * 3 * 3);
  bgeo.setAttribute('position', new T.BufferAttribute(bpos, 3));
  var bmat = new T.MeshBasicMaterial({ color: 0x222222, side: T.DoubleSide });
  var flock = new T.Mesh(bgeo, bmat); flock.name = 'tw-flock'; flock.frustumCulled = false; scene.add(flock);
  var cTmp = new T.Color();
  function flockUpdate(st, now) {
    var bats = st.event === 'halloween', show = bats || st.sky !== 'night';
    flock.visible = show; if (!show) return;
    cTmp.set(P.css(bats ? 'bat' : 'ink')); bmat.color.copy(cTmp);
    var o = 0;
    function tri(a, b, c) { bpos.set(a, o); bpos.set(b, o + 3); bpos.set(c, o + 6); o += 9; }
    birds.forEach(function (b) {
      var th = now * b.w * (bats ? 2.2 : 1) + b.ph, cx = Math.cos(th) * b.r, cz = Math.sin(th) * b.r + 8 * u, cy = b.y + Math.sin(th * 2) * 4 * u - (bats ? 40 * u : 0);
      var fl = Math.sin(now * (bats ? b.fl * 1.8 : b.fl) + b.ph), s = b.s * (bats ? 1.25 : 1), th_ = 0.16 * s;
      for (var side = -1; side <= 1; side += 2) {
        var B = [cx, cy, cz], E = [cx + side * 0.55 * s, cy + (0.18 + fl * 0.35) * s, cz], Tp = [cx + side * 1.15 * s, cy + (bats ? 0.15 + fl * 0.5 : -0.05 + fl * 0.55) * s, cz];
        if (bats) {
          var m1 = [cx + side * 0.75 * s, cy - 0.25 * s + fl * 0.2 * s, cz], m2 = [cx + side * 0.35 * s, cy - 0.3 * s, cz];
          tri(B, E, m2); tri(E, Tp, m1); tri(E, m1, m2); tri(B, m2, [cx, cy - 0.35 * s, cz]);
        } else {
          tri(B, E, [B[0], B[1] - th_, B[2]]); tri(E, [E[0], E[1] - th_, E[2]], [B[0], B[1] - th_, B[2]]);
          tri(E, Tp, [E[0], E[1] - th_, E[2]]); tri([E[0], E[1] - th_, E[2]], Tp, [Tp[0], Tp[1] - th_ * 0.3, Tp[2]]);
        }
      }
    });
    while (o < bpos.length) bpos[o++] = 0;
    bgeo.attributes.position.needsUpdate = true;
  }

  // clouds the beacon crosses: their boxes on screen, read now and then
  var host = ctx.host, clAt = -9, clEls = null;
  function readClouds(now) {
    if (now - clAt < 0.5 && now >= clAt) return; clAt = now;
    var cv = ctx.canvas, cr = cv.getBoundingClientRect(), pr = cv.width / Math.max(1, cr.width), n = 0;
    var v = ctx.vec; if (!v) return;
    if (!clEls) { clEls = []; v.E.forEach(function (e, i) { if (e.getAttribute('data-n') === 'g' && / cloud /.test(' ' + (e.getAttribute('class') || '') + ' ')) clEls.push(i); }); }
    for (var j = 0; j < clEls.length && n < 6; j++) {
      var b = v.screenBox(clEls[j]); if (!b) continue;
      var r = { left: cr.left + b.x, top: cr.top + b.y, width: b.w, height: b.h }; r.right = r.left + r.width; r.bottom = r.top + r.height;
      if (r.width < 2 || r.right < cr.left || r.left > cr.right || r.bottom < cr.top || r.top > cr.bottom) continue;
      var op = b.op; if (op < 0.1) continue;
      bm.uniforms.uCl.value[n].set((r.left + r.width / 2 - cr.left) * pr, (cr.bottom - (r.top + r.height * 0.55)) * pr, r.width * 0.46 * pr, r.height * 0.4 * pr); n++;
    }
    bm.uniforms.uN.value = n;
  }

  return {
    update: function (st, time) {
      sparkM.uniforms.uA.value += ((st.sparkleOn ? 1 : 0) * st.pn - sparkM.uniforms.uA.value) * (st.snap ? 1 : 0.1);
      sparkM.uniforms.uC2.value.set(st.event === 'christmas' ? '#bfe4ff' : st.event === 'valentine' ? '#ffc2d4' : st.event === 'halloween' ? '#ffb347' : '#fff8ea');
      sparkM.uniforms.uC1.value.set(st.event === 'valentine' ? '#fff0f5' : st.event === 'christmas' ? '#ffffff' : '#fff8ea'); sparkM.uniforms.uHeart.value = st.event === 'valentine' ? 1 : 0;
      var fog = st.wx === 'fog' ? 1 : 0;
      bm.uniforms.uA.value = st.beacon; bm.uniforms.uFog.value = fog; beam.visible = st.beacon > 0.01;
      dustM.uniforms.uA.value = st.beacon * (1 - 0.5 * fog);
      beam.scale.set(fog ? 0.42 : 1, fog ? 0.8 : 1, fog ? 0.42 : 1);
      // the painting's beacon spins through scaleX: a full turn in 22 s
      beam.rotation.y = -time * Math.PI * 2 / 22;
      if (beam.visible && !fog) readClouds(time); else bm.uniforms.uN.value = 0;
      floodM.uniforms.uA.value = st.pn;
      floodM.uniforms.uC.value.set(st.event === 'halloween' ? '#ff9a3c' : st.event === 'valentine' ? '#ff9ec0' : '#ffd27a');
      cableMat.color.set(P.css(st.pn > 0.5 ? 'twD' : 'ink'));
      var gp_ = ctx.glowPos;
      lifts.forEach(function (l) {
        var per = 46, f = ((time + l.ph) % per) / per, top = P1 - 10 * u, e;
        e = f < 0.3 ? f / 0.3 : f < 0.5 ? 1 : f < 0.8 ? 1 - (f - 0.5) / 0.3 : 0; e = e * e * (3 - 2 * e);
        var p = liftPath(lerp(3 * u, top, e), l.sx); l.g.position.set(p[0], p[1], p[2]);
        if (gp_) gp_.setXYZ(l.gi, p[0], p[1] + 0.6 * u, p[2] + 1);
      });
      if (ctx.glowOp) { redI.forEach(function (i) { ctx.glowOp.setX(i, st.event === 'christmas' ? 0 : 1); }); ctx.glowOp.setX(haloI, fog * 0.75 * (st.sky === 'night' ? 1 : 0)); }
      flockUpdate(st, time);
    }
  };
}

