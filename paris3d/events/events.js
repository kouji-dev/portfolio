import * as T from 'three';
import { EX, F, ZC, dOf, gp, at, TW_U } from '../core/view.js';
import { clamp, lerp, rng } from '../core/util.js';
import { PB } from '../core/pb.js';
import { buildSleighTeam } from './sleigh.js';
import { state } from '../state.js';

// ---------------------------------------------------------------- events and moments in 3D: the scene reacts to the skins (light, reflections, glass),
// and the flying moments become flat painted cut-outs moving round the tower, so they pass behind it and cast shadows
export function mirrorSel(sel) { return sel.replace(/(^|[\s>+~])(g|path|circle|ellipse|rect|text)(?=[\s.:#>+~]|$)/g, '$1s[data-n="$2"]'); }
export function svgCutout(host, sel, scaleUp, cb) {
  // rasterise one of the painting's own drawings (the figure only) into a texture, in its computed colours
  var r = state.vec && state.vec.cutout(mirrorSel(sel), scaleUp || 6); if (!r) return null;
  var t = new T.CanvasTexture(r.cv); t.colorSpace = T.SRGBColorSpace;
  var out = { tex: t, w: r.w, h: r.h, cx: r.cx, cy: r.cy, ok: true }; if (cb) cb(out);
  return out;
}
export function spriteMesh(cut, worldW, castShadow) {
  // a flat painted cut-out: always faces us, with an alpha-tested shadow
  var aspect = cut.h / cut.w, g = new T.PlaneGeometry(1, aspect);
  var m = new T.MeshBasicMaterial({ map: cut.tex, transparent: true, alphaTest: 0.35, side: T.DoubleSide, depthWrite: true, fog: false });
  var mesh = new T.Mesh(g, m); mesh.scale.setScalar(worldW); mesh.frustumCulled = false; mesh.renderOrder = 6; mesh.visible = false;
  if (castShadow) { mesh.castShadow = true; mesh.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: cut.tex, alphaTest: 0.35, side: T.DoubleSide }); }
  return mesh;
}

export function buildEvents(ctx, renderer) {
  var U = ctx.U, P = ctx.P, scene = ctx.scene, host = ctx.host, R = rng(2024), u = TW_U, i, k;
  var E = {};

  // ---- Halloween: jack-o'-lanterns whose candle light flickers on the ground and on the faces around them
  var pk = [];
  [[326, 1031], [350, 1031], [386, 1031], [474, 1031], [510, 1031], [534, 1031], [392, 1025], [468, 1025],
    [172, 1172], [650, 1172], [326, 1171], [534, 1171], [138, 1250], [162, 1258], [700, 1250], [724, 1258]].forEach(function (p) { pk.push(gp(p[0], p[1], 0.5)); });
  for (var sd = -1; sd <= 1; sd += 2) for (k = 0; k < 9; k += 2) { var t_ = k / 8, y_ = 1186 + t_ * 150, x_ = 430 + sd * (128 + 120 * t_ + 26) - sd * (10 + 12 * t_); pk.push(gp(x_, y_ + 8 + 6 * t_, 0.4)); }
  [60, 210, 650, 800].forEach(function (lx) { var p = gp(lx + 6, 1158, 0); p[1] = 2.6; pk.push(p); });
  pk.slice(0, 24).forEach(function (p, j) { U.uHw.value[j].set(p[0], p[1], p[2], R() * 6.28); });
  // low purple fog creeping through the gardens; green wisps over the basin
  var fp = [], fa = [];
  for (i = 0; i < 90; i++) { var gz = 470 + R() * 110, gx = (R() < 0.5 ? -1 : 1) * (9 + R() * 50); fp.push(gx, 0.35 + R() * 0.5, gz); fa.push(R() * 6.28, 0, 5 + R() * 6); }
  for (i = 0; i < 40; i++) { fp.push((R() - 0.5) * 36, 0.2, 478 + R() * 80); fa.push(R() * 6.28, 1, 2.5 + R() * 3); }
  var fgeo = new T.BufferGeometry(); fgeo.setAttribute('position', new T.Float32BufferAttribute(fp, 3)); fgeo.setAttribute('aF', new T.Float32BufferAttribute(fa, 3));
  var hfM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uA: { value: 0 } },
    vertexShader: 'attribute vec3 aF; uniform float uTime, uScale, uA; varying float vA, vK; void main(){ vK = aF.y; vec3 p = position; float f = 0.;\n' +
      ' if (aF.y < .5) { p.x += sin(uTime * .05 + aF.x) * 6. + uTime * .25 - floor((uTime * .25 + 40.) / 80.) * 80. * 0.; p.z += cos(uTime * .04 + aF.x * 2.) * 4.; vA = uA * (.5 + .5 * sin(uTime * .2 + aF.x)); }\n' +
      ' else { f = fract(uTime * .08 + aF.x); p += vec3(sin(uTime * .5 + aF.x * 3.) * 1.5, f * 3., cos(uTime * .4 + aF.x) * 1.2); vA = uA * sin(f * 3.1416); }\n' +
      ' vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? aF.z * (aF.y < .5 ? 1. : .6 + f) * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform float uTime; varying float vA, vK; void main(){ vec2 q = gl_PointCoord - .5; q.y *= vK < .5 ? 3. : 1.4; q.x += vK > .5 ? sin(q.y * 12.) * .05 : 0.; float d = length(q) * 2.; if (d > 1.) discard;\n' +
      ' vec3 c = vK < .5 ? vec3(.55, .36, .78) : vec3(.5, 1., .6); gl_FragColor = vec4(c, (1. - smoothstep(.2, 1., d)) * vA * (vK < .5 ? .3 : .55));\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var hfog = new T.Points(fgeo, hfM); hfog.frustumCulled = false; hfog.renderOrder = 5; hfog.name = 'halloween-fog'; scene.add(hfog);

  // ---- flying cut-outs: the witch, Santa's sleigh, the hot-air balloon (the painting's own drawings)
  var fly = {};
  function addFly(name, sel, worldW, shadow) {
    var c = svgCutout(host, sel, 8); if (!c) return;
    var m = spriteMesh(c, worldW, shadow); m.name = 'fly-' + name; scene.add(m); fly[name] = { m: m, c: c, t0: -1, w: worldW };
  }
  addFly('witch', '.mo-witch .wwave .bob', 52, false);
  // Santa's sleigh is a 3D model now, its reindeer each following the path (see buildSleighTeam)
  var team = buildSleighTeam(ctx), slPath = function (p) { return orbitPath(p, 95, 215); }, slBack = new T.Vector3();
  addFly('hotair', '.mo-hotair .hab > g', 24, true);
  // its shadow: a soft painted patch lying on the ground away from the sun
  var shM = new T.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
    vertexShader: 'varying vec2 vU; void main(){ vU = uv * 2. - 1.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vU; void main(){ vec2 q = vU; float d = length(vec2(q.x, (q.y + .25) * 1.15)); float body = 1. - smoothstep(.55, .62, d); float bask = 1. - smoothstep(.06, .1, length(vec2(q.x * .9, q.y - .78))); gl_FragColor = vec4(.12, .16, .3, max(body, bask) * uA);\n#include <colorspace_fragment>\n}' });
  var balShadow = new T.Mesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), shM); balShadow.frustumCulled = false; balShadow.renderOrder = 2; balShadow.name = 'balloon-shadow'; balShadow.visible = false; scene.add(balShadow);
  // trails: the witch's green and gold sparkles, the sleigh's sparkles falling as snow
  var NT = 160, tp = new Float32Array(NT * 3), ta = new Float32Array(NT * 3), ti = 0;
  for (i = 0; i < NT; i++) { tp[i * 3 + 1] = -999; ta[i * 3 + 2] = R(); }
  var tgeo = new T.BufferGeometry(); tgeo.setAttribute('position', new T.BufferAttribute(tp, 3)); tgeo.setAttribute('aT', new T.BufferAttribute(ta, 3));
  var trM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uMap: { value: ctx.tex.star } },
    vertexShader: 'attribute vec3 aT; uniform float uTime, uScale; varying float vA, vK, vS; void main(){ float age = uTime - aT.x; vK = aT.y; vS = aT.z; vec3 p = position;\n' +
      ' if (aT.y > .5) { p.y -= age * 4.5; p.x += sin(age * 2. + aT.z * 20.) * 2.; } else p.y -= age * 1.5;\n' +
      ' vA = age < 0. || p.y < -900. ? 0. : (aT.y > .5 ? 1. - smoothstep(4., 9., age) : 1. - smoothstep(.6, 1.6, age));\n' +
      ' vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? (aT.y > .5 && age > .8 ? 1.4 : 3.2) * (.7 + .6 * aT.z) * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uMap; uniform float uTime; varying float vA, vK, vS; void main(){ float s = texture2D(uMap, gl_PointCoord).a; float dsk = 1. - smoothstep(.3, .5, length(gl_PointCoord - .5)); float a = max(s, dsk * .6);\n' +
      ' vec3 c = vK > .5 ? vec3(1.) : (vS < .33 ? vec3(.62, 1., .69) : vS < .66 ? vec3(1., .82, .4) : vec3(.9, .82, 1.)); if (a < .05) discard; gl_FragColor = vec4(c, a * vA);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false });
  var trail = new T.Points(tgeo, trM); trail.frustumCulled = false; trail.renderOrder = 7; trail.name = 'fly-trails'; scene.add(trail);
  function emit(p, kind, now) { tp[ti * 3] = p[0] + (R() - 0.5) * 3; tp[ti * 3 + 1] = p[1] + (R() - 0.5) * 3; tp[ti * 3 + 2] = p[2]; ta[ti * 3] = now; ta[ti * 3 + 1] = kind; ti = (ti + 1) % NT; tgeo.attributes.position.needsUpdate = true; tgeo.attributes.aT.needsUpdate = true; }
  // a loop round the tower: enters from the left, passes behind the tower, swings in front of it and leaves on the right
  // prod: the centre crosses the whole panel (-360..360) well faster than she circles it (r 45): she always moves forward. The
  // design's -90..360 at r 85 circled backwards as fast as the centre advanced: she hovered on the right edge for ~4 s
  function loopPath(p, r, yb, laps) { r = Math.min(r, 45); var th = Math.PI + 2 * Math.PI * laps * p, cx = lerp(-360, 360, p); return [cx + Math.cos(th) * r, yb + Math.sin(p * Math.PI * 4) * 14, Math.sin(th) * r * 0.85]; }
  function orbitPath(p, r, yb) { var th = Math.PI + 2 * Math.PI * 2 * p; return [Math.cos(th) * r * (p < 0.08 ? 1 + (0.08 - p) * 30 : p > 0.92 ? 1 + (p - 0.92) * 30 : 1), yb + Math.sin(th * 2) * 10, Math.sin(th) * r * 0.85]; }
  function placeFly(f, pos, prev, a) {
    var m = f.m; m.visible = a > 0.01 && f.c.ok; if (!m.visible) return;
    m.position.set(pos[0], pos[1], pos[2]); var dx = pos[0] - prev[0], dz = pos[2] - prev[2];
    var dir = dx >= 0 ? 1 : -1; m.scale.set(f.w * dir, f.w, f.w); m.rotation.set(0, 0, clamp(-(pos[1] - prev[1]) * 0.5 * dir, -0.3, 0.3) + clamp(dz * 0.02, -0.15, 0.15));
    m.material.opacity = a;
  }

  // ---- geese in a V, starlings folding behind the tower, swallows diving: dark painted birds drawn in the shader
  var NG = 9 + 900 + 8, bp = new Float32Array(NG * 3), ba = new Float32Array(NG * 3);
  for (i = 0; i < NG; i++) { ba[i * 3] = i < 9 ? 0 : i < 909 ? 1 : 2; ba[i * 3 + 1] = R(); ba[i * 3 + 2] = R(); bp[i * 3 + 1] = -999; }
  var bgeo = new T.BufferGeometry(); bgeo.setAttribute('position', new T.BufferAttribute(bp, 3)); bgeo.setAttribute('aB', new T.BufferAttribute(ba, 3));
  var brdM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uPal: U.uPal, uTok: { value: P.i('bat') }, uTok2: { value: P.i('ink') }, uDir: { value: new T.Vector3(1, 1, 1) } },
    vertexShader: 'attribute vec3 aB; uniform float uTime, uScale; uniform vec3 uDir; varying float vK, vF, vD; void main(){ vK = aB.x; vF = sin(uTime * (aB.x < .5 ? 9. : aB.x < 1.5 ? 22. : 14.) + aB.y * 6.28); vD = aB.x < .5 ? uDir.x : aB.x < 1.5 ? uDir.y : uDir.z;\n' +
      ' vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = position.y < -900. ? 0. : (aB.x < .5 ? 7.5 : aB.x < 1.5 ? 1.5 : 1.3) * uScale / max(-mv.z, 1.); }',
    fragmentShader: 'uniform sampler2D uPal; uniform float uTok, uTok2; varying float vK, vF, vD; vec3 pal(float i){ return texelFetch(uPal, ivec2(int(i + .5), 0), 0).rgb; }\n' +
      'float seg(vec2 p, vec2 a, vec2 b, float r){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }\n' +
      'void main(){ vec2 q = (gl_PointCoord - .5) * 2.; q.y = -q.y; q.x *= vD < 0. ? -1. : 1.; float d;\n' +
      ' if (vK < .5) { d = seg(q, vec2(-.45, 0.), vec2(.35, 0.), .07); d = min(d, seg(q, vec2(.35, 0.), vec2(.55, .08), .045)); d = min(d, seg(q, vec2(0., .02), vec2(-.25, .5 * vF), .06)); d = min(d, seg(q, vec2(-.25, .5 * vF), vec2(-.55, .35 * vF + .1), .035)); }\n' +
      ' else if (vK < 1.5) { d = length(q) - .55; }\n' +
      ' else { d = seg(q, vec2(-.5, 0.), vec2(.3, 0.), .09); d = min(d, seg(q, vec2(-.5, 0.), vec2(-.8, .2), .03)); d = min(d, seg(q, vec2(-.5, 0.), vec2(-.8, -.2), .03)); d = min(d, seg(q, vec2(0., 0.), vec2(-.3, .6 * vF), .05)); d = min(d, seg(q, vec2(0., 0.), vec2(-.15, -.55 * vF), .05)); }\n' +
      ' if (d > 0.) discard; gl_FragColor = vec4(pal(vK < 1.5 ? uTok : uTok2) * .9, 1.);\n#include <colorspace_fragment>\n}' });
  var birds = new T.Points(bgeo, brdM); birds.frustumCulled = false; birds.renderOrder = 6; birds.name = 'event-birds'; scene.add(birds);
  var swl = []; for (i = 0; i < 8; i++) swl.push({ ph: R() * 6.28, c: [(R() - 0.5) * 120, 20 + R() * 40, 250 + R() * 220], r: 20 + R() * 25, sp: 0.35 + R() * 0.25 });

  // ---- Christmas: the tree's star ✦ and its lights on the ice, chimney smoke from the chalets, tiny shoppers, garlands on the bridge
  var treeB = gp(272, 1172, 0), dT = ZC - treeB[2], treeTop = at(272, 1172 - 6 - 92 * 0.96, dT);
  U.uTree.value.set(treeB[0], treeB[2], 0, 0);
  var stG = new T.BufferGeometry(); stG.setAttribute('position', new T.Float32BufferAttribute([treeTop[0], treeTop[1], treeTop[2] + 0.4], 3));
  var starM = new T.ShaderMaterial({ uniforms: { uTime: U.uStep, uScale: U.uScale, uA: { value: 0 }, uMap: { value: ctx.tex.star } },
    vertexShader: 'uniform float uTime, uScale, uA; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; vA = uA; gl_PointSize = uA > .01 ? (3.2 + .8 * sin(uTime * 4.)) * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uMap; varying float vA; void main(){ float s = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(1., .95, .7, s * vA);\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var tStar = new T.Points(stG, starM); tStar.frustumCulled = false; tStar.renderOrder = 8; tStar.name = 'xmas-star'; scene.add(tStar);
  var smP = [], smA = [];
  [[40, 1170], [758, 1170], [82, 1170], [716, 1170], [800, 1170]].forEach(function (c, j) { var d = dOf(c[1]), p = at(c[0] + 8, c[1] - 22, d); for (k = 0; k < 7; k++) { smP.push(p[0], p[1], p[2]); smA.push(k / 7, j); } });
  var cart = at(695.5, 1138, dOf(1170)); for (k = 0; k < 8; k++) { smP.push(cart[0], cart[1], cart[2]); smA.push(k / 8, 9); }
  var smg = new T.BufferGeometry(); smg.setAttribute('position', new T.Float32BufferAttribute(smP, 3)); smg.setAttribute('aS', new T.Float32BufferAttribute(smA, 2));
  var smkM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uWind: U.uWind, uX: { value: 0 }, uC: { value: 0 }, uPn: U.uPn },
    vertexShader: 'attribute vec2 aS; uniform float uTime, uScale, uWind, uX, uC; varying float vA; void main(){ float on = aS.y > 8.5 ? uC : uX; float f = fract(uTime * .12 + aS.x); vec3 p = position + vec3(f * f * 2.6 * (.4 + uWind), f * 3.2, 0.);\n' +
      ' vA = on * smoothstep(0., .1, f) * (1. - f) * .7; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? (1.5 + f * 4.) * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform float uPn; varying float vA; void main(){ vec2 q = (gl_PointCoord - .5) * vec2(2.2, 1.7); float d = length(q); float a = 1. - smoothstep(.2, 1., d); gl_FragColor = vec4(mix(vec3(.93, .93, .95), vec3(.72, .74, .84), uPn), a * vA * 1.2);\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var chSmoke = new T.Points(smg, smkM); chSmoke.frustumCulled = false; chSmoke.renderOrder = 5; chSmoke.name = 'chalet-smoke'; scene.add(chSmoke);
  // tiny shoppers strolling in front of the chalets, bags in hand
  var shP = [], shA = [];
  for (i = 0; i < 14; i++) { var left = i < 6, xa = left ? 25 : 690, xb = left ? 110 : 815, yy = 1174 + R() * 6, dd = dOf(yy); shP.push(0, 0, ZC - dd); shA.push((xa - EX) * dd / F, (xb - EX) * dd / F, R(), 0.6 + R() * 0.5); }
  var shg = new T.BufferGeometry(); shg.setAttribute('position', new T.Float32BufferAttribute(shP, 3)); shg.setAttribute('aS', new T.Float32BufferAttribute(shA, 4));
  var shopM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uA: { value: 0 }, uPal: U.uPal, uTok: { value: new T.Vector4(P.i('ppl'), P.i('skin'), P.i('red'), P.i('awG')) } },
    vertexShader: 'attribute vec4 aS; uniform float uTime, uScale, uA; varying float vA, vS, vW, vDir; void main(){ float ph = fract(uTime * .02 * aS.w + aS.z); float tt = ph < .5 ? ph * 2. : 2. - ph * 2.; vDir = ph < .5 ? 1. : -1.; vec3 p = position; p.x = mix(aS.x, aS.y, tt); p.y = .95;\n' +
      ' vA = uA; vS = aS.z; vW = sin(uTime * 7. + aS.z * 20.); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uA > .01 ? 2.2 * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uPal; uniform vec4 uTok; varying float vA, vS, vW, vDir; vec3 pal(float i){ return texelFetch(uPal, ivec2(int(i + .5), 0), 0).rgb; }\n' +
      'float seg(vec2 p, vec2 a, vec2 b, float r){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }\n' +
      'void main(){ vec2 q = (gl_PointCoord - .5) * 2.; q.y = -q.y; q.x *= vDir; float body = seg(q, vec2(0., -.15), vec2(0., .45), .16); float head = length(q - vec2(0., .68)) - .13; float legs = min(seg(q, vec2(0., -.15), vec2(.12 * vW, -.95), .06), seg(q, vec2(0., -.15), vec2(-.12 * vW, -.95), .06));\n' +
      ' float bag = length(max(abs(q - vec2(.27, -.12)) - vec2(.1, .12), 0.)) - .02; vec3 c = pal(uTok.x); float d = min(min(body, legs), bag);\n' +
      ' if (min(d, head) > 0.) discard; if (head < 0.) c = pal(uTok.y); else if (bag < 0.) c = vS < .5 ? pal(uTok.z) : pal(uTok.w); else if (body < 0. && vS > .7) c = pal(uTok.z);\n' +
      ' gl_FragColor = vec4(c, vA); if (vA < .5) discard;\n#include <colorspace_fragment>\n}' });
  var shoppers = new T.Points(shg, shopM); shoppers.frustumCulled = false; shoppers.renderOrder = 4; shoppers.name = 'shoppers'; scene.add(shoppers);
  // garlands along the bridge parapets: bulbs that light up one after another, running along the bridge
  var bi = ctx.bridgeInfo, gpP = [], gpA = [], nb = 0;
  if (bi) for (sd = -1; sd <= 1; sd += 2) { var segs = 14; for (k = 0; k < segs; k++) { var za = lerp(bi.z0 + 2, bi.z1 - 2, k / segs), zb = lerp(bi.z0 + 2, bi.z1 - 2, (k + 1) / segs);
    for (var b_ = 0; b_ < 6; b_++) { var tt2 = b_ / 6, z = lerp(za, zb, tt2), hw = lerp(bi.hw0, bi.hw1, (z - bi.z0) / (bi.z1 - bi.z0)) + 0.55, sag = Math.sin(tt2 * Math.PI) * 0.45; gpP.push(sd * hw, 1.95 - sag, z); gpA.push(nb++, (b_ + k) % 4); } } }
  var gpg = new T.BufferGeometry(); gpg.setAttribute('position', new T.Float32BufferAttribute(gpP, 3)); gpg.setAttribute('aG', new T.Float32BufferAttribute(gpA, 2));
  var garM = new T.ShaderMaterial({ uniforms: { uTime: U.uStep, uScale: U.uScale, uA: { value: 0 }, uPn: U.uPn, uN: { value: nb / 2 } },
    vertexShader: 'attribute vec2 aG; uniform float uTime, uScale, uA, uPn, uN; varying float vA; varying vec3 vC; void main(){ float idx = mod(aG.x, uN); float run = fract(uTime * .45 - idx / 22.); vA = uA * (.35 + .65 * step(run, .3)) ;\n' +
      ' vC = aG.y < .5 ? vec3(1., .82, .4) : aG.y < 1.5 ? vec3(1., .3, .35) : aG.y < 2.5 ? vec3(.45, 1., .6) : vec3(.45, .7, 1.); vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? (.38 + .3 * step(run, .3)) * (1. + uPn) * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'varying float vA; varying vec3 vC; void main(){ float d = length(gl_PointCoord - .5) * 2.; if (d > 1.) discard; vec3 c = mix(vec3(1.), vC, smoothstep(.0, .5, d)); gl_FragColor = vec4(c, vA * (1. - smoothstep(.45, 1., d)));\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var garl = new T.Points(gpg, garM); garl.frustumCulled = false; garl.renderOrder = 6; garl.name = 'bridge-garlands'; scene.add(garl);
  // the garland wires
  var wl = [];
  if (bi) for (sd = -1; sd <= 1; sd += 2) { var prevW = null; for (k = 0; k <= 14 * 6; k++) { var tt3 = k / (14 * 6), z3 = lerp(bi.z0 + 2, bi.z1 - 2, tt3), hw3 = lerp(bi.hw0, bi.hw1, (z3 - bi.z0) / (bi.z1 - bi.z0)) + 0.55, sg = Math.sin((k % 6) / 6 * Math.PI) * 0.45, pw = [sd * hw3, 2.0 - sg, z3]; if (prevW) wl.push(prevW[0], prevW[1], prevW[2], pw[0], pw[1], pw[2]); prevW = pw; } }
  var wg = new T.BufferGeometry(); wg.setAttribute('position', new T.Float32BufferAttribute(wl, 3));
  var wire = new T.LineSegments(wg, new T.LineBasicMaterial({ color: 0x2a2a30, transparent: true, opacity: 0.6 })); wire.name = 'garland-wire'; scene.add(wire);

  // ---- fireworks: every burst (click or New Year) flashes its colour on the tower, the water and the crowd, and is mirrored in the Seine
  var bursts = [];
  if (host) [].forEach.call(host.querySelectorAll('.fw .fwb'), function (g) {
    var st_ = g.getAttribute('style') || '', dl = parseFloat((/--dl:([\d.]+)/.exec(st_) || [0, 0])[1]), du = parseFloat((/--du:([\d.]+)/.exec(st_) || [0, 3.6])[1]);
    var c = g.querySelector('.rk s[data-n="circle"]'), cc = c && state.vec ? state.vec.center(c) : null, bx = cc ? cc[0] : 430, by = cc ? cc[1] : 400;
    var col = '#ffd166'; [].some.call(g.querySelectorAll('.bs s[data-n="path"], .bs s[data-n="circle"]'), function (e) { var cs = getComputedStyle(e), v = cs.stroke !== 'none' ? cs.stroke : cs.fill; if (/^rgb/.test(v) && !/^rgb\(255, 255, 255/.test(v)) { col = v; return true; } return false; });
    bursts.push({ dl: dl, du: du, x: bx, y: by, p: at(bx, by, 500), c: new T.Color(col) });
  });
  var clickT0 = -99, lastFw = 0, nyMode = '', nyT0 = 0, finaleEnd = -999, wasFinale = false;
  // smoke drifting after the finale; confetti in 3D at the finale and on New Year clicks
  var skP = [], skA = [];
  bursts.forEach(function (b) { for (k = 0; k < 5; k++) { skP.push(b.p[0] + (R() - 0.5) * 40, b.p[1] + (R() - 0.5) * 30, b.p[2]); skA.push(R(), 30 + R() * 30); } });
  var skg = new T.BufferGeometry(); skg.setAttribute('position', new T.Float32BufferAttribute(skP.length ? skP : [0, -999, 0], 3)); skg.setAttribute('aK', new T.Float32BufferAttribute(skA.length ? skA : [0, 1], 2));
  var fsM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uA: { value: 0 }, uWind: U.uWind },
    vertexShader: 'attribute vec2 aK; uniform float uTime, uScale, uA, uWind; varying float vA; void main(){ vec3 p = position + vec3(uTime * (1.5 + uWind * 2.) + sin(uTime * .1 + aK.x * 9.) * 10., sin(uTime * .07 + aK.x * 5.) * 6., 0.); vA = uA; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uA > .01 ? aK.y * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'varying float vA; void main(){ vec2 q = (gl_PointCoord - .5) * vec2(2., 2.6); float d = length(q); if (d > 1.) discard; gl_FragColor = vec4(.42, .42, .52, (1. - smoothstep(.62, .8, d)) * vA * .28);\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var fwSmoke = new T.Points(skg, fsM); fwSmoke.frustumCulled = false; fwSmoke.renderOrder = 4; fwSmoke.name = 'fw-smoke'; scene.add(fwSmoke);
  var cfP = [], cfA = [];
  for (i = 0; i < 500; i++) { cfP.push((R() - 0.5) * 70, 0, 470 + R() * 110); cfA.push(R(), R(), R()); }
  var cfg = new T.BufferGeometry(); cfg.setAttribute('position', new T.Float32BufferAttribute(cfP, 3)); cfg.setAttribute('aC', new T.Float32BufferAttribute(cfA, 3));
  var confM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uA: { value: 0 } },
    vertexShader: 'attribute vec3 aC; uniform float uTime, uScale, uA; varying float vA, vR, vK; void main(){ float f = fract(uTime * (.09 + aC.y * .05) + aC.x); vec3 p = position + vec3(sin(uTime * 2. + aC.x * 30.) * 1.2, 26. - f * 26., 0.); vR = uTime * (3. + aC.z * 6.) + aC.x * 9.; vK = aC.z; vA = uA * step(.02, f);\n' +
      ' vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? .4 * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'varying float vA, vR, vK; void main(){ vec2 q = gl_PointCoord - .5; q = mat2(cos(vR), -sin(vR), sin(vR), cos(vR)) * q; q.x /= .3 + .7 * abs(cos(vR * 1.7)); if (abs(q.x) > .14 || abs(q.y) > .3) discard;\n' +
      ' vec3 c = vK < .17 ? vec3(1., .82, .4) : vK < .34 ? vec3(1., .3, .43) : vK < .5 ? vec3(.31, .89, 1.) : vK < .67 ? vec3(.43, 1., .6) : vK < .84 ? vec3(1.) : vec3(.78, .63, 1.); gl_FragColor = vec4(c, vA);\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var confetti = new T.Points(cfg, confM); confetti.frustumCulled = false; confetti.renderOrder = 8; confetti.name = 'confetti'; scene.add(confetti);

  // ---- Valentine's: heart balloons rising from the lovers on the bridge
  var hbP = [], hbA = [];
  [[366, 1126], [486, 1126]].forEach(function (c, j) { var p = gp(c[0] + 2.5, c[1], 0); for (k = 0; k < 4; k++) { hbP.push(p[0], 1.6, p[2]); hbA.push(k / 4 + j * 0.13, R()); } });
  var hbg = new T.BufferGeometry(); hbg.setAttribute('position', new T.Float32BufferAttribute(hbP, 3)); hbg.setAttribute('aH', new T.Float32BufferAttribute(hbA, 2));
  var heartM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uA: { value: 0 } },
    vertexShader: 'attribute vec2 aH; uniform float uTime, uScale, uA; varying float vA, vK; void main(){ float f = fract(uTime / 16. + aH.x); vec3 p = position + vec3(sin(uTime * .8 + aH.y * 9.) * 1.5 - f * 18., f * 70., 0.); vK = aH.y; vA = uA * smoothstep(0., .05, f) * (1. - smoothstep(.85, 1., f));\n' +
      ' vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? 2.6 * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'varying float vA, vK; float dot2(vec2 v){ return dot(v, v); } float sdHeart(vec2 p){ p.x = abs(p.x); if (p.y + p.x > 1.) return sqrt(dot2(p - vec2(.25, .75))) - .35355; return sqrt(min(dot2(p - vec2(0., 1.)), dot2(p - .5 * max(p.x + p.y, 0.)))) * sign(p.x - p.y); }\nvoid main(){ vec2 q = (gl_PointCoord - .5) * 2.; q.y = -q.y; float d = sdHeart((q + vec2(0., .45)) * 1.15);\n' +
      ' float str = abs(q.x + sin(q.y * 6.) * .04) < .025 && q.y < -.45 ? 0. : 1.; if (d > 0. && str > .5) discard; vec3 c = vK < .5 ? vec3(.92, .2, .33) : vec3(1., .55, .68); if (d > -.08 && d <= 0.) c *= .55; if (str < .5) c = vec3(.2);\n' +
      ' gl_FragColor = vec4(c, vA);\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var hearts = new T.Points(hbg, heartM); hearts.frustumCulled = false; hearts.renderOrder = 6; hearts.name = 'heart-balloons'; scene.add(hearts);

  // ---- the Perseids: long streaks with a sparkle trail, mirrored in the river; people lying on the lawns looking up
  var met = { t0: -99, a: [0, 0, 0], b: [0, 0, 0], bright: 0, next: 1 };
  var mg = new T.BufferGeometry(); mg.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(12), 3)); mg.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); mg.setIndex([0, 1, 2, 0, 2, 3]);
  var metM = new T.ShaderMaterial({ uniforms: { uA: { value: 0 }, uHead: { value: 0 } }, transparent: true, depthWrite: false, side: T.DoubleSide,
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float uA, uHead; varying vec2 vU; void main(){ float along = vU.x; float a = smoothstep(uHead - .55, uHead, along) * step(along, uHead) * (1. - abs(vU.y - .5) * 2.); gl_FragColor = vec4(mix(vec3(.7, .85, 1.), vec3(1.), smoothstep(uHead - .1, uHead, along)), a * uA);\n#include <colorspace_fragment>\n}' });
  var meteor = new T.Mesh(mg, metM); meteor.frustumCulled = false; meteor.renderOrder = 2; meteor.name = 'meteor'; scene.add(meteor);
  var lyP = new PB(P);
  [[60, 1236, 1], [610, 1222, -1], [160, 1306, 1], [700, 1300, -1], [250, 1262, -1]].forEach(function (c) {
    var p = gp(c[0], c[1], 0.06), s = c[2]; lyP.set(['awR', 'umb3', 'red', 'sea', 'awG'][Math.floor(R() * 5)]); lyP.box(p[0] - 1.1, 0.06, p[2] - 0.7, p[0] + 1.1, 0.1, p[2] + 0.7);
    lyP.set('ppl', 'ppl', null, 'ink'); lyP.box(p[0] - 0.7 * s - 0.05, 0.1, p[2] - 0.17, p[0] + 0.3 * s + 0.05, 0.32, p[2] + 0.17); lyP.set('skin'); lyP.blob(p[0] + 0.55 * s, 0.26, p[2], 0.17, 0.16, 0.17, 1, 4);
    lyP.set('h1'); lyP.blob(p[0] + 0.66 * s, 0.24, p[2], 0.12, 0.12, 0.16, 1, 6);
  });
  var lying = new T.Mesh(lyP.geo(), ctx.mats.paint); lying.name = 'stargazers'; lying.visible = false; scene.add(lying);

  // ---- Autumn: leaf piles on the esplanade that burst when the dog runs through them
  var piles = [], plP = new PB(P);
  [130, 250, 380, 560, 700].forEach(function (x, j) { var p = gp(x, 1167, 0.05); piles.push({ x: x, p: p, hit: -99 }); plP.set(j % 2 ? 'lv1' : 'lv2', 'lv3', 'lv1'); plP.blob(p[0], 0.08, p[2], 0.9, 0.32, 0.6, 1, 30 + j); });
  var pileMesh = new T.Mesh(plP.geo(), ctx.mats.paint); pileMesh.name = 'leaf-piles'; pileMesh.visible = false; scene.add(pileMesh);
  var lpP = [], lpA = [];
  piles.forEach(function (pl, j) { for (k = 0; k < 24; k++) { lpP.push(pl.p[0], 0.2, pl.p[2]); lpA.push(j, R(), R()); } });
  var lpg = new T.BufferGeometry(); lpg.setAttribute('position', new T.Float32BufferAttribute(lpP, 3)); lpg.setAttribute('aL', new T.Float32BufferAttribute(lpA, 3));
  var lpM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uHit: { value: [-99, -99, -99, -99, -99] }, uPal: U.uPal, uTok: { value: new T.Vector3(P.i('lv1'), P.i('lv2'), P.i('lv3')) } },
    vertexShader: 'attribute vec3 aL; uniform float uTime, uScale, uHit[5]; varying float vA, vK, vR; void main(){ int j = int(aL.x + .5); float h = j == 0 ? uHit[0] : j == 1 ? uHit[1] : j == 2 ? uHit[2] : j == 3 ? uHit[3] : uHit[4]; float age = uTime - h;\n' +
      ' vA = age > 0. && age < 3. ? 1. - smoothstep(2.2, 3., age) : 0.; float a = aL.y * 6.28; vec3 v = vec3(cos(a) * 1.6, 2.6 + aL.z * 2., sin(a) * 1.2) * (.6 + aL.z * .6); vec3 p = position + v * age + vec3(0., -2.2 * age * age, 0.); p.y = max(p.y, .1);\n' +
      ' vK = aL.z; vR = age * 8. * (aL.y - .5); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? .45 * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uPal; uniform vec3 uTok; varying float vA, vK, vR; vec3 pal(float i){ return texelFetch(uPal, ivec2(int(i + .5), 0), 0).rgb; } void main(){ vec2 q = gl_PointCoord - .5; q = mat2(cos(vR), -sin(vR), sin(vR), cos(vR)) * q; if (length(q * vec2(1., 2.2)) > .45) discard; gl_FragColor = vec4(vK < .33 ? pal(uTok.x) : vK < .66 ? pal(uTok.y) : pal(uTok.z), vA); if (vA < .5) discard;\n#include <colorspace_fragment>\n}' });
  var pileLeaves = new T.Points(lpg, lpM); pileLeaves.frustumCulled = false; pileLeaves.renderOrder = 4; pileLeaves.name = 'pile-leaves'; scene.add(pileLeaves);

  var mom = '', momT0 = 0, prev = {}, metNext = 0;
  E.reflHide = [trail, birds, confetti, hfog, garl, meteor];
  E.update = function (st, s, now, dt) {
    var night = st.sky === 'night', dusk = st.sky === 'dusk', ev_ = st.event;
    if (st.moment !== mom) { mom = st.moment; momT0 = now; }
    var mt = now - momT0;
    // Halloween
    var hw = ev_ === 'halloween';
    U.uHwOn.value = hw ? clamp((st.pn - 0.2) / 0.4, 0, 1) : 0;
    hfM.uniforms.uA.value = hw && !(st.sky === 'day') ? 1 : 0; hfog.visible = hfM.uniforms.uA.value > 0;
    // flying moments
    ['witch', 'sleigh', 'hotair'].forEach(function (n) { if (fly[n]) fly[n].m.visible = false; });
    var w_ = fly.witch, sl = fly.sleigh, ha = fly.hotair;
    if (w_ && mom === 'witch') { var pw = mt / 15, a1 = clamp(Math.min(pw, 1 - pw) * 12, 0, 1), pos = loopPath(pw, 85, 118, 1.25), pv = loopPath(Math.max(0, pw - 0.004), 85, 118, 1.25); placeFly(w_, pos, pv, a1); if (w_.m.visible && R() < 0.8) emit([pos[0] - 8, pos[1] - 2, pos[2]], 0, now); }
    if (team) {
      var slOn = mom === 'sleigh' || mom === 'circle', dur = mom === 'circle' ? 16 : 14, ps = slOn ? mt / dur : 0, a2 = slOn ? clamp(Math.min(ps, 1 - ps) * 12, 0, 1) : 0;
      var sp = team.update(slPath, ps, a2, now);
      if (sp) { slBack.set(-20, -3, 0).applyMatrix4(team.sleigh.matrixWorld); emit([slBack.x, slBack.y, slBack.z], 1, now); }
    }
    if (ha && mom === 'hotair') { var ph = mt / 30, a3 = clamp(Math.min(ph, 1 - ph) * 15, 0, 1), pos3 = [lerp(-300, 330, ph), 120 + ph * 40 + Math.sin(mt * 0.4) * 3, -260 + ph * 80]; placeFly(ha, pos3, [pos3[0] - 1, pos3[1], pos3[2]], a3); if (ha.m.visible) ha.m.scale.x = Math.abs(ha.m.scale.x);
      var Ld = ctx.Ldir; if (Ld && ha.m.visible && st.sky === 'day') { var k_ = pos3[1] / Math.max(0.25, Ld.y); balShadow.position.set(pos3[0] - Ld.x * k_, 0.35, pos3[2] - Ld.z * k_); balShadow.scale.set(30, 1, 30 * (1 + Ld.z / Math.max(0.25, Ld.y) * 0.4)); shM.uniforms.uA.value = 0.3 * a3 * (1 - st.pn); balShadow.visible = true; } else balShadow.visible = false; }
    else balShadow.visible = false;
    // birds: geese, starlings, swallows
    var any = false, o, j;
    if (mom === 'geese') { var pg = mt / 16; for (j = 0; j < 9; j++) { var side = j % 2 ? 1 : -1, rr = (j + 1) >> 1; bp[j * 3] = lerp(330, -330, pg) + rr * 9; bp[j * 3 + 1] = 200 + pg * 30 + side * rr * 5; bp[j * 3 + 2] = 60 + rr * 3 * side; } brdM.uniforms.uDir.value.x = -1; any = true; }
    else for (j = 0; j < 9; j++) bp[j * 3 + 1] = -999;
    var murOn = mom === 'starlings';
    for (j = 0; j < 900; j++) {
      o = (9 + j) * 3; if (!murOn) { bp[o + 1] = -999; continue; }
      // a cloud of birds that stretches, folds and turns as it flies behind the tower
      var pm = mt / 14, cxm = lerp(-230, 240, pm) + Math.sin(mt * 0.35) * 30, cym = 125 + Math.sin(mt * 0.42) * 22;
      var u1 = ba[o + 1], u2 = ba[o + 2], u3 = (u1 * 7.13 + u2 * 3.71) % 1, zz = 2 * u1 - 1, an = 6.2832 * u2, rr0 = Math.sqrt(1 - zz * zz), rad = Math.pow(u3, 0.33);
      var vx = rr0 * Math.cos(an) * rad, vy = rr0 * Math.sin(an) * rad, vz = zz * rad;
      var str = 1.6 + 0.9 * Math.sin(mt * 0.5), ang = mt * 0.3 + Math.sin(mt * 0.21) * 1.2, ca = Math.cos(ang), sa = Math.sin(ang);
      var lx = vx * 38 * str, ly = vy * 16 / str, lz = vz * 24;
      var fx = lx * ca - ly * sa, fy = lx * sa + ly * ca; fy += Math.sin(fx * 0.06 + mt * 1.4) * 9; fx += Math.sin(fy * 0.08 + mt) * 6;
      var sc = Math.min(1, Math.min(pm, 1 - pm) / 0.08);
      bp[o] = cxm + fx * sc; bp[o + 1] = cym + fy * sc; bp[o + 2] = -140 + lz;
      any = true;
    }
    var swOn = (st.season === 'spring' && st.phase !== 1 || st.season === 'summer') && st.sky === 'day' && st.wx !== 'rain';
    for (j = 0; j < 8; j++) { o = (909 + j) * 3; var w2 = swl[j]; if (!swOn) { bp[o + 1] = -999; continue; } var a = now * w2.sp + w2.ph; bp[o] = w2.c[0] + Math.cos(a) * w2.r * 1.6; bp[o + 1] = w2.c[1] + Math.sin(a * 2) * 12 - Math.max(0, Math.sin(a)) * 20; bp[o + 2] = w2.c[2] + Math.sin(a) * w2.r; any = true; }
    brdM.uniforms.uDir.value.z = 1;
    bgeo.attributes.position.needsUpdate = true; birds.visible = any;
    // Christmas
    var xm = ev_ === 'christmas';
    starM.uniforms.uA.value = xm ? 0.4 + 0.6 * st.pn : 0;
    smkM.uniforms.uX.value = xm ? 1 : 0; smkM.uniforms.uC.value = (st.season === 'autumn' || st.season === 'winter') && !xm && ev_ !== 'newyear' ? 1 : 0; chSmoke.visible = xm || smkM.uniforms.uC.value > 0;
    shopM.uniforms.uA.value = xm ? 1 : 0; shoppers.visible = xm;
    garM.uniforms.uA.value = xm ? 0.5 + 0.5 * st.pn : 0; garl.visible = xm; wire.visible = xm;
    U.uTree.value.z = xm ? 1 : 0;
    // fireworks
    if (s.fw && s.fw !== lastFw) clickT0 = now; lastFw = s.fw;
    var ny = st.ny || '', mode = ev_ === 'newyear' && !s.fw ? (/\bfinale\b/.test(ny) ? 'finale' : /\bparty\b/.test(ny) ? 'party' : /\bvolleys\b/.test(ny) ? 'volleys' : 'base') : '';
    if (mode !== nyMode) { nyMode = mode; nyT0 = now; }
    var isFin = /\bfinale\b/.test(ny); if (wasFinale && !isFin) finaleEnd = now; wasFinale = isFin;
    var sl4 = [];
    bursts.forEach(function (b) {
      var f = -1, inten = 0;
      if (now - clickT0 < 6) { var tb = now - clickT0 - b.dl; if (tb >= 0 && tb < 3) f = tb / 3; }
      else if (mode) { var per = mode === 'finale' ? 2.4 : mode === 'party' ? b.du * 1.7 : mode === 'volleys' ? b.du * 3 : b.du, del = mode === 'finale' ? b.dl * 0.5 : mode === 'party' ? b.dl * 2 : mode === 'volleys' ? b.dl * 4 : b.dl * 1.6, tb2 = now - nyT0 - del; if (tb2 >= 0) f = (tb2 / per) % 1; }
      if (f >= 0.29 && f < 0.55) inten = f < 0.31 ? (f - 0.29) / 0.02 : 1 - (f - 0.31) / 0.24;
      if (inten > 0.01) sl4.push([inten, b]);
    });
    sl4.sort(function (a, b) { return b[0] - a[0]; });
    for (j = 0; j < 4; j++) { var e = sl4[j]; if (e) { U.uBst.value[j].set(e[1].p[0], e[1].p[1], e[1].p[2], e[0] * Math.max(0.35, st.pn)); U.uBstC.value[j].copy(e[1].c); U.uBsx.value[j].set(e[1].x, e[1].y); } else U.uBst.value[j].w = 0; }
    E.burstTint = sl4.length ? { c: sl4[0][1].c, a: sl4[0][0] * Math.max(0.35, st.pn) } : null;
    fsM.uniforms.uA.value = ev_ === 'newyear' && now - finaleEnd < 90 ? 1 - (now - finaleEnd) / 90 : 0; fwSmoke.visible = fsM.uniforms.uA.value > 0.01;
    confM.uniforms.uA.value = ev_ === 'newyear' && (isFin || /\byear\b/.test(ny) || now - clickT0 < 6) ? 1 : 0; confetti.visible = confM.uniforms.uA.value > 0;
    E.confetti = confM.uniforms.uA.value > 0;
    // Valentine's
    var va = ev_ === 'valentine';
    heartM.uniforms.uA.value = va ? 1 : 0; hearts.visible = va;
    U.uRimP.value = va && dusk ? 1 : va ? 0.4 : 0;
    // Perseids
    var pe = ev_ === 'perseids' && st.pn > 0.6;
    lying.visible = pe;
    E.meteor = null; meteor.visible = false; U.uMet.value.w = 0;
    if (pe) {
      if (now > met.next) { met.t0 = now; met.next = now + 2.5 + R() * 4; var sx0 = 330 + R() * 420, sy0 = 150 + R() * 250, ang = Math.PI * (0.8 + R() * 0.1), len = 200 + R() * 120; met.a = at(sx0, sy0, 1800); met.b = at(sx0 + Math.cos(ang) * len, sy0 + Math.sin(ang) * len * 0.5, 1800); met.bright = ctx.forceMet ? 1 : R(); met.sx0 = sx0; met.sx1 = sx0 + Math.cos(ang) * len; met.sy0 = sy0; met.sy1 = sy0 + Math.sin(ang) * len * 0.5; }
      var mt2 = (now - met.t0) / 1.1;
      if (mt2 >= 0 && mt2 < 1.4) {
        var head = Math.min(1, mt2), A = met.a, B = met.b, nx = -(B[1] - A[1]), ny_ = B[0] - A[0], nl = Math.hypot(nx, ny_) || 1, wdt = 3 + met.bright * 3; nx = nx / nl * wdt; ny_ = ny_ / nl * wdt;
        var pa = mg.attributes.position.array; pa.set([A[0] - nx, A[1] - ny_, A[2], B[0] - nx, B[1] - ny_, B[2], B[0] + nx, B[1] + ny_, B[2], A[0] + nx, A[1] + ny_, A[2]]); mg.attributes.position.needsUpdate = true;
        metM.uniforms.uHead.value = head; metM.uniforms.uA.value = mt2 < 1 ? 1 : 1 - (mt2 - 1) / 0.4; meteor.visible = true;
        var hp = [lerp(A[0], B[0], head), lerp(A[1], B[1], head), A[2]]; if (mt2 < 1 && R() < 0.9) emit(hp, 0, now);
        U.uMet.value.set(lerp(met.sx0, met.sx1, head), metM.uniforms.uA.value, 0, 1);
        if (met.bright > 0.75 && mt2 < 1) E.meteor = { x: lerp(met.sx0, met.sx1, head), y: lerp(met.sy0, met.sy1, head), a: metM.uniforms.uA.value };
      }
    }
    // Autumn: leaf piles and the dog
    var au = st.season === 'autumn' && !hw;
    pileMesh.visible = au && st.sky === 'day'; pileLeaves.visible = pileMesh.visible;
    if (mom === 'dog' && pileMesh.visible) { var dogX = -40 + 900 * (mt / 8); piles.forEach(function (pl, jj) { if (dogX > pl.x - 6 && now - pl.hit > 8) { pl.hit = now; lpM.uniforms.uHit.value[jj] = now; } }); }
  };
  return E;
}
