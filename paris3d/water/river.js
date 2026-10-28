import * as T from 'three';
import { paintMaterial } from '../core/paint.js';
import { PB } from '../core/pb.js';
import { rng, lerp, clamp } from '../core/util.js';
import { gp, ZC, HC } from '../core/view.js';
// ---------------------------------------------------------------- life on and around the river: people, a cyclist and cars on the bridge, a cyclist on the low path,
// ducks and gulls, leaves / petals / ice floating downstream, the moored boats bobbing
export function buildRiver(ctx) {
  var P = ctx.P, U = ctx.U, scene = ctx.scene, WL = ctx.WL, R = rng(77), bz = ctx.bridgeZ, hwAt = ctx.bridgeHw;
  function figure(coat, h) { var pb = new PB(P); pb.set('ink'); pb.box(-0.16, 0, -0.12, 0.16, 0.85 * h, 0.12); pb.set(coat); pb.box(-0.25, 0.85 * h, -0.17, 0.25, 1.45 * h, 0.17); pb.set('skin'); pb.box(-0.13, 1.45 * h, -0.13, 0.13, 1.75 * h, 0.13); var m = new T.Mesh(pb.geo(), ctx.mats.paint); m.castShadow = true; scene.add(m); return m; }
  function bike(coat) {
    var pb = new PB(P); pb.set('iron');
    [-0.55, 0.55].forEach(function (cz) { for (var r = 0; r < 10; r++) { var a0 = r / 10 * 6.2832, a1 = (r + 1) / 10 * 6.2832; pb.beam([0, 0.35 + Math.sin(a0) * 0.33, cz + Math.cos(a0) * 0.33], [0, 0.35 + Math.sin(a1) * 0.33, cz + Math.cos(a1) * 0.33], 0.025); } });
    pb.beam([0, 0.35, -0.55], [0, 0.85, -0.05], 0.035); pb.beam([0, 0.85, -0.05], [0, 0.35, 0.55], 0.035); pb.beam([0, 0.85, -0.05], [0, 0.95, 0.45], 0.035);
    pb.set('ink'); pb.box(-0.13, 0.85, -0.25, 0.13, 1.35, 0.05); pb.set(coat); pb.box(-0.2, 1.3, -0.15, 0.2, 1.85, 0.2); pb.set('skin'); pb.box(-0.12, 1.85, -0.05, 0.12, 2.1, 0.17);
    var m = new T.Mesh(pb.geo(), ctx.mats.paint); m.castShadow = true; scene.add(m); return m;
  }
  function car(tok) {
    var pb = new PB(P); pb.set(tok, tok + 'D', tok + 'H'); pb.box(-0.85, 0.3, -2, 0.85, 0.95, 2); pb.box(-0.75, 0.95, -1.1, 0.75, 1.45, 0.8);
    pb.set('cglass', 'cglass', 'cglassH'); pb.box(-0.77, 1.0, -1.0, 0.77, 1.38, 0.7);
    pb.set('rimD'); [[-0.86, -1.3], [0.86, -1.3], [-0.86, 1.3], [0.86, 1.3]].forEach(function (c) { pb.cyl(c[0] - (c[0] > 0 ? 0 : 0.1), 0.32, c[1], 0.3, 0.3, 0.1, 10, 'x'); });
    var m = new T.Mesh(pb.geo(), ctx.mats.paint); m.castShadow = true; scene.add(m); return m;
  }
  // bridge: people both ways on the pavements, a cyclist, a tourist taking a photo, cars both ways
  var walkers = [];
  ['awR', 'sea', 'cart', 'umb', 'h1', 'white'].forEach(function (c, i) { var side = i % 2 ? 1 : -1; walkers.push({ m: figure(c, 1), side: side, dir: i < 3 ? 1 : -1, sp: 1.1 + R() * 0.5, ph: R(), off: 1.2 + R() * 1.6 }); });
  var cyc = { m: bike('awG'), side: 1, dir: -1, sp: 4.5, ph: 0.3, off: 4.6 };
  var tour = figure('awR', 1), tz = lerp(bz[0], bz[1], 0.55); tour.position.set(-(hwAt(tz) - 1.4), 0.75, tz); tour.rotation.y = Math.PI;
  var cam = new PB(P); cam.set('ink'); cam.box(-0.12, 1.5, -0.32, 0.12, 1.65, -0.2); var camM = new T.Mesh(cam.geo(), ctx.mats.paint); tour.add(camM);
  var tFlash = ctx.glows.add([tour.position.x, 2.35, tz - 0.4], 2.4, '#ffffff', 0, 'nt');
  var cars = [];   // the cars on the bridge now come from the avenue's traffic (they turn on and off the bridge at the light)
  void car;
  // the esplanade's edge: a balloon seller (balloons bobbing on their strings) and a street painter at an easel
  var bs = gp(176, 1166, 0.1), sp_ = gp(684, 1166, 0.1), seller = figure('cart', 1.05); seller.position.set(bs[0], 0.1, bs[2]); seller.scale.setScalar(1.35);
  var balloons = new T.Group(); balloons.position.set(bs[0] + 0.35 * 1.35, 0.1, bs[2]); scene.add(balloons);
  var bcols = ['red', 'fc', 'sea', 'awG', 'petal', 'awR', 'tdH'], bl = [];
  bcols.forEach(function (tk, i) {
    var pb = new PB(P), a = i / bcols.length * 6.2832, hx = Math.cos(a) * 0.55, hz = Math.sin(a) * 0.45, hy = 3.4 + (i % 3) * 0.35;
    pb.set(tk, tk, 'white'); pb.blob(0, 0, 0, 0.36, 0.44, 0.36, 2, 30 + i); pb.set(tk); pb.tri([-0.06, -0.44, 0], [0.06, -0.44, 0], [0, -0.54, 0]);
    var m = new T.Mesh(pb.geo(), ctx.mats.paint); m.position.set(hx, hy, hz); balloons.add(m);
    var str = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0, 1.85, 0), new T.Vector3(hx, hy - 0.5, hz)]), new T.LineBasicMaterial({ color: 0x555555 })); balloons.add(str);
    bl.push({ m: m, s: str, h: [hx, hy, hz], ph: i * 1.3 });
  });
  var painter = figure('beret' in {} ? 'beret' : 'sea', 1); painter.position.set(sp_[0], 0.1, sp_[2]); painter.scale.setScalar(1.35); painter.rotation.y = -0.6;
  var ez = new PB(P), ex = sp_[0] - 1.3, ezz = sp_[2] - 0.6;
  ez.set('wood', 'trk'); ez.beam([ex - 0.4, 0.1, ezz + 0.25], [ex, 2.3, ezz], 0.04); ez.beam([ex + 0.4, 0.1, ezz + 0.25], [ex, 2.3, ezz], 0.04); ez.beam([ex, 0.1, ezz - 0.45], [ex, 2.2, ezz], 0.04); ez.box(ex - 0.55, 1.05, ezz + 0.08, ex + 0.55, 1.12, ezz + 0.2);
  ez.set('white', 'hS'); ez.box(ex - 0.5, 1.12, ezz + 0.12, ex + 0.5, 1.95, ezz + 0.16);
  var cv = new PB(P); cv.set('white', 'white', null, 'ink', 'sea', 'fc'); cv.quad([ex - 0.47, 1.15, ezz + 0.17], [ex + 0.47, 1.15, ezz + 0.17], [ex + 0.47, 1.92, ezz + 0.17], [ex - 0.47, 1.92, ezz + 0.17], [0, 0, 1, 0, 1, 1, 0, 1]);
  ez.set('beret' in {} ? 'beret' : 'ink'); ez.blob(sp_[0], 0.1 + 1.82 * 1.35, sp_[2], 0.2, 0.06, 0.2, 1, 4);
  (function () { var m = new T.Mesh(ez.geo(), ctx.mats.paint); m.castShadow = true; scene.add(m); var c = new T.Mesh(cv.geo(), paintMaterial(U, { pat: 'canvas' })); scene.add(c); })();
  ctx.contacts.push([bs[0], bs[2], 1.2, 0.8], [sp_[0] - 0.6, sp_[2], 1.6, 0.9]);
  // the low path along the water: a cyclist
  var lp = ctx.lowPath, lowBike = bike('sea'); lowBike.rotation.y = Math.PI / 2;
  // ducks (a mother and four ducklings) and a few gulls
  var ducks = new T.Group(), dk = new PB(P);
  dk.set('trk', 'trk', 'by1'); dk.blob(0, 0.18, 0, 0.42, 0.2, 0.22, 1, 3); dk.set('awG'); dk.blob(0.35, 0.45, 0, 0.13, 0.14, 0.12, 1, 4); dk.set('fc'); dk.beam([0.45, 0.43, 0], [0.62, 0.4, 0], 0.05, 0.02);
  var mom = new T.Mesh(dk.geo(), ctx.mats.paint); ducks.add(mom);
  var dl = new PB(P); dl.set('fc', 'fc', 'white'); dl.blob(0, 0.1, 0, 0.17, 0.1, 0.11, 1, 5); dl.blob(0.14, 0.22, 0, 0.07, 0.07, 0.07, 1, 6);
  var dlg = dl.geo(), lings = []; for (var i = 0; i < 4; i++) { var m = new T.Mesh(dlg, ctx.mats.paint); ducks.add(m); lings.push(m); }
  ducks.position.y = -WL; ducks.name = 'ducks'; scene.add(ducks);
  var gulls = [], gg = new T.BufferGeometry(), gpos = new Float32Array(3 * 4 * 9); gg.setAttribute('position', new T.BufferAttribute(gpos, 3));
  var gmat = new T.MeshBasicMaterial({ color: 0xffffff, side: T.DoubleSide }), gmesh = new T.Mesh(gg, gmat); gmesh.frustumCulled = false; gmesh.name = 'gulls'; scene.add(gmesh);
  for (i = 0; i < 3; i++) gulls.push({ c: [-90 + i * 95, 10 + i * 3, lerp(ctx.qz1, ctx.nbz, 0.5 + i * 0.15)], r: 22 + i * 7, w: (0.25 + i * 0.07) * (i % 2 ? -1 : 1), ph: i * 2 });
  // leaves in autumn, petals in spring, ice floes on the coldest days, drifting downstream
  function flat(tok, pts, n, thick) {
    var pb = new PB(P); pb.set(tok, thick ? 'seaL' : tok, thick ? 'white' : null, thick ? 'seaD' : null, null, null, 0);
    var t = thick || 0; for (var k = 1; k < pts.length - 1; k++) pb.tri([pts[0][0], t, pts[0][1]], [pts[k + 1][0], t, pts[k + 1][1]], [pts[k][0], t, pts[k][1]]);
    if (t) for (k = 0; k < pts.length; k++) { var a = pts[k], b = pts[(k + 1) % pts.length]; pb.quad([a[0], -0.2, a[1]], [b[0], -0.2, b[1]], [b[0], t, b[1]], [a[0], t, a[1]]); }
    return new T.InstancedMesh(pb.geo(), flatMat, n);
  }
  var flatMat = paintMaterial(U, { side: T.DoubleSide });
  var leafS = [[0, -0.5], [0.3, -0.1], [0.12, 0.45], [0, 0.6], [-0.12, 0.45], [-0.3, -0.1]], petS = [[0, -0.18], [0.14, 0], [0, 0.2], [-0.14, 0]], iceS = [[0, -1.6], [1.4, -0.8], [1.8, 0.6], [0.4, 1.5], [-1.2, 1.1], [-1.7, -0.4]];
  var drift = [['lv1', leafS, 40, 'leaf'], ['lv3', leafS, 30, 'leaf'], ['petal', petS, 70, 'petal'], ['ice', iceS, 18, 'ice']].map(function (e) {
    var im = flat(e[0], e[1], e[2], e[3] === 'ice' ? 0.22 : 0); im.name = 'drift-' + e[3]; im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
    var items = []; for (var k = 0; k < e[2]; k++) items.push({ x: -170 + R() * 340, z: lerp(ctx.qz1 + 3, ctx.nbz - 3, R()), r: R() * 6.28, s: e[3] === 'ice' ? 3.5 + R() * 3.5 : e[3] === 'leaf' ? 2.6 + R() * 1.2 : 3.2 + R() * 1.4, sp: 0.6 + R() * 0.5 });
    return { m: im, it: items, kind: e[3] };
  });
  // each bridge lamp mirrored in the water as a long wobbly streak of slivers, at night
  var sp = [], suv = [], sid = [];
  (ctx.bridgeLamps || []).forEach(function (l, i) {
    var D = ZC - l[2], Hh = l[1] + WL, dw = D * (HC + WL) / (HC + WL + Hh), zc = ZC - dw, half = D * 0.1, x = Math.sign(l[0]) * (hwAt(clamp(zc, bz[0], bz[1])) + 5.5), hw = 2.2;
    sp.push(x - hw, -WL + 0.06, zc - half, x + hw, -WL + 0.06, zc - half, x + hw, -WL + 0.06, zc + half, x - hw, -WL + 0.06, zc + half);
    suv.push(0, 0, 1, 0, 1, 1, 0, 1); sid.push(i, i, i, i);
  });
  var sgeo = new T.BufferGeometry(); sgeo.setAttribute('position', new T.Float32BufferAttribute(sp, 3)); sgeo.setAttribute('uv', new T.Float32BufferAttribute(suv, 2)); sgeo.setAttribute('aI', new T.Float32BufferAttribute(sid, 1));
  var six = []; for (var q = 0; q < sid.length / 4; q++) six.push(q * 4, q * 4 + 2, q * 4 + 1, q * 4, q * 4 + 3, q * 4 + 2); sgeo.setIndex(six);
  var streakM = new T.ShaderMaterial({
    uniforms: { uTime: U.uTime, uPn: U.uPn },
    vertexShader: 'attribute float aI; varying vec2 vU; varying float vI; void main(){ vU = uv; vI = aI; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform float uTime, uPn; varying vec2 vU; varying float vI; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' +
      'void main(){ float row = floor(vU.y * 40.); float wob = sin(row * 1.7 + uTime * 2.3 + vI) * .18 + (h(vec2(row, floor(uTime * 2.) + vI)) - .5) * .25; float w = .2 + .3 * h(vec2(row, vI + 3.));\n' +
      ' float a = (1. - smoothstep(w * .6, w, abs(vU.x - .5 - wob * .5))) * step(.25, h(vec2(row, vI))) * (1. - smoothstep(.1, .5, abs(vU.y - .5))) * uPn;\n' +
      ' gl_FragColor = vec4(mix(vec3(1., .8, .45), vec3(1., .97, .85), step(.5, h(vec2(row, vI + 7.)))), a);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false
  });
  var streaks = new T.Mesh(sgeo, streakM); streaks.name = 'lamp-streaks'; streaks.renderOrder = 3; streaks.frustumCulled = false; scene.add(streaks);
  var M = new T.Matrix4(), Q = new T.Quaternion(), Qb = new T.Quaternion(), V = new T.Vector3(), S = new T.Vector3(), Yax = new T.Vector3(0, 1, 0), Xax = new T.Vector3(1, 0, 0), gc = new T.Color();
  return {
    update: function (st, now, dt, glowPos) {
      var day = st.sky !== 'night';
      // bridge life
      walkers.forEach(function (wk) { var L_ = bz[1] - bz[0] - 4, f = ((now * wk.sp / L_ + wk.ph) % 1 + 1) % 1, z = wk.dir > 0 ? bz[0] + 2 + f * L_ : bz[1] - 2 - f * L_;
        wk.m.position.set(wk.side * (hwAt(z) - wk.off), 0.75 + Math.abs(Math.sin(now * 5 + wk.ph * 9)) * 0.04, z); wk.m.rotation.y = wk.dir > 0 ? 0 : Math.PI; });
      (function () { var L_ = bz[1] - bz[0] - 4, f = ((now * cyc.sp / L_ + cyc.ph) % 1 + 1) % 1, z = bz[1] - 2 - f * L_; cyc.m.position.set(hwAt(z) - cyc.off, 0.62, z); cyc.m.rotation.y = Math.PI; })();
      var fl = st.pn > 0.5 && Math.sin(now * 1.3) > 0.97 ? 1 : 0; if (ctx.glowOp) ctx.glowOp.setX(tFlash, fl); camM.rotation.x = 0;
      cars.forEach(function (c) { var L_ = bz[1] - bz[0] + 30, f = ((now * c.sp / L_ + c.ph) % 1 + 1) % 1, z = c.dir > 0 ? bz[0] - 15 + f * L_ : bz[1] + 15 - f * L_;
        c.m.position.set(c.x, 0.62, z); c.m.rotation.y = c.dir > 0 ? 0 : Math.PI; c.m.visible = !st.nocars; if (glowPos) glowPos.setXYZ(c.gi, c.x, 1.0, z + c.dir * 2.2); if (ctx.glowOp) ctx.glowOp.setX(c.gi, st.nocars ? 0 : 0.9); });
      bl.forEach(function (b, i) { var y = b.h[1] + Math.sin(now * 1.3 + b.ph) * 0.12, x = b.h[0] + Math.sin(now * 0.9 + b.ph) * 0.08 * (1 + U.uWind.value); b.m.position.set(x, y, b.h[2]); b.m.rotation.z = Math.sin(now * 1.1 + b.ph) * 0.08; var pa = b.s.geometry.attributes.position; pa.setXYZ(1, x, y - 0.5, b.h[2]); pa.needsUpdate = true; });
      balloons.visible = seller.visible = day; painter.visible = day && st.wx !== 'rain';
      // the low path cyclist
      var lf = ((now * 4 / (lp.x1 - lp.x0)) % 2 + 2) % 2, lx = lf < 1 ? lp.x0 + 2 + lf * (lp.x1 - lp.x0 - 4) : lp.x1 - 2 - (lf - 1) * (lp.x1 - lp.x0 - 4);
      lowBike.position.set(lx, lp.y + 0.02, lp.z); lowBike.rotation.y = lf < 1 ? Math.PI / 2 : -Math.PI / 2; lowBike.visible = day || st.pn < 0.8;
      // ducks swim upstream by day in spring and summer
      ducks.visible = day && (st.season === 'spring' || st.season === 'summer') && st.wx !== 'rain';
      var dx = 40 - ((now * 1.2) % 120), dz = ctx.nbz - 16; mom.position.set(dx, Math.sin(now * 2) * 0.08, dz); mom.rotation.y = Math.PI; mom.scale.setScalar(3);
      lings.forEach(function (m, i) { m.position.set(dx + 3.4 + i * 2.1, Math.sin(now * 3 + i) * 0.06, dz + Math.sin(now * 1.5 + i) * 0.8); m.rotation.y = Math.PI; m.scale.setScalar(3); });
      // gulls gliding over the water by day
      gmesh.visible = day; gc.set(P.css('white')); gmat.color.copy(gc);
      var o = 0; function tri(a, b, c) { gpos.set(a, o); gpos.set(b, o + 3); gpos.set(c, o + 6); o += 9; }
      gulls.forEach(function (g) { var th = now * g.w + g.ph, x = g.c[0] + Math.cos(th) * g.r, z = g.c[2] + Math.sin(th) * g.r * 0.35, y = g.c[1] + Math.sin(th * 2) * 1.5, fl2 = Math.sin(now * 5 + g.ph) * 0.35, s = 2.2;
        [-1, 1].forEach(function (sd) { tri([x, y, z], [x + sd * 0.8 * s, y + (0.35 + fl2) * s, z], [x + sd * 0.3 * s, y - 0.08 * s, z]); tri([x + sd * 0.8 * s, y + (0.35 + fl2) * s, z], [x + sd * 1.7 * s, y + (0.1 + fl2 * 1.4) * s, z], [x + sd * 0.7 * s, y + 0.18 * s, z]); }); });
      gg.attributes.position.needsUpdate = true;
      // drifting leaves / petals / ice
      var cold = st.season === 'winter' && (st.wx === 'frost' || st.wx === 'snow');
      drift.forEach(function (dr) {
        var on = dr.kind === 'leaf' ? st.season === 'autumn' : dr.kind === 'petal' ? st.season === 'spring' : cold; dr.m.visible = on; if (!on) return;
        dr.it.forEach(function (it, k) { it.x += it.sp * dt * (dr.kind === 'ice' ? 0.5 : 1); if (it.x > 170) it.x -= 340;
          // leaves and petals tip up toward the viewer as they ride the ripples, so they read as shapes (the painting draws them flat-on)
          if (dr.kind === 'ice') Q.setFromAxisAngle(Yax, it.r + Math.sin(now * 0.2 + k) * 0.05);
          else { Qb.setFromAxisAngle(Yax, it.r + Math.sin(now * 0.7 + k) * 0.3); Q.setFromAxisAngle(Xax, 0.95 + Math.sin(now * 1.3 + k) * 0.15).multiply(Qb); }
          V.set(it.x, -WL + 0.14 + Math.sin(now * 1.5 + k) * 0.03, it.z); S.setScalar(it.s); M.compose(V, Q, S); dr.m.setMatrixAt(k, M); });
        dr.m.instanceMatrix.needsUpdate = true;
      });
      // moored boats bobbing, each on its own rhythm; the cat comes and goes
      (ctx.moored || []).forEach(function (b) { b.g.position.y = -WL + Math.sin(now * b.sp + b.ph) * 0.06; b.g.rotation.x = Math.sin(now * b.sp * 0.8 + b.ph * 2) * 0.008; b.g.rotation.z = Math.sin(now * b.sp * 0.6 + b.ph) * 0.004;
        if (b.ex.cat) b.ex.cat.visible = Math.sin(now / 37 + b.ph) > -0.2; if (b.ex.name) b.ex.name.material.color.setScalar(1 - 0.55 * st.pn); });
    }
  };
}

