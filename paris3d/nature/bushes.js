import * as T from 'three';
import { dOf, gp, at, uu } from '../core/view.js';
import { lerp, rng } from '../core/util.js';
import { PB } from '../core/pb.js';
import { paintMaterial } from '../core/paint.js';
import { clumps } from './trees.js';

// ---------------------------------------------------------------- bushes and flowerbeds
export function buildBushes(ctx) {
  var P = ctx.P, U = ctx.U, scene = ctx.scene, pb = new PB(P), R = rng(47);
  var CLUMPS = clumps();
  var ico = new T.IcosahedronGeometry(1, 3), ip = ico.attributes.position;
  ctx.L.bush.forEach(function (b, i) {
    var d = dOf(b[1] + b[3] * 0.7), w = uu(d), c = at(b[0], b[1], d), flower = /^(br1|bp1|by1|fr|fp)$/.test(b[4]);
    pb.set(b[4], b[4], b[5], b[5], null, 'dot', flower ? 1 : 0);
    var shape = CLUMPS[i % CLUMPS.length], rx = b[2] * w, ry = b[3] * w * 1.1, rz = b[2] * w * 0.7;
    for (var q = 0; q < ip.count; q += 3) {
      for (var k = 0; k < 3; k++) { var v = shape[q + k], nl = Math.hypot(v[0], v[1], v[2]); pb.vert([c[0] + v[0] * rx, Math.max(c[1] - 1 * w + v[1] * ry, -0.2), c[2] + v[2] * rz], v[0] / nl, v[1] / nl, v[2] / nl, 0, 0); }
      pb.ix.push(pb.v, pb.v + 1, pb.v + 2); pb.v += 3;
    }
    ctx.contacts.push([c[0], c[2], b[2] * w * 1.15, b[2] * w * 0.8]);
    (ctx.bushPos = ctx.bushPos || []).push([c[0], c[1] + ry * 0.6, c[2], rx]);
  });
  ico.dispose();
  var m = new T.Mesh(pb.geo(), paintMaterial(U, { sway: 'bush', pat: 'bush' })); m.castShadow = true; m.receiveShadow = true; m.name = 'bushes'; scene.add(m);
  // low clipped hedges with crisp ink tops along the outer edges of the garden paths
  var hg = new PB(P); hg.set('bg1', 'lf3', 'bgH', 'ink');
  (ctx.gardenPaths || []).forEach(function (pp, j) {
    var outer = j === 0 || j === 3; if (!outer) return;
    var a = gp(pp[0][0], pp[0][1]), b = gp(pp[1][0], pp[1][1]), n = 14, side = j === 0 ? -1 : 1;
    for (var k = 0; k < n; k++) {
      if (k % 5 === 4) continue;   // gaps for the gardeners
      var t0 = k / n + 0.01, t1 = (k + 1) / n - 0.01, p0 = [lerp(a[0], b[0], t0), lerp(a[2], b[2], t0)], p1 = [lerp(a[0], b[0], t1), lerp(a[2], b[2], t1)];
      var dx = p1[0] - p0[0], dz = p1[1] - p0[1], l = Math.hypot(dx, dz), nx = -dz / l * side, nz = dx / l * side, o = 1.1, wdt = 0.9, h = 0.85;
      var A = [p0[0] + nx * o, p0[1] + nz * o], B = [p1[0] + nx * o, p1[1] + nz * o], C = [p1[0] + nx * (o + wdt), p1[1] + nz * (o + wdt)], D = [p0[0] + nx * (o + wdt), p0[1] + nz * (o + wdt)];
      var sides = [[A, B], [B, C], [C, D], [D, A]];
      sides.forEach(function (sd) { var p = sd[0], q2 = sd[1]; hg.quad([p[0], 0.05, p[1]], [q2[0], 0.05, q2[1]], [q2[0], h, q2[1]], [p[0], h, p[1]], [0, 0, 1, 0, 1, 1, 0, 1]); hg.quad([q2[0], 0.05, q2[1]], [p[0], 0.05, p[1]], [p[0], h, p[1]], [q2[0], h, q2[1]], [0, 0, 1, 0, 1, 1, 0, 1]); });
      hg.quad([A[0], h, A[1]], [B[0], h, B[1]], [C[0], h, C[1]], [D[0], h, D[1]], [0, 1, 1, 1, 1, 1, 0, 1]); hg.quad([D[0], h, D[1]], [C[0], h, C[1]], [B[0], h, B[1]], [A[0], h, A[1]], [0, 1, 1, 1, 1, 1, 0, 1]);
    }
  });
  var hm = new T.Mesh(hg.geo(), paintMaterial(U, { pat: 'hedge' })); hm.castShadow = true; hm.receiveShadow = true; hm.name = 'hedges'; scene.add(hm);
}
