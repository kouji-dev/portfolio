import * as T from 'three';
import { EX, F, ZC, dOf, at, uu } from '../core/view.js';
import { clamp, lerp, rng, canvasTex } from '../core/util.js';
import { PB } from '../core/pb.js';
import { paintMaterial } from '../core/paint.js';

// ---------------------------------------------------------------- Haussmann rows
// facades baked from the painting's own windows (with frames, sills, cross-bars, curtains, shutters, stone courses, signs, doors),
// plus real balconies, awnings, café tables, a pharmacy cross, aerials, corner rotundas, chimney smoke, pigeons and life at the windows
export function buildRows(ctx, solid) {
  var L = ctx.L, P = ctx.P, U = ctx.U, PX = 7, list = L.hauss, cols = 4, R = rng(57);
  var cw = 0, ch = 0;
  list.forEach(function (b) { cw = Math.max(cw, Math.ceil((b.w + 4) * PX) + 4); ch = Math.max(ch, Math.ceil((b.base - b.roof) * PX) + 4); });
  var W = cw * cols, H = ch * Math.ceil(list.length / cols), A = canvasTex(W, H, true);
  A.t.wrapS = A.t.wrapT = T.ClampToEdgeWrapping; A.t.anisotropy = 4;
  var facades = new PB(P), z0 = ZC - dOf(1018), d = dOf(1018), w = uu(d);
  function U_(px) { return px / W; } function V_(py) { return 1 - py / H; }
  function X(px) { return (px - EX) * d / F; } function Y(py, b) { return (b.base - py) * w; }
  var chimShadows = [];
  var curtainsC = ['#d9734e', '#e8b04a', '#c94f6d', '#7fae8a', '#f2d6a2', '#9b7fc4', '#e07a5f'];
  var winList = [];
  list.forEach(function (b, i) {
    var ox = (i % cols) * cw + 2 + 2 * PX, oy = Math.floor(i / cols) * ch + 2;
    b._o = [ox, oy]; b.i = i; b.left = b.x < 430;
    var a = at(b.x, b.base, d), xr = a[0] + b.w * w, yt = (b.base - b.top) * w, yr = (b.base - b.roof) * w;
    var fy0 = oy + (b.top - b.roof) * PX, fy1 = oy + (b.base - b.roof) * PX;
    facades.set(b.face, 'hS');
    facades.quad([a[0], 0, z0], [xr, 0, z0], [xr, yt, z0], [a[0], yt, z0], [U_(ox), V_(fy1), U_(ox + b.w * PX), V_(fy1), U_(ox + b.w * PX), V_(fy0), U_(ox), V_(fy0)]);
    var ins = 6 * b.s * w, rz = z0 - (yr - yt) * 0.55;
    b._rz = rz; b._yr = yr;
    facades.set('roof', 'roof');
    facades.quad([a[0] - 1.5 * w, yt, z0 + 0.3], [xr + 1.5 * w, yt, z0 + 0.3], [xr - ins, yr, rz], [a[0] + ins, yr, rz],
      [U_(ox - 1.5 * PX), V_(fy0), U_(ox + (b.w + 1.5) * PX), V_(fy0), U_(ox + (b.w - 6 * b.s) * PX), V_(oy), U_(ox + 6 * b.s * PX), V_(oy)]);
    var back = z0 - 18;
    solid.set(b.face, 'hS'); solid.box(a[0], 0, back, xr, yt, z0 - 0.05, 'brl');
    solid.set('roof'); solid.quad([a[0] + ins, yr, rz], [xr - ins, yr, rz], [xr - ins, yr, back + 2], [a[0] + ins, yr, back + 2]);
    solid.quad([a[0] - 1.5 * w, yt, z0 + 0.3], [a[0] + ins, yr, rz], [a[0] + ins, yr, back + 2], [a[0], yt, back]);
    solid.quad([xr, yt, back], [xr - ins, yr, back + 2], [xr - ins, yr, rz], [xr + 1.5 * w, yt, z0 + 0.3]);
    // the cornice: a ledge with its lit top
    solid.set('hL', 'hS'); solid.box(a[0] - 0.6 * w, yt - 2.2 * b.s * w, z0 - 0.2, xr + 0.6 * w, yt, z0 + 0.5);
    b.chims.forEach(function (cx) {
      var c0 = (cx - EX) * d / F, cz = rz - 1.5;
      solid.set('chim', 'hS'); solid.box(c0, yr - 1.5 * b.s * w, cz - 2, c0 + 10 * b.s * w, yr + 9 * b.s * w, cz);
      solid.set('hS'); solid.box(c0 - 0.3 * w, yr + 8.2 * b.s * w, cz - 2.2, c0 + 10 * b.s * w + 0.3 * w, yr + 9 * b.s * w, cz + 0.2);
      chimShadows.push([c0 + 5 * b.s * w, yr + 8.2 * b.s * w, cz, 0, 0, 10 * b.s * w, b.s * w]);
      solid.set('pot', 'chim'); for (var k = 0; k < 3; k++) solid.cyl(c0 + (2 + k * 3.2) * b.s * w, yr + 9 * b.s * w, cz - 1, 0.9 * b.s * w, 0.65 * b.s * w, 4 * b.s * w, 8);
    });
    // windows: each remembers whether it is lit at night and when it goes out
    b.wins.forEach(function (wn) {
      var lit = wn[2] !== 'wd', h = R(), o = { b: b, x: wn[0], y: wn[1], tok: wn[2], lit: lit, shut: false, half: false, cur: curtainsC[Math.floor(R() * curtainsC.length)] };
      if (!lit && h < 0.25) o.shut = true; else if (h > 0.94) o.half = true;
      o.never = R() < 0.25; o.off = R() * 330; o.again = !o.never && R() < 0.22; o.on = 330 + R() * 80;
      winList.push(o); (b._w = b._w || []).push(o);
    });
  });
  // the 20 windows that light up now and then at night (as in the painting)
  (L.dark || []).slice(0, 400).forEach(function (wn, i) {
    if (i % 12 !== 0) return;
    ctx.blinkers.push([(wn[0] + wn[2] / 2 - EX) * d / F, (1018 - wn[1] - wn[3] / 2) * w, z0 + 0.25, wn[3] * w * 1.1]);
  });
  function litAt(o, m) { if (!o.lit) return false; if (m >= 600 || o.never) return true; if (m < o.off) return true; return o.again && m >= o.on; }
  var litKey = '';
  function bake() {
    var g = A.g, pn = U.uPn.value, m = ctx.minutes == null ? 780 : ctx.minutes; g.clearRect(0, 0, W, H);
    list.forEach(function (b) {
      var ox = b._o[0], oy = b._o[1], s = b.s;
      function px(x) { return ox + (x - b.x) * PX; } function py(y) { return oy + (y - b.roof) * PX; }
      function rect(x, y, w_, h_, t, op) { g.globalAlpha = op == null ? 1 : op; g.fillStyle = t.charAt(0) === '#' || t.indexOf('rgb') === 0 ? t : P.css(t); g.fillRect(px(x), py(y), w_ * PX, h_ * PX); }
      // roof: zinc with seams, dormers with their little roofs and windows
      rect(b.x - 2, b.roof, b.w + 4, b.top - b.roof, 'roof');
      for (var sx = Math.floor(b.x + 5 * s); sx < b.x + b.w - 3 * s; sx += Math.max(3, Math.floor(4 * s))) rect(sx, b.roof + 1, 0.35, b.top - b.roof - 2, 'roofL', 0.75);
      for (var cx = Math.floor(b.x + 8 * s); cx < b.x + b.w - 10 * s; cx += Math.max(8, Math.floor(13 * s))) {
        g.globalAlpha = 1; g.fillStyle = P.css('dorm'); g.beginPath();
        g.moveTo(px(cx), py(b.top)); g.lineTo(px(cx), py(b.roof + 8 * s)); g.lineTo(px(cx + 4.5 * s), py(b.roof + 4 * s));
        g.lineTo(px(cx + 9 * s), py(b.roof + 8 * s)); g.lineTo(px(cx + 9 * s), py(b.top)); g.fill();
        g.strokeStyle = P.css('roofL'); g.lineWidth = 0.5 * PX; g.beginPath(); g.moveTo(px(cx - 0.6), py(b.roof + 8.4 * s)); g.lineTo(px(cx + 4.5 * s), py(b.roof + 3.6 * s)); g.lineTo(px(cx + 9.6 * s), py(b.roof + 8.4 * s)); g.stroke();
        var dl = pn > 0.5 && (Math.round(cx) * 7 + b.i * 3) % 5 < 2;
        rect(cx + 2.6 * s, b.roof + 7.5 * s, 3.8 * s, Math.max(1.2, b.top - b.roof - 9 * s), dl ? 'wl' : 'wd');
        rect(cx + 4.35 * s, b.roof + 7.5 * s, 0.3, Math.max(1.2, b.top - b.roof - 9 * s), 'hL', 0.8);
      }
      // the facade: stone courses as fine strokes, a darker side, the cornice line and its dentils
      rect(b.x, b.top, b.w, b.h, b.face); rect(b.x + b.w * 0.74, b.top, b.w * 0.26, b.h, 'hS', 0.5);
      for (var cy = b.top + 2.4; cy < b.base - 13 * s; cy += 1.9 * s) rect(b.x, cy, b.w, 0.2, 'hS', 0.55);
      for (var jx = b.x + 1; jx < b.x + b.w; jx += 3.1 * s) for (var jy = b.base - 13 * s - 1.9 * s; jy > b.base - 13 * s - 6 * s; jy -= 1.9 * s) rect(jx + ((jy | 0) % 2) * 1.5 * s, jy, 0.16, 1.9 * s, 'hS', 0.45);
      rect(b.x, b.top, b.w, 0.55, 'hL', 0.95); rect(b.x, b.top + 0.55, b.w, 0.35, 'hS', 0.8);
      for (var dx = b.x + 0.4; dx < b.x + b.w - 0.4; dx += 1.1) rect(dx, b.top + 0.9, 0.5, 0.5, 'hS', 0.55);
      // shadows under the balconies (the ledges themselves are 3D)
      b.floors.forEach(function (wy, row) { if (row === 1 || row === b.floors.length - 1) rect(b.x + 1, wy + 9 * s + 0.5, b.w - 2, 0.8, 'hS', 0.55); });
      // windows: surround, sill, frame and cross-bars; curtains; a few shutters closed and a few casements ajar
      (b._w || []).forEach(function (o) {
        var x = o.x, y = o.y, ww = 5.2 * s, wh = 8.5 * s, lit = litAt(o, m), night = pn > 0.5;
        rect(x - 0.45, y - 0.45, ww + 0.9, wh + 0.9, 'hL', 0.9);
        rect(x - 0.9, y + wh + 0.35, ww + 1.8, 0.6, 'hL'); rect(x - 0.9, y + wh + 0.95, ww + 1.8, 0.3, 'hS', 0.7);
        if (o.shut) {
          rect(x, y, ww, wh, 'roofL'); for (var k = 0.6; k < wh; k += 0.75) rect(x, y + k, ww, 0.18, 'hS', 0.6);
          rect(x + ww / 2 - 0.1, y, 0.2, wh, 'hS', 0.9); return;
        }
        var tok = night ? (lit ? o.tok : 'wd') : o.tok;
        rect(x, y, ww, wh, tok);
        if (night && lit) { rect(x, y, ww * 0.24, wh, o.cur, 0.8); rect(x + ww * 0.76, y, ww * 0.24, wh, o.cur, 0.8); rect(x, y, ww, wh * 0.08, o.cur, 0.6); }
        else if (!night) { rect(x, y, ww * 0.2, wh, '#ffffff', 0.32); rect(x + ww * 0.8, y, ww * 0.2, wh, '#ffffff', 0.32); }
        if (o.half) { rect(x, y, ww / 2, wh, night ? 'wd' : 'hS', 0.55); rect(x + ww / 2 - 0.35, y, 0.35, wh, 'hL', 0.95); }
        var fc = night && lit ? 'rgba(70,44,22,0.8)' : P.css('hL');
        rect(x + ww / 2 - 0.13, y, 0.26, wh, fc, 0.95); rect(x, y + wh * 0.38, ww, 0.24, fc, 0.95);
        rect(x - 0.1, y - 0.1, ww + 0.2, 0.25, fc, 0.6);
      });
      // ground floor: shop fronts with signs, café fronts, doors with a carved arch
      rect(b.x, b.base - 13 * s, b.w, 13 * s, 'shop');
      b.shops.forEach(function (sh, si) {
        var x = sh[0], door = !sh[1] && !sh[2] && si % 2 === 1;
        if (door) {
          var dw = 5 * s, dh = 9.5 * s, dx0 = x + 2.5 * s, dy1 = b.base - 0.2;
          rect(dx0 - 0.7, dy1 - dh - 1, dw + 1.4, dh + 1, 'hL', 0.9);
          g.globalAlpha = 1; g.fillStyle = P.css('awG'); g.beginPath(); g.moveTo(px(dx0), py(dy1)); g.lineTo(px(dx0), py(dy1 - dh + dw / 2));
          g.arc(px(dx0 + dw / 2), py(dy1 - dh + dw / 2), dw / 2 * PX, Math.PI, 0); g.lineTo(px(dx0 + dw), py(dy1)); g.fill();
          rect(dx0 + dw / 2 - 0.1, dy1 - dh + dw / 2, 0.2, dh - dw / 2, 'iron', 0.7);
          rect(dx0 + dw / 2 - 0.6, dy1 - dh - 0.9, 1.2, 1.3, 'hS', 0.9);
          return;
        }
        rect(x, b.base - 9 * s, 10 * s, 8 * s, sh[1] ? 'cafe' : 'wd');
        rect(x, b.base - 9 * s, 10 * s, 0.35, 'hL', 0.8); rect(x + 5 * s - 0.1, b.base - 9 * s, 0.2, 8 * s, 'iron', 0.7);
        rect(x - 0.2, b.base - 12.6 * s, 10 * s + 0.4, 2 * s, sh[1] ? 'awR' : 'iron', 0.95);
        for (var k = 0; k < 4; k++) rect(x + 1.2 * s + k * 2.1 * s, b.base - 11.9 * s, 1.3 * s, 0.55 * s, 'awW', 0.9);
        if (sh[2]) rect(x - 1, b.base - 9 * s, 10 * s + 2, 1.4, 'hS', 0.45);
      });
      if (b.i === 3) { // a bicycle on a balcony
        var by = b.floors[1] + 9 * s, bx = b.x + b.w * 0.62;
        g.globalAlpha = 1; g.strokeStyle = P.css('iron'); g.lineWidth = 0.3 * PX;
        [[bx, by - 1.3], [bx + 3.4, by - 1.3]].forEach(function (c) { g.beginPath(); g.arc(px(c[0]), py(c[1]), 1.1 * PX, 0, 6.2832); g.stroke(); });
        g.beginPath(); g.moveTo(px(bx), py(by - 1.3)); g.lineTo(px(bx + 1.4), py(by - 2.7)); g.lineTo(px(bx + 3.4), py(by - 1.3)); g.moveTo(px(bx + 1.4), py(by - 2.7)); g.lineTo(px(bx + 2.9), py(by - 2.8)); g.stroke();
      }
    });
    g.globalAlpha = 1; A.t.needsUpdate = true;
  }
  var m = new T.Mesh(facades.geo(), paintMaterial(U, { map: A.t })); m.castShadow = true; m.receiveShadow = true; ctx.scene.add(m);

  // --- 3D details on the facades
  var bal = new PB(P), rails = new PB(P), awn = new PB(P), street = new PB(P), rot = new PB(P), Rd = rng(71);
  bal.set('hL', 'hS'); rails.set('iron', 'iron', null, 'iron', 'iron'); awn.set('awW', 'hS', null, 'iron', 'awW');
  var ped = new PB(P); var pavZ = z0 + 12 * w;
  list.forEach(function (b) {
    var s = b.s, x0 = X(b.x), x1 = X(b.x + b.w);
    // pavement along the foot of the row
    street.set('pave', 'pave', null, 'paveL'); street.quad([x0 - 1, 0.04, pavZ], [x1 + 1, 0.04, pavZ], [x1 + 1, 0.04, z0], [x0 - 1, 0.04, z0]);
    // balconies: real ledges on the 2nd and 5th floors with wrought-iron railings; pots and plants on some
    b.floors.forEach(function (wy, row) {
      if (!(row === 1 || row === b.floors.length - 1)) return;
      var yy = Y(wy + 9 * s, b), dep = 1.5 * w, rh = 2.7 * s * w, n = Math.round(b.w / 1.4);
      bal.box(x0 + 0.6 * w, yy - 0.55 * w, z0, x1 - 0.6 * w, yy, z0 + dep);
      rails.quad([x0 + 0.7 * w, yy, z0 + dep], [x1 - 0.7 * w, yy, z0 + dep], [x1 - 0.7 * w, yy + rh, z0 + dep], [x0 + 0.7 * w, yy + rh, z0 + dep], [0, 0, n, 0, n, 1, 0, 1]);
      if (Rd() < 0.45) for (var k = 0; k < 3; k++) {
        var px_ = lerp(x0 + 2 * w, x1 - 2 * w, Rd()), pz = z0 + 0.7 * w;
        street.set('pot', 'chim'); street.cyl(px_, yy, pz, 0.55 * w, 0.75 * w, 1.1 * w, 6);
        street.set(Rd() < 0.5 ? 'lf1' : 'lf2', 'lf3'); street.blob(px_, yy + 1.8 * w, pz, 1.1 * w, 0.9 * w, 0.8 * w, 0, 90 + k);
        if (Rd() < 0.6) { street.set(Rd() < 0.5 ? 'fr' : 'fc'); street.blob(px_ + 0.4 * w, yy + 2.3 * w, pz + 0.5 * w, 0.4 * w, 0.4 * w, 0.4 * w, 0, 7); }
      }
    });
    // awnings: striped canvas with a scalloped edge, flapping in the wind
    b.shops.forEach(function (sh) {
      if (!sh[2]) return;
      var xa = X(sh[0] - 1), xb = X(sh[0] + 10 * s + 1), yTop = Y(b.base - 9 * s, b) + 0.2, yBot = yTop - 3 * s * w, dz = 3.6 * w, n = Math.round((xb - xa) / (1.6 * w));
      awn.set(sh[2], 'hS', null, 'iron', 'awW');
      awn.quad([xa, yTop, z0 + 0.1], [xb, yTop, z0 + 0.1], [xb, yBot, z0 + dz], [xa, yBot, z0 + dz], [0, 0, n, 0, n, 1, 0, 1]);
      // café terraces glow warm at night, the awning lit from below
      if (sh[1]) (ctx.awnings = ctx.awnings || []).push([xa, xb, yBot, z0 + dz]);
      if (sh[1]) { ctx.glows.add([(xa + xb) / 2, yBot - 0.6 * w, z0 + dz * 0.7], (xb - xa) * 1.1, '#ffc27a', 0.55, 'dusk', 0.42); ctx.glows.add([(xa + xb) / 2, yBot + 0.4 * w, z0 + dz * 0.95], (xb - xa) * 0.55, '#ffe0a8', 0.5, 'dusk', 0.42); }
      // café tables and chairs on the pavement, a few people sitting
      if (sh[1]) for (var t = 0; t < 2; t++) {
        var tx = lerp(xa + 1.5 * w, xb - 1.5 * w, (t + 0.5) / 2), tz = z0 + (6 + t * 2.5) * w;
        street.set('iron'); street.cyl(tx, 0.04, tz, 0.12 * w, 0.12 * w, 1.6 * w, 5);
        street.set('awW', 'hS'); street.cyl(tx, 1.6 * w, tz, 0.9 * w, 0.9 * w, 0.18 * w, 10); street.disc([tx, 1.78 * w, tz], 0.9 * w, 'y', 10);
        [-1, 1].forEach(function (sd) {
          var cx_ = tx + sd * 1.5 * w; street.set('iron'); street.box(cx_ - 0.45 * w, 0.95 * w, tz - 0.45 * w, cx_ + 0.45 * w, 1.1 * w, tz + 0.45 * w); street.box(cx_ + sd * 0.35 * w - 0.08 * w, 0.95 * w, tz - 0.45 * w, cx_ + sd * 0.35 * w + 0.08 * w, 2.3 * w, tz + 0.45 * w);
          if (Rd() < 0.6) { street.set(['awR', 'sea', 'cart', 'umb', 'h1'][Math.floor(Rd() * 5)]); street.box(cx_ - 0.4 * w, 1.1 * w, tz - 0.35 * w, cx_ + 0.4 * w, 2.9 * w, tz + 0.35 * w); (ctx.heads = ctx.heads || []).push([cx_, 3.4 * w, tz + 0.5 * w, w * 2.2]); street.set('skin'); street.blob(cx_, 3.4 * w, tz, 0.45 * w, 0.5 * w, 0.45 * w, 0, 3); }
        });
      }
    });
    // TV aerials on some ridges
    if (b.i % 2 === 0) {
      var ax = X(b.x + b.w * 0.3), ay = b._yr, az = b._rz - 1;
      street.set('iron'); street.beam([ax, ay, az], [ax, ay + 7 * s * w, az], 0.13 * w);
      [6.8, 4.9].forEach(function (hh, j) { street.beam([ax - (2.4 - j * 0.6) * s * w, ay + hh * s * w, az], [ax + (2.4 - j * 0.6) * s * w, ay + hh * s * w, az], 0.1 * w); });
      street.beam([ax, ay + 6 * s * w, az], [ax + 1.6 * s * w, ay + 6.8 * s * w, az + 0.6 * w], 0.08 * w);
    }
  });
  // a green pharmacy cross at a corner (lit at night)
  var ph = list[9], phx = X(ph.x) + 1.4 * w, phy = Y(ph.base - 20.5 * ph.s, ph), phz = z0 + 1.2 * w;
  street.set('iron'); street.box(phx - 0.15 * w, phy - 0.15 * w, z0, phx + 0.15 * w, phy + 0.15 * w, phz);
  street.set('awG', 'awG', 'awG'); street.box(phx - 0.55 * w, phy - 1.6 * w, phz - 0.25 * w, phx + 0.55 * w, phy + 1.6 * w, phz + 0.25 * w); street.box(phx - 1.6 * w, phy - 0.55 * w, phz - 0.25 * w, phx + 1.6 * w, phy + 0.55 * w, phz + 0.25 * w);
  var phGlow = ctx.glows.add([phx, phy, phz + 1], 9 * w, '#4dff9a', 0.9);
  // corner rotundas on the end blocks next to the Champ de Mars, windows all round, a small dome and finial
  [[list[7], 1], [list[8], -1]].forEach(function (e) {
    var b = e[0], s = b.s, cx = X(e[1] > 0 ? b.x + b.w : b.x), rr = 7.5 * s * w, cz = z0 - rr * 0.35, top = Y(b.top - 3 * s, b), seg = 16;
    rot.set(b.face, 'hS', null, 'iron', 'wl', 'hL'); rot.sc = 0;
    for (var k = 0; k < seg; k++) {
      var a0 = k / seg * 6.2832, a1 = (k + 1) / seg * 6.2832, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1), cell = 7.2 * s * w;
      var u0 = k / seg * 6.2832 * rr / cell, u1 = (k + 1) / seg * 6.2832 * rr / cell;
      rot.quad([cx + c1 * rr, 13 * s * w, cz + s1 * rr], [cx + c0 * rr, 13 * s * w, cz + s0 * rr], [cx + c0 * rr, top, cz + s0 * rr], [cx + c1 * rr, top, cz + s1 * rr], [u1, 0, u0, 0, u0, (top - 13 * s * w) / (8 * s * w), u1, (top - 13 * s * w) / (8 * s * w)]);
    }
    solid.set('shop'); solid.cyl(cx, 0, cz, rr, rr, 13 * s * w, seg);
    solid.set('hL', 'hS'); solid.cyl(cx, top, cz, rr + 0.5 * w, rr + 0.5 * w, 1.2 * w, seg);
    solid.set('roof', 'roof', null, 'roofL', null, null, 0.5); solid.blob(cx, top + 1.2 * w, cz, rr * 0.92, rr * 0.75, rr * 0.92, 2, 12);
    solid.set('iron'); solid.beam([cx, top + rr * 0.7, cz], [cx, top + rr * 0.7 + 5 * s * w, cz], 0.3 * w, 0.05 * w);
    ctx.contacts.push([cx, cz, rr * 1.1, rr * 0.6]);
  });
  // soft shadows under the chimney caps and pots
  var gS = canvasTex(4, 64, true); (function () { var gr = gS.g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); gS.g.fillStyle = gr; gS.g.fillRect(0, 0, 4, 64); gS.t.needsUpdate = true; })();
  var shM = new T.MeshBasicMaterial({ map: gS.t, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  // prod: the chimney shadows never move: one merged mesh (one draw call in each pass) instead of one mesh each
  var csP = [], csN = [], csU = [], csI = [];
  chimShadows.forEach(function (c) {
    var hgt = 2.8 * c[6], pg = new T.PlaneGeometry(c[5], hgt).translate(c[0], c[1] - hgt / 2, c[2] + 0.03), o = csP.length / 3;
    csP.push.apply(csP, pg.attributes.position.array); csN.push.apply(csN, pg.attributes.normal.array); csU.push.apply(csU, pg.attributes.uv.array);
    pg.index.array.forEach(function (k) { csI.push(k + o); }); pg.dispose();
  });
  if (csP.length) {
    var csG = new T.BufferGeometry(); csG.setAttribute('position', new T.Float32BufferAttribute(csP, 3)); csG.setAttribute('normal', new T.Float32BufferAttribute(csN, 3)); csG.setAttribute('uv', new T.Float32BufferAttribute(csU, 2)); csG.setIndex(csI);
    var csM = new T.Mesh(csG, shM); csM.renderOrder = 2; csM.name = 'rows-chimshadow'; ctx.scene.add(csM);
  }
  function add(pb, opt, name, cast) { var mm = new T.Mesh(pb.geo(), paintMaterial(U, opt)); mm.name = name; mm.castShadow = cast !== false; mm.receiveShadow = true; ctx.scene.add(mm); return mm; }
  add(bal, {}, 'rows-balcony'); add(rails, { pat: 'rail', side: T.DoubleSide }, 'rows-rail', false); add(street, {}, 'rows-street'); add(rot, { pat: 'hwin' }, 'rows-rotunda');
  add(awn, { pat: 'awn', side: T.DoubleSide, vkey: 'awn', vsnip: '\ntransformed.z += sin(uTime * 3.1 + position.x * .9) * uWind * .5 * uv.y; transformed.y += sin(uTime * 4.3 + position.x * 1.3) * uWind * .25 * uv.y;' }, 'rows-awning');

  // --- life at the windows by night: silhouettes passing behind curtains, a television's blue flicker
  var litWins = winList.filter(function (o) { return o.lit && !o.shut; }), Rs = rng(83), sp = [], sa = [];
  for (var i = 0; i < 14; i++) { var o = litWins[Math.floor(Rs() * litWins.length)]; sp.push(X(o.x + 2.6 * o.b.s), Y(o.y + 4.25 * o.b.s, o.b), z0 + 0.3); sa.push(Rs() * 40, 18 + Rs() * 20, i < 2 ? 1 : 0, 0); o.life = i; }
  var lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(sp, 3)); lg.setAttribute('aL', new T.Float32BufferAttribute(sa, 4));
  var lifeM = new T.ShaderMaterial({
    uniforms: { uTime: U.uTime, uStep: U.uStep, uScale: U.uScale, uPn: U.uPn, uOn: { value: new Float32Array(14).fill(1) } },
    vertexShader: 'attribute vec4 aL; uniform float uTime, uStep, uScale, uPn; varying float vA, vX, vTv, vFl; void main(){ float ph = mod(uTime + aL.x, aL.y); vTv = aL.z;\n' +
      ' vA = uPn * (vTv > .5 ? 1. : smoothstep(0., .4, ph) * (1. - smoothstep(4.6, 5., ph))); vX = mix(-.35, .35, clamp(ph / 5., 0., 1.)); if (aL.z < .5 && aL.x > 20.) vX = -vX;\n' +
      ' vFl = .55 + .45 * fract(sin(floor(uStep * 10.) * 12.9898 + aL.x) * 43758.5453);\n' +
      ' vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? ' + (8.5 * 0.72 * w).toFixed(3) + ' * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'varying float vA, vX, vTv, vFl; void main(){ vec2 p = gl_PointCoord - .5; if (abs(p.x) > .3 || abs(p.y) > .48) discard;\n' +
      ' if (vTv > .5) { gl_FragColor = vec4(vec3(.42, .62, 1.) * vFl, .85 * vA); }\n' +
      ' else { vec2 q = p - vec2(vX * .6, 0.); float head = length((q - vec2(0., -.06)) / vec2(.085, .1)); float sh = length((q - vec2(0., .2)) / vec2(.2, .16));\n' +
      '   float a = (1. - smoothstep(.85, 1., min(head, sh))) * (1. - step(.48, p.y + .0)); if (a < .02) discard; gl_FragColor = vec4(.28, .13, .06, a * .78 * vA); }\n' +
      '#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false
  });
  var life = new T.Points(lg, lifeM); life.name = 'rows-life'; life.frustumCulled = false; life.renderOrder = 3; ctx.scene.add(life);

  // --- chimney smoke in winter
  var smP = [], smA = [];
  list.forEach(function (b) { b.chims.forEach(function (cx) { for (var k = 0; k < 6; k++) { smP.push((cx - EX) * d / F + 5 * b.s * w, b._yr + 13 * b.s * w, b._rz - 2.5); smA.push(k / 6, R()); } }); });
  var smg = new T.BufferGeometry(); smg.setAttribute('position', new T.Float32BufferAttribute(smP, 3)); smg.setAttribute('aS', new T.Float32BufferAttribute(smA, 2));
  var smokeM = new T.ShaderMaterial({
    uniforms: { uTime: U.uTime, uScale: U.uScale, uWind: U.uWind, uOn: { value: 0 }, uPal: U.uPal, uTok: { value: P.i('smoke') } },
    vertexShader: 'attribute vec2 aS; uniform float uTime, uScale, uWind, uOn; varying float vA; void main(){ float f = fract(uTime * .07 + aS.x + aS.y * .13); vec3 p = position + vec3(f * f * 9. * (.4 + uWind), f * 9., sin(uTime + aS.y * 9.) * .4);\n' +
      ' vA = uOn * smoothstep(0., .12, f) * (1. - f) * .6; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? (1.5 + f * 4.5) * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uPal; uniform float uTok; varying float vA; void main(){ vec2 q = (gl_PointCoord - .5) * vec2(2.4, 1.7); float d = length(q); float a = 1. - smoothstep(.15, 1., d); gl_FragColor = vec4(texelFetch(uPal, ivec2(int(uTok + .5), 0), 0).rgb, a * vA * .8);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false
  });
  var smoke = new T.Points(smg, smokeM); smoke.name = 'rows-smoke'; smoke.frustumCulled = false; smoke.renderOrder = 4; ctx.scene.add(smoke);

  // --- pigeons on the ridges: they take off when a car passes below, and come back
  var pig = [], Rp = rng(13);
  [1, 4, 9, 12].forEach(function (bi) { var b = list[bi]; for (var k = 0; k < 4; k++) { var px_ = X(b.x + b.w * (0.25 + k * 0.15 + Rp() * 0.05)); pig.push({ home: [px_, b._yr + 0.35 * w, b._rz - 1.2], sx: EX + px_ * F / d, t: -1, dir: Rp() < 0.5 ? -1 : 1, ph: Rp() * 6, sp: 0.8 + Rp() * 0.4 }); } });
  var pgeo = new T.BufferGeometry(), ppos = new Float32Array(pig.length * 4 * 9);
  pgeo.setAttribute('position', new T.BufferAttribute(ppos, 3));
  var pmat = new T.MeshBasicMaterial({ color: 0x777777, side: T.DoubleSide }), pmesh = new T.Mesh(pgeo, pmat); pmesh.name = 'rows-pigeons'; pmesh.frustumCulled = false; ctx.scene.add(pmesh);
  var pc = new T.Color();
  pig.forEach(function (p, i) { p.grp = Math.floor(i / 4); });
  function pigeons(now, dt) {
    pc.set(P.css('roofL')); pmat.color.copy(pc).multiplyScalar(0.8);
    var o = 0, cars = ctx.carsSx || [];
    function tri(a, b, c) { ppos.set(a, o); ppos.set(b, o + 3); ppos.set(c, o + 6); o += 9; }
    pig.forEach(function (p) { if (p.t < 0 && p.cool <= 0) pig.forEach(function (q) { if (q.grp === p.grp && q.t > 0 && q.t < 0.4) { p.t = 0.01; } }); });
    pig.forEach(function (p) {
      if (p.t < 0) { p.cool = (p.cool || 0) - dt; if (p.cool <= 0) for (var j = 0; j < cars.length; j++) if (Math.abs(cars[j] - p.sx) < 10) { if (Rp() < 0.3) p.t = 0; else p.cool = 5; break; } }
      else { p.t += dt; if (p.t > 14) { p.t = -1; p.cool = 25; } }
      var hx = p.home[0], hy = p.home[1], hz = p.home[2], s = 0.55 * w;
      if (p.t < 0) {   // sitting: a plump body and a head
        var bob = Math.sin(now * 2 + p.ph) * 0.05 * w;
        tri([hx - 1.1 * s, hy + bob, hz], [hx + 0.9 * s, hy + bob, hz], [hx - 0.1 * s, hy + 1.1 * s + bob, hz]);
        tri([hx + 0.5 * s, hy + 0.8 * s + bob, hz], [hx + 1.2 * s, hy + 1.1 * s + bob, hz], [hx + 0.7 * s, hy + 1.6 * s + bob, hz]);
        tri([hx - 1.1 * s, hy + bob, hz], [hx - 1.8 * s, hy + 0.6 * s + bob, hz], [hx - 0.6 * s, hy + 0.5 * s + bob, hz]);
        for (var q = 0; q < 9; q++) ppos[o++] = 0;
      } else {         // flying: up and away, a loop, then home
        var f = p.t / 14, out = Math.sin(Math.min(1, f) * Math.PI), x = hx + p.dir * out * 40 * w * p.sp, y = hy + out * 26 * w + Math.sin(p.t * 1.7 + p.ph) * 2 * w, z = hz + out * 6;
        var fl = Math.sin(now * 16 + p.ph), sw = 1.6 * s;
        tri([x, y, z], [x - sw, y + fl * 0.9 * s, z], [x - 0.4 * sw, y - 0.3 * s, z]); tri([x, y, z], [x + sw, y + fl * 0.9 * s, z], [x + 0.4 * sw, y - 0.3 * s, z]);
        tri([x - 0.3 * s, y - 0.2 * s, z], [x + 0.3 * s, y - 0.2 * s, z], [x, y + 0.5 * s, z]); tri([x, y, z], [x, y, z], [x, y, z]);
      }
    });
    pgeo.attributes.position.needsUpdate = true;
  }

  return {
    bake: bake,
    update: function (st, now, dt) {
      // lights going out one by one after midnight, a few on again at dawn
      var mm = ctx.minutes == null ? 780 : ctx.minutes, n = 0;
      for (var i = 0; i < winList.length; i++) if (litAt(winList[i], mm)) n++;
      var k = n + '|' + (U.uPn.value > 0.5 ? 1 : 0);
      if (k !== litKey) { litKey = k; ctx.rowsDirty = true; }
      smokeM.uniforms.uOn.value = st.season === 'winter' ? 1 : 0; smoke.visible = st.season === 'winter';
      if (ctx.glowOp) ctx.glowOp.setX(phGlow, 0.9);
      pigeons(now, dt);
    }
  };
}

