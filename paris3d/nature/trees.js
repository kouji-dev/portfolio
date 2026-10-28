import * as T from 'three';
import { gY0, dOf, at, uu } from '../core/view.js';
import { clamp, lerp, rng, canvasTex } from '../core/util.js';
import { PB } from '../core/pb.js';
import { paintMaterial, PATS } from '../core/paint.js';

// ---------------------------------------------------------------- trees: crowns of many leaf clumps with jagged leafy edges, ink outlines, a sunlit leafy rim,
// gaps, flecks; plane trees, poplars and a few conifers; forking limbs, flared roots, grates, dappled shade; the seasons
// a leaf clump: a lumpy sphere whose surface bulges into leaf scallops (the silhouette reads as a leafy edge)
export function clumpGeo(seed, det) {
  var g = new T.IcosahedronGeometry(1, det == null ? 2 : det), p = g.attributes.position, R = rng(seed), C = [];
  for (var i = 0; i < 46; i++) { var u = R() * 2 - 1, a = R() * 6.2832, s = Math.sqrt(1 - u * u); C.push([s * Math.cos(a), u, s * Math.sin(a), 0.22 + R() * 0.12]); }
  var out = [];
  for (i = 0; i < p.count; i++) {
    var x = p.getX(i), y = p.getY(i), z = p.getZ(i), m = 0.84;
    for (var k = 0; k < C.length; k++) { var c = C[k], d = Math.acos(clamp(x * c[0] + y * c[1] + z * c[2], -1, 1)) / c[3]; if (d < 1) m = Math.max(m, 0.8 + 0.3 * Math.sqrt(1 - d * d)); }
    out.push([x * m, y * m, z * m]);
  }
  g.dispose(); return out;
}
export var CLUMPS = null;
// the four leaf-clump shapes, made once and shared with the bushes (a module can't assign another module's CLUMPS)
export function clumps() { if (!CLUMPS) CLUMPS = [11, 23, 37, 41].map(function (s) { return clumpGeo(s, 3); }); return CLUMPS; }
export function crownUnit(P, kind) {
  if (!CLUMPS) CLUMPS = [11, 23, 37, 41].map(function (s) { return clumpGeo(s, 3); });
  var ico = new T.IcosahedronGeometry(1, 3), ip = ico.attributes.position, pb = new PB(P), R = rng(kind === 'poplar' ? 7 : kind === 'conifer' ? 9 : 5), list = [];
  pb.set('tc2', 'tc1', 'tc3', 'tcH', null, 'dot', 0.6);
  if (kind === 'conifer') { pb.set('bq', 'mor', 'bqL', 'tcH', null, 'dot', 2);
    for (var t = 0; t < 6; t++) { var y = -14 + t * 7.2, r = 15 * (1 - t / 6.6) + 2; for (var k = 0; k < 7; k++) { var a = k / 7 * 6.2832 + t; list.push([Math.cos(a) * r * 0.62, y - 2, Math.sin(a) * r * 0.62, r * 0.48, 5.2, r * 0.48, 0]); } list.push([0, y + 1, 0, r * 0.62, 6.5, r * 0.62, 1]); }
    list.push([0, 30, 0, 2.8, 6, 2.8, 0]);
  } else if (kind === 'poplar') {
    for (var j = 0; j < 15; j++) { var yy = -24 + j * 4.4, rr = 9 * Math.sin((j + 1) / 16 * Math.PI) + 2.5, aa = j * 2.4; list.push([Math.cos(aa) * rr * 0.45, yy, Math.sin(aa) * rr * 0.45, rr * 0.75, 6.5, rr * 0.75, j % 3 === 1 ? 1 : 0]); }
  } else {
    list.push([0, -1, 0, 15, 12, 14, 1]);   // the core that fills the inside
    for (var n = 0; n < 17; n++) {
      var u = n < 5 ? 0.15 + R() * 0.25 : R() * 1.6 - 0.75, ph = n * 2.399, sr = Math.sqrt(Math.max(0, 1 - u * u));
      var rad = 7.5 + R() * 4;
      list.push([Math.cos(ph) * sr * 15, u * 10 - 1, Math.sin(ph) * sr * 13, rad, rad * 0.85, rad, 0]);
    }
  }
  list.forEach(function (c, i) {
    var shape = CLUMPS[i % CLUMPS.length], id = R(), inner = c[6] ? 1 : 0;
    for (var q = 0; q < ip.count; q += 3) {
      var vs = [];
      for (var k = 0; k < 3; k++) { var v = shape[q + k]; vs.push([c[0] + v[0] * c[3], c[1] + v[1] * c[4], c[2] + v[2] * c[5]]); }
      for (k = 0; k < 3; k++) { var o = shape[q + k], nl = Math.hypot(o[0], o[1], o[2]); pb.vert(vs[k], o[0] / nl, o[1] / nl, o[2] / nl, id, inner); }
      pb.ix.push(pb.v, pb.v + 1, pb.v + 2); pb.v += 3;
    }
  });
  ico.dispose();
  return pb.geo();
}
export function clippedUnit(P) {
  var pb = new PB(P), g = new T.IcosahedronGeometry(1, 3), p = g.attributes.position;
  pb.set('tc2', 'tc1', 'tc3', 'tcH', null, 'dot', 0.9);
  for (var i = 0; i < p.count; i += 3) {
    for (var k = 0; k < 3; k++) {
      var x = p.getX(i + k), y = p.getY(i + k), z = p.getZ(i + k), m = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
      var bx = lerp(x, x / m, 0.75), by = lerp(y, y / m, 0.75), bz = lerp(z, z / m, 0.75);
      var nx = lerp(x, Math.abs(x) === m ? Math.sign(x) : 0, 0.6), ny = lerp(y, Math.abs(y) === m ? Math.sign(y) : 0, 0.6), nz = lerp(z, Math.abs(z) === m ? Math.sign(z) : 0, 0.6), nl = Math.hypot(nx, ny, nz) || 1;
      pb.vert([bx * 15, by * 10 + 4, bz * 10], nx / nl, ny / nl, nz / nl, 0.5, 0);
    }
    pb.ix.push(pb.v, pb.v + 1, pb.v + 2); pb.v += 3;
  }
  g.dispose();
  return pb.geo();
}
export function snowUnit(P) {
  var pb = new PB(P); pb.set('snow', 'snow');
  [[-10, 22, 2, 13, 4.2], [8, 20, 4, 12, 4], [0, 26, -3, 10, 3.6]].forEach(function (b, i) { pb.blob(b[0], b[1], b[2], b[3], b[4], b[3] * 0.9, 1, 51 + i); });
  return pb.geo();
}
export function crownPattern(P) {
  function c(t) { return 'pal(' + P.i(t).toFixed(1) + ')'; }
  // vUv2.x: clump id (random), vUv2.y: 1 for the inner core clumps
  return 'float cid = vUv2.x, cin = vUv2.y; vec3 Vw = normalize(vViewPosition); float cfr = 1. - abs(dot(normal, Vw));\n' +
    // the season's mix: white blossom among the pink, mixed yellow / orange / rust in autumn
    'bool evg = vScr > 1.5;\n' +
    'if (!evg && uSeason.x > .5 && uSeason.w < 2.5) col = mix(col, (cid > .82 ? ' + c('petal') + ' : mix(' + c('white') + ', ' + c('petal') + ', .12)) * mix(.82, 1., b1), step(.6, cid) * .9);\n' +
    'if (!evg && uSeason.z > .5) { vec3 ac = cid < .3 ? ' + c('lv2') + ' : cid < .55 ? ' + c('lv1') + ' : cid < .7 ? ' + c('lv3') + ' : col; col = mix(col, ac * mix(.78, 1.05, b1), .65); }\n' +
    // the inner core is in shade: darker, hatched
    'col = mix(col, cShade * .8, cin * .45);\n' +
    // leaves: every cell holds a small leaf; light leaves on the lit side, a bright leafy rim facing the sun, dark leaves in the shade
    'vec2 lq = vec2(vWP.x + vWP.z * .55, vWP.y) * 2.6; vec2 lc = floor(lq), lf = fract(lq) - .5 + (vec2(h21(lc + 1.3), h21(lc + 7.1)) - .5) * .3; float lr = h21(lc); lf = mat2(cos(lr * 6.), -sin(lr * 6.), sin(lr * 6.), cos(lr * 6.)) * lf;\n' +
    'float leafS = 1. - smoothstep(.0, .05, length(lf * vec2(1., 2.2)) - .27);\n' +
    'float sunSide = smoothstep(-.05, .3, ndl) * smoothstep(.3, .65, cfr) * (1. - cin);\n' +
    'col = mix(col, cLit * 1.1 + vec3(.06), leafS * max(sunSide, .55 * b1 * step(.6, lr)) * step(.3, lr) * (1. - .55 * uPn));\n' +
    'col = mix(col, cShade * .7, leafS * (1. - b1) * step(.55, lr) * .7);\n' +
    // gaps where the sky and the branches show through (more when the crowns thin in late autumn)
    'float gapT = .74 - .1 * step(2.5, uSeason.w) * uSeason.z - .04 * uSeason.x + .06 * uSeason.y;\n' +
    'if (cin < .5 && cfr > .55 && vn2(vWP.xy * .55 + vWP.z * .3 + cid * 17.) > gapT) discard;\n' +
    // ink: a line round each clump where it turns away from us (the clumps\' silhouettes, the crown\'s contour)
    'col = mix(col, pal(vTok.x) * .34, smoothstep(.6, .8, cfr) * (1. - cin) * .95);\n' +
    // at night the fountain's light reaches the trees beside the basin
    'col += uFL * uPn * uFount * (1. - smoothstep(22., 46., abs(vWP.x))) * smoothstep(455., 472., vWP.z) * (1. - smoothstep(545., 560., vWP.z)) * (1. - smoothstep(4., 12., vWP.y)) * .18 * (1. - cin * .6);\n';
}
export function barkPattern() {
  // vertical bark strokes; the plane trees (vScr > .5) have a mottled bark of light and dark patches
  return 'vec2 bq = vec2(atan(vWP.z - floor(vWP.z), 1.) + vWP.x * 1.7 + vWP.z * 1.3, vWP.y * .6); float bs = abs(fract(bq.x * 2.2 + h21(vec2(floor(bq.y * 2.), 0.)) * .5) - .5);\n' +
    'col = mix(col, cShade * .72, (1. - smoothstep(.04, .09, bs)) * .55);\n' +
    'if (vScr > .5) { vec2 mq = vec2(vWP.x * 2. + vWP.z * 1.6, vWP.y * 1.3); float mo = vn2(mq * 1.4); col = mix(col, mix(' + "pal(vTok2.x)" + ', vec3(.86, .82, .66), .45), smoothstep(.55, .62, mo) * .8); col = mix(col, cShade * .8, smoothstep(.62, .68, vn2(mq * 1.4 + 9.)) * .5); }\n';
}

