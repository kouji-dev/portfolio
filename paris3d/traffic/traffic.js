import * as T from 'three';
import { paintMaterial } from '../core/paint.js';
import { PB } from '../core/pb.js';
import { radialTexture } from '../core/textures.js';
import { lerp, clamp } from '../core/util.js';
import { ZC, dOf, EX, F } from '../core/view.js';
// ---------------------------------------------------------------- traffic on the Avenue de New-York (original archetypes, not real models)
// ---------------------------------------------------------------- the Avenue de New-York: toy-like cartoon cars (our own designs), more traffic, a traffic light
// prof: the side outline from the rear bumper (u = 0) to the front (u = 1); belt: the window line; n: how boxy the cross-section is
export var CAR_KINDS = {
  hatch: { id: 1, tok: 'hh', len: 4.0, belt: 1.0, n: 5, doors: 2, lamp: 2, prof: [[0, .35], [0, .98], [.06, 1.04], [.14, 1.5], [.62, 1.55], [.8, 1.06], [.97, .95], [1, .78], [1, .35]] },
  gt: { id: 2, tok: 'gt', len: 5.0, belt: .95, n: 5, doors: 4, lamp: 1, prof: [[0, .35], [0, .9], [.12, .98], [.3, 1.38], [.62, 1.4], [.76, 1.0], [.98, .86], [1, .7], [1, .35]] },
  teardrop: { id: 3, tok: 'td', len: 4.6, belt: .8, n: 4, doors: 2, lamp: 1, bubble: 1, prof: [[0, .32], [0, .8], [.12, .9], [.3, 1.22], [.55, 1.25], [.78, .86], [.97, .62], [1, .5], [1, .32]] },
  suv: { id: 4, tok: 'sv', len: 4.7, belt: 1.15, n: 6, doors: 4, lamp: 2, prof: [[0, .45], [0, 1.15], [.08, 1.2], [.14, 1.72], [.75, 1.74], [.86, 1.2], [.98, 1.1], [1, .95], [1, .45]] },
  wedge: { id: 5, tok: 'wg', len: 4.5, belt: .82, n: 10, doors: 2, lamp: 1, prof: [[0, .3], [0, .84], [.18, .92], [.35, 1.1], [.58, 1.1], [.98, .58], [1, .5], [1, .3]] },
  saloon: { id: 6, tok: 'sl', len: 4.9, belt: .98, n: 5, doors: 4, lamp: 0, prof: [[0, .35], [0, .96], [.2, 1.02], [.32, 1.45], [.68, 1.46], [.8, 1.02], [.98, .92], [1, .78], [1, .35]] },
  racer: { id: 7, tok: 'rc', len: 4.8, belt: .86, n: 6, doors: 2, lamp: 1, prof: [[0, .26], [0, .95], [.1, .98], [.36, 1.05], [.58, 1.04], [.98, .5], [1, .42], [1, .26]] },
  taxi: { id: 8, tok: 'clad', len: 4.7, belt: .98, n: 5, doors: 4, lamp: 2, prof: [[0, .35], [0, .96], [.18, 1.02], [.3, 1.46], [.7, 1.47], [.82, 1.02], [.98, .92], [1, .78], [1, .35]] }
};
export function chaikin(pts, it) {
  for (var k = 0; k < it; k++) { var o = [pts[0]]; for (var i = 0; i < pts.length - 1; i++) { var a = pts[i], b = pts[i + 1]; o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } o.push(pts[pts.length - 1]); pts = o; }
  return pts;
}
export function profTop(sm, u) { var y = 0; for (var i = 0; i < sm.length - 1; i++) { var a = sm[i], b = sm[i + 1]; if ((u >= a[0] && u <= b[0]) || (u <= a[0] && u >= b[0])) { var f = Math.abs(b[0] - a[0]) < 1e-6 ? 1 : (u - a[0]) / (b[0] - a[0]); y = Math.max(y, lerp(a[1], b[1], f)); } } return y; }
// a grid of vertices (rows of points), triangulated; normals are smoothed afterwards
PB.prototype.grid = function (rows, uvs, closed) {
  var R_ = rows.length, C_ = rows[0].length, v0 = this.v;
  for (var r = 0; r < R_; r++) for (var c = 0; c < C_; c++) this.vert(rows[r][c], 0, 1, 0, uvs[r][c][0], uvs[r][c][1]);
  this.v += R_ * C_;
  var cmax = closed ? C_ : C_ - 1;
  for (r = 0; r < R_ - 1; r++) for (c = 0; c < cmax; c++) { var c1 = (c + 1) % C_, a = v0 + r * C_ + c, b = v0 + r * C_ + c1, d = v0 + (r + 1) * C_ + c, e = v0 + (r + 1) * C_ + c1; this.ix.push(a, d, b, b, d, e); }
};
export function smoothGeo(pb) { var g = pb.geo(); g.computeVertexNormals(); return g; }
export function supE(a, n) { var c = Math.cos(a), s = Math.sin(a); return [Math.sign(c) * Math.pow(Math.abs(c), 2 / n), Math.sign(s) * Math.pow(Math.abs(s), 2 / n)]; }

