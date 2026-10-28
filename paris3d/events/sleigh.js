import * as T from 'three';
import { clamp, lerp } from '../core/util.js';

// ---------------------------------------------------------------- Santa's sleigh in 3D: a modelled sleigh (Santa, the sack, the elf waving on the back)
// pulled by four reindeer that each follow the flight path on their own (spaced along the path, turning where the path turns,
// galloping out of step, bobbing), with the reins drawn between them every frame. Colours are the painting's tokens, read live.
export function buildSleighTeam(ctx) {
  var host = ctx.host, scene = ctx.scene;
  var grad = new T.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]), 3, 1, T.RGBAFormat);
  grad.minFilter = grad.magFilter = T.NearestFilter; grad.needsUpdate = true;
  var M = {}, TOK = { sleigh: '#c8102e', deer: '#7a4a2a', skin: '#ffe2cc', snow: '#ffffff', red: '#d4213a', goldL: '#f2c14e', xtT: '#8a5a3a', xtH: '#2f8a4a', ink: '#1a1a22', fur: '#f4ead8', nose: '#ff3b4e', antler: '#c9a77a' };
  Object.keys(TOK).forEach(function (k) { M[k] = new T.MeshToonMaterial({ color: TOK[k], gradientMap: grad, transparent: true }); });
  Object.keys(TOK).forEach(function (k) { M[k].emissive = new T.Color(TOK[k]).multiplyScalar(0.4); });
  M.nose.emissive = new T.Color('#ff3b4e'); M.nose.emissiveIntensity = 0.8;
  function mesh(geo, mat, x, y, z, sx, sy, sz) { var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); if (sx) m.scale.set(sx, sy || sx, sz || sx); m.castShadow = true; return m; }
  var SPH = new T.SphereGeometry(1, 18, 12), CYL = new T.CylinderGeometry(1, 1, 1, 10), CONE = new T.ConeGeometry(1, 1, 14);
  // ---- the sleigh (local +x = forward, y up); the painting's side profile, extruded
  var sl = new T.Group();
  var sh = new T.Shape(); sh.moveTo(-2, 8); sh.lineTo(26, 8); sh.quadraticCurveTo(31, 8, 31, 2); sh.quadraticCurveTo(31, -4, 22, -4); sh.lineTo(3, -4); sh.quadraticCurveTo(-4, 0, -2, 8);
  var body = new T.ExtrudeGeometry(sh, { depth: 11, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 2, curveSegments: 10 }); body.translate(-14.5, 0, -5.5);
  sl.add(mesh(body, M.sleigh));
  var trim = new T.BoxGeometry(30, 1.2, 12.8); sl.add(mesh(trim, M.goldL, 0, 8.4, 0));
  // runners: a curl at the front, two struts each
  [-5.6, 5.6].forEach(function (z) {
    var c = new T.CatmullRomCurve3([new T.Vector3(-19, -7, z), new T.Vector3(8, -7, z), new T.Vector3(16, -6.4, z), new T.Vector3(18.6, -3.4, z), new T.Vector3(17, -1.6, z)]);
    sl.add(mesh(new T.TubeGeometry(c, 24, 0.55, 6), M.goldL));
    [-10, 9].forEach(function (x) { var s = mesh(CYL, M.goldL, x, -5.5, z, 0.4, 3.2, 0.4); sl.add(s); });
  });
  // Santa: coat, belt, head, beard, hat with its bobble; one arm with the whip
  var santa = new T.Group(); santa.position.set(-1, 8, 0); sl.add(santa);
  santa.add(mesh(SPH, M.sleigh, 0, 4.2, 0, 4.6, 5.2, 4.4));
  santa.add(mesh(CYL, M.ink, 0, 3.4, 0, 4.7, 1.1, 4.5));
  santa.add(mesh(SPH, M.skin, 0.6, 11, 0, 2.7));
  santa.add(mesh(SPH, M.snow, 1.9, 9.6, 0, 2.2, 2.6, 2.4));
  santa.add(mesh(CYL, M.snow, 0.4, 12.9, 0, 2.9, 1, 2.9));
  var hat = mesh(CONE, M.sleigh, -0.6, 15.7, 0, 2.6, 5, 2.6); hat.rotation.z = 0.45; santa.add(hat);
  santa.add(mesh(SPH, M.snow, -2.6, 17.6, 0, 1.1));
  var arm = new T.Group(); arm.position.set(1.5, 7, 3.4); santa.add(arm);
  arm.add(mesh(CYL, M.sleigh, 1.6, 0, 0, 1.2, 4, 1.2)); arm.children[0].rotation.z = -1.0;
  var whip = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(3.2, 1.2, 0), new T.Vector3(8, 4, 0), new T.Vector3(13, 2, 0), new T.Vector3(16, -1, 0)]), new T.LineBasicMaterial({ color: 0x1a1a22, transparent: true }));
  arm.add(whip);
  // the sack and the little elf on the back, waving
  sl.add(mesh(SPH, M.xtT, -10, 12, 0, 5, 5.6, 4.6));
  sl.add(mesh(SPH, M.xtT, -10, 17.3, 0, 1.6, 1.2, 1.6));
  var elf = new T.Group(); elf.position.set(-15.6, 8, 0); sl.add(elf);
  elf.add(mesh(SPH, M.xtH, 0, 2.4, 0, 1.9, 2.6, 1.8));
  elf.add(mesh(SPH, M.skin, 0, 6.2, 0, 1.6));
  var eh = mesh(CONE, M.red, -0.3, 9.4, 0, 1.5, 4, 1.5); eh.rotation.z = 0.35; elf.add(eh);
  elf.add(mesh(SPH, M.snow, -1.1, 11.2, 0, 0.55));
  var wave = new T.Group(); wave.position.set(0, 3.6, 1.6); elf.add(wave);
  var wa = mesh(CYL, M.xtH, 0, 1.7, 0, 0.5, 3.4, 0.5); wave.add(wa); wave.add(mesh(SPH, M.skin, 0, 3.6, 0, 0.7));
  sl.traverse(function (o) { o.castShadow = true; });
  // ---- a reindeer (local +x forward), legs hinged at shoulder and hip
  function reindeer(lead) {
    var g = new T.Group(), bodyG = new T.Group(); g.add(bodyG);
    bodyG.add(mesh(SPH, M.deer, 0, 0, 0, 6.6, 3.3, 2.9));
    bodyG.add(mesh(SPH, M.fur, -0.4, -1.5, 0, 5.4, 1.8, 2.3));
    bodyG.add(mesh(CYL, M.red, 0.8, 0.4, 0, 0.9, 6.8, 3.2));
    bodyG.add(mesh(SPH, M.goldL, 0.8, 0.4, 3.1, 0.55)); bodyG.add(mesh(SPH, M.goldL, 0.8, 0.4, -3.1, 0.55));
    var tail = mesh(SPH, M.fur, -6.6, 1.2, 0, 1.1, 0.8, 0.8); bodyG.add(tail);
    var head = new T.Group(); head.position.set(5.2, 2.4, 0); bodyG.add(head);
    var neck = mesh(CYL, M.deer, 1.2, 2.4, 0, 1.4, 5.2, 1.5); neck.rotation.z = -0.6; head.add(neck);
    var skull = mesh(SPH, M.deer, 3.6, 5.2, 0, 2.6, 1.6, 1.6); skull.rotation.z = -0.25; head.add(skull);
    head.add(mesh(SPH, lead ? M.nose : M.ink, 6.1, 4.6, 0, lead ? 0.85 : 0.55));
    head.add(mesh(SPH, M.ink, 4.2, 5.9, 1.25, 0.28)); head.add(mesh(SPH, M.ink, 4.2, 5.9, -1.25, 0.28));
    [-1, 1].forEach(function (s) {
      var a = new T.CatmullRomCurve3([new T.Vector3(2.6, 6.4, s * 0.8), new T.Vector3(2, 9, s * 1.8), new T.Vector3(0.6, 11.6, s * 2.6), new T.Vector3(1.2, 13.2, s * 3.2)]);
      head.add(mesh(new T.TubeGeometry(a, 10, 0.32, 5), M.antler));
      var b = new T.CatmullRomCurve3([new T.Vector3(2, 9, s * 1.8), new T.Vector3(3.6, 10.6, s * 2.4), new T.Vector3(4.2, 12, s * 2.6)]);
      head.add(mesh(new T.TubeGeometry(b, 6, 0.26, 5), M.antler));
      head.add(mesh(SPH, M.deer, 2.2, 6.8, s * 1.5, 0.8, 0.4, 0.5));
    });
    var legs = [];
    [[3.6, 1.6], [3.6, -1.6], [-4.2, 1.6], [-4.2, -1.6]].forEach(function (p, i) {
      var hinge = new T.Group(); hinge.position.set(p[0], -1.6, p[1]); bodyG.add(hinge);
      var up = mesh(CYL, M.deer, 0, -2.2, 0, 0.75, 4.4, 0.75); hinge.add(up);
      var knee = new T.Group(); knee.position.set(0, -4.3, 0); hinge.add(knee);
      knee.add(mesh(CYL, M.deer, 0, -2, 0, 0.55, 4, 0.55)); knee.add(mesh(SPH, M.ink, 0.3, -4.1, 0, 0.75, 0.5, 0.7));
      legs.push({ h: hinge, k: knee, front: i < 2, side: i % 2 });
    });
    g.traverse(function (o) { o.castShadow = true; });
    return { g: g, body: bodyG, head: head, legs: legs, tail: tail };
  }
  var team = new T.Group(); team.name = 'sleigh-team'; team.visible = false; scene.add(team);
  team.add(sl);
  var deer = [0, 1, 2, 3].map(function (k) { var d = reindeer(k === 3); team.add(d.g); d.ph = k * 1.37 + 0.4; return d; });
  // the reins: from the sleigh's front to each reindeer's harness, re-laid every frame
  var NR = 4 * 2 * 9, rp = new Float32Array(NR * 3), rgeo = new T.BufferGeometry(); rgeo.setAttribute('position', new T.BufferAttribute(rp, 3));
  var reins = new T.LineSegments(rgeo, new T.LineBasicMaterial({ color: 0xd8b45a, transparent: true })); reins.frustumCulled = false; team.add(reins);
  // ---- following the path: an arc-length table, so every piece is placed a set distance along it
  var tbl = null, tblFor = null;
  function table(path) {
    if (tblFor === path) return tbl; tblFor = path;
    var n = 1600, p0 = -0.02, p1 = 1.35, ps = [], ls = [], pts = [], L = 0, prev = null;
    for (var i = 0; i <= n; i++) { var p = p0 + (p1 - p0) * i / n, q = path(p); if (prev) L += Math.hypot(q[0] - prev[0], q[1] - prev[1], q[2] - prev[2]); ps.push(p); ls.push(L); pts.push(q); prev = q; }
    return (tbl = { ps: ps, ls: ls, pts: pts });
  }
  function atLen(t, L) {
    var a = 0, b = t.ls.length - 1; if (L <= 0) return 0; if (L >= t.ls[b]) return b;
    while (b - a > 1) { var m = (a + b) >> 1; if (t.ls[m] < L) a = m; else b = m; } return a;
  }
  function lenAt(t, p) { var i = clamp(Math.round((p - t.ps[0]) / (t.ps[t.ps.length - 1] - t.ps[0]) * (t.ps.length - 1)), 0, t.ps.length - 1); return t.ls[i]; }
  var V = new T.Vector3(), Q = new T.Quaternion(), E3 = new T.Euler(0, 0, 0, 'YXZ');
  function pose(obj, t, L, roll) {
    var i = atLen(t, L), j = Math.min(t.pts.length - 1, i + 4), k = Math.max(0, i - 4), P = t.pts[i], A = t.pts[j], B = t.pts[k];
    var dx = A[0] - B[0], dy = A[1] - B[1], dz = A[2] - B[2], hz = Math.hypot(dx, dz) || 1;
    // heading along the path, pitch with the climb, a bank into the turn (from how fast the heading changes)
    var yaw = Math.atan2(-dz, dx), pitch = Math.atan2(dy, hz);
    var j2 = Math.min(t.pts.length - 1, i + 24), A2 = t.pts[j2], yaw2 = Math.atan2(-(A2[2] - P[2]), A2[0] - P[0]), dyaw = Math.atan2(Math.sin(yaw2 - yaw), Math.cos(yaw2 - yaw));
    obj.position.set(P[0], P[1], P[2]);
    E3.set(0, yaw, 0); obj.quaternion.setFromEuler(E3);
    obj.rotateZ(pitch); obj.rotateX(clamp(-dyaw * 2.2, -0.45, 0.45) + (roll || 0));
    return P;
  }
  var colAt = -9, SPACING = 17, LEAD = 27;
  function readColours(now) {
    if (now - colAt < 1 && now >= colAt) return; colAt = now;
    var cs = host ? getComputedStyle(host) : null; if (!cs) return;
    Object.keys(TOK).forEach(function (k) { var v = cs.getPropertyValue('--c-' + k).trim(); if (v) { try { M[k].color.setStyle(v); } catch (e) {} } });
    // no ambient light in the scene: the shaded side keeps a share of its own colour, like the painting's shade band
    Object.keys(TOK).forEach(function (k) { if (k !== 'nose') M[k].emissive.copy(M[k].color).multiplyScalar(0.4); });
  }
  function update(path, ps, alpha, now) {
    team.visible = alpha > 0.01; if (!team.visible) return null;
    readColours(now);
    for (var k in M) { M[k].opacity = alpha; }
    reins.material.opacity = alpha * 0.9; whip.material.opacity = alpha;
    var t = table(path), L0 = lenAt(t, ps);
    var sp = pose(sl, t, L0, Math.sin(now * 2.1) * 0.04);
    sl.position.y += Math.sin(now * 2.6) * 0.8;
    // the whip cracks now and then; the elf waves
    arm.rotation.z = 0.25 + Math.max(0, Math.sin(now * 3.1)) * 0.6; wave.rotation.z = Math.sin(now * 9) * 0.5 + 0.3;
    sl.updateMatrixWorld(); var front = new T.Vector3(17, 2, 0).applyMatrix4(sl.matrixWorld), r = 0;
    deer.forEach(function (d, i) {
      var L = L0 + LEAD + i * SPACING;
      pose(d.g, t, L, Math.sin(now * 1.7 + d.ph) * 0.05);
      // each one at its own point of the stride: a bound lifts the body, the legs reach and fold
      var w = now * 9.5 + d.ph, b = Math.sin(w);
      d.g.position.y += Math.abs(Math.sin(w)) * 1.4 + Math.sin(now * 0.9 + d.ph * 2) * 1.2;
      d.g.position.z += Math.sin(now * 0.7 + d.ph) * 1.1;
      d.body.rotation.z = b * 0.12; d.head.rotation.z = -b * 0.15; d.tail.rotation.z = b * 0.4;
      d.legs.forEach(function (l) {
        var s = Math.sin(w + (l.front ? 0 : Math.PI * 0.9) + l.side * 0.35);
        l.h.rotation.z = l.front ? 0.2 + s * 0.85 : -0.15 + s * 0.8; l.k.rotation.z = l.front ? -Math.max(0, -s) * 1.3 : Math.max(0, s) * 1.2;
      });
      d.g.updateMatrixWorld();
      // reins: two lines from the sleigh front to this reindeer's harness, sagging between
      var hp = new T.Vector3(0.8, 0.6, 0).applyMatrix4(d.g.matrixWorld);
      [-1, 1].forEach(function (s) {
        var a = front.clone(); a.z += s * 1.2;
        for (var q = 0; q < 9; q++) {
          var u0 = q / 9, u1 = (q + 1) / 9;
          [u0, u1].forEach(function (u) { var x = lerp(a.x, hp.x, u), y = lerp(a.y, hp.y, u) - Math.sin(u * Math.PI) * 2.2, z = lerp(a.z, hp.z, u) + s * (1 - u) * 0.6; rp[r++] = x; rp[r++] = y; rp[r++] = z; });
        }
      });
    });
    rgeo.attributes.position.needsUpdate = true;
    return sp;
  }
  return { group: team, update: update, sleigh: sl };
}
