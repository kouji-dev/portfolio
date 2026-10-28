import * as T from 'three';
import { gp } from '../core/view.js';
import { lerp } from '../core/util.js';
import { PB } from '../core/pb.js';
import { paintMaterial } from '../core/paint.js';

// ---------------------------------------------------------------- the bridge
export function buildBridge(ctx, pb) {
  var deck = [gp(398, 1046, 0.6), gp(462, 1046, 0.6), gp(508, 1128, 0.6), gp(352, 1128, 0.6)], WL = ctx.WL, P = ctx.P;
  ctx.bridgeInfo = { hw0: deck[1][0], hw1: deck[2][0], z0: deck[0][2], z1: deck[3][2] };
  var st = new PB(P), bal = new PB(P), z0 = deck[0][2], z1 = deck[3][2], n = 5;
  function hwAt(z) { return lerp(deck[1][0], deck[2][0], (z - z0) / (z1 - z0)); }
  // the road and its centre line
  pb.set('br', 'brS', null, 'brL', null, null, 0.75); pb.quad(deck[3], deck[2], deck[1], deck[0]);
  pb.set('roadL'); pb.beam([0, 0.64, z0 + 2], [0, 0.64, z1 - 1], 0.1);
  for (var zz = z0 + 4; zz < z1 - 4; zz += 6) pb.box(-0.12, 0.6, zz, 0.12, 0.66, zz + 3);
  // pavements with a kerb along both sides
  [-1, 1].forEach(function (sd) {
    var xa0 = sd * hwAt(z0), xa1 = sd * hwAt(z1), xi0 = xa0 - sd * 3.4, xi1 = xa1 - sd * 3.4;
    pb.set('paveL', 'pave', null, 'pave', null, null, 0.4);
    var q = [[xi0, 0.74, z0], [xa0, 0.74, z0], [xa1, 0.74, z1], [xi1, 0.74, z1]]; if (sd < 0) q = [q[1], q[0], q[3], q[2]]; pb.quad(q[3], q[2], q[1], q[0]);
    pb.set('path', 'qwS'); var k = [[xi0, 0.6, z0], [xi1, 0.6, z1], [xi1, 0.74, z1], [xi0, 0.74, z0]]; if (sd > 0) pb.quad(k[1], k[0], k[3], k[2]); else pb.quad(k[0], k[1], k[2], k[3]);
  });
  // the parapets: stone below, a balustrade of small posts above, a rail on top; the outer face goes down to the water
  [-1, 1].forEach(function (sd) {
    var o = sd * 0.8;
    for (var k = 0; k < 12; k++) {
      var za = lerp(z0, z1, k / 12), zb = lerp(z0, z1, (k + 1) / 12), xa = sd * hwAt(za), xb = sd * hwAt(zb), na = Math.round((zb - za) / 0.36);
      st.set('br', 'brS', null, null, 'lf2', 'mor');
      var f = [[xa + o, 0.1, za], [xb + o, 0.1, zb], [xb + o, 0.7, zb], [xa + o, 0.7, za]], uv = [za / 1.5, (0.1 + WL + 0.5) / 0.7, zb / 1.5, (0.1 + WL + 0.5) / 0.7, zb / 1.5, (0.7 + WL + 0.5) / 0.7, za / 1.5, (0.7 + WL + 0.5) / 0.7];
      if (sd > 0) st.quad(f[1], f[0], f[3], f[2], [uv[2], uv[3], uv[0], uv[1], uv[6], uv[7], uv[4], uv[5]]); else st.quad(f[0], f[1], f[2], f[3], uv);
      st.set('brL', 'brS'); st.box(Math.min(xa, xa + o) - 0.05, 0.6, za, Math.max(xa, xa + o) + 0.05, 0.82, zb);
      st.box(Math.min(xa, xa + o) - 0.05, 1.5, za, Math.max(xa, xa + o) + 0.05, 1.68, zb);
      bal.set('br', 'brS', 'brL', 'brS'); var xm = xa + o / 2, xm2 = xb + o / 2;
      bal.quad([xm, 0.82, za], [xm2, 0.82, zb], [xm2, 1.5, zb], [xm, 1.5, za], [0, 0, na, 0, na, 1, 0, 1]);
    }
  });
  // piers and arches under the deck, in stone; a stone eagle on each pier, outside the parapet
  st.set('br', 'brS', null, null, 'lf2', 'mor');
  for (var i = 0; i <= n; i++) {
    var z = lerp(z0, z1, i / n), hw = hwAt(z) - 0.4;
    st.boxW(-hw - 1.4, -WL - 1, z - 2, hw + 1.4, 0.55, z + 2, 1.2, 'fblr');
    [-1, 1].forEach(function (sd) {
      var ex = sd * (hwAt(z) + 1.6), ey = 1.7;
      pb.set('br', 'brS', 'brL'); pb.box(ex - 0.7, 0.55, z - 0.9, ex + 0.7, ey, z + 0.9);
      // a stone eagle: body, head and hooked beak turned outward, wings half open, tail feathers
      pb.set('brL', 'brS', 'brL');
      pb.blob(ex, ey + 0.6, z, 0.32, 0.55, 0.38, 1, 60 + i);
      pb.blob(ex + sd * 0.08, ey + 1.25, z, 0.2, 0.22, 0.2, 1, 70 + i); pb.beam([ex + sd * 0.2, ey + 1.25, z], [ex + sd * 0.42, ey + 1.12, z], 0.08, 0.02);
      [-1, 1].forEach(function (wz) {
        pb.tri([ex, ey + 1.0, z + wz * 0.15], [ex - sd * 0.15, ey + 1.55, z + wz * 0.85], [ex, ey + 0.35, z + wz * 0.45]);
        pb.tri([ex, ey + 1.0, z + wz * 0.15], [ex, ey + 0.35, z + wz * 0.45], [ex - sd * 0.15, ey + 1.55, z + wz * 0.85]);
        pb.tri([ex - sd * 0.15, ey + 1.55, z + wz * 0.85], [ex - sd * 0.1, ey + 0.75, z + wz * 1.05], [ex, ey + 0.35, z + wz * 0.45]);
        pb.tri([ex - sd * 0.15, ey + 1.55, z + wz * 0.85], [ex, ey + 0.35, z + wz * 0.45], [ex - sd * 0.1, ey + 0.75, z + wz * 1.05]);
      });
      pb.tri([ex - sd * 0.1, ey + 0.25, z - 0.18], [ex - sd * 0.1, ey + 0.25, z + 0.18], [ex - sd * 0.3, ey - 0.05, z]);
      pb.tri([ex - sd * 0.1, ey + 0.25, z + 0.18], [ex - sd * 0.1, ey + 0.25, z - 0.18], [ex - sd * 0.3, ey - 0.05, z]);
    });
  }
  for (i = 0; i < n; i++) {
    var za = lerp(z0, z1, i / n) + 2, zb = lerp(z0, z1, (i + 1) / n) - 2, hw2 = hwAt((za + zb) / 2) - 0.6;
    for (var k = 0; k < 10; k++) {
      var t0 = k / 10, t1 = (k + 1) / 10, y0 = -WL + Math.sin(t0 * Math.PI) * (WL - 0.7), y1 = -WL + Math.sin(t1 * Math.PI) * (WL - 0.7), zA = lerp(za, zb, t0), zB = lerp(za, zb, t1);
      [-1, 1].forEach(function (sd) { var x = sd * (hw2 + 1.4), U0 = [zA / 1.2, (y0 + WL + 0.5) / 0.7], U1 = [zB / 1.2, (y1 + WL + 0.5) / 0.7], UT = (0.55 + WL + 0.5) / 0.7;
        if (sd > 0) st.quad([x, y0, zA], [x, y1, zB], [x, 0.55, zB], [x, 0.55, zA], [U0[0], U0[1], U1[0], U1[1], U1[0], UT, U0[0], UT]);
        else st.quad([x, y1, zB], [x, y0, zA], [x, 0.55, zA], [x, 0.55, zB], [U1[0], U1[1], U0[0], U0[1], U0[0], UT, U1[0], UT]); });
      st.quad([-hw2 - 1.4, y0, zA], [hw2 + 1.4, y0, zA], [hw2 + 1.4, y1, zB], [-hw2 - 1.4, y1, zB], [0, 0, 20, 0, 20, 1, 0, 1]); st.quad([-hw2 - 1.4, y1, zB], [hw2 + 1.4, y1, zB], [hw2 + 1.4, y0, zA], [-hw2 - 1.4, y0, zA], [0, 0, 20, 0, 20, 1, 0, 1]);
    }
  }
  var ms = new T.Mesh(st.geo(), paintMaterial(ctx.U, { pat: 'quay' })), mb = new T.Mesh(bal.geo(), paintMaterial(ctx.U, { pat: 'balus', side: T.DoubleSide }));
  ms.name = 'bridge-stone'; mb.name = 'bridge-balustrade'; [ms, mb].forEach(function (m) { m.castShadow = true; m.receiveShadow = true; ctx.scene.add(m); });
  ctx.bridgeHw = hwAt; ctx.bridgeZ = [z0, z1];
}