export function buildTrees(ctx) {
  var L = ctx.L, P = ctx.P, U = ctx.U, scene = ctx.scene, R = rng(19), trees = [];
  PATS.crown = crownPattern(P); PATS.bark = barkPattern();
  L.canopy.forEach(function (c, i) {
    var garden = c.base != null, contact = garden ? c.base : c.cy + 24 * c.s, d = dOf(contact) - (garden ? 0 : 2);
    var ctr = at(c.x, c.cy, d), kind = !garden && (i === 2 || i === 9 || i === 17) ? 'poplar' : c.evg && i % 4 === 0 ? 'conifer' : 'plane';
    trees.push({ c: ctr, s: c.s * uu(d), evg: c.evg || kind === 'conifer', garden: garden, base: garden ? at(c.x, c.base, d) : [ctr[0], 0, ctr[2]], kind: kind });
  });
  ctx.rowsTrees.forEach(function (p) { var d = dOf(p[1]) - 1, c = at(p[0], p[1] - 4, d); trees.push({ c: c, s: 0.32 * uu(d), evg: R() < 0.3, garden: false, base: [c[0], 0, c[2]], small: true, kind: 'clipped' }); });
  var units = { plane: crownUnit(P, 'plane'), poplar: crownUnit(P, 'poplar'), conifer: crownUnit(P, 'conifer'), clipped: clippedUnit(P) }, snow = snowUnit(P), n = trees.length;
  // prod: each crown kind holds only its own trees (the design drew every kind for all trees, the others shrunk to nothing: 2.3M triangles instead of 275K)
  var nk = {}, nCap = 0; trees.forEach(function (t) { t.slot = nk[t.kind] || 0; nk[t.kind] = t.slot + 1; if (!t.small) t.cap = nCap++; });
  var crownMat = paintMaterial(U, { sway: 'tree', pat: 'crown' }), inst = {}, caps = new T.InstancedMesh(snow, paintMaterial(U, { sway: 'tree' }), nCap);
  Object.keys(units).forEach(function (k) { var m = new T.InstancedMesh(units[k], k === 'clipped' ? ctx.mats.paint : crownMat, nk[k] || 0); m.name = 'crowns-' + k; inst[k] = m; });
  var trunks = new PB(P), bare = new PB(P), bareE = new PB(P), dry = new PB(P), buds = new PB(P), snowB = new PB(P), twig = new PB(P), forks = new PB(P), grates = new PB(P), nest = new PB(P), frostP = [];
  var M = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), S = new T.Vector3(), Y = new T.Vector3(0, 1, 0);
  function limb(pb, a, b, r0, r1, depth, spread, tok) {
    pb.beam(a, b, r0, r1);
    if (depth <= 0) return [b];
    var tips = [], dir = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(dir[0], dir[1], dir[2]);
    for (var k = 0; k < 2; k++) {
      var sg = k ? 1 : -1, ang = Math.atan2(dir[1], dir[0]) + sg * spread * (0.7 + R() * 0.6), l2 = len * (0.55 + R() * 0.2);
      var e = [b[0] + Math.cos(ang) * l2, b[1] + Math.sin(ang) * l2, b[2] + (R() - 0.5) * l2 * 0.6];
      tips = tips.concat(limb(pb, b, e, r1, r1 * 0.55, depth - 1, spread * 0.85, tok));
    }
    // a short ink line in the crook of the fork
    forks.set('ink'); forks.beam([b[0], b[1] - r1 * 0.2, b[2]], [b[0], b[1] + r1 * 1.3, b[2]], r1 * 0.28, r1 * 0.06);
    return tips;
  }
  var nestDone = false;
  trees.forEach(function (t, i) {
    t.rot = R() * 6.28;
    if (t.small) return;
    var plane = t.kind === 'plane', s = t.s, top = [t.c[0], t.c[1] - (t.kind === 'poplar' ? 26 : 12) * s, t.c[2]], bz = t.base;
    trunks.set('trk', 'trk', 'tcH', null, 'dryl', null, plane ? 1 : 0);
    trunks.beam([bz[0], bz[1] - 0.2, bz[2]], top, 3.6 * s, 2.2 * s);
    // roots flaring into the ground
    trunks.cyl(bz[0], bz[1] - 0.2, bz[2], 6.2 * s, 3.5 * s, 4 * s, 9);
    for (var k = 0; k < 5; k++) { var a = k / 5 * 6.2832 + t.rot; trunks.beam([bz[0] + Math.cos(a) * 2 * s, bz[1] + 2.4 * s, bz[2] + Math.sin(a) * 2 * s], [bz[0] + Math.cos(a) * 8.5 * s, bz[1] - 0.3, bz[2] + Math.sin(a) * 8.5 * s], 1.3 * s, 0.4 * s); }
    // the limbs inside the crown fork twice
    if (t.kind !== 'conifer') [-15, 13, -4].forEach(function (dx) { limb(trunks, top, [top[0] + dx * s * 0.6, top[1] + 11 * s, top[2] + (R() - 0.5) * 6 * s], 1.5 * s, 0.9 * s, 1, 0.45, 'trk'); });
    // street trees stand in an iron grate in the pavement
    if (!t.garden) { grates.set('iron', 'iron', null, 'ink', 'pave'); var gs = 9 * s; grates.quad([bz[0] - gs, 0.07, bz[2] + gs], [bz[0] + gs, 0.07, bz[2] + gs], [bz[0] + gs, 0.07, bz[2] - gs], [bz[0] - gs, 0.07, bz[2] - gs], [0, 0, 1, 0, 1, 1, 0, 1]); }
    if (t.kind !== 'plane') return;
    // bare branches (winter): a fan of limbs that fork, fine ink twig tips, dried leaves and buds, snow along the limbs
    var pb = t.evg ? bareE : bare; pb.set('trk');
    var o = [t.c[0], t.c[1] - 26 * s, t.c[2]];
    for (k = 0; k < 7; k++) {
      var an = Math.PI / 2 + (k - 3) * 0.38 + (R() - 0.5) * 0.24, ln = (34 + R() * 12) * s * (1 - Math.abs(k - 3) * 0.06), dz = (R() - 0.5) * 20 * s;
      var e = [o[0] + Math.cos(an) * ln * 1.15, o[1] + Math.sin(an) * ln, o[2] + dz];
      pb.beam(o, e, 1.1 * s, 0.35 * s);
      snowB.set('snow'); snowB.beam([lerp(o[0], e[0], 0.45), lerp(o[1], e[1], 0.45) + 0.9 * s, lerp(o[2], e[2], 0.45)], [e[0], e[1] + 0.5 * s, e[2]], 0.7 * s, 0.3 * s);
      for (var j = 0; j < 3; j++) {
        var f = 0.45 + R() * 0.45, p0 = [lerp(o[0], e[0], f), lerp(o[1], e[1], f), lerp(o[2], e[2], f)], b2 = an + (R() < 0.5 ? -1 : 1) * (0.4 + R() * 0.4), l2 = (8 + R() * 7) * s;
        var tip = [p0[0] + Math.cos(b2) * l2, p0[1] + Math.sin(b2) * l2, p0[2] + (R() - 0.5) * 4 * s];
        pb.beam(p0, tip, 0.45 * s, 0.2 * s);
        if (!t.evg) for (var q = 0; q < 3; q++) { var b3 = b2 + (q - 1) * 0.5, l3 = (2.5 + R() * 2.5) * s; twig.set('ink'); twig.beam(tip, [tip[0] + Math.cos(b3) * l3, tip[1] + Math.sin(b3) * l3, tip[2] + (R() - 0.5) * s], 0.16 * s, 0.05 * s); if (q === 1) frostP.push(tip[0] + Math.cos(b3) * l3, tip[1] + Math.sin(b3) * l3, tip[2]); }
        buds.set('bud'); buds.blob(tip[0], tip[1], tip[2], 1.6 * s, 1.6 * s, 1.6 * s, 0, 70 + j);
        if (R() < 0.45) { dry.set('dryl'); dry.blob(tip[0] + 0.5 * s, tip[1] - 1 * s, tip[2], 1.5 * s, 1 * s, 1.3 * s, 0, 80 + j); }
      }
      // a bird's nest in the crook of one tree
      if (!nestDone && !t.evg && t.garden && k === 2) { nestDone = true; var nx = lerp(o[0], e[0], 0.55), ny = lerp(o[1], e[1], 0.55), nz = lerp(o[2], e[2], 0.55);
        nest.set('dryl', 'trk', 'hay'); nest.blob(nx, ny + 1.5 * s, nz, 3.6 * s, 2 * s, 3.6 * s, 1, 3); nest.set('trk'); for (q = 0; q < 6; q++) { var aq = q / 6 * 6.2832; nest.beam([nx + Math.cos(aq) * 3.8 * s, ny + 2.6 * s, nz + Math.sin(aq) * 3.8 * s], [nx + Math.cos(aq + 1.4) * 3.6 * s, ny + 2.2 * s, nz + Math.sin(aq + 1.4) * 3.6 * s], 0.22 * s); } }
    }
  });
  var pm = ctx.mats.paint, bm = paintMaterial(U, { pat: 'bark' });
  var mT = new T.Mesh(trunks.geo(), bm), mB = new T.Mesh(bare.geo(), pm), mBE = new T.Mesh(bareE.geo(), pm), mD = new T.Mesh(dry.geo(), pm), mBu = new T.Mesh(buds.geo(), pm), mS = new T.Mesh(snowB.geo(), pm), mTw = new T.Mesh(twig.geo(), pm), mN = new T.Mesh(nest.geo(), pm), mF = new T.Mesh(forks.geo(), pm);
  var mG = new T.Mesh(grates.geo(), paintMaterial(U, { pat: 'grate' })); mG.receiveShadow = true; mG.renderOrder = 1; scene.add(mG);
  var all = [caps, mT, mB, mBE, mD, mBu, mS, mTw, mN, mF].concat(Object.keys(inst).map(function (k) { return inst[k]; }));
  all.forEach(function (m) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); });
  caps.castShadow = false; mS.castShadow = false; mTw.castShadow = false;
  // dappled shade on the ground under each tree (big trees; the clipped rows keep a plain contact shadow)
  var dapM = new T.ShaderMaterial({ uniforms: { uPn: U.uPn, uTime: U.uTime, uWind: U.uWind }, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    vertexShader: 'varying vec2 vU; varying vec3 vW; void main(){ vU = uv * 2. - 1.; vec4 w = vec4(position, 1.);\n#ifdef USE_INSTANCING\nw = instanceMatrix * w;\n#endif\nw = modelMatrix * w; vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform float uPn, uTime, uWind; varying vec2 vU; varying vec3 vW; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' +
      'void main(){ float r = length(vU); if (r > 1.) discard; vec2 q = vW.xz * .55 + vec2(sin(uTime * .9) * .08, cos(uTime * .7) * .06) * (1. + uWind); vec2 c = floor(q), f = fract(q) - .5; float spot = 1. - smoothstep(.18, .3, length(f + (vec2(h(c), h(c + 3.)) - .5) * .4));\n' +
      ' float a = (1. - smoothstep(.55, .95, r)) * spot * step(.4, h(c + 7.)) * (1. - uPn) * .4; gl_FragColor = vec4(1., .96, .72, a);\n#include <colorspace_fragment>\n}' });
  dapM.userData.instancing = true;  // prod: the flecks are drawn as one InstancedMesh (see the batching in mount)
  var dapG = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), daps = [];
  trees.forEach(function (t) {
    ctx.contacts.push([t.base[0], t.base[2], (t.small ? 9 : 7) * t.s, (t.small ? 4 : 4) * t.s]);
    if (t.small) return;
    // sun flecks: spots of light falling through the leaves into the crown's shadow (placed where the shadow lies)
    var dm = new T.Mesh(dapG, dapM), r = (t.kind === 'poplar' ? 12 : 22) * t.s; dm.scale.set(r * 2, 1, r * 1.6); dm.renderOrder = 2; dm.name = 'sun-flecks'; scene.add(dm); daps.push([dm, t]);
  });
  // frost sparkles on the twig tips on cold mornings
  var fg = new T.BufferGeometry(); fg.setAttribute('position', new T.Float32BufferAttribute(frostP, 3));
  var frostM = new T.ShaderMaterial({ uniforms: { uMap: { value: ctx.tex.star }, uScale: U.uScale, uTime: U.uTime, uA: { value: 0 } },
    vertexShader: 'uniform float uScale, uTime, uA; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vec4 q = projectionMatrix * (mv + vec4(0., 0., 1., 0.)); gl_Position = projectionMatrix * mv; gl_Position.z = q.z / q.w * gl_Position.w; float ph = fract(sin(dot(position.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.28;\n' +
      ' vA = uA * pow(max(0., sin(uTime * 1.7 + ph)), 6.); gl_PointSize = vA > .01 ? 1.4 * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uMap; varying float vA; void main(){ gl_FragColor = vec4(.92, .97, 1., texture2D(uMap, gl_PointCoord).a * vA);\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var frost = new T.Points(fg, frostM); frost.frustumCulled = false; frost.renderOrder = 8; frost.name = 'frost-sparkles'; scene.add(frost);
  // leaf flecks scattered round the crowns' edges, and leaves fluttering off in autumn
  var fl = [], fa = [];
  trees.forEach(function (t, i) { if (t.small || t.kind === 'conifer') return; for (var k = 0; k < 16; k++) { var a = R() * 6.2832, e = R() * 1.4 - 0.5; fl.push(t.c[0] + Math.cos(a) * 21 * t.s * Math.cos(e), t.c[1] + Math.sin(e) * 14 * t.s, t.c[2] + Math.sin(a) * 18 * t.s * Math.cos(e)); fa.push(R(), t.s, i, R()); } });
  var flg = new T.BufferGeometry(); flg.setAttribute('position', new T.Float32BufferAttribute(fl, 3)); flg.setAttribute('aF', new T.Float32BufferAttribute(fa, 4));
  var leafT = (function () { var S_ = canvasTex(64, 64, false), g = S_.g; g.clearRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(32, 4); g.quadraticCurveTo(58, 30, 32, 60); g.quadraticCurveTo(6, 30, 32, 4); g.fill(); g.strokeStyle = 'rgba(0,0,0,1)'; g.lineWidth = 3; g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(32, 10); g.lineTo(32, 56); g.stroke(); S_.t.needsUpdate = true; return S_.t; })();
  var flM = new T.ShaderMaterial({ uniforms: { uMap: { value: leafT }, uScale: U.uScale, uTime: U.uTime, uWind: U.uWind, uPal: U.uPal, uTok: { value: new T.Vector4(P.i('tc2'), P.i('tc3'), P.i('lv1'), P.i('lv2')) }, uFall: { value: 0 }, uHide: { value: 0 } },
    vertexShader: 'attribute vec4 aF; uniform float uScale, uTime, uWind, uFall, uHide; varying float vA, vK; varying float vR;\n' +
      'void main(){ vec3 p = position; float fall = min(uFall, 1.) * step(.45, aF.x); float ft = fract(uTime * (.05 + aF.w * .04) + aF.x * 7.); p.y -= fall * ft * 22. * aF.y * 10.; p.x += fall * (ft * 14. * aF.y * 10. * (.4 + uWind) + sin(uTime * 2. + aF.x * 30.) * 4. * aF.y * 3.);\n' +
      ' p.x += sin(uTime * 2.1 + aF.x * 20.) * aF.y * 3. * (.3 + uWind); float sw = ft * 6.2832 * 1.5 + aF.x * 9.; p.x += fall * cos(sw) * ft * aF.y * 30.; p.z += fall * sin(sw) * ft * aF.y * 30.; vA = (1. - uHide) * (fall > 0. ? smoothstep(0., .08, ft) * (1. - smoothstep(.85, 1., ft)) : 1.); vK = aF.w; vR = uTime * (1. + aF.x * 3.) * fall + aF.x * 6.28;\n' +
      ' vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? .5 * aF.y * 10. * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uMap, uPal; uniform vec4 uTok; uniform float uFall; varying float vA, vK, vR; vec3 pal(float i){ return texelFetch(uPal, ivec2(int(i + .5), 0), 0).rgb; }\n' +
      'void main(){ vec2 q = gl_PointCoord - .5; q = mat2(cos(vR), -sin(vR), sin(vR), cos(vR)) * q; vec4 t = texture2D(uMap, q + .5); if (t.a < .5) discard; vec3 c = uFall > 1.5 ? (vK < .5 ? vec3(1., .82, .88) : vec3(1., .97, .97)) : uFall > .5 ? (vK < .5 ? pal(uTok.z) : pal(uTok.w)) : (vK < .5 ? pal(uTok.x) : pal(uTok.y)); gl_FragColor = vec4(c, vA); if (vA < .5) discard;\n#include <colorspace_fragment>\n}' });
  var flecks = new T.Points(flg, flM); flecks.frustumCulled = false; flecks.renderOrder = 3; flecks.name = 'leaf-flecks'; scene.add(flecks);
  var key = '';
  ctx.treeList = trees;
  return {
    trees: trees,
    update: function (st) {
      var Ld = ctx.Ldir; if (Ld) daps.forEach(function (d) { var t = d[1], hgt = t.c[1] - gY0(t.c[0], t.c[2]), k = hgt / Math.max(0.25, Ld.y); d[0].position.set(t.c[0] - Ld.x * k, gY0(t.c[0], t.c[2]) + 0.16, t.c[2] - Ld.z * k); d[0].visible = d[0].material.uniforms.uPn.value < 0.95 && !(st.season === 'winter' && !t.evg); });
      var winter = st.season === 'winter' && st.event !== 'christmas', sp1 = st.season === 'spring' && st.phase === 1, au3 = st.season === 'autumn' && st.phase === 3;
      frostM.uniforms.uA.value = st.wx === 'frost' && st.sky !== 'night' ? 1 : 0;
      flM.uniforms.uFall.value = st.season === 'autumn' ? 1 : st.season === 'spring' && st.phase >= 2 ? 2 : 0; flM.uniforms.uHide.value = winter || sp1 ? 1 : 0;
      var k = [st.season, st.phase, st.event, st.wx].join('|');
      if (k === key) return; key = k;
      var snowy = st.event === 'christmas' || st.wx === 'snow' || st.wx === 'fog', dense = st.season === 'summer' ? 1.07 : 1;
      trees.forEach(function (t, i) {
        var show = !((winter && !t.evg) || sp1), sc = (au3 ? 0.72 : 1) * dense;
        Q.setFromAxisAngle(Y, t.kind === 'clipped' ? 0 : t.rot); V.set(t.c[0], t.c[1], t.c[2]);
        S.setScalar(show ? t.s * sc : 0.0001); if (t.kind === 'poplar') S.set(t.s * sc * 0.8, t.s * sc * 1.1, t.s * sc * 0.8); M.compose(V, Q, S); inst[t.kind].setMatrixAt(t.slot, M);
        if (!t.small) { S.setScalar(show && snowy ? t.s : 0.0001); M.compose(V, Q, S); caps.setMatrixAt(t.cap, M); }
      });
      Object.keys(inst).forEach(function (kk) { inst[kk].instanceMatrix.needsUpdate = true; }); caps.instanceMatrix.needsUpdate = true;
      mB.visible = winter || sp1 || au3; mBE.visible = sp1 || au3; mTw.visible = winter || sp1 || au3;
      mD.visible = st.season === 'winter' || au3; mBu.visible = st.season === 'spring'; mS.visible = snowy && (winter || sp1); mN.visible = winter || sp1;
    }
  };
}
