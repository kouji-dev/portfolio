import * as T from 'three';
import { gp } from '../core/view.js';
import { lerp, rng } from '../core/util.js';
import { PB } from '../core/pb.js';
import { paintMaterial } from '../core/paint.js';

// ---------------------------------------------------------------- life in the gardens: bees and butterflies, grass tufts, sprinklers with a rainbow,
// benches and garden chairs, a reader now and then, pigeons
export function buildGardenLife(ctx) {
  var P = ctx.P, U = ctx.U, scene = ctx.scene, R = rng(53), bp = ctx.bushPos || [];
  // bees and butterflies
  var ip = [], ia = [];
  bp.forEach(function (b, i) { if (i % 2) return; for (var k = 0; k < 3; k++) { ip.push(b[0], b[1], b[2]); ia.push(R() * 6.28, k === 0 ? 1 : 0, b[3], R()); } });
  var ig = new T.BufferGeometry(); ig.setAttribute('position', new T.Float32BufferAttribute(ip, 3)); ig.setAttribute('aI', new T.Float32BufferAttribute(ia, 4));
  var insM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uOn: { value: 0 }, uPal: U.uPal, uTok: { value: new T.Vector3(P.i('petal'), P.i('fc'), P.i('white')) } },
    vertexShader: 'attribute vec4 aI; uniform float uTime, uScale, uOn; varying float vB, vF, vK; void main(){ float t = uTime * (aI.y > .5 ? .5 : 1.6) + aI.x; vec3 p = position + vec3(cos(t) * aI.z * 1.3, .5 + sin(t * 2.3) * .4 + aI.y * .8, sin(t * 1.3) * aI.z * .9);\n' +
      ' vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; vB = aI.y; vK = aI.w; vF = abs(sin(uTime * (aI.y > .5 ? 9. : 40.) + aI.x)); gl_PointSize = uOn > .5 ? (aI.y > .5 ? 1.1 : .45) * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uPal; uniform vec3 uTok; varying float vB, vF, vK; vec3 pal(float i){ return texelFetch(uPal, ivec2(int(i + .5), 0), 0).rgb; } void main(){ vec2 q = gl_PointCoord - .5; vec3 c;\n' +
      ' if (vB > .5) { vec2 w = vec2(abs(q.x) / max(.15, vF), q.y); float wing = length((w - vec2(.25, -.08)) / vec2(.26, .2)) - 1.; float wing2 = length((w - vec2(.2, .17)) / vec2(.18, .14)) - 1.; float body = length(q / vec2(.04, .22)) - 1.; if (min(min(wing, wing2), body) > 0.) discard; c = body < 0. ? vec3(.15) : (vK < .5 ? pal(uTok.x) : vK < .8 ? pal(uTok.y) : pal(uTok.z)); if (min(wing, wing2) < 0. && min(wing, wing2) > -.25) c *= .7; }\n' +
      ' else { float body = length(q / vec2(.3, .2)) - 1.; float wings = length((vec2(abs(q.x), q.y) - vec2(.08, .2)) / vec2(.16, .14 * (.6 + .4 * vF))) - 1.; if (min(body, wings) > 0.) discard; c = body < 0. ? (step(.5, fract((q.x + .3) * 5.)) > .5 ? vec3(.12) : vec3(1., .78, .15)) : vec3(.9, .95, 1.); }\n' +
      ' gl_FragColor = vec4(c, 1.);\n#include <colorspace_fragment>\n}', transparent: false });
  var ins = new T.Points(ig, insM); ins.frustumCulled = false; ins.name = 'bees-butterflies'; scene.add(ins);
  // grass tufts in 3D near the bottom of the view, swaying
  var tuft = new PB(P); tuft.set('lawnL', 'lawnD', 'lawnL');
  for (var k = 0; k < 7; k++) { var a = k / 7 * 3.14, h = 0.45 + R() * 0.35, lean = (R() - 0.5) * 0.3; var x0 = (k - 3) * 0.05; tuft.quad([x0 - 0.035, 0, 0], [x0 + 0.035, 0, 0], [x0 + Math.cos(a) * 0.12 + lean, h, Math.sin(a) * 0.05], [x0 + Math.cos(a) * 0.12 + lean - 0.002, h, Math.sin(a) * 0.05], [0, 0, 1, 0, 1, 1, 0, 1]); }
  var tg = tuft.geo(), N = 260, tm = new T.InstancedMesh(tg, paintMaterial(U, { sway: 'grass', side: T.DoubleSide }), N), Mx = new T.Matrix4(), Qx = new T.Quaternion(), Vx = new T.Vector3(), Sx = new T.Vector3(), Yx = new T.Vector3(0, 1, 0), placed = 0;
  while (placed < N) { var x = (R() - 0.5) * 70, z = 520 + R() * 70, onLawn = Math.abs(x) > 8 + (z - 470) * 0.0 && !(Math.abs(x) < 22 && z < 560); if (!onLawn) { if (R() < 0.98) continue; } Qx.setFromAxisAngle(Yx, R() * 6.28); Vx.set(x, 0.05, z); Sx.setScalar(1.6 + R() * 1.4); Mx.compose(Vx, Qx, Sx); tm.setMatrixAt(placed++, Mx); }
  tm.name = 'grass-tufts'; tm.receiveShadow = true; scene.add(tm);
  // sprinklers on summer mornings, with a small rainbow in the spray
  var spr = new T.Group(); spr.name = 'sprinklers'; scene.add(spr);
  var sp = [], sa = [];
  [gp(40, 1260), gp(820, 1260)].forEach(function (p, j) { for (var k = 0; k < 140; k++) { sp.push(p[0], 0.1, p[2]); sa.push(R(), R(), j, 0); } });
  var sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3)); sg.setAttribute('aS', new T.Float32BufferAttribute(sa, 4));
  var sprM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale },
    vertexShader: 'attribute vec4 aS; uniform float uTime, uScale; varying float vA; void main(){ float sweep = sin(uTime * .8 + aS.z * 2.) * 1.1; float t = fract(aS.x + uTime * .7); float ang = sweep + (aS.y - .5) * .2; vec3 v = vec3(cos(ang) * 6., 6.5, sin(ang) * 3.) * (.9 + aS.y * .2);\n' +
      ' vec3 p = position + v * t + vec3(0., -9.8 * t * t * .9, 0.); vA = (1. - t) * .85; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = .22 * uScale / max(-mv.z, 1.); }',
    fragmentShader: 'varying float vA; void main(){ float d = length(gl_PointCoord - .5) * 2.; if (d > 1.) discard; gl_FragColor = vec4(.88, .95, 1., vA * (1. - d * d));\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  spr.add(new T.Points(sg, sprM));
  var rbM = new T.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, side: T.DoubleSide,
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vU; vec3 hue(float h){ return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); } void main(){ vec2 q = vU * 2. - vec2(1., 0.); float r = length(q); float b = (r - .7) / .3; if (b < 0. || b > 1. || q.y < 0.) discard; gl_FragColor = vec4(hue(.8 - b * .8), uA * sin(b * 3.1416) * .55);\n#include <colorspace_fragment>\n}' });
  [gp(40, 1260), gp(820, 1260)].forEach(function (p) { var rb = new T.Mesh(new T.PlaneGeometry(9, 4.5), rbM); rb.position.set(p[0], 0.2 + 2.25, p[2] + 0.8); rb.renderOrder = 4; spr.add(rb); var hd = new PB(P); hd.set('iron'); hd.cyl(p[0], 0.05, p[2], 0.08, 0.06, 0.3, 6); spr.add(new T.Mesh(hd.geo(), ctx.mats.paint)); });
  // green Paris benches along the esplanade, garden chairs round the basin, a reader now and then, pigeons pecking
  var fur = new PB(P), bw = ctx.basin;
  function bench(x, z, rot) {
    var c = Math.cos(rot), s = Math.sin(rot); function T_(lx, ly, lz) { return [x + lx * c - lz * s, ly, z + lx * s + lz * c]; }
    fur.set('awG', 'bq', 'bqL', 'ink');
    for (var k = 0; k < 4; k++) { var z0 = -0.2 + k * 0.13; var a = T_(-0.9, 0.45, z0), b = T_(0.9, 0.45, z0 + 0.1); fur.box(Math.min(a[0], b[0]), 0.43, Math.min(a[2], b[2]), Math.max(a[0], b[0]), 0.48, Math.max(a[2], b[2])); }
    for (k = 0; k < 3; k++) { var a2 = T_(-0.9, 0.62 + k * 0.14, -0.28), b2 = T_(0.9, 0.7 + k * 0.14, -0.25); fur.box(Math.min(a2[0], b2[0]), 0.62 + k * 0.14, Math.min(a2[2], b2[2]), Math.max(a2[0], b2[0]), 0.7 + k * 0.14, Math.max(a2[2], b2[2])); }
    fur.set('iron'); [-0.8, 0.8].forEach(function (lx) { fur.beam(T_(lx, 0.05, 0.22), T_(lx, 0.45, 0.05), 0.04); fur.beam(T_(lx, 0.05, -0.22), T_(lx, 0.98, -0.32), 0.04); fur.beam(T_(lx, 0.6, 0.15), T_(lx, 0.6, -0.15), 0.035); });
    ctx.contacts.push([x, z, 1.1, 0.45]);
  }
  function chair(x, z, rot) {
    var c = Math.cos(rot), s = Math.sin(rot); function T_(lx, ly, lz) { return [x + lx * c - lz * s, ly, z + lx * s + lz * c]; }
    fur.set('awG', 'bq', 'bqL');
    for (var k = 0; k < 3; k++) { var a = T_(-0.22, 0.44, -0.18 + k * 0.14), b = T_(0.22, 0.47, -0.08 + k * 0.14); fur.box(Math.min(a[0], b[0]), 0.44, Math.min(a[2], b[2]), Math.max(a[0], b[0]), 0.47, Math.max(a[2], b[2])); }
    fur.beam(T_(-0.2, 0.5, -0.22), T_(0.2, 0.5, -0.22), 0.025); fur.beam(T_(-0.2, 0.86, -0.28), T_(0.2, 0.86, -0.28), 0.06);
    [[-0.2, 0.18], [0.2, 0.18], [-0.2, -0.2], [0.2, -0.2]].forEach(function (l) { fur.beam(T_(l[0], 0.05, l[1]), T_(l[0], l[1] < 0 ? 0.9 : 0.46, l[1] < 0 ? l[1] - 0.06 : l[1]), 0.025); });
  }
  var benches = [[gp(150, 1166), 0], [gp(240, 1166), 0], [gp(620, 1166), 0], [gp(720, 1166), 0]];
  benches.forEach(function (b) { bench(b[0][0], b[0][2] + 0.8, Math.PI); });
  var chairs = [];
  for (var ci = 0; ci < 14; ci++) { var side = ci % 2 ? 1 : -1, t = 0.12 + (ci >> 1) * 0.12, e0 = side < 0 ? bw[0] : bw[1], e1 = side < 0 ? bw[3] : bw[2], px = lerp(e0[0], e1[0], t) + side * (1.6 + R() * 0.8), pz = lerp(e0[2], e1[2], t), rot = side < 0 ? -Math.PI / 2 + (R() - 0.5) * 0.8 : Math.PI / 2 + (R() - 0.5) * 0.8; chair(px, pz, rot); chairs.push([px, pz]); }
  var fm = new T.Mesh(fur.geo(), ctx.mats.paint); fm.castShadow = true; fm.receiveShadow = true; fm.name = 'benches-chairs'; scene.add(fm);
  // the reader: sits on the second bench with a book, comes and goes
  var rd = new PB(P), b1 = benches[1][0], rx = b1[0], rz = b1[2] + 0.8;
  rd.set('awR'); rd.box(rx - 0.22, 0.48, rz - 0.15, rx + 0.22, 1.12, rz + 0.12); rd.set('ink'); rd.box(rx - 0.2, 0.42, rz + 0.08, rx + 0.2, 0.55, rz + 0.45); rd.box(rx - 0.2, 0.05, rz + 0.38, rx - 0.04, 0.5, rz + 0.5); rd.box(rx + 0.04, 0.05, rz + 0.38, rx + 0.2, 0.5, rz + 0.5);
  rd.set('skin'); rd.blob(rx, 1.3, rz + 0.02, 0.15, 0.18, 0.15, 1, 2); rd.set('h1'); rd.blob(rx, 1.4, rz - 0.02, 0.16, 0.1, 0.16, 1, 3);
  rd.set('white', 'hS'); rd.box(rx - 0.16, 0.86, rz + 0.25, rx + 0.16, 1.0, rz + 0.27); rd.set('sea'); rd.box(rx - 0.17, 0.85, rz + 0.27, rx + 0.17, 1.01, rz + 0.29);
  (ctx.heads = ctx.heads || []).push([rx, 1.32, rz + 0.18, 1]);
  var reader = new T.Mesh(rd.geo(), ctx.mats.paint); reader.castShadow = true; reader.name = 'reader'; scene.add(reader);
  // pigeons pecking round the reader's bench
  var pg = new PB(P); pg.set('roofL', 'hS', 'white'); pg.blob(0, 0.14, 0, 0.16, 0.1, 0.09, 1, 5); pg.blob(0.14, 0.24, 0, 0.06, 0.06, 0.055, 1, 6); pg.set('fc'); pg.beam([0.19, 0.23, 0], [0.24, 0.22, 0], 0.012);
  var pgeo = pg.geo(), pigeons = [];
  for (var pi = 0; pi < 5; pi++) { var m = new T.Mesh(pgeo, ctx.mats.paint); m.scale.setScalar(1.3); scene.add(m); pigeons.push({ m: m, x: rx + (R() - 0.5) * 4, z: rz + 1 + R() * 2.5, ph: R() * 6, dir: R() * 6.28 }); }
  return {
    update: function (st, now) {
      var day = st.sky !== 'night', warm = st.season === 'spring' || st.season === 'summer';
      insM.uniforms.uOn.value = day && warm && st.wx !== 'rain' ? 1 : 0;
      var morning = (ctx.minutes || 780) >= 420 && (ctx.minutes || 780) < 660;
      spr.visible = st.season === 'summer' && morning && st.wx !== 'rain'; rbM.uniforms.uA.value = spr.visible ? 1 : 0;
      reader.visible = day && st.wx !== 'rain' && st.wx !== 'snow' && Math.sin(now / 47) > -0.3;
      pigeons.forEach(function (p, i) { var peck = Math.max(0, Math.sin(now * 3 + p.ph)) ; p.m.visible = day && st.wx !== 'snow'; p.dir += Math.sin(now * 0.3 + p.ph) * 0.01; p.x += Math.cos(p.dir) * 0.004; p.z += Math.sin(p.dir) * 0.004;
        p.m.position.set(p.x, 0.12, p.z); p.m.rotation.set(0, -p.dir, -peck * 0.5); });
    }
  };
}
