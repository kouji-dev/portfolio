import * as T from 'three';
import { lerp, rng, canvasTex, sliver } from './util.js';

// ---------------------------------------------------------------- textures
// scratch strokes in three channels (two stroke sets and a set of dots), tiled in a screen-like space anchored to the world
export function scratchTexture() {
  var S = canvasTex(512, 512, false), g = S.g, R = rng(5);
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512); g.globalCompositeOperation = 'lighter';
  function set(col, n, ang0, ang1, l0, l1, w0, w1) {
    g.fillStyle = col;
    for (var i = 0; i < n; i++) {
      var x = R() * 512, y = R() * 512, l = lerp(l0, l1, R()), a = lerp(ang0, ang1, R()), w = lerp(w0, w1, R());
      for (var ox = -512; ox <= 512; ox += 512) for (var oy = -512; oy <= 512; oy += 512) sliver(g, x + ox, y + oy, l, a, w);
    }
  }
  set('#ff0000', 70, -0.36, -0.12, 40, 150, 2.4, 6);
  set('#00ff00', 46, -0.3, 0.08, 34, 120, 2.2, 5);
  g.fillStyle = '#0000ff';
  for (var i = 0; i < 90; i++) { var x = R() * 512, y = R() * 512, r = 1.5 + R() * 3; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); }
  return S.t;
}
// water: long horizontal slivers (light, dark, bright) like the painted Seine
export function waterTexture() {
  var S = canvasTex(512, 512, false), g = S.g, R = rng(7);
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512); g.globalCompositeOperation = 'lighter';
  [['#ff0000', 90], ['#00ff00', 60], ['#0000ff', 30]].forEach(function (p) {
    g.fillStyle = p[0];
    for (var i = 0; i < p[1]; i++) {
      var x = R() * 512, y = R() * 512, l = 40 + R() * 200, a = (R() - 0.5) * 0.06, w = 1.4 + R() * 3.6;
      for (var ox = -512; ox <= 512; ox += 512) for (var oy = -512; oy <= 512; oy += 512) sliver(g, x + ox, y + oy, l, a, w);
    }
  });
  return S.t;
}
export function radialTexture(stops) {
  var S = canvasTex(128, 128, true), g = S.g, gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); S.t.wrapS = S.t.wrapT = T.ClampToEdgeWrapping;
  return S.t;
}

export function starTexture() {
  var S = canvasTex(64, 64, true), g = S.g; S.t.wrapS = S.t.wrapT = T.ClampToEdgeWrapping;
  var d = g.createImageData(64, 64), px = d.data;
  for (var y = 0; y < 64; y++) for (var x = 0; x < 64; x++) {
    var dx = (x + 0.5 - 32) / 32, dy = (y + 0.5 - 32) / 32, ax = Math.abs(dx), ay = Math.abs(dy);
    // two long arms (a cross), two short diagonal ones, a soft core
    var c1 = Math.max(0, 1 - ay / (0.09 * (1 - ax) + 0.005)) * (1 - ax), c2 = Math.max(0, 1 - ax / (0.09 * (1 - ay) + 0.005)) * (1 - ay);
    var u = (dx + dy) * 0.7071, v = (dx - dy) * 0.7071, au = Math.abs(u), av = Math.abs(v);
    var c3 = Math.max(0, 1 - av / (0.05 * (1 - au / 0.45) + 0.004)) * Math.max(0, 1 - au / 0.45), c4 = Math.max(0, 1 - au / (0.05 * (1 - av / 0.45) + 0.004)) * Math.max(0, 1 - av / 0.45);
    var core = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 0.28);
    var a = Math.min(1, Math.max(c1, c2, c3 * 0.8, c4 * 0.8) + core * core);
    var o = (y * 64 + x) * 4; px[o] = px[o + 1] = px[o + 2] = 255; px[o + 3] = Math.round(a * 255);
  }
  g.putImageData(d, 0, 0);
  return S.t;
}
