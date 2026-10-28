import * as T from 'three';
import { EX, F, ZC, dOf, gp, at, uu } from '../core/view.js';
import { clamp, lerp, rng, canvasTex } from '../core/util.js';
import { PB } from '../core/pb.js';
import { paintMaterial, PATS } from '../core/paint.js';
import { buildRows } from './rows.js';
import { buildBridge } from './bridge.js';
import { buildTower } from './tower.js';

// ---------------------------------------------------------------- the scene, piece by piece
// prod: async, yielding between its big parts (rows of buildings, bridge, tower) so no single step blocks for ~1 s
export async function buildScene(ctx, step) {
  var L = ctx.L, P = ctx.P, U = ctx.U, G = ctx.glows, scene = ctx.scene, R = rng(3);
  function mesh(pb, shadows) { var m = new T.Mesh(pb.geo(), ctx.mats.paint); m.castShadow = shadows !== false; m.receiveShadow = true; scene.add(m); return m; }
  var solid = new PB(P), ground = new PB(P), i, k;
  function boxAt(x0, y0, x1, y1, d, depth) { var a = at(x0, y1, d), b = at(x1, y0, d); solid.box(a[0], a[1], a[2] - depth, b[0], b[1], a[2]); }

  // --- distant Paris: three layers, each paler in the haze; roofs, chimneys, domes and spires on the skyline;
  //     two cranes with red lights; windows coming on block by block at dusk
  var dFar = 1150, far = new PB(P), Rf = rng(29), cityFlags = new PB(P), city = {};
  function farSet(tok, haze) { far.set(tok, 'far1', null, null, 'sks1'); far.sc = haze; }
  var thrs = L.far.map(function () { return 0.12 + Rf() * 0.75; });
  L.far.forEach(function (f) { var a = at(f[0], f[2], dFar), b = at(f[0] + f[1], f[2], dFar); farSet(f[3], 0.06); far.box(a[0], -2, a[2] - 30, b[0], a[1], a[2]); });
  L.farw.forEach(function (w) { var bi = 0; L.far.forEach(function (f, j) { if (w[0] >= f[0] && w[0] <= f[0] + f[1]) bi = j; }); G.add(at(w[0], w[1], dFar - 1), 4 * uu(dFar), '#ffc777', 0.8, 'dusk', thrs[bi]); });
  [[1750, 0.32, 961, 971, 'far2'], [2600, 0.56, 957, 967, 'far1']].forEach(function (ly, li) {
    var dd = ly[0], uq = uu(dd), x = -60;
    while (x < 900) {
      var bw = 12 + Rf() * 22, top = ly[2] + Rf() * (ly[3] - ly[2]), a = at(x, top, dd), b = at(x + bw, top, dd), thr = 0.12 + Rf() * 0.75;
      farSet(ly[4], ly[1]); far.box(a[0], -2, a[2] - 40, b[0], a[1], a[2]);
      // a mansard roof on some, chimneys on others
      if (Rf() < 0.55) { var rh = (2 + Rf() * 2.5) * uq; far.quad([a[0], a[1], a[2]], [b[0], a[1], a[2]], [b[0] - rh, a[1] + rh, a[2] - rh], [a[0] + rh, a[1] + rh, a[2] - rh]); }
      for (var c = 0; c < 3; c++) if (Rf() < 0.45) { var cx = lerp(a[0], b[0], 0.15 + Rf() * 0.7); far.box(cx, a[1], a[2] - 3, cx + 1.4 * uq, a[1] + (2.5 + Rf() * 2) * uq, a[2] - 1); }
      // windows at night, the whole block coming on at once at dusk
      for (var k = 0; k < 2 + Rf() * 3; k++) G.add(at(x + 2 + Rf() * (bw - 4), top + 3 + Rf() * (972 - top + 6), dd - 2), 4 * uq, '#ffc777', 0.7 - li * 0.2, 'dusk', thr);
      x += bw + Rf() * 4;
    }
    // domes and spires on the skyline
    [[li ? 180 : 610, 'dome'], [li ? 520 : 70, 'spire'], [li ? 760 : 300, 'dome'], [li ? 40 : 840, 'spire']].forEach(function (e) {
      var base = at(e[0], ly[2] - 1, dd);
      farSet(ly[4], ly[1]);
      if (e[1] === 'dome') { far.box(base[0] - 6 * uq, -2, base[2] - 10, base[0] + 6 * uq, base[1] + 2 * uq, base[2]); far.blob(base[0], base[1] + 2 * uq, base[2] - 5, 6 * uq, 7 * uq, 6 * uq, 1, 30 + li); far.beam([base[0], base[1] + 8 * uq, base[2] - 5], [base[0], base[1] + 13 * uq, base[2] - 5], 0.7 * uq, 0.05); }
      else { far.box(base[0] - 2.5 * uq, -2, base[2] - 6, base[0] + 2.5 * uq, base[1] + 6 * uq, base[2]); far.beam([base[0], base[1] + 6 * uq, base[2] - 3], [base[0], base[1] + 24 * uq, base[2] - 3], 2.4 * uq, 0.05); }
    });
  });
  // cranes: mast, jib, counter-jib, cab, a red light at the top and at the tip of the jib
  [[150, 1750, 1], [705, 1750, -1]].forEach(function (cr) {
    var dd = cr[1], uq = uu(dd), b0 = at(cr[0], 975, dd), top = at(cr[0], 936, dd), dir = cr[2];
    farSet('far2', 0.3);
    far.beam([b0[0], -2, b0[2]], [top[0], top[1], top[2]], 0.9 * uq);
    far.beam([top[0] - dir * 9 * uq, top[1], top[2]], [top[0] + dir * 34 * uq, top[1], top[2]], 0.6 * uq);
    far.beam([top[0], top[1] + 5 * uq, top[2]], [top[0] + dir * 30 * uq, top[1] + 0.5 * uq, top[2]], 0.25 * uq);
    far.beam([top[0], top[1] + 5 * uq, top[2]], [top[0] - dir * 8 * uq, top[1] + 0.5 * uq, top[2]], 0.25 * uq);
    far.box(top[0] - dir * 9 * uq - 2 * uq, top[1] - 3 * uq, top[2] - 1.5 * uq, top[0] - dir * 9 * uq + 2 * uq, top[1], top[2] + 1.5 * uq);
    far.box(top[0] - 1.6 * uq, top[1] - 4 * uq, top[2] - 1.6 * uq, top[0] + 1.6 * uq, top[1] - 0.5 * uq, top[2] + 1.6 * uq);
    far.beam([top[0] + dir * 22 * uq, top[1], top[2]], [top[0] + dir * 22 * uq, top[1] - 16 * uq, top[2]], 0.12 * uq);
    G.add([top[0], top[1] + 5.5 * uq, top[2] + 1], 3.2 * uq, '#ff5a66', 1, 'blink');
    G.add([top[0] + dir * 34 * uq, top[1] + 0.8 * uq, top[2] + 1], 3.2 * uq, '#ff5a66', 1, 'blink');
  });
  // Tour Montparnasse, far behind: a crisp window grid, the sky reflected on its glass by day, red lights on the roof edge
  var dM = 3000, mxa = at(401, 919, dM), mxb = at(423, 919, dM), mtp = new PB(P);
  mtp.set('mtp', 'mtp', null, 'mtpL', 'skb2', 'sks1'); mtp.boxW(mxa[0], -2, mxa[2] - 40, mxb[0], mxa[1], mxa[2], 3.7, 'fbrl');
  solid.set('mtpL'); solid.box(mxa[0] - 0.5, mxa[1], mxa[2] - 41, mxb[0] + 0.5, mxa[1] + 3 * uu(dM), mxa[2] + 0.5);
  for (i = 0; i < 26; i++) G.add(at(401 + 2 + R() * 18, 924 + R() * 64, dM - 2), 2.6 * uu(dM), '#ffd38a', 0.85);
  G.add(at(403, 918, dM - 2), 3 * uu(dM), '#ff5a66', 1, 'blink'); G.add(at(421, 918, dM - 2), 3 * uu(dM), '#ff5a66', 1, 'blink'); G.add(at(412, 918, dM - 2), 3 * uu(dM), '#ff5a66', 1, 'blink');
  // Les Invalides: the drum with its windows and a colonnade, the dome with gold ribs and garlands, lit from below at night
  var dI = dOf(990), iu = uu(dI), drum = new PB(P);
  solid.set('inv', 'ndS'); boxAt(74, 968, 134, 998, dI, 40);
  var domeC = at(104, 944, dI - 19), yD0 = at(104, 968, dI)[1], yD1 = domeC[1], rD = 22 * iu;
  drum.set('inv', 'ndS', null, 'ndS', 'wl', 'invD'); drum.sc = 0;
  for (k = 0; k < 20; k++) {
    var a0 = k / 20 * 6.2832, a1 = (k + 1) / 20 * 6.2832, cw_ = 6.2832 * rD / 20 / (4.2 * iu);
    drum.quad([domeC[0] + Math.sin(a0) * rD, yD0, domeC[2] + Math.cos(a0) * rD], [domeC[0] + Math.sin(a1) * rD, yD0, domeC[2] + Math.cos(a1) * rD], [domeC[0] + Math.sin(a1) * rD, yD1, domeC[2] + Math.cos(a1) * rD], [domeC[0] + Math.sin(a0) * rD, yD1, domeC[2] + Math.cos(a0) * rD],
      [k * cw_, 0, (k + 1) * cw_, 0, (k + 1) * cw_, (yD1 - yD0) / (4.2 * iu * 1.5), k * cw_, (yD1 - yD0) / (4.2 * iu * 1.5)]);
  }
  solid.set('inv', 'ndS', 'nd');
  for (k = 0; k < 24; k++) { var ca = (k + 0.5) / 24 * 6.2832; solid.cyl(domeC[0] + Math.sin(ca) * (rD + 2 * iu), yD0, domeC[2] + Math.cos(ca) * (rD + 2 * iu), 0.75 * iu, 0.65 * iu, yD1 - yD0 - 1.5 * iu, 6); }
  solid.cyl(domeC[0], yD1 - 1.5 * iu, domeC[2], rD + 3.2 * iu, rD + 3.2 * iu, 1.5 * iu, 24); solid.cyl(domeC[0], yD0, domeC[2], rD + 3.2 * iu, rD + 3.2 * iu, 0.9 * iu, 24);
  solid.set('invD', 'invD'); solid.blob(domeC[0], domeC[1], domeC[2], 21 * iu, 36 * iu, 21 * iu, 2, 9);
  solid.set('gold'); boxAt(101, 898, 107, 908, dI - 16, 6 * iu);
  solid.beam(at(104, 898, dI - 19), at(104, 878, dI - 19), 1.6 * iu, 0.1);
  function domeP(th, ph, sc) { sc = sc || 1.035; return [domeC[0] + Math.cos(ph) * Math.sin(th) * 21 * iu * sc, domeC[1] + Math.sin(ph) * 36 * iu * sc, domeC[2] + Math.cos(ph) * Math.cos(th) * 21 * iu * sc]; }
  var NR = 16, phs = []; for (k = 0; k <= 10; k++) phs.push(k / 10 * 1.38);
  for (k = 0; k < NR; k++) { var th = k / NR * 6.2832; for (var j = 0; j < 10; j++) solid.beam(domeP(th, phs[j]), domeP(th, phs[j + 1]), 0.55 * iu * (1 - j * 0.05)); }
  [0.42, 0.85].forEach(function (ph0, gi) {
    for (var k = 0; k < NR; k++) {
      var ta = k / NR * 6.2832, tb = (k + 1) / NR * 6.2832, prev = domeP(ta, ph0);
      for (var j = 1; j <= 6; j++) { var t = j / 6, p2 = domeP(lerp(ta, tb, t), ph0 - Math.sin(t * Math.PI) * (0.13 - gi * 0.04)); solid.beam(prev, p2, 0.3 * iu); prev = p2; }
      solid.blob.call(solid, domeP(ta, ph0)[0], domeP(ta, ph0)[1], domeP(ta, ph0)[2], 1.1 * iu, 1.1 * iu, 1.1 * iu, 0, 40 + k);
    }
  });
  for (k = 0; k < NR; k++) { var p0 = domeP((k + 0.5) / NR * 6.2832, 1.12), p1 = domeP((k + 0.5) / NR * 6.2832, 1.3); solid.beam(p0, p1, 0.35 * iu); }
  G.add(at(104, 928, dI - 40), 92 * iu, '#ffd38a', 0.3);
  G.add([domeC[0], yD0 + 3 * iu, domeC[2] + rD + 6 * iu], 70 * iu, '#ffcf80', 0.55);
  var invFlood = new T.ShaderMaterial({
    uniforms: { uA: U.uPn },
    vertexShader: 'varying float vY; varying vec3 vN, vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uA; varying float vY; varying vec3 vN, vV; void main(){ float e = pow(abs(dot(vN, vV)), 1.4); gl_FragColor = vec4(1., .86, .58, pow(1. - vY, 1.3) * e * uA * .4);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false, side: T.DoubleSide
  });
  [-1, 1].forEach(function (sd) {
    var len = 60 * iu, g = new T.CylinderGeometry(16 * iu, 2 * iu, len, 20, 1, true); g.translate(0, len / 2, 0);
    var uvs = g.attributes.uv; for (var j = 0; j < uvs.count; j++) uvs.setY(j, g.attributes.position.getY(j) / len);
    var mm = new T.Mesh(g, invFlood), base = new T.Vector3(domeC[0] + sd * 14 * iu, yD0 - 2 * iu, domeC[2] + rD + 10 * iu), tip = new T.Vector3(domeC[0] + sd * 4 * iu, domeC[1] + 20 * iu, domeC[2]);
    mm.position.copy(base); mm.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), tip.sub(base).normalize()); mm.renderOrder = 4; mm.name = 'inv-flood'; scene.add(mm);
  });
  // a sun glint sliding over the gold
  var igl = new T.Points(new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute([0, 0, 0], 3)), new T.ShaderMaterial({
    uniforms: { uMap: { value: ctx.tex.star }, uScale: U.uScale, uA: { value: 0 }, uTime: U.uTime },
    vertexShader: 'uniform float uScale, uA, uTime; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vec4 q = projectionMatrix * (mv + vec4(0., 0., 8., 0.)); gl_Position = projectionMatrix * mv; gl_Position.z = q.z / q.w * gl_Position.w; vA = uA * (.75 + .25 * sin(uTime * 2.3)); gl_PointSize = vA > .01 ? ' + (34 * iu).toFixed(2) + ' * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uMap; varying float vA; void main(){ gl_FragColor = vec4(1., .97, .85, texture2D(uMap, gl_PointCoord).a * vA);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false
  }));
  igl.name = 'inv-glint'; igl.frustumCulled = false; igl.renderOrder = 8; scene.add(igl);
  city.invGlint = function (st) { var th = clamp((U.uGlint.value - 270) / 150, -1, 1) * 0.75, p = domeP(th, 0.62, 1.07); igl.geometry.attributes.position.setXYZ(0, p[0], p[1], p[2]); igl.geometry.attributes.position.needsUpdate = true; igl.material.uniforms.uA.value = 1 - st.pn; };
  // École Militaire: windows, the central pediment, a flag on the pavilion's dome, its facade lit at night
  var dE = dOf(1000), eu = uu(dE), emw = new PB(P);
  emw.set('em', 'ndS', null, 'ndS', 'wl', 'ndS'); emw.sc = 1;
  (function () { var a = at(460, 1002, dE), b = at(552, 988, dE); emw.boxW(a[0], a[1], a[2] - 60, b[0], b[1], a[2], 3.3 * eu, 'flrt'); a = at(494, 990, dE - 4); b = at(518, 980, dE - 4); emw.boxW(a[0], a[1], a[2] - 30, b[0], b[1], a[2], 3.3 * eu, 'flrt'); })();
  solid.set('invD'); var ed = at(506, 979, dE + 6); solid.blob(ed[0], ed[1], ed[2], 10 * eu, 11 * eu, 10 * eu, 1, 3);
  solid.set('ndS'); for (k = -44; k < 46; k += 4) { if (Math.abs(k) < 14) continue; boxAt(506 + k, 990, 506.8 + k, 998, dE - 0.4, 0.5); }
  (function () { var l = at(495, 980, dE - 3.6), r = at(517, 980, dE - 3.6), tp = at(506, 974.5, dE - 3.6);
    solid.set('em', 'ndS'); solid.tri(l, r, tp); solid.set('roof'); solid.quad([l[0], l[1], l[2] - 6], [l[0], l[1], l[2]], tp, [tp[0], tp[1], tp[2] - 6]); solid.quad([r[0], r[1], r[2]], [r[0], r[1], r[2] - 6], [tp[0], tp[1], tp[2] - 6], tp);
    solid.set('ndS'); solid.beam([l[0], l[1] + 0.3 * eu, l[2] + 0.05], [r[0], r[1] + 0.3 * eu, r[2] + 0.05], 0.35 * eu); })();
  (function () { var tp = [ed[0], ed[1] + 11 * eu, ed[2]]; solid.set('iron'); solid.beam(tp, [tp[0], tp[1] + 9 * eu, tp[2]], 0.3 * eu);
    ['sea', 'white', 'red'].forEach(function (tk, j) { cityFlags.set(tk); cityFlags.quad([tp[0] + j * 1.6 * eu, tp[1] + 5.8 * eu, tp[2]], [tp[0] + (j + 1) * 1.6 * eu, tp[1] + 5.8 * eu, tp[2] + (j % 2 ? -0.3 : 0.3) * eu], [tp[0] + (j + 1) * 1.6 * eu, tp[1] + 9 * eu, tp[2] + (j % 2 ? -0.3 : 0.3) * eu], [tp[0] + j * 1.6 * eu, tp[1] + 9 * eu, tp[2]]); }); })();
  G.add(at(506, 992, dE - 30), 130 * eu, '#ffd38a', 0.22);
  [[far, { pat: 'haze' }, 'far'], [mtp, { pat: 'mtp' }, 'montparnasse'], [drum, { pat: 'hwin' }, 'inv-drum'], [emw, { pat: 'hwin' }, 'em-facade'], [cityFlags, { side: T.DoubleSide }, 'city-flags']].forEach(function (e) {
    var mm = new T.Mesh(e[0].geo(), paintMaterial(U, e[1])); mm.name = e[2]; mm.castShadow = true; mm.receiveShadow = true; scene.add(mm);
  });

  await step(0.04);
  // --- Champ de Mars: mowing stripes, dotted gravel paths, joggers and a dog, picnics in summer
  var bz_ = gp(0, 1043)[2] - 0.2; ground.set('lawnD', 'lawnD'); ground.quad([-2600, -0.3, bz_], [2600, -0.3, bz_], [2600, -0.3, -1800], [-2600, -0.3, -1800]);   // stops at the river wall (it used to show as a green strip over the water)
  var cm = [gp(398, 996.5, 0.02), gp(474, 996.5, 0.02), gp(552, 1014, 0.02), gp(318, 1014, 0.02)], champ = new PB(P);
  function cmP(u, v, y) { var n0 = [lerp(cm[3][0], cm[2][0], u), lerp(cm[3][2], cm[2][2], u)], f0 = [lerp(cm[0][0], cm[1][0], u), lerp(cm[0][2], cm[1][2], u)]; return [lerp(n0[0], f0[0], v), y == null ? 0.02 : y, lerp(n0[1], f0[1], v)]; }
  champ.set('champ', 'lawnD', null, 'lawnL', 'path', 'ndS');
  for (k = 0; k < 24; k++) for (var c = 0; c < 10; c++) { var va = k / 24, vb = (k + 1) / 24, ua = c / 10, ub = (c + 1) / 10; champ.quad(cmP(ua, va), cmP(ub, va), cmP(ub, vb), cmP(ua, vb), [ua, va, ub, va, ub, vb, ua, vb]); }
  (function () { var mm = new T.Mesh(champ.geo(), paintMaterial(U, { pat: 'champ' })); mm.name = 'champ'; mm.receiveShadow = true; scene.add(mm); })();
  var pic = new PB(P), Rc = rng(17);
  for (k = 0; k < 8; k++) {
    var u0 = 0.15 + Rc() * 0.7, v0 = 0.08 + Rc() * 0.6, c0 = cmP(u0, v0, 0.05), bw2 = 1.3 + Rc() * 0.5, bd = 1 + Rc() * 0.4;
    pic.set(Rc() < 0.5 ? 'awR' : 'sea', 'hS', null, null, 'awW'); pic.quad([c0[0] - bw2, 0.06, c0[2] + bd], [c0[0] + bw2, 0.06, c0[2] + bd], [c0[0] + bw2, 0.06, c0[2] - bd], [c0[0] - bw2, 0.06, c0[2] - bd]);
  }
  var picM = new T.Mesh(pic.geo(), paintMaterial(U, { pat: 'check' })); picM.name = 'champ-picnic'; scene.add(picM);
  var walkers = [], Rw = rng(23);
  [[0.035, 'awR', 0, 1.6], [0.04, 'sea', 0, 1.1], [0.965, 'cart', 0, 1.7], [0.96, 'umb', 0, 1.0], [0.03, 'h1', 0, 1.25], [0.97, 'white', 0, 1.5], [0.045, 'trk', 1, 1.1]].forEach(function (wk, i) {
    var pb = new PB(P), dog = wk[2] === 1;
    if (dog) { pb.set(wk[1]); pb.box(-0.4, 0.25, -0.15, 0.4, 0.55, 0.15); pb.box(0.35, 0.45, -0.12, 0.6, 0.7, 0.12); pb.box(-0.35, 0, -0.1, -0.25, 0.3, 0.1); pb.box(0.25, 0, -0.1, 0.35, 0.3, 0.1); }
    else { pb.set('ink'); pb.box(-0.15, 0, -0.12, 0.15, 0.85, 0.12); pb.set(wk[1]); pb.box(-0.25, 0.85, -0.18, 0.25, 1.5, 0.18); pb.set('skin'); pb.box(-0.14, 1.5, -0.14, 0.14, 1.8, 0.14); }
    var mm = new T.Mesh(pb.geo(), ctx.mats.paint); mm.scale.setScalar(dog ? 1.4 : 1.6); mm.castShadow = true; scene.add(mm);
    walkers.push({ m: mm, u: wk[0], sp: (dog ? 1.1 : wk[3] > 1.3 ? 1.6 : 0.6) / 600, ph: Rw(), run: wk[3] > 1.3 || dog });
  });
  city.champ = function (st, now) {
    picM.visible = st.season === 'summer' && st.wx !== 'rain' && st.sky !== 'night';
    walkers.forEach(function (w_, i) {
      var tt = (now * w_.sp * 60 + w_.ph) % 2, v = tt < 1 ? tt : 2 - tt, p = cmP(w_.u, 0.3 + v * 0.67, 0.02);
      if (i === 6) { var lead = walkers[1], lt = (now * lead.sp * 60 + lead.ph) % 2, lv = lt < 1 ? lt : 2 - lt; p = cmP(w_.u, 0.3 + Math.max(0, Math.min(1, lv)) * 0.67 + 0.006, 0.02); }
      w_.m.position.set(p[0], 0.05 + (w_.run ? Math.abs(Math.sin(now * 9 + i)) * 0.18 : 0), p[2]);
      var lt_ = i === 6 ? (now * walkers[1].sp * 60 + walkers[1].ph) % 2 : tt; w_.m.rotation.y = (lt_ < 1 ? 1 : -1) * Math.PI / 2; w_.m.visible = st.sky !== 'night' || i < 2;
    });
  };
  // tree rows along its sides: small clipped crowns marching to École Militaire
  ctx.rowsTrees = [];
  for (i = 0; i < 26; i++) { var t_ = i / 25, y_ = 996 + t_ * 18; ctx.rowsTrees.push([389 - t_ * 87, y_], [483 + t_ * 86, y_]); }
  ctx.city = city;

  // --- Haussmann rows beside the Champ de Mars (facades baked from the painting's own windows)
  await step(0.06); ctx.rows = buildRows(ctx, solid); await step(0.1);

  // --- Quai Branly, the river wall, the Seine's far quay
  var rz0 = gp(0, 1032)[2], rz1 = gp(0, 1042)[2];
  ground.set('road', 'road', null, null, null, 'roadL', 0.35); ground.quad([-2600, 0.02, rz1], [2600, 0.02, rz1], [2600, 0.02, rz0 - 40], [-2600, 0.02, rz0 - 40]);
  var qz0 = gp(0, 1041)[2], qz1 = gp(0, 1043)[2];
  ground.set('qwL'); ground.quad([-2600, 0.05, qz1], [2600, 0.05, qz1], [2600, 0.05, qz0], [-2600, 0.05, qz0]);
  // the far quay wall: stone, iron rings, a ladder, steps down to a low path along the water (with a cyclist)
  var quay = new PB(P), WLq = ctx.WL, LP = [-262, -98], LY = -1.75, LZ = qz1 + 3.2;
  function qface(x0, x1, y0, y1, z) { quay.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], [x0 / 1.5, (y0 + WLq + 0.5) / 0.7, x1 / 1.5, (y0 + WLq + 0.5) / 0.7, x1 / 1.5, (y1 + WLq + 0.5) / 0.7, x0 / 1.5, (y1 + WLq + 0.5) / 0.7]); }
  quay.set('qw', 'qwS', null, null, 'lf2', 'mor');
  qface(-2600, 2600, -WLq - 0.5, 0.05, qz1);
  qface(LP[0], LP[1], -WLq - 0.5, LY, LZ);
  quay.quad([LP[0], LY, LZ], [LP[1], LY, LZ], [LP[1], LY, qz1], [LP[0], LY, qz1], [LP[0] / 1.5, 0, LP[1] / 1.5, 0, LP[1] / 1.5, 2, LP[0] / 1.5, 2]);
  quay.set('qwL'); quay.quad([LP[0], LY + 0.02, LZ], [LP[1], LY + 0.02, LZ], [LP[1], LY + 0.02, LZ - 0.35], [LP[0], LY + 0.02, LZ - 0.35]);
  quay.set('qw', 'qwS', null, null, 'lf2', 'mor');
  for (var sk = 0; sk < 9; sk++) {   // the steps, descending along the wall toward the low path
    var sx0 = LP[1] + sk * 1.9, sy1 = 0.05 - sk * 0.2, sy0 = sy1 - 0.2;
    quay.quad([sx0, sy1, qz1 + 2.2], [sx0 + 1.9, sy1, qz1 + 2.2], [sx0 + 1.9, sy1, qz1], [sx0, sy1, qz1]);
    qface(sx0, sx0 + 1.9, -WLq - 0.5, sy1, qz1 + 2.2);
    quay.quad([sx0, sy0, qz1 + 2.2], [sx0, sy0, qz1], [sx0, sy1, qz1], [sx0, sy1, qz1 + 2.2]);
  }
  quay.set('iron');
  for (var rx = -240; rx < 260; rx += 26) { if (Math.abs(rx) < 16) continue; var rc = [rx, -1.15, qz1 + 0.1]; quay.box(rx - 0.08, -0.85, qz1, rx + 0.08, -0.7, qz1 + 0.12); for (var ri = 0; ri < 10; ri++) { var a0 = ri / 10 * 6.2832, a1 = (ri + 1) / 10 * 6.2832; quay.beam([rc[0] + Math.sin(a0) * 0.3, rc[1] + Math.cos(a0) * 0.3, rc[2]], [rc[0] + Math.sin(a1) * 0.3, rc[1] + Math.cos(a1) * 0.3, rc[2]], 0.05); } }
  [[-26, -25.3]].forEach(function (lx) { [lx[0], lx[1]].forEach(function (x) { quay.beam([x, -WLq - 0.3, qz1 + 0.18], [x, 0.6, qz1 + 0.18], 0.05); }); for (var ry = -WLq - 0.1; ry < 0.05; ry += 0.3) quay.beam([lx[0], ry, qz1 + 0.18], [lx[1], ry, qz1 + 0.18], 0.035); });
  (function () { var mq = new T.Mesh(quay.geo(), paintMaterial(ctx.U, { pat: 'quay' })); mq.name = 'quay'; mq.receiveShadow = true; mq.castShadow = true; scene.add(mq); })();
  ctx.lowPath = { x0: LP[0], x1: LP[1], y: LY, z: qz1 + 1.6 };
  // near bank: wall top, Avenue de New-York with its dashed line
  ctx.qz1 = qz1; ctx.nbz = gp(0, 1123)[2];
  var nb = gp(0, 1123)[2], nb1 = gp(0, 1125)[2], nb2 = gp(0, 1130)[2], av2 = gp(0, 1156)[2];
  ground.set('qw', 'qwS'); ground.quad([-2600, 0.05, nb2], [2600, 0.05, nb2], [2600, 0.05, nb1], [-2600, 0.05, nb1]);
  ground.set('qwL'); ground.quad([-2600, 0.06, nb1], [2600, 0.06, nb1], [2600, 0.06, nb], [-2600, 0.06, nb]);
  // the Avenue de New-York: asphalt strokes and patches, gutters, a zebra crossing and stop lines at the bridge, lane arrows, a manhole; kerbs with a lit edge
  (function () {
    var la = ZC - dOf(1146) - 0.9, lb = ZC - dOf(1153), K0 = nb2, K1 = av2;
    PATS.road = 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); vec2 p = vUv2; float px_ = max(aw.x, aw.y);\n' +
      'vec2 r_q = p * vec2(.9, 2.4); vec2 r_c = floor(r_q), r_f = fract(r_q) - .5; float r_h = h21(r_c);\n' +
      'col = mix(col, h21(r_c + 7.) > .5 ? cBase * 1.12 : cShade * .82, step(.62, r_h) * (1. - smoothstep(.07, .13, abs(r_f.y))) * step(abs(r_f.x + (r_h - .5) * .3), .32) * .85);\n' +
      'vec2 r_pc = floor(p / vec2(6., 3.5)), r_pf = fract(p / vec2(6., 3.5)); float r_pm = step(.74, h21(r_pc + 31.)) * step(.15, r_pf.x) * step(r_pf.x, .8) * step(.2, r_pf.y) * step(r_pf.y, .75);\n' +
      'col = mix(col, cShade * .9, r_pm * .75);\n' +
      'float r_k0 = p.y - ' + K0.toFixed(2) + ', r_k1 = ' + K1.toFixed(2) + ' - p.y; col = mix(col, cShade * .7, (1. - smoothstep(.0, .5, r_k0)) * .6 + (1. - smoothstep(.0, .5, r_k1)) * .6);\n' +
      'col = mix(col, pal(vTok.w) * .9, .7 * (ln(abs(r_k0 - .55) / px_, .4) + ln(abs(r_k1 - .55) / px_, .4)));\n' +
      'vec3 r_pt = pal(vTok2.x);\n' +
      'float r_zb = step(-16.2, p.x) * step(p.x, -12.5) * step(.5, fract((p.y - ' + K0.toFixed(2) + ') / 1.15)) * step(' + (K0 + 0.8).toFixed(2) + ', p.y) * step(p.y, ' + (K1 - 0.8).toFixed(2) + ');\n' +
      'float r_sl = max(step(abs(p.x + 17.4), .22) * step(p.y, ' + ((la + lb) / 2 - 2.4).toFixed(2) + '), step(abs(p.x + 10.9), .22) * step(' + ((la + lb) / 2 - 2.4).toFixed(2) + ', p.y)) * step(' + (K0 + 0.8).toFixed(2) + ', p.y) * step(p.y, ' + (K1 - 0.8).toFixed(2) + ');\n' +
      'col = mix(col, r_pt, max(r_zb, r_sl) * .92);\n' +
      'for (int i = 0; i < 4; i++) { float fi = float(i); float ax = i == 0 ? -42. : i == 1 ? 34. : i == 2 ? 30. : -40.; float az = i < 2 ? ' + la.toFixed(2) + ' : ' + lb.toFixed(2) + '; float ad_ = i < 2 ? 1. : -1.;\n' +
      '  vec2 a_l = vec2((p.x - ax) * ad_, p.y - az); float a_m = max(step(abs(a_l.y), .14) * step(-2.2, a_l.x) * step(a_l.x, .2), step(.2, a_l.x) * step(a_l.x, 1.3) * step(abs(a_l.y), (1.3 - a_l.x) * .6)); col = mix(col, r_pt, a_m * .9); }\n' +
      'float r_mh = length(p - vec2(7.5, ' + ((la + lb) / 2).toFixed(2) + ')); col = mix(col, cShade * .62, 1. - smoothstep(.42, .45, r_mh)); col = mix(col, pal(vTok.w), ln(abs(r_mh - .44) / px_, .5) * .8);\n' +
      'col = mix(col, cShade * .45, (1. - smoothstep(.36, .38, r_mh)) * step(.6, max(fract((p.x - 7.5) * 6.), fract((p.y) * 6.))));\n' +
      // snow piled along the kerbs
      'if (uSnow > .5) { float r_sp = max(1. - smoothstep(.3, .9 + .5 * vn2(p * .6), r_k0), 1. - smoothstep(.3, .9 + .5 * vn2(p * .6 + 3.), r_k1)); col = mix(col, mix(vec3(.84, .88, .98), vec3(.98), b1), r_sp); col = mix(col, cShade * .6, ln(abs(max(1. - smoothstep(.3, .9 + .5 * vn2(p * .6), r_k0), 1. - smoothstep(.3, .9 + .5 * vn2(p * .6 + 3.), r_k1)) - .5) / max(fwidth(r_sp), 1e-4), .5) * .5); }\n';
    var rp = new PB(P); rp.set('road', 'road', 'roadL', 'ink', 'roadL', null, 0);
    for (var i = -26; i < 26; i++) { var x0 = i * 100, x1 = x0 + 100; rp.quad([x0, 0.05, K1], [x1, 0.05, K1], [x1, 0.05, K0], [x0, 0.05, K0], [x0, K1, x1, K1, x1, K0, x0, K0]); }
    var rm = new T.Mesh(rp.geo(), paintMaterial(U, { pat: 'road' })); rm.name = 'avenue-road'; rm.receiveShadow = true; scene.add(rm);
    var kb = new PB(P); kb.set('path', 'qwS', 'paveL');
    kb.box(-2600, 0.05, K0 - 0.05, 2600, 0.2, K0 + 0.28, 'ft'); kb.box(-2600, 0.05, K1 - 0.28, 2600, 0.2, K1 + 0.05, 'bt');
    kb.set('paveL'); kb.box(-2600, 0.2, K0 + 0.2, 2600, 0.215, K0 + 0.28, 't'); kb.box(-2600, 0.2, K1 - 0.28, 2600, 0.215, K1 - 0.2, 't');
    var km = new T.Mesh(kb.geo(), ctx.mats.paint); km.name = 'kerbs'; km.receiveShadow = true; scene.add(km);
  })();
  var dl = dOf(1143), dz0 = ZC - dOf(1142.5), dz1 = ZC - dOf(1143.5);
  ground.set('roadL');
  for (var x = -900; x < 1700; x += 22) { var xa = (x - EX) * dl / F, xb = (x + 12 - EX) * dl / F; ground.quad([xa, 0.08, dz1], [xb, 0.08, dz1], [xb, 0.08, dz0], [xa, 0.08, dz0]); }
  ctx.lanes = { a: ZC - dOf(1146) - 0.9, b: ZC - dOf(1153) };

  // --- the Trocadéro gardens: lawn, esplanade, paths, the basin
  var lawnPB = new PB(P), pathPB = new PB(P);
  lawnPB.set('lawn', 'lawnD', null, 'lawnL', 'lawnD', 'lawnL', 0.9);
  for (var lx = -26; lx < 26; lx++) for (var lz = 0; lz < 4; lz++) { var za = lerp(av2, 640, lz / 4), zb = lerp(av2, 640, (lz + 1) / 4); lawnPB.quad([lx * 100, 0.05, zb], [lx * 100 + 100, 0.05, zb], [lx * 100 + 100, 0.05, za], [lx * 100, 0.05, za]); }
  var es0 = gp(0, 1156)[2], es1 = gp(0, 1172)[2];
  pathPB.set('path', 'path', 'paveL', 'ink', null, 'qwS', 1);
  for (lx = -26; lx < 26; lx++) pathPB.quad([lx * 100, 0.1, es1], [lx * 100 + 100, 0.1, es1], [lx * 100 + 100, 0.1, es0], [lx * 100, 0.1, es0], [0, 1, 1, 1, 1, 0, 0, 0]);
  function poly4(pts, y) { var q = pts.map(function (p) { return gp(p[0], p[1], y); }); pathPB.sc = 1; pathPB.quad(q[3], q[2], q[1], q[0], [0, 1, 1, 1, 1, 0, 0, 0]); }
  poly4([[250, 1172], [300, 1172], [90, 1500], [-40, 1500]], 0.12);
  poly4([[560, 1172], [610, 1172], [860, 1460], [760, 1500]], 0.12);
  (function () { var ml = new T.Mesh(lawnPB.geo(), paintMaterial(U, { pat: 'lawn' })); ml.name = 'lawns'; ml.receiveShadow = true; scene.add(ml); var mp = new T.Mesh(pathPB.geo(), paintMaterial(U, { pat: 'gravel' })); mp.name = 'paths'; mp.receiveShadow = true; scene.add(mp); })();
  ctx.gardenPaths = [[[250, 1172], [-40, 1500]], [[300, 1172], [90, 1500]], [[560, 1172], [760, 1500]], [[610, 1172], [860, 1460]]];
  var bo = [gp(304, 1172, 0.32), gp(556, 1172, 0.32), gp(732, 1500, 0.32), gp(128, 1500, 0.32)];
  var bw = [gp(312, 1176, 0.32), gp(548, 1176, 0.32), gp(720, 1500, 0.32), gp(140, 1500, 0.32)], BW = ctx.BWL;
  // the basin's rim: stone blocks with joints, a rounded coping over the water, a wet band down the inside wall
  var rimB = new PB(P), BC = [0, 0, (bw[0][2] + bw[3][2]) / 2];
  function el(a, b) { return Math.hypot(b[0] - a[0], b[2] - a[2]); }
  rimB.set('basin', 'basin', null, 'ink', null, null, 1);
  var L0 = el(bw[0], bw[1]), L1 = el(bw[0], bw[3]), L2 = el(bw[1], bw[2]), L3 = el(bw[3], bw[2]);
  rimB.quad(bw[0], bw[1], bo[1], bo[0], [0, 0, L0, 0, L0, 1, 0, 1]); rimB.quad(bo[3], bw[3], bw[0], bo[0], [0, 1, 0, 0, L1, 0, L1, 1]);
  rimB.quad(bw[1], bw[2], bo[2], bo[1], [0, 0, L2, 0, L2, 1, 0, 1]); rimB.quad(bo[3], bo[2], bw[2], bw[3], [0, 1, L3, 1, L3, 0, 0, 0]);
  [[bw[0], bw[1]], [bw[1], bw[2]], [bw[2], bw[3]], [bw[3], bw[0]]].forEach(function (e) {
    var a = e[0], b = e[1], len = el(a, b), mx = (a[0] + b[0]) / 2, mz = (a[2] + b[2]) / 2, ix = BC[0] - mx, iz = BC[2] - mz, dx = (b[0] - a[0]) / len, dz = (b[2] - a[2]) / len, nx = -dz, nz = dx;
    if (nx * ix + nz * iz < 0) { nx = -nx; nz = -nz; }
    // the inside wall, down into the water
    rimB.sc = 2; var y0 = 0.32, y1 = 0.0, A = [a[0], y0, a[2]], B = [b[0], y0, b[2]], C = [b[0], y1, b[2]], D = [a[0], y1, a[2]];
    if ((B[0] - A[0]) * nz - (B[2] - A[2]) * nx > 0) rimB.quad(D, C, B, A, [0, y1, len, y1, len, y0, 0, y0]); else rimB.quad(C, D, A, B, [len, y1, 0, y1, 0, y0, len, y0]);
    // the rounded coping: a half-round stone over the water's edge
    rimB.sc = 3; var rows = [], uvs = [], r = 0.15, seg = 8;
    [a, b].forEach(function (p, ri) { var row = [], ur = []; for (var k = 0; k <= seg; k++) { var th = -1.1 + (Math.PI + 1.1) * k / seg, ox = Math.cos(th) * r, oy = Math.sin(th) * r;
      row.push([p[0] + nx * (ox - 0.02), 0.31 + oy, p[2] + nz * (ox - 0.02)]); ur.push([ri * len, k / seg]); } rows.push(row); uvs.push(ur); });
    rimB.grid(rows, uvs, false);
  });
  (function () { var g = rimB.geo(); g.computeVertexNormals(); var m = new T.Mesh(g, paintMaterial(U, { pat: 'rim', side: T.DoubleSide })); m.name = 'basin-rim'; m.receiveShadow = true; m.castShadow = true; scene.add(m); })();
  ctx.basin = bw;
  mesh(ground, false);

  // --- the Pont d'Iéna, seen down its axis
  buildBridge(ctx, solid);
  // --- the Eiffel Tower
  await step(0.12); ctx.tower = buildTower(ctx);
  // --- lamps, statues, moored boats
  var lant = new PB(P); ctx.panelPB = new PB(P);
  var lampSh = [], LR = rng(77); ctx.lampLights = [];
  function lampAt(X, Z, h, w, l) {
    var thr = 0.3 + LR() * 0.5;   // lamps switch on one after another at dusk
    solid.set('lamp', 'lamp', 'lampG');
    solid.cyl(X, 0, Z, 4.2 * w, 3.6 * w, 2.4 * w, 10); solid.cyl(X, 2.4 * w, Z, 3 * w, 2.2 * w, 3.4 * w, 10);
    solid.cyl(X, 5.8 * w, Z, 1.5 * w, 1.05 * w, h - 14 * w, 8);
    [0.38, 0.62].forEach(function (f) { solid.cyl(X, 5.8 * w + (h - 14 * w) * f, Z, 1.9 * w, 1.9 * w, 0.8 * w, 8); });
    solid.cyl(X, h - 8.2 * w, Z, 1.2 * w, 2.6 * w, 1.6 * w, 8); solid.cyl(X, h - 6.6 * w, Z, 2.6 * w, 2.6 * w, 0.6 * w, 8);
    [-1, 1].forEach(function (sd) { solid.beam([X, h - 9.5 * w, Z], [X + sd * 3.2 * w, h - 7 * w, Z], 0.45 * w, 0.3 * w); solid.beam([X + sd * 3.2 * w, h - 7 * w, Z], [X + sd * 2.6 * w, h - 5.8 * w, Z], 0.3 * w, 0.25 * w); });
    lant.set('lampG', 'lampG', null, 'lamp', 'lampG'); lant.sc = thr;
    var y0 = h - 6 * w, y1 = h + 9.5 * w, r0 = 3.4 * w, r1 = 4.6 * w, cs = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
    for (var k = 0; k < 4; k++) { var a = cs[k], c = cs[(k + 1) % 4]; lant.quad([X + c[0] * r0, y0, Z + c[1] * r0], [X + a[0] * r0, y0, Z + a[1] * r0], [X + a[0] * r1, y1, Z + a[1] * r1], [X + c[0] * r1, y1, Z + c[1] * r1], [0, 0, 1, 0, 1, 1, 0, 1]); }
    solid.set('lamp'); solid.box(X - r1 - 0.6 * w, y1, Z - r1 - 0.6 * w, X + r1 + 0.6 * w, y1 + 1 * w, Z + r1 + 0.6 * w);
    solid.tri([X - 6.6 * w, y1 + w, Z + 5 * w], [X + 6.6 * w, y1 + w, Z + 5 * w], [X, y1 + 6 * w, Z]); solid.tri([X + 6.6 * w, y1 + w, Z - 5 * w], [X - 6.6 * w, y1 + w, Z - 5 * w], [X, y1 + 6 * w, Z]);
    solid.tri([X + 6.6 * w, y1 + w, Z + 5 * w], [X + 6.6 * w, y1 + w, Z - 5 * w], [X, y1 + 6 * w, Z]); solid.tri([X - 6.6 * w, y1 + w, Z - 5 * w], [X - 6.6 * w, y1 + w, Z + 5 * w], [X, y1 + 6 * w, Z]);
    solid.beam([X, y1 + 6 * w, Z], [X, y1 + 9 * w, Z], 0.5 * w, 0.1 * w);
    G.add([X, h + 3.5 * w, Z + 0.5], 56 * w, '#ffd38a', 0.65, 'dusk', thr); ctx.lampLights.push([X, h + 3.5 * w, Z, thr, w]);
    if (l[1] < 1125) (ctx.bridgeLamps = ctx.bridgeLamps || []).push([X, h + 3.5 * w, Z, w, thr]); else lampSh.push([X, Z, h, w]);
    if (l[1] > 1150) { (ctx.aveLamps = ctx.aveLamps || []).push([X, h + 3.5 * w, Z, w, thr]); } else ctx.pools.push([X, Z, 52 * w, thr]); ctx.contacts.push([X, Z, 6 * w, 3 * w]);
  }
  L.lamp.forEach(function (l) { var d = dOf(l[1]) - 0.4, b = at(l[0], l[1], d), s = l[3]; lampAt(b[0], b[2], l[2] * s * uu(d), uu(d) * s, l); });
  // garden lamps along the outer edge of the two garden paths: their shadows lie across the gravel in the morning and the afternoon
  [478, 500, 522, 544].forEach(function (z) { [-1, 1].forEach(function (sd) { lampAt(sd * 23.4, z, 5.2, 0.085, [0, 1160]); }); });
  // the lamps that light their surroundings: the nearest ones first
  ctx.lampLights.slice().sort(function (a, b) { return b[2] - a[2]; }).slice(0, 24).forEach(function (l, i) { U.uLamps.value[i].set(l[0], l[1], l[2], l[3]); });
  (function () { var m = new T.Mesh(lant.geo(), paintMaterial(U, { pat: 'lant' })); m.name = 'lanterns'; scene.add(m); })();
  // the lamp posts' shadows: too thin for the shadow map, so they are painted on the ground: a long thin pole and the lantern, lying away from the sun
  (function () {
    var n = lampSh.length, pos = new Float32Array(n * 8 * 3), uv = [], ix = [];
    for (var i = 0; i < n; i++) { for (var q = 0; q < 2; q++) { var o = i * 8 + q * 4; uv.push(0, 0, 1, 0, 1, 1, 0, 1); ix.push(o, o + 2, o + 1, o, o + 3, o + 2); } }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(ix);
    var m = new T.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2,
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'uniform float uA; varying vec2 vU; void main(){ float e = smoothstep(.0, .12, vU.y) * smoothstep(1., .88, vU.y); gl_FragColor = vec4(.13, .16, .3, uA * (.55 + .45 * e) * smoothstep(1., .9, vU.x));\n#include <colorspace_fragment>\n}' });
    var mesh = new T.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.name = 'lamp-shadows'; scene.add(mesh);
    function quad(o, ax, az, bx, bz, wd, y) { var dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, nx = -dz / l * wd / 2, nz = dx / l * wd / 2;
      [[ax + nx, az + nz], [bx + nx, bz + nz], [bx - nx, bz - nz], [ax - nx, az - nz]].forEach(function (p, k) { pos[(o + k) * 3] = p[0]; pos[(o + k) * 3 + 1] = y; pos[(o + k) * 3 + 2] = p[1]; }); }
    ctx.lampShadows = function () {
      var Ld = ctx.Ldir; m.uniforms.uA.value = 0.5 * U.uCloud.value.x; mesh.visible = m.uniforms.uA.value > 0.01; if (!mesh.visible || !Ld) return;
      var kx = -Ld.x / Math.max(0.2, Ld.y), kz = -Ld.z / Math.max(0.2, Ld.y);
      lampSh.forEach(function (L, i) { var X = L[0], Z = L[1], h = L[2], w = L[3], y = 0.14, hp = h - 6 * w, ht = h + 15 * w;
        quad(i * 8, X, Z, X + kx * hp, Z + kz * hp, 3.4 * w, y); quad(i * 8 + 4, X + kx * hp, Z + kz * hp, X + kx * ht, Z + kz * ht, 9.4 * w, y); });
      g.attributes.position.needsUpdate = true;
    };
  })();
  (function () {
    var al = ctx.aveLamps || []; if (!al.length) return;
    // the pool of light: a disc lying on the ground, warm in the middle, with a soft ink edge
    function poolMat(thr) { return new T.ShaderMaterial({ uniforms: { uPn: U.uPn, uThr: { value: thr } }, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3,
      vertexShader: 'varying vec2 vU; void main(){ vU = uv * 2. - 1.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'uniform float uPn, uThr; varying vec2 vU; void main(){ float on = smoothstep(uThr - .04, uThr + .04, uPn); float r = length(vU); float a = (1. - smoothstep(.2, .92, r)) * .5 + (1. - smoothstep(.0, .035, abs(r - .93))) * .38; vec3 c = mix(vec3(1., .82, .5), vec3(.35, .2, .1), (1. - smoothstep(.0, .04, abs(r - .93))) * step(.8, r)); gl_FragColor = vec4(c, a * on * step(r, 1.));\n#include <colorspace_fragment>\n}' }); }
    // the halo ring round the lantern
    var ringT = (function () { var S = canvasTex(64, 64, true), g = S.g; g.clearRect(0, 0, 64, 64); g.strokeStyle = 'rgba(255,226,170,0.95)'; g.lineWidth = 2.2; g.beginPath(); g.arc(32, 32, 26, 0, 6.2832); g.stroke(); g.strokeStyle = 'rgba(255,226,170,0.35)'; g.lineWidth = 5; g.beginPath(); g.arc(32, 32, 26, 0, 6.2832); g.stroke(); S.t.needsUpdate = true; return S.t; })();
    var rp = [], rt = [], mp = [], ma = [];
    al.forEach(function (l, i) {
      var pool = new T.Mesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat(l[4] || .5)); pool.scale.set(64 * l[3], 1, 30 * l[3]); pool.position.set(l[0], 0.12, l[2] + 4 * l[3]); pool.renderOrder = 2; pool.name = 'lamp-pool'; pool.userData.off = function () { return U.uPn.value <= pool.material.uniforms.uThr.value - .04; }; scene.add(pool);
      rp.push(l[0], l[1], l[2] + 0.6); rt.push(l[4] || .5);
      for (var k = 0; k < 5; k++) { mp.push(l[0], l[1], l[2]); ma.push(i * 5 + k, 1 + Math.random() * 2); }
    });
    (ctx.bridgeLamps || []).forEach(function (l) { rp.push(l[0], l[1], l[2] + 0.6); rt.push(l[4] || .5); });
    var rg = new T.BufferGeometry(); rg.setAttribute('position', new T.Float32BufferAttribute(rp, 3)); rg.setAttribute('aThr', new T.Float32BufferAttribute(rt, 1));
    var ring = new T.Points(rg, new T.ShaderMaterial({ uniforms: { uMap: { value: ringT }, uScale: U.uScale, uPn: U.uPn, uTime: U.uTime, uFog: U.uFog },
      vertexShader: 'attribute float aThr; uniform float uScale, uPn, uTime, uFog; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; vA = smoothstep(aThr - .04, aThr + .04, uPn) * (.55 + .15 * sin(uTime * 1.3 + aThr * 20.)); gl_PointSize = vA > .01 ? (1. + uFog * .9) * ' + (34 * al[0][3]).toFixed(3) + ' * uScale / max(-mv.z, 1.) : 0.; }',
      fragmentShader: 'uniform sampler2D uMap; varying float vA; void main(){ gl_FragColor = vec4(1., .9, .7, texture2D(uMap, gl_PointCoord).a * vA);\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false }));
    ring.frustumCulled = false; ring.renderOrder = 6; ring.name = 'lamp-halo'; scene.add(ring);
    var starP = new T.Points(rg, new T.ShaderMaterial({ uniforms: { uScale: U.uScale, uPn: U.uPn, uTime: U.uTime },
      vertexShader: 'attribute float aThr; uniform float uScale, uPn, uTime; varying float vA, vR; void main(){ vec4 mv = modelViewMatrix * vec4(position + vec3(0., 0., -.35), 1.); gl_Position = projectionMatrix * mv; vA = smoothstep(aThr - .04, aThr + .04, uPn); vR = uTime * .4 + aThr * 9.; gl_PointSize = vA > .01 ? ' + (16 * al[0][3]).toFixed(3) + ' * uScale / max(-mv.z, 1.) * (.85 + .15 * sin(uTime * 2. + aThr * 30.)) : 0.; }',
      fragmentShader: 'varying float vA, vR; void main(){ vec2 q = gl_PointCoord - .5; float c = cos(vR * .2), s = sin(vR * .2); q = mat2(c, -s, s, c) * q; vec2 a = abs(q); float st = max(1. - smoothstep(.42, .48, a.x + a.y * 9.), 1. - smoothstep(.42, .48, a.y + a.x * 9.)); st = max(st, 1. - smoothstep(.07, .11, length(q))); if (st < .05) discard; gl_FragColor = vec4(1., .98, .9, st * vA);\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false }));
    starP.frustumCulled = false; starP.renderOrder = 7; starP.name = 'lamp-stars'; scene.add(starP);
    var wetM = new T.ShaderMaterial({ uniforms: { uPn: U.uPn, uRain: U.uRain, uTime: U.uTime }, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3,
      vertexShader: 'attribute float aThr; varying vec2 vU; varying float vThr; void main(){ vU = uv; vThr = aThr; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'uniform float uPn, uRain, uTime; varying vec2 vU; varying float vThr; float h(float n){ return fract(sin(n * 91.7) * 43758.5); } void main(){ float on = smoothstep(vThr - .04, vThr + .04, uPn) * uRain; if (on < .01) discard; float row = floor(vU.y * 22.); float wob = (h(row + floor(uTime * 3.)) - .5) * .25; float w = (1. - smoothstep(.15, .5, abs(vU.x - .5 + wob))) * step(.3, h(row * 1.7 + vThr * 50.)) * (1. - smoothstep(.0, .9, vU.y));\n gl_FragColor = vec4(1., .84, .55, w * on * .9);\n#include <colorspace_fragment>\n}' });
    var wp = [], wuv = [], wthr = [], wix = [];
    al.concat(ctx.gardenLampList || []).forEach(function (l, i) { var x = l[0], z = l[2], hw = 1.1, len = 10; [[x - hw, 0.15, z], [x + hw, 0.15, z], [x + hw, 0.15, z + len], [x - hw, 0.15, z + len]].forEach(function (p) { wp.push(p[0], p[1], p[2]); wthr.push(l[4] || .5); }); wuv.push(0, 0, 1, 0, 1, 1, 0, 1); var o = i * 4; wix.push(o, o + 2, o + 1, o, o + 3, o + 2); });
    var wg = new T.BufferGeometry(); wg.setAttribute('position', new T.Float32BufferAttribute(wp, 3)); wg.setAttribute('uv', new T.Float32BufferAttribute(wuv, 2)); wg.setAttribute('aThr', new T.Float32BufferAttribute(wthr, 1)); wg.setIndex(wix);
    var wet = new T.Mesh(wg, wetM); wet.material.side = T.DoubleSide; wet.frustumCulled = false; wet.renderOrder = 2; wet.name = 'lamp-wet'; scene.add(wet);
    // moths circling the lanterns on summer nights
    var mg = new T.BufferGeometry(); mg.setAttribute('position', new T.Float32BufferAttribute(mp, 3)); mg.setAttribute('aM', new T.Float32BufferAttribute(ma, 2));
    var mothM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uOn: { value: 0 }, uR: { value: 10 * al[0][3] } },
      vertexShader: 'attribute vec2 aM; uniform float uTime, uScale, uOn, uR; varying float vA, vF; void main(){ float t = uTime * (1.6 + aM.y * .5) + aM.x * 2.4; vec3 p = position + vec3(cos(t) * uR * (.7 + .3 * sin(t * 2.3)), sin(t * 1.7) * uR * .6, sin(t) * uR * .5);\n' +
        ' vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; vA = uOn; gl_PointSize = vA > .01 ? .38 * uScale / max(-mv.z, 1.) : 0.; vF = abs(sin(uTime * 28. + aM.x * 3.)); }',
      fragmentShader: 'varying float vA, vF; void main(){ vec2 q = gl_PointCoord - .5; float body = length(q * vec2(5., 1.6)); float wing = length((vec2(abs(q.x), q.y) - vec2(.2, -.05)) * vec2(1.6 + 2. * (1. - vF), 2.2)); if (min(body, wing) > .5) discard; gl_FragColor = vec4(body < .5 ? vec3(.35, .28, .2) : vec3(.96, .92, .8), vA);\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
    var moths = new T.Points(mg, mothM); moths.frustumCulled = false; moths.renderOrder = 7; moths.name = 'moths'; scene.add(moths);
    ctx.moths = mothM;
  })();
  L.statue.forEach(function (st) { statue(solid, st[0], st[1], st[2], st[3], ctx); });
  L.boat.forEach(function (b, i) { mooredBoat(ctx, solid, b[0], b[1], b[2], b[3], i); });
  mesh(solid);
  (function () { var m = new T.Mesh(ctx.panelPB.geo(), paintMaterial(U, { pat: 'panel' })); m.name = 'pedestals'; m.castShadow = true; m.receiveShadow = true; scene.add(m); })();
}

export function statue(pb, x, y, s, flip, ctx) {
  var d = dOf(y) - 1, w = uu(d) * s, b = at(x, y, d), f = flip, X = b[0], Z = b[2];
  if (ctx) ctx.contacts.push([X, Z, 14 * w, 11 * w]);
  // the pedestal: mouldings and carved panels
  var pp = ctx.panelPB;
  pb.set('brL', 'brS'); pb.box(X - 11.5 * w, 0, Z - 9.5 * w, X + 11.5 * w, 2.2 * w, Z + 9.5 * w);
  pp.set('br', 'brS', 'brL', 'brS'); pp.boxW(X - 10 * w, 2.2 * w, Z - 8 * w, X + 10 * w, 21 * w, Z + 8 * w, 9.4 * w, 'fblr');
  pb.set('brL', 'brS'); pb.box(X - 11 * w, 21 * w, Z - 9 * w, X + 11 * w, 24.5 * w, Z + 9 * w);
  var hy = 24.5 * w;
  function P3(px, py, pz) { return [X + px * f * w, hy + py * w, Z + (pz || 0) * w]; }
  // the horse, rearing a little: body, chest, neck, head, mane, legs, tail (green bronze where the sun hits)
  pb.set('statue', 'statue', 'bqL');
  pb.blob(X + 0.5 * f * w, hy + 11 * w, Z, 9 * w, 4.3 * w, 3.6 * w, 1, 4);
  pb.blob(X + 6.5 * f * w, hy + 12.4 * w, Z, 4.2 * w, 4.4 * w, 3.4 * w, 1, 5);
  pb.beam(P3(8, 14), P3(11, 20.5), 2.3 * w, 1.4 * w);
  pb.beam(P3(10.8, 21.2), P3(14.6, 18.4), 1.55 * w, 0.95 * w);
  [-0.7, 0.7].forEach(function (ez) { pb.tri(P3(11, 22, ez), P3(11.6, 23.6, ez), P3(12, 21.8, ez)); });
  for (var m = 0; m < 4; m++) pb.tri(P3(8 + m * 0.8, 15.5 + m * 1.4, 0), P3(7.2 + m * 0.8, 17.2 + m * 1.4, 0), P3(8.7 + m * 0.8, 16.4 + m * 1.4, 0));
  [[-1.5, 1], [1.5, 0]].forEach(function (lg) {
    if (lg[1]) { pb.beam(P3(7, 9, lg[0]), P3(10, 7, lg[0]), 1.1 * w, 0.8 * w); pb.beam(P3(10, 7, lg[0]), P3(9.4, 4.6, lg[0]), 0.8 * w, 0.6 * w); }
    else pb.beam(P3(6, 9, lg[0]), P3(6.6, 0.3, lg[0]), 1.1 * w, 0.65 * w);
    pb.beam(P3(-5.5, 9, lg[0]), P3(-6.6, 4.4, lg[0]), 1.3 * w, 0.8 * w); pb.beam(P3(-6.6, 4.4, lg[0]), P3(-5.8, 0.3, lg[0]), 0.8 * w, 0.6 * w);
  });
  pb.beam(P3(-8, 12.5), P3(-10.8, 8.5), 0.9 * w, 0.6 * w); pb.beam(P3(-10.8, 8.5), P3(-10.2, 3.5), 0.6 * w, 0.25 * w);
  // the rider: torso, helmeted head, a raised sword arm, the other on the reins, legs at the horse's sides, a cloak
  pb.beam(P3(0.6, 14.5), P3(1.2, 22), 1.7 * w, 1.35 * w);
  pb.blob(X + 1.4 * f * w, hy + 23.9 * w, Z, 1.35 * w, 1.5 * w, 1.35 * w, 1, 6); pb.beam(P3(1.4, 24.8), P3(1.2, 27), 0.9 * w, 0.1 * w);
  pb.beam(P3(1.6, 21), P3(4.2, 25.6, 0.6), 0.6 * w, 0.5 * w); pb.beam(P3(4.2, 25.6, 0.6), P3(5.6, 31.5, 0.6), 0.25 * w, 0.12 * w);
  pb.beam(P3(1.4, 20.5, -0.5), P3(5.2, 16.5, -0.8), 0.55 * w, 0.45 * w);
  [-2.2, 2.2].forEach(function (lz) { pb.beam(P3(0.6, 15, lz * 0.7), P3(2, 10, lz * 1.25), 0.85 * w, 0.6 * w); });
  pb.tri(P3(0.2, 21.5, 1.6), P3(-4.5, 13.5, 2.4), P3(0.2, 21.5, -1.6)); pb.tri(P3(0.2, 21.5, -1.6), P3(-4.5, 13.5, -2.4), P3(-4.5, 13.5, 2.4));
}

// names painted on the hulls (made-up names)
export function hullNames() {
  if (hullNames.t) return hullNames.t;
  var S = canvasTex(1024, 384, true), g = S.g; S.t.wrapS = S.t.wrapT = T.ClampToEdgeWrapping; S.t.anisotropy = 4;
  g.clearRect(0, 0, 1024, 384); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  ['Petit Nuage', 'Clair de Seine', 'La Mouette Bleue'].forEach(function (n, i) { g.font = 'italic 700 92px Georgia, "Times New Roman", serif'; g.fillText(n, 512, 64 + i * 128); });
  S.t.needsUpdate = true; hullNames.t = S.t; return S.t;
}
export function mooredBoat(ctx, pb0, x0, y0, L_, kind, idx) {
  var P = ctx.P, d = ctx.waterD(y0), w = uu(d), a = at(x0, y0, d), Y = -ctx.WL, x1 = a[0] + L_ * w, z = a[2], dep = 7;
  var cx = (a[0] + x1) / 2, cz = z - dep / 2, pb = new PB(P), win = new PB(P), fl = new PB(P), R = rng(31 + idx);
  function L(p) { return [p[0] - cx, p[1] - Y, p[2] - cz]; }
  function box(x0_, y0_, z0_, x1_, y1_, z1_, faces) { pb.box(x0_ - cx, y0_ - Y, z0_ - cz, x1_ - cx, y1_ - Y, z1_ - cz, faces); }
  var g = new T.Group(), extras = {};
  if (kind === 'mouche') {
    pb.set('bh'); box(a[0] - 3 * w, Y - 0.6, z - dep, x1 + 6 * w, Y + 6 * w, z);
    pb.set('white'); box(a[0] - 3 * w, Y + 5.2 * w, z - 0.02, x1 + 6 * w, Y + 6 * w, z + 0.06);
    pb.set('bc'); box(a[0] + 8 * w, Y + 6 * w, z - dep * 0.85, x1 - 7 * w, Y + 15 * w, z - 0.4);
    win.set('bc', 'bc', null, 'ink', 'bw', 'ink'); win.sc = 20 + idx;
    var nW = Math.floor((L_ - 22) / 7);
    for (var k = 0; k < nW; k++) { var wx = a[0] + (12 + k * 7) * w; win.quad(L([wx, Y + 8 * w, z - 0.35]), L([wx + 5 * w, Y + 8 * w, z - 0.35]), L([wx + 5 * w, Y + 14 * w, z - 0.35]), L([wx, Y + 14 * w, z - 0.35]), [k, 0, k + 1, 0, k + 1, 1, k, 1]); }
    ctx.glows.add([cx, Y + 8 * w, z + 1], L_ * 1.2 * w, '#ffd38a', 0.3);
  } else {
    pb.set('iron'); box(a[0] - 2 * w, Y - 0.6, z - dep, x1 + 4 * w, Y + 7 * w, z);
    pb.set('awR'); box(a[0] - 2 * w, Y + 6.2 * w, z - 0.02, x1 + 4 * w, Y + 7 * w, z + 0.06);
    pb.set('bqL'); box(a[0] + 8 * w, Y + 7 * w, z - dep * 0.8, a[0] + (8 + L_ * 0.4) * w, Y + 14 * w, z - 0.5);
    pb.set('h4', 'hS'); box(a[0] + L_ * 0.6 * w, Y + 7 * w, z - dep * 0.8, a[0] + L_ * 0.9 * w, Y + 12 * w, z - 0.5);
    pb.set('iron'); box(a[0] + L_ * 0.58 * w, Y + 12 * w, z - dep * 0.85, a[0] + L_ * 0.92 * w, Y + 12.8 * w, z - 0.3);
    win.set('h4', 'hS', null, 'ink', 'wl', 'ink'); win.sc = 99;
    [0.62, 0.72].forEach(function (f, j) { win.quad(L([a[0] + L_ * f * w, Y + 8 * w, z - 0.45]), L([a[0] + (L_ * f + 4) * w, Y + 8 * w, z - 0.45]), L([a[0] + (L_ * f + 4) * w, Y + 11 * w, z - 0.45]), L([a[0] + L_ * f * w, Y + 11 * w, z - 0.45]), [j, 0, j + 1, 0, j + 1, 1, j, 1]); });
    // portholes along the hull (lit at night), plants in pots, a bicycle, laundry on a line
    for (k = 0; k < 6; k++) { var px = a[0] + (14 + k * L_ * 0.12) * w; pb.set('wl', 'wl'); pb.disc(L([px, Y + 3.2 * w, z + 0.05]), 1.1 * w, 'z', 10); pb.set('chrome'); pb.cyl(px - cx, 3.2 * w, z - cz + 0.02, 1.35 * w, 1.35 * w, 0.06, 10, 'z'); ctx.glows.add([px, Y + 3.2 * w, z + 0.4], 6 * w, '#ffd38a', 0.85); }
    for (k = 0; k < 4; k++) { var ppx = a[0] + (1 + k * 1.6) * w; pb.set('pot', 'chim'); pb.cyl(ppx - cx, 7 * w, -dep * 0.3 + (k % 2) * 1.2, 0.6 * w, 0.8 * w, 1.4 * w, 6); pb.set(k % 2 ? 'lf1' : 'lf2', 'lf3'); pb.blob(ppx - cx, 9.4 * w, -dep * 0.3 + (k % 2) * 1.2, 1.3 * w, 1.1 * w, 1.1 * w, 0, 20 + k); if (k % 2 === 0) { pb.set('fr'); pb.blob(ppx - cx + 0.4 * w, 10.2 * w, -dep * 0.3 + 0.6, 0.45 * w, 0.45 * w, 0.45 * w, 0, 9); } }
    var bx = a[0] + L_ * 0.52 * w - cx, by = 7 * w, bz = z - cz - 0.8;
    pb.set('car3'); [[0, 0], [3.2, 0]].forEach(function (c) { for (var r = 0; r < 10; r++) { var a0 = r / 10 * 6.2832, a1 = (r + 1) / 10 * 6.2832; pb.beam([bx + c[0] * w + Math.cos(a0) * 1.1 * w, by + 1.1 * w + Math.sin(a0) * 1.1 * w, bz], [bx + c[0] * w + Math.cos(a1) * 1.1 * w, by + 1.1 * w + Math.sin(a1) * 1.1 * w, bz], 0.1 * w); } });
    pb.beam([bx, by + 1.1 * w, bz], [bx + 1.4 * w, by + 2.6 * w, bz], 0.12 * w); pb.beam([bx + 1.4 * w, by + 2.6 * w, bz], [bx + 3.2 * w, by + 1.1 * w, bz], 0.12 * w); pb.beam([bx + 1.4 * w, by + 2.6 * w, bz], [bx + 2.9 * w, by + 2.8 * w, bz], 0.12 * w);
    var lx0 = a[0] + 10 * w - cx, lx1 = a[0] + (6 + L_ * 0.4) * w - cx, ly = 14 * w + 4 * w, lz = -dep * 0.3;
    pb.set('iron'); pb.beam([lx0, 14 * w, lz], [lx0, ly, lz], 0.12 * w); pb.beam([lx1, 14 * w, lz], [lx1, ly, lz], 0.12 * w); pb.beam([lx0, ly, lz], [lx1, ly - 0.4 * w, lz], 0.05 * w);
    ['awR', 'sea', 'white', 'by1', 'awG'].forEach(function (tk, j) { var cx0 = lerp(lx0, lx1, 0.12 + j * 0.17); fl.set(tk); fl.quad([cx0, ly - 3 * w, lz], [cx0 + 2.2 * w, ly - 3 * w, lz], [cx0 + 2.2 * w, ly - 0.2 * w, lz], [cx0, ly - 0.2 * w, lz], [0, 1, 1, 1, 1, 0, 0, 0]); });
    // a deck lamp near the bow, lit at night
    var dlx = a[0] + L_ * 0.47 * w - cx, dlz = -dep * 0.55; pb.set('iron'); pb.beam([dlx, 7 * w, dlz], [dlx, 12.5 * w, dlz], 0.14 * w); pb.set('lampG', 'lampG', null, 'iron'); pb.box(dlx - 0.6 * w, 12.5 * w, dlz - 0.6 * w, dlx + 0.6 * w, 14 * w, dlz + 0.6 * w); pb.set('iron'); pb.box(dlx - 0.8 * w, 14 * w, dlz - 0.8 * w, dlx + 0.8 * w, 14.4 * w, dlz + 0.8 * w);
    ctx.glows.add([a[0] + L_ * 0.47 * w, Y + 13.3 * w, cz + dlz + 0.4], 14 * w, '#ffd38a', 0.7, 'dusk', 0.5);
    // a cat on the wheelhouse roof, now and then
    var cat = new PB(P), cxr = a[0] + L_ * 0.75 * w - cx, cyr = 12.8 * w; cat.set('awW');
    cat.blob(cxr, cyr + 0.9 * w, 0, 1.6 * w, 0.9 * w, 0.8 * w, 1, 3); cat.blob(cxr + 1.6 * w, cyr + 1.9 * w, 0, 0.75 * w, 0.7 * w, 0.7 * w, 1, 4);
    cat.tri([cxr + 1.2 * w, cyr + 2.4 * w, 0], [cxr + 1.5 * w, cyr + 3.1 * w, 0], [cxr + 1.7 * w, cyr + 2.5 * w, 0]); cat.tri([cxr + 1.8 * w, cyr + 2.5 * w, 0], [cxr + 2.1 * w, cyr + 3.1 * w, 0], [cxr + 2.3 * w, cyr + 2.3 * w, 0]);
    cat.beam([cxr - 1.5 * w, cyr + 0.9 * w, 0], [cxr - 2.6 * w, cyr + 2.6 * w, 0], 0.25 * w, 0.15 * w);
    extras.cat = new T.Mesh(cat.geo(), ctx.mats.paint); g.add(extras.cat);
  }
  // ropes to the quay and fenders on the hull
  var qz = ctx.qz1 + 0.3, ropeT = [[a[0] + 2 * w, -1], [x1 - 2 * w, 1]];
  ropeT.forEach(function (r) {
    var p0 = [r[0], Y + (kind === 'mouche' ? 6 : 7) * w, z - dep], p1 = [r[0] - r[1] * 6, 0.25, qz]; pb.set('trk');
    var prev = L(p0); for (var k = 1; k <= 8; k++) { var t = k / 8, q = [lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t) - Math.sin(t * Math.PI) * 1.2, lerp(p0[2], p1[2], t)], lq = L(q); pb.beam(prev, lq, 0.06); prev = lq; }
    pb.set('iron'); pb.cyl(p1[0] - cx, 0.05 - Y, qz - cz, 0.18, 0.14, 0.45, 6);
  });
  pb.set('clad', 'clad', 'chrome');
  for (k = 0; k < 4; k++) { var fx = lerp(a[0] + 6 * w, x1 - 6 * w, (k + 0.5) / 4) - cx; pb.cyl(fx, 1.2 * w - 0.6, z - cz + 0.25, 0.32, 0.32, 1.6 * w + 0.4, 8); pb.beam([fx, 1.2 * w + 1.6 * w - 0.2, z - cz + 0.25], [fx, (kind === 'mouche' ? 6 : 7) * w, z - cz + 0.05], 0.03); }
  var body = new T.Mesh(pb.geo(), ctx.mats.paint), wm = new T.Mesh(win.geo(), paintMaterial(ctx.U, { pat: 'pax' })), fm = fl.v ? new T.Mesh(fl.geo(), paintMaterial(ctx.U, { side: T.DoubleSide, vkey: 'cloth', vsnip: '\ntransformed.z += sin(uTime * 3. + position.x * 3.) * uWind * .25 * uv.y;' })) : null;
  [body, wm].forEach(function (m) { m.castShadow = true; m.receiveShadow = true; g.add(m); }); if (fm) g.add(fm);
  // the name on the hull, near the bow
  var nm = new T.Mesh(new T.PlaneGeometry(22 * w, 22 * w * 128 / 1024), new T.MeshBasicMaterial({ map: hullNames(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  var uv = nm.geometry.attributes.uv; for (k = 0; k < uv.count; k++) uv.setY(k, (2 - idx + uv.getY(k)) / 3);
  nm.position.set(x1 - 16 * w - cx, 3.2 * w, z - cz + 0.08); nm.name = 'hull-name'; g.add(nm); extras.name = nm;
  g.position.set(cx, Y, cz); g.name = 'moored-' + idx; ctx.scene.add(g);
  (ctx.moored = ctx.moored || []).push({ g: g, ph: R() * 6.28, sp: 0.7 + R() * 0.6, ex: extras });
}


