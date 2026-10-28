import * as T from 'three';
import { paintMaterial } from '../core/paint.js';
import { PB } from '../core/pb.js';
import { uu, F, EX } from '../core/view.js';
// ---------------------------------------------------------------- the bateau-mouche cruising downstream, slipping under the bridge
export function buildCruiser(ctx) {
  var P = ctx.P, pb = new PB(P), win = new PB(P), fl = new PB(P), y0 = 1104, d = ctx.waterD(y0), w = uu(d), Y = -ctx.WL, L_ = 130 * w, dep = 7;
  pb.set('bh'); pb.box(0, Y - 0.5, -dep, L_, Y + 0.9, 0);
  pb.quad([L_, Y - 0.5, 0], [L_ + 11 * w, Y + 0.9, -dep / 2], [L_ + 11 * w, Y + 0.9, -dep / 2], [L_, Y + 0.9, 0]);
  pb.set('white'); pb.box(0, Y + 0.72, -0.02, L_, Y + 0.9, 0.06);
  pb.set('bc'); pb.box(9 * w, Y + 0.9, -dep + 0.6, 121 * w, Y + 2.0, -0.4);
  pb.set('roofL', 'roofL', 'white'); pb.box(12 * w, Y + 2.0, -dep + 0.8, 120 * w, Y + 2.15, -0.6);
  // the captain's cabin at the bow, with a light; a flag at the stern
  pb.set('bc'); pb.box(112 * w, Y + 2.15, -dep * 0.7, 124 * w, Y + 3.1, -dep * 0.3);
  win.set('bc', 'bc', null, 'ink', 'bw', 'ink'); win.sc = 98; win.quad([113 * w, Y + 2.35, -dep * 0.3 + 0.02], [123 * w, Y + 2.35, -dep * 0.3 + 0.02], [123 * w, Y + 2.95, -dep * 0.3 + 0.02], [113 * w, Y + 2.95, -dep * 0.3 + 0.02], [0, 0, 1, 0, 1, 1, 0, 1]);
  pb.set('iron'); pb.beam([3 * w, Y + 0.9, -dep / 2], [3 * w, Y + 3.6, -dep / 2], 0.05);
  ['sea', 'white', 'red'].forEach(function (tk, j) { fl.set(tk); fl.quad([3 * w - j * 0.45, Y + 2.8, -dep / 2], [3 * w - (j + 1) * 0.45, Y + 2.8, -dep / 2 + (j % 2 ? 0.08 : -0.08)], [3 * w - (j + 1) * 0.45, Y + 3.55, -dep / 2 + (j % 2 ? 0.08 : -0.08)], [3 * w - j * 0.45, Y + 3.55, -dep / 2], [0, 0, 1, 0, 1, 1, 0, 1]); });
  // windows with passengers behind the glass, some waving
  for (var k = 0; k < 11; k++) { var x = (18 + k * 9) * w; win.sc = k; win.quad([x, Y + 1.0, -0.35], [x + 7 * w, Y + 1.0, -0.35], [x + 7 * w, Y + 1.85, -0.35], [x, Y + 1.85, -0.35], [k, 0, k + 1, 0, k + 1, 1, k, 1]); }
  var g = new T.Mesh(pb.geo(), ctx.mats.paint), wm = new T.Mesh(win.geo(), paintMaterial(ctx.U, { pat: 'pax' })), fm = new T.Mesh(fl.geo(), paintMaterial(ctx.U, { side: T.DoubleSide, vkey: 'flag', vsnip: '\ntransformed.z += sin(uTime * 6. + position.x * 4.) * .08 * uv.x;' }));
  [g, wm].forEach(function (m) { m.castShadow = true; m.receiveShadow = true; });
  var grp = new T.Group(); grp.add(g, wm, fm); grp.name = 'cruiser'; ctx.scene.add(grp);
  var z = ctx.waterZ(y0) - 0.5, gi = ctx.glows.add([0, Y + 1.4, z + 1], 170 * w, '#ffd38a', 0.28), span = 1100 * d / F, start = (-160 - EX) * d / F;
  var nav = [ctx.glows.add([0, 0, 0], 3.5, '#5dff8a', 1), ctx.glows.add([0, 0, 0], 3, '#ffffff', 0.9), ctx.glows.add([0, 0, 0], 4.5, '#ffd38a', 0.9), ctx.glows.add([0, 0, 0], 3.5, '#ff4a5a', 1)];
  // a white glint running along the glass roof by day
  var gl = new T.Points(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([0, 0, 0], 3)), new T.ShaderMaterial({
    uniforms: { uMap: { value: ctx.tex.star }, uScale: ctx.U.uScale, uA: { value: 0 } },
    vertexShader: 'uniform float uScale, uA; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vec4 q = projectionMatrix * (mv + vec4(0., 0., 4., 0.)); gl_Position = projectionMatrix * mv; gl_Position.z = q.z / q.w * gl_Position.w; vA = uA; gl_PointSize = vA > .01 ? 4.5 * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uMap; varying float vA; void main(){ gl_FragColor = vec4(1., 1., 1., texture2D(uMap, gl_PointCoord).a * vA);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false
  })); gl.frustumCulled = false; gl.renderOrder = 8; gl.name = 'cruiser-glint'; ctx.scene.add(gl);
  return {
    update: function (time, glowPos, st) {
      var t = (time / 150) % 1, xx = start + span * t;
      grp.position.set(xx, Math.sin(time * 1.4) * 0.05, z); ctx.U.uBoat.value.set(xx + L_ + 11 * w, z - dep / 2, L_, 1);
      glowPos.setXYZ(gi, xx + L_ / 2, Y + 1.4, z + 1);
      glowPos.setXYZ(nav[0], xx + L_ + 4 * w, Y + 1.5, z + 0.3); glowPos.setXYZ(nav[1], xx + 3 * w, Y + 3.7, z - dep / 2); glowPos.setXYZ(nav[2], xx + 118 * w, Y + 2.65, z - dep * 0.3 + 0.4); glowPos.setXYZ(nav[3], xx + L_ + 2 * w, Y + 1.5, z - dep + 0.2);
      var gx = 12 * w + ((time * 0.11) % 1) * 108 * w; gl.geometry.attributes.position.setXYZ(0, xx + gx, Y + 2.2, z - 0.6); gl.geometry.attributes.position.needsUpdate = true;
      gl.material.uniforms.uA.value = st ? (1 - st.pn) * (0.6 + 0.4 * Math.sin(time * 3)) : 0;
    }
  };
}


