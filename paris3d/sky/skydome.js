import * as T from 'three';
import { HZ, F } from '../core/view.js';
import { clamp } from '../core/util.js';
import { parseCol } from './clouds.js';

// ---------------------------------------------------------------- the sky dome: the painting's sky gradients (day, dusk, night, the event tints)
// on a sphere round the camera, blended in the shader by the same CSS opacities that blended the painted rects
export function buildSky(ctx, vec) {
  if (!vec) return null;
  var N = vec.N, E = vec.E, rows = [];
  N.forEach(function (n, i) { if (n.nx && n.nx.indexOf('dome:') === 0) { var gi = vec.byId[n.nx.slice(5)]; if (gi != null) rows.push({ i: i, gi: gi }); } });
  if (!rows.length) return null;
  rows = rows.slice(0, 8);
  var RW = 256, cv = document.createElement('canvas'); cv.width = RW; cv.height = 8;
  var tex = new T.CanvasTexture(cv); tex.minFilter = T.LinearFilter; tex.magFilter = T.LinearFilter; tex.generateMipmaps = false; tex.flipY = false;
  var y1 = [], y2 = [], op = [];
  rows.forEach(function (r) { var k = N[r.gi].k || {}, user = k.gu === 'userSpaceOnUse', b = N[r.i].b || [-100, -100, 1016, 1260];
    y1.push(user ? +(k.y1 || 0) : b[1] + b[3] * +(k.y1 || 0)); y2.push(user ? +(k.y2 || 0) : b[1] + b[3] * +(k.y2 != null ? k.y2 : 1)); op.push(0); });
  while (y1.length < 8) { y1.push(0); y2.push(1); op.push(0); }
  var mat = new T.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uY1: { value: y1 }, uY2: { value: y2 }, uOp: { value: op }, uN: { value: rows.length }, uFlash: ctx.U.uFlash },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform sampler2D uTex; uniform float uY1[8], uY2[8], uOp[8]; uniform int uN; uniform float uFlash; varying vec3 vW;\n' +
      ' vec3 lin(vec3 c){ return mix(c / 12.92, pow((c + .055) / 1.055, vec3(2.4)), step(.04045, c)); }\n' +
      ' void main(){ vec3 d = normalize(vW - cameraPosition); float z = max(-d.z, .03);\n' +
      // the painting's own image plane: where this direction lands on it (the sky gradients are vertical, in painting units)
      '  float py = ' + HZ.toFixed(1) + ' - ' + F.toFixed(1) + ' * d.y / z;\n' +
      '  vec3 c = vec3(0.); for (int j = 0; j < 8; j++) { if (j >= uN) break; float t = clamp((py - uY1[j]) / max(uY2[j] - uY1[j], 1.), 0., 1.);\n' +
      '   vec4 g = texture2D(uTex, vec2((t * 254. + 1.) / 256., (float(j) + .5) / 8.)); c = mix(c, g.rgb, g.a * uOp[j]); }\n' +
      '  gl_FragColor = vec4(c, 1.); }',
    side: T.BackSide, depthWrite: false, depthTest: true, transparent: true, fog: false
  });
  var dome = new T.Mesh(new T.SphereGeometry(8800, 48, 24), mat); dome.name = 'sky-dome'; dome.renderOrder = -3e6; dome.frustumCulled = false; vec.skyScene.add(dome);
  var key = '', bakeAt = -9, opAt = -9, g2 = cv.getContext('2d');
  function bake() {
    var k = '';
    rows.forEach(function (r) { vec.kids[r.gi].forEach(function (s) { var c = getComputedStyle(E[s]); k += c.stopColor + c.stopOpacity; }); });
    if (k === key) return; key = k;
    g2.clearRect(0, 0, RW, 8);
    rows.forEach(function (r, j) {
      var gr = g2.createLinearGradient(1, 0, RW - 1, 0);
      vec.kids[r.gi].forEach(function (s) { var c = getComputedStyle(E[s]), of = (N[s].k || {}).of, o = of == null ? 0 : /%$/.test(of) ? parseFloat(of) / 100 : parseFloat(of);
        var q = parseCol(c.stopColor), so = vec.num(c.stopOpacity, 1);
        gr.addColorStop(clamp(o || 0, 0, 1), 'rgba(' + Math.round(q[0] * 255) + ',' + Math.round(q[1] * 255) + ',' + Math.round(q[2] * 255) + ',' + so * q[3] + ')'); });
      g2.fillStyle = gr; g2.fillRect(0, j, RW, 1);
    });
    tex.needsUpdate = true;
  }
  function update(now, camera) {
    dome.position.copy(camera.position); dome.updateMatrixWorld();
    if (now - bakeAt > 0.5 || now < bakeAt) { bakeAt = now; bake(); }
    if (now - opAt > 0.08 || now < opAt) {
      opAt = now;
      var L = getComputedStyle(E[0]), lo = L.display === 'none' ? 0 : vec.num(L.opacity, 1);
      rows.forEach(function (r, j) { var c = getComputedStyle(E[r.i]); var vis = c.display !== 'none' && c.visibility !== 'hidden'; var p = E[r.i].parentElement;
        while (vis && p && p !== E[0]) { if (getComputedStyle(p).display === 'none') vis = false; p = p.parentElement; }
        op[j] = vis ? vec.num(c.opacity, 1) * (j === 0 ? 1 : 1) : 0; });
      // the first rect is the base: always fully there (the layer's own opacity applies to the whole sky)
      mat.uniforms.uOp.value = op;
    }
  }
  return { dome: dome, update: update, dbg: function () { return { op: op.slice(), y1: y1, y2: y2, row: [0, 1, 2].map(function (j) { var d = g2.getImageData(0, j, RW, 1).data; return [d[0], d[1], d[2], d[3], d[512], d[513], d[514], d[515], d[1020], d[1021], d[1022]]; }) }; } };
}
