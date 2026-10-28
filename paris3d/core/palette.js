import * as T from 'three';

// ---------------------------------------------------------------- palette: the painting's colour tokens, live from CSS
export function Palette(names, el) {
  var n = names.length, self = this;
  this.names = names; this.idx = {}; names.forEach(function (k, i) { self.idx[k] = i; });
  this.data = new Float32Array(n * 4); this.cur = []; this.tgt = []; this.hex = {};
  for (var i = 0; i < n; i++) { this.cur.push(new T.Color(1, 0, 1)); this.tgt.push(new T.Color(1, 0, 1)); }
  this.tex = new T.DataTexture(this.data, n, 1, T.RGBAFormat, T.FloatType);
  this.tex.minFilter = this.tex.magFilter = T.NearestFilter; this.tex.needsUpdate = true;
  this.el = el; this.first = true; this.moving = false;
}
Palette.prototype.read = function () {
  var cs = getComputedStyle(this.el), ch = false;
  for (var i = 0; i < this.names.length; i++) {
    var v = cs.getPropertyValue('--c-' + this.names[i]).trim();
    if (v && v !== this.hex[this.names[i]]) { this.hex[this.names[i]] = v; this.tgt[i].set(v); ch = true; }
  }
  if (this.first) { for (i = 0; i < this.cur.length; i++) this.cur[i].copy(this.tgt[i]); this.first = false; this.write(); return true; }
  if (ch) this.moving = true;
  return ch;
};
Palette.prototype.step = function (dt) {
  if (!this.moving) return false;
  var k = 1 - Math.exp(-dt * 3.2), done = true;
  for (var i = 0; i < this.cur.length; i++) {
    var c = this.cur[i], t = this.tgt[i];
    c.r += (t.r - c.r) * k; c.g += (t.g - c.g) * k; c.b += (t.b - c.b) * k;
    if (Math.abs(t.r - c.r) + Math.abs(t.g - c.g) + Math.abs(t.b - c.b) > 0.002) done = false; else c.copy(t);
  }
  if (done) this.moving = false;
  this.write(); return true;
};
Palette.prototype.snap = function () { for (var i = 0; i < this.cur.length; i++) this.cur[i].copy(this.tgt[i]); this.moving = false; this.write(); };
Palette.prototype.write = function () {
  for (var i = 0; i < this.cur.length; i++) { var c = this.cur[i]; this.data[i * 4] = c.r; this.data[i * 4 + 1] = c.g; this.data[i * 4 + 2] = c.b; this.data[i * 4 + 3] = 1; }
  this.tex.needsUpdate = true;
};
Palette.prototype.i = function (name) { var v = this.idx[name]; return v == null ? -1 : v; };
Palette.prototype.css = function (name) { var i = this.idx[name]; return i == null ? '#ff00ff' : '#' + this.cur[i].getHexString(); };
