import * as T from 'three';
import { rng, lerp } from '../core/util.js';
import { at, uu, gp, ZC, dOf, TW_U, EX, F } from '../core/view.js';
// ---------------------------------------------------------------- glints: 4-point star sparkles where light catches (water, gold, glass)
export function buildGlints(ctx) {
  var U = ctx.U, R = rng(61), pos = [], aS = [], aP = [], aK = [];
  function add(p, size, kind) { pos.push(p[0], p[1], p[2]); aS.push(size); aP.push(R() * 100); aK.push(kind); }
  // the Seine, from the far quay to the near one
  for (var i = 0; i < 160; i++) { var y = 1046 + R() * 76, d = ctx.waterD(y), x = -60 + R() * 940; add(at(x, y, d).map(function (v, k) { return k === 1 ? -ctx.WL + 0.05 : v; }), 16 * uu(d), 0); }
  // the basin
  for (i = 0; i < 70; i++) { var y2 = 1180 + R() * 300, t = (y2 - 1176) / 324, x2 = lerp(318 - 172 * t, 542 + 172 * t, R()), p = gp(x2, y2, ctx.BWL * -1 + 0.05); add(p, 20 * uu(ZC - p[2]), 0); }
  // gold on Les Invalides, glass on the boats and the tower's beacon
  var dI = dOf(990);
  for (i = 0; i < 10; i++) add(at(92 + R() * 24, 900 + R() * 44, dI - 26), 12 * uu(dI), 1);
  var u = TW_U; add([0, 559 / 1.858, 5 * u], 30 * u, 1);
  (ctx.twGlints || []).forEach(function (p) { add(p, 22 * u, 1); });
  var g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aS', new T.Float32BufferAttribute(aS, 1));
  g.setAttribute('aP', new T.Float32BufferAttribute(aP, 1)); g.setAttribute('aK', new T.Float32BufferAttribute(aK, 1));
  var m = new T.ShaderMaterial({
    uniforms: { uTime: U.uTime, uScale: U.uScale, uPn: U.uPn, uGlint: U.uGlint, uMap: { value: ctx.tex.star }, uQ: U.uQ, uWet: { value: 0 }, uPal: U.uPal, uTok: { value: ctx.P.i('seaH') } },
    vertexShader: 'attribute float aS, aP, aK; uniform float uTime, uScale, uPn, uGlint, uQ; varying float vA;\n' +
      'void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; vec4 q = projectionMatrix * (mv + vec4(0., 0., 6., 0.)); gl_Position.z = q.z / q.w * gl_Position.w; float d = ' + ZC.toFixed(1) + ' - position.z;\n' +
      ' float sx = ' + EX.toFixed(1) + ' + position.x * ' + F.toFixed(1) + ' / d; float near = exp(-pow((sx - uGlint) / 170., 2.));\n' +
      ' float day = 1. - uPn; float w = aK < .5 ? day * (.25 + .75 * near) + uPn * .7 * near : aK < 1.5 ? day : 1.;\n' +
      ' float tw = pow(max(0., sin(uTime * (1.3 + fract(aP) * 2.) + aP)), 8.); vA = w * tw * step(fract(aP * 7.3), uQ);\n' +
      ' gl_PointSize = vA > .01 ? aS * (.6 + .6 * tw) * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uMap, uPal; uniform float uTok; varying float vA; void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(mix(texelFetch(uPal, ivec2(int(uTok + .5), 0), 0).rgb, vec3(1.), .5), t.a * vA);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false
  });
  var pts = new T.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 8; ctx.scene.add(pts);
  m.pts = pts; return m;
}