export function buildTraffic(ctx) {
  var P = ctx.P, U = ctx.U, scene = ctx.scene, SC = 1.35;
  var mats = { body: paintMaterial(U, { pat: 'carbody' }), glass: paintMaterial(U, { pat: 'carglass', side: T.DoubleSide }), lamp: paintMaterial(U, { pat: 'carlamp', side: T.DoubleSide }), rim: paintMaterial(U, { pat: 'rim' }), plate: paintMaterial(U, { pat: 'plate', side: T.DoubleSide }), outline: new T.ShaderMaterial({ side: T.BackSide, uniforms: { uScale: U.uScale, uPal: U.uPal, uTok: { value: P.i('ink') }, uPx: U.uPx },
      vertexShader: 'uniform float uScale, uPx; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vec3 n = normalize(normalMatrix * normal); mv.xyz += n * (1.15 * uPx * -mv.z / uScale + .006); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D uPal; uniform float uTok; void main(){ gl_FragColor = vec4(texelFetch(uPal, ivec2(int(uTok + .5), 0), 0).rgb * .8, 1.);\n#include <colorspace_fragment>\n}' }), win: paintMaterial(U, { pat: 'win' }), paint: ctx.mats.paint };
  var glowTex = radialTexture([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
  function cone(len, w0, w1, color, op) {   // a light cone / streak lying on the road (local coords: along +x)
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute([0, 0, -w0, len, 0, -w1, len, 0, w1, 0, 0, w0], 3)); g.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 2, 1, 0, 3, 2]);
    var m = new T.ShaderMaterial({ uniforms: { uC: { value: new T.Color(color) }, uA: { value: 0 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'uniform vec3 uC; uniform float uA; varying vec2 vU; void main(){ float a = pow(1. - vU.x, 1.3) * (1. - pow(abs(vU.y - .5) * 2., 3.)) * uA; gl_FragColor = vec4(uC * a, a);\n#include <colorspace_fragment>\n}' });
    var mm = new T.Mesh(g, m); mm.renderOrder = 3; mm.frustumCulled = false; return mm;
  }

  // ---- one car: a lofted rounded body, a greenhouse with pillars and glass, wheels that turn, shaped lamps, mirrors, plates, a driver
  function carMesh(kind) {
    var k = CAR_KINDS[kind], len = k.len, hw = 0.9, sm = chaikin(k.prof.slice(1, -1), 3), tok = k.tok;
    var tD = tok === 'clad' ? 'clad' : tok + 'D', tH = tok === 'clad' ? 'chrome' : tok + 'H';
    function top(u) { return profTop(sm, u); }
    function plan(u) { return 0.8 + 0.2 * Math.sqrt(clamp(Math.min(u, 1 - u) / 0.14, 0, 1)); }
    var body = new PB(P), glass = new PB(P), acc = new PB(P), lampB = new PB(P), plates = new PB(P), wheelsB = [];
    // lower body
    body.set(tok, tD, tH, 'ink', 'chrome', kind === 'racer' ? 'rcS' : 'clad', k.id * 10 + len);
    var NS = 30, M = 18, rows = [], uvs = [];
    for (var i = 0; i <= NS; i++) {
      var t = i / NS, u = 0.5 - 0.5 * Math.cos(t * Math.PI), x = u * len, yt = Math.min(top(u), k.belt), yb = 0.3, ym = (yt + yb) / 2, hh = (yt - yb) / 2, w = hw * plan(u), row = [], uvr = [];
      for (var j = 0; j < M; j++) { var e = supE(j / M * 6.2832, k.n), y = ym + hh * e[1]; row.push([x, y, w * e[0]]); uvr.push([x, y]); }
      rows.push(row); uvs.push(uvr);
    }
    body.grid(rows, uvs, true);
    // end caps: a fan at the rear and the front
    (function () {
      var start = body.v - (NS + 1) * M;
      [0, NS].forEach(function (i) { var c = rows[i].reduce(function (sm_, p) { return [sm_[0] + p[0] / M, sm_[1] + p[1] / M, sm_[2] + p[2] / M]; }, [0, 0, 0]); var cv = body.v; body.vert(c, 0, 0, 0, c[0], c[1]); body.v++;
        for (var j = 0; j < M; j++) { var j1 = (j + 1) % M, a = start + i * M + j, b = start + i * M + j1; if (i === 0) body.ix.push(cv, b, a); else body.ix.push(cv, a, b); } });
    })();
    // greenhouse
    var ua = 1, ub = 0; for (i = 0; i <= 200; i++) { var uu_ = i / 200; if (top(uu_) > k.belt + 0.05) { ua = Math.min(ua, uu_); ub = Math.max(ub, uu_); } }
    var roofTok = kind === 'hatch' ? 'clad' : tok;
    glass.set(roofTok, kind === 'hatch' ? 'clad' : tD, tH, 'ink', kind === 'suv' ? 'clad' : 'cglass', 'cglassH', k.id * 10 + len);
    rows = []; uvs = []; var NC = 22, MC = 14;
    for (i = 0; i <= NC; i++) {
      var u2 = lerp(ua, ub, i / NC), x2 = u2 * len, yb2 = k.belt - 0.02, yt2 = top(u2), wb = hw * plan(u2) * 0.96, wt = hw * plan(u2) * (k.bubble ? 0.62 : 0.74), row2 = [], uv2 = [];
      for (j = 0; j <= MC; j++) { var e2 = supE(j / MC * Math.PI, k.bubble ? 2.4 : 4), f = Math.abs(e2[1]); row2.push([x2, yb2 + (yt2 - yb2) * f, e2[0] * lerp(wb, wt, f)]); uv2.push([i / NC, f]); }
      rows.push(row2); uvs.push(uv2);
    }
    glass.grid(rows, uvs, false);
    // the glass's end caps (windscreen / rear window close the arch)
    [0, NC].forEach(function (i) { var r = rows[i], base = glass.v - (NC + 1) * (MC + 1) + i * (MC + 1); var mid = [r[0][0], r[0][1], 0]; var cv = glass.v; glass.vert(mid, 0, 0, 0, i ? 1 : 0, 0); glass.v++;
      for (var j = 0; j < MC; j++) { if (i) glass.ix.push(cv, base + j, base + j + 1); else glass.ix.push(cv, base + j + 1, base + j); } });
    // wheels: tyre + rim (the rim pattern has spokes and a coloured caliper); each wheel is its own mesh so it can turn
    var wr = kind === 'suv' ? 0.4 : 0.36, rimStyle = kind === 'hatch' || kind === 'racer' || kind === 'wedge' ? 10 : 5;
    var wheelGeo = (function () {
      var pb = new PB(P); pb.set('clad', 'clad', 'rimD');
      pb.cyl(0, 0, -0.13, wr, wr, 0.26, 18, 'z'); pb.disc([0, 0, 0.13], wr, 'z', 18);
      pb.set('rimD', 'rimD', 'chrome', 'ink', 'caliper', 'chrome', rimStyle);
      var cs = []; for (var q = 0; q < 18; q++) { var a0 = q / 18 * 6.2832, a1 = (q + 1) / 18 * 6.2832; pb.vert([0, 0, 0.135], 0, 0, 1, 0.5, 0.5); pb.vert([Math.cos(a0) * wr * 0.72, Math.sin(a0) * wr * 0.72, 0.135], 0, 0, 1, 0.5 + Math.cos(a0) * 0.5, 0.5 + Math.sin(a0) * 0.5); pb.vert([Math.cos(a1) * wr * 0.72, Math.sin(a1) * wr * 0.72, 0.135], 0, 0, 1, 0.5 + Math.cos(a1) * 0.5, 0.5 + Math.sin(a1) * 0.5); pb.ix.push(pb.v, pb.v + 1, pb.v + 2); pb.v += 3; }
      void cs; return pb.geo();
    })();
    // lamps: shaped head-lights at the front, tail-lights at the rear (the teardrop has a light bar)
    var hy = Math.min(top(0.97), k.belt) - 0.12, ty = Math.min(top(0.03), k.belt) - 0.12, lw = kind === 'saloon' ? 0.22 : k.lamp === 1 ? 0.36 : 0.3, lh = kind === 'saloon' ? 0.22 : k.lamp === 1 ? 0.1 : 0.16;
    var fx = len - 0.005 + 0.03, rx = -0.03;
    lampB.set('lampG', 'lampG', null, 'ink', 'white', null, k.lamp);
    [-1, 1].forEach(function (sd) { var zc = sd * 0.58; lampB.quad([fx, hy - lh / 2, zc + (sd > 0 ? -lw / 2 : lw / 2)], [fx, hy - lh / 2, zc + (sd > 0 ? lw / 2 : -lw / 2)], [fx, hy + lh / 2, zc + (sd > 0 ? lw / 2 : -lw / 2)], [fx, hy + lh / 2, zc + (sd > 0 ? -lw / 2 : lw / 2)].map(function (v) { return v; }), sd > 0 ? [0, 0, 1, 0, 1, 1, 0, 1] : [1, 0, 0, 0, 0, 1, 1, 1]); });
    lampB.set('tail', 'tail', null, 'ink', 'red', null, kind === 'teardrop' ? 3 : k.lamp);
    if (kind === 'teardrop') lampB.quad([rx, ty - 0.05, 0.62], [rx, ty - 0.05, -0.62], [rx, ty + 0.05, -0.62], [rx, ty + 0.05, 0.62], [0, 0, 1, 0, 1, 1, 0, 1]);
    else [-1, 1].forEach(function (sd) { var zc = sd * 0.6; lampB.quad([rx, ty - lh / 2, zc + sd * lw / 2], [rx, ty - lh / 2, zc - sd * lw / 2], [rx, ty + lh / 2, zc - sd * lw / 2], [rx, ty + lh / 2, zc + sd * lw / 2], sd > 0 ? [0, 0, 1, 0, 1, 1, 0, 1] : [1, 0, 0, 0, 0, 1, 1, 1]); });
    // a light strip along each side for the lamps seen side-on (the painting's view is side-on)
    lampB.set('lampG', 'lampG', null, 'ink', 'white', null, 4);
    [-1, 1].forEach(function (sd) { var z = sd * (hw * plan(0.98) + 0.03); var a = [len - 0.18, hy - 0.06, z], b = [len - 0.02, hy - 0.06, z], c = [len - 0.02, hy + 0.06, z], d = [len - 0.18, hy + 0.06, z]; if (sd > 0) lampB.quad(a, b, c, d); else lampB.quad(b, a, d, c); });
    lampB.set('tail', 'tail', null, 'ink', 'red', null, 4);
    [-1, 1].forEach(function (sd) { var z = sd * (hw * plan(0.02) + 0.03); var a = [0.02, ty - 0.06, z], b = [0.2, ty - 0.06, z], c = [0.2, ty + 0.06, z], d = [0.02, ty + 0.06, z]; if (sd > 0) lampB.quad(a, b, c, d); else lampB.quad(b, a, d, c); });
    // number plates (made-up, unreadable): front and back
    plates.set('white', 'white', null, 'ink', 'sea', null, 0);
    plates.quad([fx + 0.01, 0.5, 0.26], [fx + 0.01, 0.5, -0.26], [fx + 0.01, 0.62, -0.26], [fx + 0.01, 0.62, 0.26], [0, 0, 1, 0, 1, 1, 0, 1]);
    plates.quad([rx - 0.01, 0.5, -0.26], [rx - 0.01, 0.5, 0.26], [rx - 0.01, 0.62, 0.26], [rx - 0.01, 0.62, -0.26], [0, 0, 1, 0, 1, 1, 0, 1]);
    // door mirrors on the A-pillar, bumpers in dark trim
    acc.set(tok, tD, tH);
    [-1, 1].forEach(function (sd) { var mx = ub * len - 0.16, my = k.belt + 0.02, mz = sd * (hw * plan(ub) * 0.96); acc.box(mx - 0.1, my, Math.min(mz, mz + sd * 0.14), mx + 0.02, my + 0.09, Math.max(mz, mz + sd * 0.14)); acc.set('clad'); acc.box(mx - 0.04, my - 0.04, Math.min(mz, mz + sd * 0.06), mx, my, Math.max(mz, mz + sd * 0.06)); acc.set(tok, tD, tH); });
    acc.set('clad', 'clad', 'rimD'); acc.box(len - 0.07, 0.3, -hw * 0.8, len + 0.04, 0.42, hw * 0.8); acc.box(-0.04, 0.3, -hw * 0.8, 0.07, 0.42, hw * 0.8);
    // per-car features
    if (kind === 'hatch') { acc.set('clad'); acc.box(0.02, top(0.14) - 0.02, -0.72, 0.36, top(0.14) + 0.05, 0.72); acc.set('chrome', 'rimD', 'white'); [-0.32, -0.16].forEach(function (z) { acc.cyl(0.02, 0.36, z, 0.05, 0.05, -0.16, 8, 'x'); }); }
    if (kind === 'gt') { acc.set('chrome'); [-1, 1].forEach(function (sd) { acc.beam([ua * len, k.belt + 0.01, sd * hw * 0.93], [ub * len, k.belt + 0.01, sd * hw * 0.93], 0.018); }); }
    if (kind === 'teardrop') { acc.set(tok, tD, tH); [-1, 1].forEach(function (sd) { var z = sd * 0.62; acc.tri([0.05, top(0.05), z], [0.55, top(0.12), z], [0.1, top(0.05) + 0.24, z]); acc.tri([0.55, top(0.12), z], [0.05, top(0.05), z], [0.1, top(0.05) + 0.24, z]); }); }
    if (kind === 'suv') { acc.set('chrome', 'rimD'); [-1, 1].forEach(function (sd) { acc.beam([ua * len + 0.3, top(0.5) + 0.06, sd * 0.55], [ub * len - 0.3, top(0.5) + 0.06, sd * 0.55], 0.03); [0.32, 0.68].forEach(function (f) { var x = lerp(ua, ub, f) * len; acc.beam([x, top(x / len), sd * 0.55], [x, top(0.5) + 0.06, sd * 0.55], 0.025); }); }); }
    if (kind === 'racer') { acc.set('rc', 'rcD', 'rcH'); [-0.5, 0.5].forEach(function (z) { acc.box(0.08, top(0.04), z - 0.03, 0.2, top(0.04) + 0.32, z + 0.03); }); acc.set('rcS', 'rcS'); acc.box(-0.12, top(0.04) + 0.32, -0.85, 0.42, top(0.04) + 0.38, 0.85); }
    if (kind === 'taxi') { acc.set('white', 'white', 'white'); acc.box(0.48 * len - 0.25, top(0.5) - 0.01, -0.3, 0.48 * len + 0.25, top(0.5) + 0.16, 0.3); }
    // arches: dark flares (chunky on the SUV)
    var whx = [0.18 * len, 0.8 * len];
    acc.set('clad', 'clad', 'rimD');
    whx.forEach(function (wx) { [-1, 1].forEach(function (sd) { var r0 = wr + 0.05, r1 = wr + (kind === 'suv' ? 0.17 : 0.07), z = sd * (hw * plan(wx / len) + (kind === 'suv' ? 0.02 : 0.005)); for (var q = 0; q < 10; q++) { var a0 = q / 10 * Math.PI, a1 = (q + 1) / 10 * Math.PI; var A = [wx + Math.cos(a0) * r0, 0.36 + Math.sin(a0) * r0, z], B = [wx + Math.cos(a1) * r0, 0.36 + Math.sin(a1) * r0, z], C = [wx + Math.cos(a1) * r1, 0.36 + Math.sin(a1) * r1, z], D = [wx + Math.cos(a0) * r1, 0.36 + Math.sin(a0) * r1, z]; if (sd > 0) acc.quad(B, A, D, C); else acc.quad(A, B, C, D); } }); });
    // event dressing: antlers + red nose (Christmas), a fir on the roof (Christmas), a pumpkin on the roof (Halloween)
    var ev = new PB(P), evH = new PB(P), rt = top(0.5);
    if (kind === 'hatch') { ev.set('deer'); [-1, 1].forEach(function (sd) { ev.beam([0.5 * len, rt, sd * 0.3], [0.42 * len, rt + 0.55, sd * 0.45], 0.05); ev.beam([0.45 * len, rt + 0.3, sd * 0.38], [0.36 * len, rt + 0.42, sd * 0.5], 0.035); }); ev.set('red'); ev.blob(len + 0.1, hy, 0, 0.16, 0.16, 0.16, 1, 3); }
    if (kind === 'suv') { ev.set('xt', 'xt', 'xtH'); ev.cyl(0.45 * len, rt + 0.08, 0, 0.6, 0.02, 1.1, 8); ev.set('xtT'); ev.box(0.2 * len, rt + 0.02, -0.55, 0.7 * len, rt + 0.09, 0.55); }
    if (kind === 'saloon') { evH.set('pk', 'pkD'); evH.blob(0.55 * len, rt + 0.32, 0, 0.45, 0.32, 0.45, 1, 4); evH.set('pkS'); evH.box(0.55 * len - 0.04, rt + 0.6, -0.04, 0.55 * len + 0.04, rt + 0.78, 0.04); }

    var bg_ = smoothGeo(body), gg_ = smoothGeo(glass), g = new T.Group(), parts = [[bg_, mats.body], [gg_, mats.glass], [acc.geo(), mats.paint], [lampB.geo(), mats.lamp], [plates.geo(), mats.plate]];
    [bg_, gg_].forEach(function (geo) { var o = new T.Mesh(geo, mats.outline); o.renderOrder = 1; g.add(o); });
    parts.forEach(function (p) { var m = new T.Mesh(p[0], p[1]); m.castShadow = true; m.receiveShadow = true; g.add(m); });
    var wheels = [];
    whx.forEach(function (wx) { [-1, 1].forEach(function (sd) { var wm = new T.Mesh(wheelGeo, mats.rim); wm.position.set(wx, 0.36, sd * (hw * plan(wx / len) - 0.1)); if (sd < 0) wm.rotation.y = Math.PI; wm.castShadow = true; g.add(wm); wheels.push({ m: wm, sd: sd }); }); });
    var mx = ev.v ? new T.Mesh(ev.geo(), mats.paint) : null, mh = evH.v ? new T.Mesh(evH.geo(), mats.paint) : null; if (mx) g.add(mx); if (mh) g.add(mh);
    g.scale.setScalar(SC); return { g: g, xm: mx, hw: mh, len: len * SC, L: len, wheels: wheels, wr: wr * SC, hy: hy, ty: ty, kind: kind };
  }
  // ---- the other traffic: a bus, a scooter, rental bikes
  function busMesh() {
    var pb = new PB(P), win = new PB(P), len = 11, g = new T.Group();
    pb.set('awG', 'bqL', 'awG'); pb.boxW(0, 0.35, -1.25, len, 1.25, 1.25, 1); pb.set('white', 'hS', 'white'); pb.box(0, 1.25, -1.25, len, 3.0, 1.25); pb.set('awG'); pb.box(0, 3.0, -1.2, len, 3.15, 1.2);
    pb.set('clad'); pb.box(len - 0.05, 0.35, -1.1, len + 0.05, 0.6, 1.1);
    win.set('white', 'hS', null, 'ink', 'cglass', 'cglassH');
    [-1, 1].forEach(function (sd) { var z = sd * 1.26, n = 7; var a = [0.6, 1.45, z], b = [len - 1.2, 1.45, z], c = [len - 1.2, 2.75, z], d = [0.6, 2.75, z]; if (sd > 0) win.quad(a, b, c, d, [0, 0, n, 0, n, 2, 0, 2]); else win.quad(b, a, d, c, [0, 0, n, 0, n, 2, 0, 2]); });
    win.quad([len + 0.01, 1.4, 1.1], [len + 0.01, 1.4, -1.1], [len + 0.01, 2.85, -1.1], [len + 0.01, 2.85, 1.1], [0, 0, 1, 0, 1, 2, 0, 2]);
    var lampB = new PB(P); lampB.set('lampG', 'lampG', null, 'ink', 'white', null, 2); [-1, 1].forEach(function (sd) { lampB.quad([len + 0.03, 0.62, sd * 0.85 + 0.15 * -sd], [len + 0.03, 0.62, sd * 0.85 - 0.15 * -sd].map(function (v) { return v; }), [len + 0.03, 0.78, sd * 0.85 - 0.15 * -sd], [len + 0.03, 0.78, sd * 0.85 + 0.15 * -sd], [0, 0, 1, 0, 1, 1, 0, 1]); });
    [[pb.geo(), mats.paint], [win.geo(), mats.win], [lampB.geo(), mats.lamp]].forEach(function (p) { var m = new T.Mesh(p[0], p[1]); m.castShadow = true; m.receiveShadow = true; g.add(m); });
    var wheels = [], wg = new T.CylinderGeometry(0.48, 0.48, 0.3, 16).rotateX(Math.PI / 2);
    [1.8, len - 2.2].forEach(function (wx) { [-1, 1].forEach(function (sd) { var wm = new T.Mesh(wg, mats.paint); wm.position.set(wx, 0.48, sd * 1.1); g.add(wm); wheels.push({ m: wm, sd: 1 }); }); });
    wg.setAttribute('aTok', new T.Float32BufferAttribute(new Array(wg.attributes.position.count).fill(0).flatMap(function () { return [P.i('clad'), P.i('clad'), P.i('rimD'), -1]; }), 4));
    wg.setAttribute('aTok2', new T.Float32BufferAttribute(new Array(wg.attributes.position.count * 2).fill(-1), 2)); wg.setAttribute('aScr', new T.Float32BufferAttribute(new Array(wg.attributes.position.count).fill(0), 1));
    g.scale.setScalar(1.15); return { g: g, len: len * 1.15, L: len, wheels: wheels, wr: 0.48 * 1.15, hy: 0.7, ty: 0.7, kind: 'bus' };
  }
  function twoWheeler(kind) {
    var pb = new PB(P), g = new T.Group(), len = 1.8, wheels = [];
    if (kind === 'scooter') {
      pb.set('awR', 'red', 'awW'); pb.blob(0.55, 0.62, 0, 0.55, 0.28, 0.24, 1, 7); pb.blob(1.35, 0.95, 0, 0.18, 0.5, 0.2, 1, 8); pb.set('clad'); pb.box(0.35, 0.86, -0.18, 0.95, 0.96, 0.18);
      pb.set('chrome'); pb.beam([1.45, 1.4, -0.35], [1.45, 1.4, 0.35], 0.03);
      pb.set('sea'); pb.box(0.6, 0.96, -0.2, 0.95, 1.55, 0.2); pb.set('white', 'white', 'white'); pb.blob(0.8, 1.82, 0, 0.2, 0.22, 0.2, 1, 9);
      pb.set('ink'); pb.beam([0.75, 1.4, 0.18], [1.4, 1.38, 0.3], 0.05); pb.beam([0.75, 1.0, 0.18], [1.1, 0.62, 0.22], 0.06);
    } else {
      pb.set('mor', 'bq', 'morL'); pb.beam([0.3, 0.38, 0], [0.85, 0.9, 0], 0.05); pb.beam([0.85, 0.9, 0], [1.45, 0.38, 0], 0.05); pb.beam([0.85, 0.9, 0], [1.38, 1.02, 0], 0.045); pb.beam([0.85, 0.4, 0], [0.85, 0.9, 0], 0.045);
      pb.set('mor', 'bq'); pb.box(1.4, 0.85, -0.18, 1.75, 1.05, 0.18); pb.set('clad'); pb.box(0.72, 0.92, -0.1, 0.98, 0.98, 0.1);
      pb.set(kind === 'bike1' ? 'awG' : 'cart'); pb.box(0.7, 0.98, -0.18, 1.0, 1.6, 0.2); pb.set('skin'); pb.blob(0.9, 1.82, 0.02, 0.17, 0.2, 0.17, 1, 10);
      pb.set('ink'); pb.box(0.75, 0.55, -0.1, 0.95, 0.98, 0.1); pb.beam([0.95, 1.5, 0.15], [1.38, 1.1, 0.22], 0.045);
    }
    var m = new T.Mesh(pb.geo(), mats.paint); m.castShadow = true; g.add(m);
    var tg = new T.TorusGeometry(0.31, 0.045, 6, 18); var wg = new PB(P); wg.set('clad'); for (var q = 0; q < 6; q++) { var a = q / 6 * Math.PI; wg.beam([Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0], [-Math.cos(a) * 0.3, -Math.sin(a) * 0.3, 0], 0.012); } void tg;
    for (q = 0; q < 16; q++) { var a0 = q / 16 * 6.2832, a1 = (q + 1) / 16 * 6.2832; wg.beam([Math.cos(a0) * 0.32, Math.sin(a0) * 0.32, 0], [Math.cos(a1) * 0.32, Math.sin(a1) * 0.32, 0], 0.045); }
    var wgeo = wg.geo();
    [0.3, 1.45].forEach(function (wx) { var wm = new T.Mesh(wgeo, mats.paint); wm.position.set(wx, 0.36, 0); g.add(wm); wheels.push({ m: wm, sd: 1 }); });
    g.scale.setScalar(SC); return { g: g, len: len * SC, L: len, wheels: wheels, wr: 0.36 * SC, hy: 1.0, ty: 0.8, kind: kind, small: true };
  }

  // ---- lanes: a (+x, the river side of the near carriageway), b (-x), c (-x, the far fast lane: the racer), d (+x, bikes by the kerb)
  var LA = ctx.lanes, laneZ = { a: LA.a, b: LA.b, c: ZC - dOf(1139), d: ZC - dOf(1133.5) }, dir = { a: 1, b: -1, c: -1, d: 1 };
  var S0 = -115, S1 = 115, LOOP = S1 - S0, STOP = { a: -17.5, b: 11, c: 11, d: -17.5 };
  var lanes = { a: [], b: [], c: [], d: [] }, all = [];
  function addV(m, lane, s, v0, opt) { var o = { m: m, lane: lane, s: s, v: v0 * 0.6, v0: v0, acc: 0, ph: Math.random() * 6, opt: opt || {}, mode: 'lane' }; m.g.position.set(dir[lane] * s, 0.05, laneZ[lane]); if (dir[lane] < 0) m.g.rotation.y = Math.PI; scene.add(m.g); lanes[lane].push(o); all.push(o); return o; }
  var cars = {};
  addV(cars.hatch = carMesh('hatch'), 'a', -80, 7.2);
  addV(cars.gt = carMesh('gt'), 'a', -40, 6.6);
  addV(cars.teardrop = carMesh('teardrop'), 'a', 10, 7.6);
  addV(cars.taxi = carMesh('taxi'), 'a', 55, 6.9);
  addV(twoWheeler('scooter'), 'a', 90, 6.2);
  addV(cars.suv = carMesh('suv'), 'b', -70, 6.4);
  addV(cars.wedge = carMesh('wedge'), 'b', -30, 7.8);
  addV(cars.saloon = carMesh('saloon'), 'b', 20, 6.8);
  addV(busMesh(), 'b', 70, 5.2);
  var bridgeOut = addV(carMesh('gt'), 'b', 100, 6.5, { turnAt: -8 });           // turns off onto the bridge
  var racer = addV(cars.racer = carMesh('racer'), 'c', -95, 28, { hero: 1 });
  addV(twoWheeler('bike1'), 'd', -60, 4.2); addV(twoWheeler('bike2'), 'd', 30, 3.8);
  // the inbound bridge car: comes up the bridge, waits for the avenue's red, turns left into lane a
  var bridgeIn = { m: carMesh('saloon'), mode: 'bridge', z: 0, v: 0, v0: 6, ph: 1, opt: {}, acc: 0, lane: 'a' };
  scene.add(bridgeIn.m.g); all.push(bridgeIn); ctx.vehicles = all;
  var bz = ctx.bridgeZ || [250, 427];
  bridgeIn.z = bz[0] - 6;
  bridgeOut.opt.paint = 1;

  // ---- the traffic light at the bridge (one head per direction), the stop lines and the zebra crossing are in the road pattern
  var tl = new PB(P), lampsTL = [];
  [[STOP.a + 0.4, ZC - dOf(1130) - 0.7], [-STOP.b - 0.4, ZC - dOf(1156) + 1.2]].forEach(function (p, i) {
    var x = p[0], z = p[1];
    tl.set('iron', 'iron', 'chrome'); tl.cyl(x, 0.05, z, 0.09, 0.07, 3.1, 8); tl.box(x - 0.18, 3.0, z - 0.14, x + 0.18, 4.15, z + 0.14);
    tl.set('ink'); tl.box(x - 0.22, 2.96, z + 0.14, x + 0.22, 4.2, z + 0.17);
    ['red', 'fc', 'awG'].forEach(function (c, j) { lampsTL.push({ i: i, j: j, p: [x, 3.95 - j * 0.36, z + 0.2] }); });
  });
  (function () { var m = new T.Mesh(tl.geo(), mats.paint); m.castShadow = true; scene.add(m); })();
  var tlCol = ['#ff3b30', '#ffb02e', '#4dff7a'], tlGl = lampsTL.map(function (l) { return ctx.glows.add(l.p, 0.9, tlCol[l.j], 1, 'nt'); });
  var lensG = new PB(P); lampsTL.forEach(function (l) { lensG.set(['red', 'fc', 'awG'][l.j]); lensG.disc([l.p[0], l.p[1], l.p[2] - 0.02], 0.13, 'z', 12); });
  var lensMat = new T.ShaderMaterial({ uniforms: { uOn: { value: new T.Vector3(1, 0, 0) }, uCol: { value: tlCol.map(function (c) { return new T.Color(c); }) } },
    vertexShader: 'attribute vec4 aTok; varying float vJ; void main(){ vJ = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform vec3 uOn; uniform vec3 uCol[3]; varying float vJ; void main(){ int j = vJ > 3.8 ? 0 : vJ > 3.4 ? 1 : 2; float on = j == 0 ? uOn.x : j == 1 ? uOn.y : uOn.z; gl_FragColor = vec4(uCol[j] * (.22 + .78 * on), 1.);\n#include <colorspace_fragment>\n}' });
  var lens = new T.Mesh(lensG.geo(), lensMat); lens.name = 'traffic-light-lenses'; scene.add(lens);
  function lightState(t) { var c = ((t % 30) + 30) % 30; return c < 16 ? 'green' : c < 19 ? 'amber' : 'red'; }

  // ---- night: light cones on the road ahead, red tail streaks, 4-point flares at the head-lights, reflections on wet roads
  all.forEach(function (o) {
    var m = o.m, big = !m.small;
    o.cone = cone(big ? 12 : 6, big ? 0.9 : 0.3, big ? 3.4 : 1.5, '#ffe9b0'); scene.add(o.cone);   // lies flat on the road, placed each frame (not tilted with the body)
    o.tailS = cone(big ? 2.6 : 1.4, big ? 0.55 : 0.12, big ? 0.3 : 0.08, '#ff2a3a'); o.tailS.rotation.set(Math.PI / 2, Math.PI, 0); o.tailS.position.set(-0.05, m.ty, m.small ? 0 : 0.95); m.g.add(o.tailS);
    o.wet = [];   // reflections of the lights on a wet road: streaks running toward us from each light
    [[m.L, m.hy, '#fff1c8'], [0, m.ty, '#ff3a48']].forEach(function (L_) { [-1, 1].forEach(function (sd) { if (m.small && sd < 0) return; var c = cone(16, 0.3, 0.12, L_[2]); c.rotation.y = -Math.PI / 2; c.userData.l = [L_[0], L_[1], sd * (m.small ? 0 : 0.6)]; scene.add(c); o.wet.push(c); }); });
  });
  all.forEach(function (o) { var m = o.m, sh = new T.Mesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), ctx.contactMat); sh.scale.set(m.L * 1.08, 1, m.small ? 0.7 : 2.1); sh.position.set(m.L / 2, 0.02, 0); sh.renderOrder = 1; m.g.add(sh); });
  var taxiGl = ctx.glows.add([0, 0, 0], 2.6, '#fff6c8', 0.95), taxi = all.filter(function (o) { return o.m.kind === 'taxi'; })[0];
  var flN = all.length * 4, flP = new Float32Array(flN * 3), flA = new Float32Array(flN * 3);
  var flG = new T.BufferGeometry(); flG.setAttribute('position', new T.BufferAttribute(flP, 3)); flG.setAttribute('aF', new T.BufferAttribute(flA, 3));
  var flM = new T.ShaderMaterial({ uniforms: { uMap: { value: ctx.tex.star }, uScale: U.uScale, uPn: U.uPn, uGlow: { value: glowTex } },
    vertexShader: 'attribute vec3 aF; uniform float uScale, uPn; varying vec3 vC; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vec4 q = projectionMatrix * (mv + vec4(0., 0., 2., 0.)); gl_Position = projectionMatrix * mv; gl_Position.z = q.z / q.w * gl_Position.w;\n' +
      ' vA = aF.x > .5 ? aF.y * uPn : aF.y * max(uPn, step(1.05, aF.y) * .75); vC = aF.x > .5 ? vec3(1., .96, .82) : vec3(1., .2, .25);   // brake lights brighten when a car stops, and show by day too\n' +
      ' gl_PointSize = vA > .01 ? aF.z * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uMap, uGlow; varying vec3 vC; varying float vA; void main(){ float s = texture2D(uMap, gl_PointCoord).a; float g = texture2D(uGlow, gl_PointCoord).a; gl_FragColor = vec4(mix(vC, vec3(1.), s * .6), max(s, g * .55) * vA);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false });
  var flares = new T.Points(flG, flM); flares.frustumCulled = false; flares.renderOrder = 9; flares.name = 'car-flares'; scene.add(flares);
  // ✦ on the chrome by day: one glint per car that comes and goes
  var chP = new Float32Array(all.length * 3), chA = new Float32Array(all.length), chG = new T.BufferGeometry(); chG.setAttribute('position', new T.BufferAttribute(chP, 3)); chG.setAttribute('aA', new T.BufferAttribute(chA, 1));
  var chM = new T.ShaderMaterial({ uniforms: { uMap: { value: ctx.tex.star }, uScale: U.uScale },
    vertexShader: 'attribute float aA; uniform float uScale; varying float vA; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vec4 q = projectionMatrix * (mv + vec4(0., 0., 2., 0.)); gl_Position = projectionMatrix * mv; gl_Position.z = q.z / q.w * gl_Position.w; vA = aA; gl_PointSize = vA > .01 ? 1.6 * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uMap; varying float vA; void main(){ gl_FragColor = vec4(1., 1., 1., texture2D(uMap, gl_PointCoord).a * vA);\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var chrome = new T.Points(chG, chM); chrome.frustumCulled = false; chrome.renderOrder = 9; chrome.name = 'car-chrome-glints'; scene.add(chrome);
  // the racer: speed lines and a dust puff when it streaks past
  var speed = new T.Group(); var slM = new T.ShaderMaterial({ uniforms: { uA: { value: 0 } }, transparent: true, depthWrite: false, side: T.DoubleSide,
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vU; void main(){ gl_FragColor = vec4(1., 1., 1., (1. - vU.x) * uA * (1. - pow(abs(vU.y - .5) * 2., 4.)));\n#include <colorspace_fragment>\n}' });
  for (var i = 0; i < 6; i++) { var sl = cone(3 + (i * 7 % 5) * 1.1, 0.05, 0.015, '#ffffff'); sl.material = slM; sl.rotation.set(Math.PI / 2, Math.PI, 0); sl.position.set(-0.25 - (i % 3) * 0.4, 0.35 + i * 0.17, -0.98); speed.add(sl); } cars.racer.g.add(speed);
  var DP = 40, dpP = new Float32Array(DP * 3), dpA = new Float32Array(DP * 2), dpi = 0, dpG = new T.BufferGeometry(); dpG.setAttribute('position', new T.BufferAttribute(dpP, 3)); dpG.setAttribute('aD', new T.BufferAttribute(dpA, 2));
  var dpM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uPal: U.uPal, uTok: { value: P.i('path') } },
    vertexShader: 'attribute vec2 aD; uniform float uTime, uScale; varying float vA; void main(){ float age = uTime - aD.x; vA = age < 0. || age > 1.6 ? 0. : (1. - age / 1.6) * .75; vec3 p = position + vec3(0., age * .5, 0.); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? (.8 + age * 1.6) * aD.y * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uPal; uniform float uTok; varying float vA; void main(){ float d = length(gl_PointCoord - .5) * 2.; gl_FragColor = vec4(texelFetch(uPal, ivec2(int(uTok + .5), 0), 0).rgb * .92, (1. - smoothstep(.5, 1., d)) * vA);\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var dust = new T.Points(dpG, dpM); dust.frustumCulled = false; dust.renderOrder = 4; dust.name = 'racer-dust'; scene.add(dust);
  var racerNext = 6, lastT = 0;

  // ---- driving
  function obstacleGap(o, list, light) {
    var d = dir[o.lane], best = 1e9;
    for (var i = 0; i < list.length; i++) { var p = list[i]; if (p === o) continue; var g = p.s - o.s - o.m.len; if (g < -o.m.len - 0.5) g += LOOP; if (g > -1 && g < best) best = g; }   // s is the rear; the gap runs from my front to their rear
    var toStop = STOP[o.lane] - o.s - o.m.len;
    if (light !== 'green' && toStop > -0.5 && toStop < 45) { if (!(light === 'amber' && toStop < o.v * o.v / 8 + 0.5)) best = Math.min(best, toStop); }
    if (o.opt.turnAt != null && o.s < o.opt.turnAt && light === 'green') best = Math.min(best, o.opt.turnAt - o.s - o.m.len);
    void d; return best;
  }
  function drive(o, gap, dt) {
    var vt = Math.min(o.v0, Math.sqrt(Math.max(0, 2 * 3.5 * (gap - 2.2)))), a = clamp((vt - o.v) * 1.6, -7, o.opt.hero ? 9 : 2.6);
    o.acc += (a - o.acc) * Math.min(1, dt * 4); o.v = Math.min(vt, Math.max(0, o.v + a * dt)); return Math.min(o.v * dt, Math.max(0, gap - 1.6));
  }
  function place(o, x, z, yaw, dt, now) {
    var m = o.m, bounce = Math.sin(now * 9 + o.ph) * 0.012 * Math.min(1, o.v / 6) + Math.sin(now * 3.1 + o.ph) * 0.006;
    m.g.position.set(x, 0.05 + bounce, z); m.g.rotation.set(0, yaw, 0);
    // body roll and pitch: lean into braking, a gentle sway
    m.g.rotation.z = clamp(-o.acc * 0.006, -0.03, 0.03); m.g.rotation.x = Math.sin(now * 1.7 + o.ph) * 0.006 * Math.min(1, o.v / 5);
    m.wheels.forEach(function (w) { w.m.rotation.z -= w.sd * o.v * dt / m.wr; });
  }
  return {
    update: function (st, time, glowPos) {
      var dt = clamp(time - lastT, 0, 0.1); lastT = time;
      var light = lightState(time), hide = !!st.nocars, night = st.pn, wet = st.wx === 'rain';
      lensMat.uniforms.uOn.value.set(light === 'red' ? 1 : 0, light === 'amber' ? 1 : 0, light === 'green' ? 1 : 0);
      lampsTL.forEach(function (l, k) { var on = (l.j === 0 && light === 'red') || (l.j === 1 && light === 'amber') || (l.j === 2 && light === 'green'); if (ctx.glowOp) ctx.glowOp.setX(tlGl[k], on ? 0.35 + 0.65 * night : 0); });
      ['a', 'b', 'c', 'd'].forEach(function (ln) {
        var list = lanes[ln];
        list.slice().forEach(function (o) {
          if (o.opt.hero) {   // the racer waits out of sight, then streaks past on a green
            if (!o.running) { if (time >= racerNext && light === 'green' && ((time % 30) + 30) % 30 < 9) { o.running = true; racerNext = time + 30 + Math.random() * 12; } else { o.v = 0; o.s = -95; } }
          }
          var gap = obstacleGap(o, list, light);
          o.s += drive(o, gap, dt);
          if (o.opt.turnAt != null && o.s >= o.opt.turnAt && light !== 'green') { list.splice(list.indexOf(o), 1); o.mode = 'turnOut'; o.t = 0; return; }
          if (o.s > S1) { o.running = false; if (o === bridgeIn) { list.splice(list.indexOf(o), 1); o.mode = 'bridge'; o.z = bz[0] - 6; o.v = o.v0; } else o.s -= LOOP; }
          if (o.mode === 'lane') place(o, dir[ln] * o.s, laneZ[ln], dir[ln] > 0 ? 0 : Math.PI, dt, time);
        });
      });
      // the outbound car: a right turn off lane b onto the bridge, then away up the bridge; back into lane b out of sight
      if (bridgeOut.mode === 'turnOut') {
        bridgeOut.v = Math.min(bridgeOut.v0, bridgeOut.v + dt * 2.2); bridgeOut.t += dt * Math.max(1, bridgeOut.v) / 7.5;
        var f = Math.min(1, bridgeOut.t), ang = f * Math.PI / 2, x0 = 8 - Math.sin(ang) * 4.8, z0 = LA.b - 4.8 * (1 - Math.cos(ang));
        place(bridgeOut, x0, z0, Math.PI - ang, dt, time); if (f >= 1) { bridgeOut.mode = 'up'; bridgeOut.z = z0; }
      } else if (bridgeOut.mode === 'up') {
        bridgeOut.v = Math.min(bridgeOut.v0, bridgeOut.v + dt * 2.2); bridgeOut.z -= bridgeOut.v * dt; place(bridgeOut, 3.2, bridgeOut.z, Math.PI / 2, dt, time);
        if (bridgeOut.z < bz[0] - 8) { bridgeOut.mode = 'lane'; bridgeOut.s = S0 + 2; lanes.b.push(bridgeOut); }
      }
      // the inbound car: up the bridge toward us, waits while the avenue has green, then turns left into lane a
      if (bridgeIn.mode === 'bridge') {
        var clear = !lanes.a.some(function (q) { return q.s > -14 && q.s < 16; }) && !lanes.d.some(function (q) { return q.s > -8 && q.s < 6; });
        var stopZ = bz[1] - 3.5, gapZ = light === 'red' && ((time % 30) + 30) % 30 > 21.5 && clear ? 1e9 : stopZ - bridgeIn.z;
        var vt = Math.min(bridgeIn.v0, Math.sqrt(Math.max(0, 7 * (gapZ - 0.5)))), a = clamp((vt - bridgeIn.v) * 1.6, -7, 2.4); bridgeIn.acc = a; bridgeIn.v = Math.max(0, bridgeIn.v + a * dt); bridgeIn.z += bridgeIn.v * dt;
        place(bridgeIn, -3.2, bridgeIn.z, -Math.PI / 2, dt, time);
        if (bridgeIn.z > stopZ - 0.3 && light === 'red' && ((time % 30) + 30) % 30 > 21.5 && clear) { bridgeIn.mode = 'turnIn'; bridgeIn.t = 0; bridgeIn.z0 = bridgeIn.z; }
      } else if (bridgeIn.mode === 'turnIn') {
        bridgeIn.v = Math.min(bridgeIn.v0, bridgeIn.v + dt * 2.4); bridgeIn.t += dt * Math.max(1, bridgeIn.v) / 11;
        var Rz = LA.a - bridgeIn.z0; bridgeIn.t += 0; var g2 = Math.min(1, bridgeIn.t * 11 / (Rz * 1.5708)), a2 = g2 * Math.PI / 2, px = -3.2 + (1 - Math.cos(a2)) * Rz, pz = bridgeIn.z0 + Math.sin(a2) * Rz;
        place(bridgeIn, px, pz, -Math.PI / 2 + a2, dt, time);
        if (g2 >= 1) { bridgeIn.mode = 'lane'; bridgeIn.s = px; lanes.a.push(bridgeIn); }
      }
      // lights, flares, glints, dust, event dressing
      var k = 0, V = new T.Vector3(), ch = 0;
      all.forEach(function (o, idx) {
        var m = o.m; m.g.visible = !hide && !(o.opt.hero && !o.running);
        if (m.xm) m.xm.visible = st.event === 'christmas'; if (m.hw) m.hw.visible = st.event === 'halloween';
        o.cone.material.uniforms.uA.value = night * 0.95; o.cone.visible = m.g.visible;
        m.g.updateMatrixWorld();
        V.set(m.L + 0.1, 0, 0).applyMatrix4(m.g.matrixWorld); o.cone.position.set(V.x, 0.1, V.z); o.cone.rotation.set(0, m.g.rotation.y, 0); o.tailS.material.uniforms.uA.value = night * 0.8 * clamp(o.v / 7, 0.25, 1);
        o.wet.forEach(function (c) { c.visible = wet && m.g.visible; if (!c.visible) return; var l = c.userData.l; V.set(l[0], l[1], l[2]).applyMatrix4(m.g.matrixWorld); c.position.set(V.x, 0.09, V.z); c.material.uniforms.uA.value = (0.35 + 0.65 * night); });
        var facing = Math.max(0, Math.cos(m.g.rotation.y + Math.PI / 2));   // +z: toward us
        [[m.L + 0.04, m.hy, 1], [-0.04, m.ty, 0]].forEach(function (L_) { [-1, 1].forEach(function (sd) {
          V.set(L_[0], L_[1], m.small ? 0 : sd * 0.6).applyMatrix4(m.g.matrixWorld); flP.set([V.x, V.y, V.z], k * 3);
          var on = m.g.visible && !(m.small && sd < 0) ? 1 : 0, brake = m.small ? 0 : clamp(1 - o.v / 3, 0, 1); flA.set([L_[2], on * (L_[2] ? 0.8 + facing : 0.7 + 0.6 * brake), L_[2] ? 0.9 + facing * 3.2 : 0.7 + 0.5 * brake], k * 3); k++;
        }); });
        V.set(m.L * (0.3 + 0.1 * Math.sin(time * 0.3 + idx)), m.hy + 0.55, 0.92 * (Math.cos(m.g.rotation.y) >= 0 ? 1 : -1)).applyMatrix4(m.g.matrixWorld); chP.set([V.x, V.y, V.z], ch * 3);
        chA[ch] = m.g.visible ? (1 - night) * Math.pow(Math.max(0, Math.sin(time * 1.3 + idx * 2.1)), 12) : 0; ch++;
      });
      flG.attributes.position.needsUpdate = true; flG.attributes.aF.needsUpdate = true; chG.attributes.position.needsUpdate = true; chG.attributes.aA.needsUpdate = true;
      // the racer streaking past: speed lines and a dust puff behind the rear wheels
      var fast = racer.v > 14 && racer.m.g.visible; speed.visible = fast; slM.uniforms.uA.value = fast ? 0.9 : 0;
      if (fast) for (var q = 0; q < 2; q++) { V.set(-0.3 + Math.random() * 0.4, 0.15, (Math.random() - 0.5) * 1.6).applyMatrix4(racer.m.g.matrixWorld); dpP.set([V.x, V.y, V.z], dpi * 3); dpA.set([time - Math.random() * 0.05, 1.2 + Math.random()], dpi * 2); dpi = (dpi + 1) % DP; }
      dpG.attributes.position.needsUpdate = true; dpG.attributes.aD.needsUpdate = true;
      if (taxi && glowPos) { V.set(taxi.m.L * 0.48, 1.55, 0).applyMatrix4(taxi.m.g.matrixWorld); glowPos.setXYZ(taxiGl, V.x, V.y, V.z); if (ctx.glowOp) ctx.glowOp.setX(taxiGl, taxi.m.g.visible ? 0.95 : 0); }
      ctx.carsW = hide ? [] : all.filter(function (o) { return o.m.g.visible && !o.m.small && o.v > 2; }).map(function (o) { return [o.m.g.position.x, o.m.g.position.z, o.m.g.rotation.y, o.m.L, o.v]; });
      ctx.carsSx = hide ? [] : all.filter(function (o) { return o.mode === 'lane'; }).map(function (o) { return EX + o.m.g.position.x * F / (ZC - o.m.g.position.z); });
      void glowPos;
    }
  };
}

