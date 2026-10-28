import * as T from 'three';
import { rng } from './util.js';

// ---------------------------------------------------------------- geometry builder with per-vertex colour tokens
// aTok = (base, shade, lit, strokes R), aTok2 = (strokes G, dots B), aScr = stroke strength
export function PB(P) { this.P = P; this.p = []; this.n = []; this.uv = []; this.t = []; this.t2 = []; this.s = []; this.ix = []; this.v = 0; this.set('h1'); }
PB.prototype.set = function (base, shade, lit, r, g, b, scr) {
  var P = this.P;
  this.tk = [P.i(base), P.i(shade || base), lit ? P.i(lit) : -1, r ? P.i(r) : -1];
  this.tk2 = [g ? P.i(g) : -1, b ? P.i(b) : -1]; this.sc = scr == null ? (r || g || b ? 0.85 : 0) : scr;
  return this;
};
PB.prototype.vert = function (q, nx, ny, nz, u, v) {
  this.p.push(q[0], q[1], q[2]); this.n.push(nx, ny, nz); this.uv.push(u, v);
  this.t.push(this.tk[0], this.tk[1], this.tk[2], this.tk[3]); this.t2.push(this.tk2[0], this.tk2[1]); this.s.push(this.sc);
};
PB.prototype.quad = function (a, b, c, d, uv) {
  var ex = c[0] - a[0], ey = c[1] - a[1], ez = c[2] - a[2], fx = d[0] - b[0], fy = d[1] - b[1], fz = d[2] - b[2];
  var nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  nx /= l; ny /= l; nz /= l; uv = uv || [0, 0, 1, 0, 1, 1, 0, 1];
  this.vert(a, nx, ny, nz, uv[0], uv[1]); this.vert(b, nx, ny, nz, uv[2], uv[3]); this.vert(c, nx, ny, nz, uv[4], uv[5]); this.vert(d, nx, ny, nz, uv[6], uv[7]);
  var v = this.v; this.ix.push(v, v + 1, v + 2, v, v + 2, v + 3); this.v += 4;
};
PB.prototype.tri = function (a, b, c) {
  var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  this.vert(a, nx / l, ny / l, nz / l, 0, 0); this.vert(b, nx / l, ny / l, nz / l, 1, 0); this.vert(c, nx / l, ny / l, nz / l, 0, 1);
  this.ix.push(this.v, this.v + 1, this.v + 2); this.v += 3;
};
PB.prototype.box = function (x0, y0, z0, x1, y1, z1, faces) {
  faces = faces || 'fbrlt';
  if (faces.indexOf('f') >= 0) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
  if (faces.indexOf('b') >= 0) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
  if (faces.indexOf('r') >= 0) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
  if (faces.indexOf('l') >= 0) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  if (faces.indexOf('t') >= 0) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
  if (faces.indexOf('u') >= 0) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
};
PB.prototype.beam = function (p0, p1, r, r1) {
  r1 = r1 == null ? r : r1;
  var dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2], l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  dx /= l; dy /= l; dz /= l;
  var ux = 0, uy = 1, uz = 0; if (Math.abs(dy) > 0.9) { ux = 1; uy = 0; }
  var sx = dy * uz - dz * uy, sy = dz * ux - dx * uz, sz = dx * uy - dy * ux, sl = Math.sqrt(sx * sx + sy * sy + sz * sz);
  sx /= sl; sy /= sl; sz /= sl;
  var tx = sy * dz - sz * dy, ty = sz * dx - sx * dz, tz = sx * dy - sy * dx, O = [[1, 1], [-1, 1], [-1, -1], [1, -1]], A = [], B = [];
  for (var k = 0; k < 4; k++) {
    var a = O[k][0], b = O[k][1];
    A.push([p0[0] + (sx * a + tx * b) * r, p0[1] + (sy * a + ty * b) * r, p0[2] + (sz * a + tz * b) * r]);
    B.push([p1[0] + (sx * a + tx * b) * r1, p1[1] + (sy * a + ty * b) * r1, p1[2] + (sz * a + tz * b) * r1]);
  }
  for (k = 0; k < 4; k++) { var k1 = (k + 1) % 4; this.quad(A[k1], A[k], B[k], B[k1]); }
};
// a lumpy sphere with smooth normals
PB.prototype.blob = function (cx, cy, cz, rx, ry, rz, det, seed) {
  var g = new T.IcosahedronGeometry(1, det == null ? 2 : det), p = g.attributes.position, R = rng(seed || 1), ph = R() * 6;
  for (var i = 0; i < p.count; i += 3) {
    var vs = [];
    for (var k = 0; k < 3; k++) {
      var x = p.getX(i + k), y = p.getY(i + k), z = p.getZ(i + k), m = 1 + 0.07 * Math.sin(x * 4 + ph) * Math.sin(y * 5 + ph) * Math.sin(z * 4.5);
      vs.push([cx + x * rx * m, cy + y * ry * m, cz + z * rz * m, x, y, z]);
    }
    for (k = 0; k < 3; k++) this.vert(vs[k], vs[k][3], vs[k][4], vs[k][5], 0, 0);
    this.ix.push(this.v, this.v + 1, this.v + 2); this.v += 3;
  }
  g.dispose();
};
PB.prototype.cyl = function (x, y, z, r0, r1, h, seg, axis) {
  seg = seg || 8;
  for (var i = 0; i < seg; i++) {
    var a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    if (axis === 'z') this.quad([x + c1 * r0, y + s1 * r0, z], [x + c0 * r0, y + s0 * r0, z], [x + c0 * r1, y + s0 * r1, z + h], [x + c1 * r1, y + s1 * r1, z + h]);
    else this.quad([x + c1 * r0, y, z + s1 * r0], [x + c0 * r0, y, z + s0 * r0], [x + c0 * r1, y + h, z + s0 * r1], [x + c1 * r1, y + h, z + s1 * r1]);
  }
};
PB.prototype.geo = function () {
  var g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3));
  g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(this.uv, 2));
  g.setAttribute('aTok', new T.Float32BufferAttribute(this.t, 4));
  g.setAttribute('aTok2', new T.Float32BufferAttribute(this.t2, 2));
  g.setAttribute('aScr', new T.Float32BufferAttribute(this.s, 1));
  g.setIndex(this.v > 65535 ? new T.Uint32BufferAttribute(this.ix, 1) : new T.Uint16BufferAttribute(this.ix, 1));
  g.computeBoundingSphere();
  return g;
};
