import * as T from 'three';
import { ZC, dOf, gp, at, uu } from '../core/view.js';
import { lerp, rng } from '../core/util.js';
import { PB } from '../core/pb.js';

// ---------------------------------------------------------------- the Warsaw fountain: twenty cannons, twelve columns, edge jets and side arcs, spray and mist
// every jet is a bright core inside a pale see-through sheath with a trail of droplet beads; drops break off and fall; splash crowns where they land
export function buildFountain(ctx) {
  var L = ctx.L, U = ctx.U, P = ctx.P, group = new T.Group(), Y0 = -ctx.BWL + 0.05, R = rng(55);
  var pos = [], aT = [], aS = [], aW = [], aK = [], aO = [], aD = [], aB = [], idx = [], v = 0;
  var land = ctx.land = [];
  var dp = { a: [], b: [], c: [], base: [], m: [] }, nd = 0;   // beads and drops: the arc (a, b, c), its base, and (mode, kind, order, seed)
  var cr = { p: [], base: [], m: [] };                           // splash crowns
  var spr = { p: [], x: [], m: [] };                             // boiling crowns, mist, sparkles
  var cols = [];
  function bez(p0, c, p1, t) { return [0, 1, 2].map(function (k) { return (1 - t) * (1 - t) * p0[k] + 2 * (1 - t) * t * c[k] + t * t * p1[k]; }); }
  function ribbon(p0, c, p1, w0, w1, kind, n, base, order, layer) {
    for (var i = 0; i <= n; i++) {
      var t = i / n, q = bez(p0, c, p1, t);
      var dq = [0, 1, 2].map(function (k) { return 2 * (1 - t) * (c[k] - p0[k]) + 2 * t * (p1[k] - c[k]); });
      for (var s = -1; s <= 1; s += 2) { pos.push(q[0], q[1], q[2]); aD.push(dq[0], dq[1], dq[2]); aT.push(t); aS.push(s); aW.push(lerp(w0, w1, Math.pow(t, 1.4))); aK.push(kind); aO.push(order, layer); aB.push(base[0], base[1], base[2]); }
      if (i < n) idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      v += 2;
    }
  }
  function jet(p0, c, p1, w0, w1, kind, n, base, order) { ribbon(p0, c, p1, w0 * 1.9, w1 * 2.2, kind, n, base, order, 0); ribbon(p0, c, p1, w0 * 0.55, w1 * 0.5, kind, n, base, order, 1); }
  function drops(p0, c, p1, base, kind, order, nb, nf, sz) {
    var k;
    for (k = 0; k < nb; k++) { dp.a.push(p0[0], p0[1], p0[2]); dp.b.push(c[0], c[1], c[2]); dp.c.push(p1[0], p1[1], p1[2]); dp.base.push(base[0], base[1], base[2]); dp.m.push(0, kind, order, (k + R() * 0.6) / nb, sz); nd++; }
    for (k = 0; k < nf; k++) { dp.a.push(p0[0], p0[1], p0[2]); dp.b.push(c[0], c[1], c[2]); dp.c.push(p1[0], p1[1], p1[2]); dp.base.push(base[0], base[1], base[2]); dp.m.push(1, kind, order, R(), sz * 0.9); nd++; }
  }
  function crown(p, base, kind, order, size) { cr.p.push(p[0], p[1], p[2]); cr.base.push(base[0], base[1], base[2]); cr.m.push(kind, order, size, R()); }
  // the twenty cannons: from the near end of the basin, arcing toward the tower; they start one after another
  L.cannon.forEach(function (j, i) {
    var p0 = gp(j[0], j[1], Y0), p1 = gp(j[4], j[5], Y0), dm = ZC - (p0[2] + p1[2]) / 2, cm = at(j[2], j[3], dm), c = [cm[0], cm[1], (p0[2] + p1[2]) / 2];
    jet(p0, c, p1, 2.6 * uu(ZC - p0[2]), 8 * uu(ZC - p1[2]), 0, 28, p0, i);
    drops(p0, c, p1, p0, 0, i, 9, 8, 0.32);
    crown(p1, p0, 0, i, 1.9); land.push([p1[0], p1[2], 0, R()]);
  });
  // twelve tall columns, with water falling back in strands
  L.column.forEach(function (j, i) {
    var d = dOf(j[1]), b = gp(j[0], j[1], Y0), h = j[3] * uu(d), w = uu(d) * j[2];
    jet(b, [b[0], b[1] + h * 0.6, b[2]], [b[0], b[1] + h, b[2]], 6.4 * w, 2.4 * w, 1, 12, b, i);
    for (var s = 0; s < 4; s++) { var an = s / 4 * 6.2832 + 0.4, ca = Math.cos(an), sa = Math.sin(an) * 0.8;
      ribbon([b[0] + ca * 2 * w, b[1] + h * 0.96, b[2] + sa * 2 * w], [b[0] + ca * 9 * w, b[1] + h * 0.5, b[2] + sa * 9 * w], [b[0] + ca * 11 * w, b[1], b[2] + sa * 11 * w], 1.2 * w, 1.6 * w, 2, 10, b, i, s % 2 ? 0 : 1); }
    cols.push([b, h, w, i]);
    for (var k = 0; k < 14; k++) { dp.a.push(b[0], b[1], b[2]); dp.b.push(h, w, 0); dp.c.push(0, 0, 0); dp.base.push(b[0], b[1], b[2]); dp.m.push(2, 1, i, R(), 0.3); nd++; }
    for (k = 0; k < 11; k++) { var aa = R() * 6.2832, rr = (1.5 + R() * 3) * w; spr.p.push(b[0], b[1], b[2]); spr.x.push(Math.cos(aa) * rr, (R() - 0.2) * 4.5 * w, Math.sin(aa) * rr * 0.8, h); spr.m.push(0, i, R(), (2.2 + R() * 2) * w); }
    for (k = 0; k < 3; k++) { spr.p.push(b[0], b[1], b[2]); spr.x.push((R() - 0.5) * 6 * w, 2 * w, (R() - 0.5) * 4 * w, 0); spr.m.push(1, i, R(), (16 + R() * 10) * w); }
    ctx.jetGlows = ctx.jetGlows || []; ctx.jetGlows.push(ctx.glows.add([b[0], b[1] + h * 0.5, b[2] + 0.2], 20 * w, '#ffffff', 0.5, 'jet'));
    land.push([b[0], b[2], 1, R()]);
  });
  // small edge jets that pulse in a ripple down the basin
  L.edge.forEach(function (j, i) {
    var d = dOf(j[1]), b = gp(j[0], j[1], Y0), w = uu(d) * j[2];
    jet(b, [b[0], b[1] + 15 * w, b[2]], [b[0], b[1] + 30 * w, b[2]], 3.2 * w, 1.4 * w, 4, 6, b, i);
    drops(b, [b[0] + 2 * w, b[1] + 30 * w, b[2]], [b[0] + 4 * w, b[1], b[2]], b, 4, i, 0, 3, 0.18);
    crown([b[0], b[1], b[2]], b, 4, i, 0.7); land.push([b[0], b[2], 2, R()]);
  });
  // side arcs from the rim into the basin
  L.arc.forEach(function (j, i) {
    var d = dOf(j[1]), w = uu(d) * j[3], a = gp(j[0], j[1], 0.36), b = gp(j[2], j[1] + 2, Y0), cm = at((j[0] + j[2]) / 2, j[1] - 46 * j[3], d), c = [cm[0], cm[1], (a[2] + b[2]) / 2];
    jet(a, c, b, 3.2 * w, 3.2 * w, 3, 14, a, i);
    drops(a, c, b, a, 3, i, 5, 3, 0.2);
    crown(b, a, 3, i, 0.9); land.push([b[0], b[2], 3, R()]);
  });
  var g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aT', new T.Float32BufferAttribute(aT, 1)); g.setAttribute('aS', new T.Float32BufferAttribute(aS, 1));
  g.setAttribute('aW', new T.Float32BufferAttribute(aW, 1)); g.setAttribute('aK', new T.Float32BufferAttribute(aK, 1)); g.setAttribute('aO', new T.Float32BufferAttribute(aO, 2));
  g.setAttribute('aD', new T.Float32BufferAttribute(aD, 3)); g.setAttribute('aB', new T.Float32BufferAttribute(aB, 3)); g.setIndex(idx);
  // shared GLSL: how far each jet reaches (the pressure rising one cannon after another, sinking back when the show ends) and how tall the columns stand
  var JS = 'uniform float uTime, uLeap, uHalf, uFount, uPat, uWind;\n' +
    'float onOf(float k, float o){ return k < .5 ? clamp(uFount * 2. - o * .045, 0., 1.) : clamp(uFount * 1.7 - .35 - o * .02, 0., 1.); }\n' +
    'float hsOf(float k, float o, float t, float z){ if (k > .5 && k < 2.5) return 1. + uLeap * .9 * t + .05 * sin(uTime * 2.4 + o * 1.7) * t + uPat * .55 * sin(uTime * 1.2 - o * .9) * t; if (k > 3.5) return .62 + .38 * (.5 + .5 * sin(uTime * 2.2 - z * .22)); return 1.; }\n' +
    'bool rests(float k, float o){ return k < .5 && uHalf > .5 && mod(o, 2.) < .5; }\n';
  var jm = new T.ShaderMaterial({
    uniforms: { uPal: U.uPal, uTime: U.uTime, uFount: U.uFount, uJet: { value: P.i('jet') }, uWL: { value: P.i('waterL') }, uLeap: U.uLeap, uHalf: U.uHalf, uPat: U.uPat, uWind: U.uWind, uPn: U.uPn, uFL: U.uFL },
    vertexShader: 'attribute float aT, aS, aW, aK; attribute vec2 aO; attribute vec3 aD, aB; varying float vT, vS, vK, vL, vI;\n' + JS +
      'void main(){ vT = aT; vS = aS; vK = aK; vL = aO.y; vI = aO.x; float on = onOf(aK, aO.x);\n' +
      ' vec3 p = position - aB; if ((aK > .5 && aK < 2.5) || aK > 3.5) p.y *= hsOf(aK, aO.x, aK > 1.5 && aK < 2.5 ? 1. : aT, aB.z);\n' +
      ' p *= on; p.x += (sin(uTime * 3.1 + aO.x * 1.3 + aT * 4.) * .05 + uWind * .07 * aT) * aT * (aK < .5 ? 1.6 : 1.) * on; p.z += cos(uTime * 2.7 + aO.x) * .03 * aT * on; p += aB;\n' +
      ' vec4 mv = modelViewMatrix * vec4(p, 1.);\n' +
      ' vec2 tv = (modelViewMatrix * vec4(aD, 0.)).xy; tv = length(tv) > 1e-5 ? normalize(tv) : vec2(0., 1.); mv.xy += vec2(-tv.y, tv.x) * aS * aW * .5 * (.4 + .6 * on);\n' +
      ' gl_Position = projectionMatrix * mv; if (on < .02 || rests(aK, aO.x)) gl_Position = vec4(2., 2., 2., 1.); }',
    fragmentShader: 'uniform sampler2D uPal; uniform float uTime, uJet, uWL, uPn; uniform vec3 uFL; varying float vT, vS, vK, vL, vI;\n' +
      'vec3 pal(float i){ return texelFetch(uPal, ivec2(int(i + .5), 0), 0).rgb; }\n' +
      'void main(){ float ed = abs(vS); vec3 c = pal(uJet); float a;\n' +
      // the sheath: pale and see-through, with soft streaks running up it
      ' if (vL < .5) { a = (1. - smoothstep(.5, 1., ed)) * (.2 + .1 * sin(vT * 38. - uTime * 9. + vI)); c = mix(c, pal(uWL), .3); }\n' +
      // the core: bright, with a dash running along it
      ' else { a = (1. - smoothstep(.6, 1., ed)) * .95; float dash = step(fract(vT * 9. - uTime * 2.4 + vI * .37), .42) * (1. - smoothstep(0., .45, ed)); c = mix(c, pal(uWL), dash * .55); c = mix(c, vec3(1.), (1. - smoothstep(.0, .4, ed)) * .45); }\n' +
      ' if (vK < .5) a *= smoothstep(0., .04, vT);\n' +
      // at night the water glows from inside, lit from the basin below
      ' c = mix(c, uFL * 1.1 + .12, uPn * clamp(.62 - .35 * vT, 0., 1.)); a = min(1., a * (1. + uPn * .25));\n' +
      ' gl_FragColor = vec4(c, a);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false, side: T.DoubleSide
  });
  var jets = new T.Mesh(g, jm); jets.frustumCulled = false; jets.renderOrder = 3; jets.name = 'jets'; group.add(jets);

  // beads riding the arcs, drops breaking off and falling, water falling back from the columns
  var dg = new T.BufferGeometry(); dg.setAttribute('position', new T.Float32BufferAttribute(dp.a, 3)); dg.setAttribute('aC', new T.Float32BufferAttribute(dp.b, 3)); dg.setAttribute('aE', new T.Float32BufferAttribute(dp.c, 3));
  dg.setAttribute('aB', new T.Float32BufferAttribute(dp.base, 3)); var mm = new Float32Array(nd * 4), ms = new Float32Array(nd); for (var q = 0; q < nd; q++) { mm.set(dp.m.slice(q * 5, q * 5 + 4), q * 4); ms[q] = dp.m[q * 5 + 4]; }
  dg.setAttribute('aM', new T.BufferAttribute(mm, 4)); dg.setAttribute('aSz', new T.BufferAttribute(ms, 1));
  var dm = new T.ShaderMaterial({
    uniforms: { uTime: U.uTime, uFount: U.uFount, uLeap: U.uLeap, uHalf: U.uHalf, uPat: U.uPat, uWind: U.uWind, uScale: U.uScale, uPn: U.uPn, uFL: U.uFL, uY0: { value: Y0 - 0.05 } },
    vertexShader: 'attribute vec3 aC, aE, aB; attribute vec4 aM; attribute float aSz; uniform float uScale, uPn, uY0; varying float vA, vM;\n' + JS +
      'vec3 bez(vec3 a, vec3 b, vec3 c, float t){ return (1. - t) * (1. - t) * a + 2. * (1. - t) * t * b + t * t * c; }\n' +
      'vec3 bd(vec3 a, vec3 b, vec3 c, float t){ return 2. * (1. - t) * (b - a) + 2. * t * (c - b); }\n' +
      'void main(){ float mode = aM.x, k = aM.y, o = aM.z, sd = aM.w; float on = onOf(k, o); vec3 p; vA = 0.; vM = mode;\n' +
      ' if (mode < .5) { float t = fract(sd + uTime * (k < .5 ? .42 : .6)); p = bez(position, aC, aE, t); p += vec3(sin(sd * 40. + uTime * 7.), cos(sd * 30. + uTime * 6.), 0.) * .08 * t; vA = .9 * smoothstep(.0, .06, t) * (1. - smoothstep(.9, 1., t)); }\n' +
      ' else if (mode < 1.5) { float T = 1.4; float tau = fract(uTime / T + sd * 7.31) * T; float t0 = .35 + .55 * fract(sd * 13.7); vec3 b0 = bez(position, aC, aE, t0); vec3 dv = bd(position, aC, aE, t0);\n' +
      '   vec2 hv = length(dv.xz) > 1e-4 ? normalize(dv.xz) : vec2(0.); p = b0 + vec3(hv.x * 1.6 + uWind * .5, 0., hv.y * 1.6) * tau + vec3(sin(sd * 50.) * .4, dv.y * .03 * tau - 4.9 * tau * tau, cos(sd * 70.) * .3) ;\n' +
      '   vA = .85 * smoothstep(uY0, uY0 + .25, p.y) * smoothstep(0., .1, tau); }\n' +
      ' else { float T = 1.5; float tau = fract(uTime / T + sd * 5.17) * T; float h = aC.x * hsOf(1., o, 1., 0.); float an = sd * 6.2832 * 3.; vec3 top = position + vec3(0., h, 0.);\n' +
      '   p = top + vec3(cos(an), 0., sin(an) * .8) * (.6 + fract(sd * 9.) * 1.6) * tau + vec3(uWind * .4 * tau, 1.2 * tau - 4.9 * tau * tau, 0.); vA = .85 * smoothstep(uY0, uY0 + .3, p.y); }\n' +
      ' p = aB + (p - aB) * (mode > 1.5 ? 1. : on); if (mode > 1.5) p.y = aB.y + (p.y - aB.y) * on;\n' +
      ' if (on < .3 || rests(k, o)) vA = 0.;\n' +
      ' vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? aSz * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform float uPn; uniform vec3 uFL; varying float vA, vM; void main(){ vec2 q = gl_PointCoord - .5; q.y *= vM > .5 ? .75 : 1.; float d = length(q) * 2.; if (d > 1.) discard;\n' +
      ' vec3 c = mix(vec3(.9, .96, 1.), uFL * 1.1 + .1, uPn * .6); c = mix(c, vec3(1.), (1. - smoothstep(.0, .45, length(q + vec2(.12, .12)) * 2.)) * .6);\n' +
      ' gl_FragColor = vec4(c, vA * (1. - smoothstep(.75, 1., d)));\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false
  });
  var dpts = new T.Points(dg, dm); dpts.frustumCulled = false; dpts.renderOrder = 4; dpts.name = 'jet-drops'; group.add(dpts);

  // splash crowns where the jets hit the water
  var cg = new T.BufferGeometry(); cg.setAttribute('position', new T.Float32BufferAttribute(cr.p, 3)); cg.setAttribute('aB', new T.Float32BufferAttribute(cr.base, 3)); cg.setAttribute('aM', new T.Float32BufferAttribute(cr.m, 4));
  var cmM = new T.ShaderMaterial({
    uniforms: { uTime: U.uTime, uFount: U.uFount, uLeap: U.uLeap, uHalf: U.uHalf, uPat: U.uPat, uWind: U.uWind, uScale: U.uScale, uPn: U.uPn, uFL: U.uFL, uPal: U.uPal, uJet: { value: P.i('jet') } },
    vertexShader: 'attribute vec3 aB; attribute vec4 aM; uniform float uScale; varying float vA, vPh, vSd;\n' + JS +
      'void main(){ float k = aM.x, o = aM.y; float on = onOf(k, o); vec3 p = aB + (position - aB) * on; vSd = aM.w; vPh = fract(uTime * (k < .5 ? 1.7 : 2.3) + aM.w);\n' +
      ' float hs = k > 3.5 ? hsOf(k, o, 1., aB.z) : 1.; vA = (k < .5 ? smoothstep(.92, 1., on) : smoothstep(.3, .8, on)) * (rests(k, o) ? 0. : 1.);\n' +
      ' p.y += aM.z * .35 * hs; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? aM.z * hs * (.9 + .2 * sin(vPh * 6.28)) * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uPal; uniform float uJet, uPn; uniform vec3 uFL; varying float vA, vPh, vSd; vec3 pal(float i){ return texelFetch(uPal, ivec2(int(i + .5), 0), 0).rgb; }\n' +
      'void main(){ vec2 q = gl_PointCoord - .5; q.y = -q.y; float m = 0.;\n' +
      // a mound of white water at the bottom, five spikes thrown up and out round it, a few loose drops
      ' m = max(m, 1. - smoothstep(.0, .04, length((q - vec2(0., -.38)) / vec2(.42, .1)) - 1.));\n' +
      ' for (int i = 0; i < 5; i++) { float fi = float(i) - 2.; float hh = (.45 + .25 * fract(vSd * 7. + fi * .31)) * (.75 + .25 * sin(vPh * 6.28 + fi)); vec2 b0 = vec2(fi * .13, -.36); vec2 tip = vec2(fi * .2, -.36 + hh);\n' +
      '   vec2 pa = q - b0, ba = tip - b0; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); float wd = mix(.05, .008, h); m = max(m, 1. - smoothstep(wd, wd + .02, length(pa - ba * h)));\n' +
      '   m = max(m, 1. - smoothstep(.02, .035, length(q - tip - vec2(fi * .03, .06 + .05 * vPh)))); }\n' +
      ' if (m < .05) discard; vec3 c = mix(mix(pal(uJet), vec3(1.), .5), uFL * 1.1 + .1, uPn * .6); gl_FragColor = vec4(c, m * vA * .9);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false
  });
  var crowns = new T.Points(cg, cmM); crowns.frustumCulled = false; crowns.renderOrder = 4; crowns.name = 'splash-crowns'; group.add(crowns);

  // spray: boiling crowns on the columns, a mist drifting with the wind over the landing zone, droplets catching ✦ in the sun
  var land0 = L.cannon.map(function (j) { return j[4]; }), lo = Math.min.apply(null, land0), hi = Math.max.apply(null, land0), k2;
  for (k2 = 0; k2 < 26; k2++) { var mp = gp(lo - 18 + R() * (hi - lo + 36), 1256 + (R() - 0.5) * 14, Y0 + 0.3); spr.p.push(mp[0], mp[1], mp[2]); spr.x.push(0, R() * 1.5, 0, 0); spr.m.push(1, -1, R(), (9 + R() * 9) * uu(ZC - mp[2])); }
  for (k2 = 0; k2 < 150; k2++) { var sq = gp(lo - 24 + R() * (hi - lo + 48), 1236 + R() * 30, Y0 + R() * 3.5); spr.p.push(sq[0], sq[1], sq[2]); spr.x.push(0, 0, 0, 0); spr.m.push(2, 0, R(), 0.34); }
  cols.forEach(function (cc) { for (var k = 0; k < 6; k++) { spr.p.push(cc[0][0], cc[0][1], cc[0][2]); spr.x.push((R() - 0.5) * 5 * cc[2], (0.85 + R() * 0.2), (R() - 0.5) * 4 * cc[2], cc[1]); spr.m.push(3, cc[3], R(), 0.3); } });
  var sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(spr.p, 3)); sg.setAttribute('aX', new T.Float32BufferAttribute(spr.x, 4)); sg.setAttribute('aM', new T.Float32BufferAttribute(spr.m, 4));
  var sm = new T.ShaderMaterial({
    uniforms: { uPal: U.uPal, uTime: U.uTime, uScale: U.uScale, uFount: U.uFount, uLeap: U.uLeap, uHalf: U.uHalf, uPat: U.uPat, uWind: U.uWind, uPn: U.uPn, uFL: U.uFL, uSun: U.uCloud, uJet: { value: P.i('jet') }, uMist: { value: P.i('mist') } },
    vertexShader: 'attribute vec4 aX, aM; uniform float uScale, uPn; uniform vec3 uSun; varying float vA, vMode, vF;\n' + JS +
      'void main(){ float mode = aM.x, o = aM.y, sd = aM.z; vec3 p = position; float sz = aM.w; vMode = mode; vF = 0.;\n' +
      ' if (mode < .5) { float on = onOf(1., o); float h = aX.w * hsOf(1., o, 1., 0.) * on; float b = 1. + .3 * sin(uTime * 5. + sd * 30.); p += vec3(aX.x * b, h + aX.y * b, aX.z * b); sz *= .8 + .35 * sin(uTime * 3.7 + sd * 20.); vA = .8 * smoothstep(.4, .8, on); }\n' +
      ' else if (mode < 1.5) { float f = fract(uTime * .07 * (.5 + uWind) + sd); p += vec3(f * (3. + 4. * uWind), aX.y + f * 1.2, (sd - .5) * 2.); float on = o > -.5 ? onOf(1., o) : smoothstep(.85, 1., uFount); vA = .2 * sin(f * 3.1416) * on; sz *= .8 + .5 * f; }\n' +
      ' else if (mode < 2.5) { float f = fract(uTime * .5 + sd * 3.); p += vec3(f * 1.5 * uWind, -f * 1.6, 0.); vA = .9 * smoothstep(.9, 1., uFount) * (1. - f); vF = step(.6, fract(sd * 17.)) * (1. - uPn) * uSun.x; }\n' +
      ' else { float on = onOf(1., o); float h = aX.w * hsOf(1., o, 1., 0.) * on; float f = fract(uTime * .6 + sd * 5.); p += vec3(aX.x * (1. + f), h * aX.y - f * 2.5, aX.z * (1. + f)); vA = .9 * smoothstep(.5, .9, on) * (1. - f); vF = step(.5, fract(sd * 13.)) * (1. - uPn) * uSun.x; }\n' +
      ' if (vF > .01) sz *= 2.6 * (.6 + .4 * sin(uTime * 9. + sd * 40.));\n' +
      ' vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .005 ? sz * 2. * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uPal; uniform float uJet, uMist, uPn; uniform vec3 uFL; varying float vA, vMode, vF; vec3 pal(float i){ return texelFetch(uPal, ivec2(int(i + .5), 0), 0).rgb; }\n' +
      'void main(){ vec2 q = gl_PointCoord - .5; vec3 c = mix(pal(uJet), vec3(1.), .3); float a;\n' +
      ' if (vF > .01) { vec2 aq = abs(q); float st = max(1. - smoothstep(.0, .05, aq.x * 6. + aq.y) , 1. - smoothstep(.0, .05, aq.y * 6. + aq.x)); st = max(st, 1. - smoothstep(.06, .12, length(q))); if (st < .05) discard; gl_FragColor = vec4(1., 1., .95, st * vA); return; }\n' +
      ' if (vMode > .5 && vMode < 1.5) { float d = length(q) * 2.; if (d > 1.) discard; c = mix(pal(uMist), vec3(1.), .4); a = (1. - smoothstep(.2, 1., d)) * vA; }\n' +
      ' else { q.y *= 1.4; float d = length(q) * 2.; if (d > 1.) discard; a = vA * (1. - smoothstep(.72, 1., d)); c = mix(c, vec3(1.), (1. - smoothstep(.0, .5, length(q + vec2(.1, .12)) * 2.)) * .5); }\n' +
      ' c = mix(c, uFL * 1.1 + .1, uPn * .65); gl_FragColor = vec4(c, a);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false
  });
  var spray = new T.Points(sg, sm); spray.frustumCulled = false; spray.renderOrder = 4; spray.name = 'spray'; group.add(spray);
  var c0 = gp(430, 1270, 0.6); ctx.jetGlows.push(ctx.glows.add([c0[0], 2, c0[2]], 400 * uu(ZC - c0[2]), '#ffffff', 0.35, 'jet'));

  // a small rainbow in the mist over the landing zone, by day when the sun is out
  var rbM = new T.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, side: T.DoubleSide,
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vU; vec3 hue(float h){ return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); } void main(){ vec2 q = vU * 2. - vec2(1., 0.); float r = length(q); float b = (r - .8) / .2; if (b < 0. || b > 1. || q.y < 0.) discard; gl_FragColor = vec4(hue(.8 - b * .8), uA * sin(b * 3.1416) * .5 * smoothstep(.0, .35, q.y));\n#include <colorspace_fragment>\n}' });
  var lz = gp(430, 1256, Y0), rbw = new T.Mesh(new T.PlaneGeometry(10, 5), rbM); rbw.position.set(lz[0], Y0 + 2.45, lz[2] + 1.5); rbw.renderOrder = 4; rbw.name = 'fountain-rainbow'; group.add(rbw);

  // the cannon nozzles at the near end of the basin
  var nz = new PB(P); nz.set('statue', 'iron', 'goldL', 'ink');
  L.cannon.forEach(function (j) {
    var p0 = gp(j[0], j[1], Y0), p1 = gp(j[4], j[5], Y0), dm = ZC - (p0[2] + p1[2]) / 2, cm = at(j[2], j[3], dm), dx = cm[0] - p0[0], dy = cm[1] - p0[1], dz = (p0[2] + p1[2]) / 2 - p0[2], l = Math.hypot(dx, dy, dz);
    nz.beam([p0[0] - dx / l * 0.45, Y0 - 0.25, p0[2] - dz / l * 0.45], [p0[0], p0[1] + 0.02, p0[2]], 0.12, 0.08); nz.cyl(p0[0], Y0 - 0.05, p0[2], 0.2, 0.2, 0.06, 8);
  });
  var nzm = new T.Mesh(nz.geo(), ctx.mats.paint); nzm.name = 'nozzles'; nzm.castShadow = true; ctx.scene.add(nzm);

  // people sitting on the rim in summer
  var bw = ctx.basin, sit = new PB(P), tops = ['awR', 'sea', 'gold', 'petal', 'awW', 'h1'];
  [[-1, 0.22], [-1, 0.47], [-1, 0.71], [1, 0.3], [1, 0.58], [1, 0.84]].forEach(function (s, i) {
    var e0 = s[0] < 0 ? bw[0] : bw[1], e1 = s[0] < 0 ? bw[3] : bw[2], x = lerp(e0[0], e1[0], s[1]) + s[0] * 0.55, z = lerp(e0[2], e1[2], s[1]), o = s[0];
    sit.set(tops[i % tops.length]); sit.box(x - 0.17, 0.5, z - 0.2, x + 0.17, 1.08, z + 0.2);
    sit.set(i % 2 ? 'ink' : 'sea'); sit.box(Math.min(x, x + o * 0.5), 0.46, z - 0.18, Math.max(x, x + o * 0.5), 0.6, z + 0.18); sit.box(Math.min(x + o * 0.4, x + o * 0.55), 0.06, z - 0.17, Math.max(x + o * 0.4, x + o * 0.55), 0.55, z - 0.02); sit.box(Math.min(x + o * 0.4, x + o * 0.55), 0.06, z + 0.02, Math.max(x + o * 0.4, x + o * 0.55), 0.55, z + 0.17);
    sit.set('skin'); sit.blob(x + o * 0.02, 1.25, z, 0.14, 0.17, 0.14, 1, 20 + i); sit.set(i % 3 ? 'h1' : 'h3'); sit.blob(x - o * 0.02, 1.34, z, 0.15, 0.1, 0.15, 1, 30 + i);
    sit.set('skin'); sit.beam([x, 1.0, z + 0.2], [x + o * 0.25, 0.62, z + 0.25], 0.05);
  });
  var sitters = new T.Mesh(sit.geo(), ctx.mats.paint); sitters.name = 'rim-sitters'; sitters.castShadow = true; ctx.scene.add(sitters);

  ctx.scene.add(group);
  group.update = function (st, now) {
    var day = st.sky !== 'night', sunOut = day && st.wx !== 'rain' && st.wx !== 'fog' && st.wx !== 'snow';
    sitters.visible = st.season === 'summer' && day && st.wx !== 'rain';
    var m = ctx.minutes || 780, lowSun = m < 690 || m > 960;
    rbM.uniforms.uA.value = sunOut ? U.uFount.value * (1 - st.pn) * (lowSun ? 1 : 0.75) : 0;
  };
  return group;
}
