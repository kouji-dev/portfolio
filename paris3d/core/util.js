import * as T from 'three';

// ---------------------------------------------------------------- helpers
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function rng(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function canvasTex(w, h, srgb) {
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4;
  return { c: c, g: c.getContext('2d'), t: t };
}
// a painted scratch: a thin lens, like the painting's sliver()
export function sliver(g, x, y, len, ang, w) {
  var dx = Math.cos(ang) * len, dy = Math.sin(ang) * len, px = -Math.sin(ang) * w, py = Math.cos(ang) * w;
  g.beginPath(); g.moveTo(x, y);
  g.quadraticCurveTo(x + dx / 2 + px, y + dy / 2 + py, x + dx, y + dy);
  g.quadraticCurveTo(x + dx / 2 + px * 0.3, y + dy / 2 + py * 0.3, x, y);
  g.fill();
}
