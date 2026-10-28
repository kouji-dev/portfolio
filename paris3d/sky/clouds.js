import * as T from 'three';
import { HZ, F, ZC, HC, at } from '../core/view.js';
import { clamp, rng } from '../core/util.js';

// ---------------------------------------------------------------- clouds in 3D: painted cloud masses built from each painted cloud's own silhouette
// (puffs packed inside the outline, a flat base), toon-shaded by the sun or the moon, with an ink edge, shaded bellies, a gold rim at dusk
// and a warm belly at night; they drift west to east with the painting's own cloud animation and keep its colours (read from the mirror)
export function parseCol(s, out) {
  // computed colours come as rgb(), rgba() or color(srgb …) (color-mix): → [r, g, b, a] in 0..1 (sRGB)
  out = out || [0, 0, 0, 1]; if (!s) return out;
  var m = /color\(srgb\s+([^)]+)\)/.exec(s);
  if (m) { var v = m[1].replace('/', ' ').trim().split(/\s+/).map(parseFloat); out[0] = v[0]; out[1] = v[1]; out[2] = v[2]; out[3] = v.length > 3 ? v[3] : 1; return out; }
  m = /rgba?\(([^)]+)\)/.exec(s);
  if (m) { var w = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat); out[0] = w[0] / 255; out[1] = w[1] / 255; out[2] = w[2] / 255; out[3] = w.length > 3 ? w[3] : 1; return out; }
  var c = new T.Color(), o = { r: 0, g: 0, b: 0 }; try { c.setStyle(s); c.getRGB(o, T.SRGBColorSpace); } catch (e) {} out[0] = o.r; out[1] = o.g; out[2] = o.b; out[3] = 1; return out;
}
export function buildClouds(ctx, vec) {
  if (!vec) return null;
  var N = vec.N, E = vec.E, kids = vec.kids, list = [], R = rng(77);
  N.forEach(function (n, i) { if (n.nx === 'cloud' || n.nx === 'raincloud') list.push(i); });
  if (!list.length) return null;
  var ico = new T.IcosahedronGeometry(1, 2), ip = ico.attributes.position, iIdx = ico.index ? ico.index.array : null;
  var vsh = 'attribute vec3 aC; uniform float uOp; uniform vec3 uL; varying vec3 vN, vV, vW; varying float vB, vH;\n' +
    'void main(){ vec4 w = modelMatrix * vec4(position, 1.); vN = normal; vV = normalize(cameraPosition - w.xyz); vW = position; vB = aC.x; vH = aC.z; gl_Position = projectionMatrix * viewMatrix * w; }';
  var fsh = 'uniform vec3 uBody, uShade, uRim, uBelly, uL; uniform float uOp, uRimA, uBellyA, uShadeA; varying vec3 vN, vV, vW; varying float vB, vH;\n' +
    'void main(){ vec3 n = normalize(vN); float ndl = dot(n, normalize(uL));\n' +
    // flat painted bands: the lit body, a soft shade on the side away from the light, and the shaded belly band along the base (with a wavy top edge)
    '  float lit = smoothstep(-.18, -.08, ndl);\n' +
    '  vec3 c = mix(mix(uBody, uShade, .45 * uShadeA), uBody, lit);\n' +
    '  float band = 1. - smoothstep(.0, .02, vH - (.2 + .045 * sin(vW.x * .045) + .03 * sin(vW.x * .13 + 1.3)));\n' +
    '  c = mix(c, uShade, max(band, vB) * uShadeA);\n' +
    '  float fr = 1. - abs(dot(n, normalize(vV))); c = mix(c, uRim, smoothstep(.62, .78, fr) * uRimA * step(-.1, ndl));\n' +
    '  c = mix(c, uBelly, uBellyA * smoothstep(-.2, -.75, n.y));\n' +
    '  gl_FragColor = vec4(c, uOp); }';
  var ish = 'uniform vec3 uInk; uniform float uOp, uInkA; void main(){ gl_FragColor = vec4(uInk, uOp * uInkA); }';
  var ivs = 'uniform float uW; void main(){ vec4 w = modelMatrix * vec4(position + normal * uW, 1.); gl_Position = projectionMatrix * viewMatrix * w; }';
  var clouds = [];
  list.forEach(function (ci, k) {
    var rain = N[ci].nx === 'raincloud';
    // the silhouette: the body path (k-cl, or cl3-rain for the rain clouds), with its shade, rim, edge and belly companions
    var body = -1, shade = [], ink = -1, edge = -1, bel = -1;
    (function find(i) { kids[i].forEach(function (c) {
      var cls = ' ' + (E[c].getAttribute('class') || '') + ' ';
      if (/ (k-cl|cl3-rain) /.test(cls) && body < 0) body = c; else if (/ (k-clS|cl3-rs|cl3-rb) /.test(cls)) shade.push(c);
      else if (/ (s-clR|cl3-rr) /.test(cls)) ink = c; else if (/ cl3-edge /.test(cls)) edge = c; else if (/ cl3-belly /.test(cls)) bel = c;
      if (N[c].t === 'g') find(c); }); })(ci);
    if (body < 0 || !N[body].b) return;
    var b = N[body].b, S = 160 / Math.max(b[2], b[3]), W = Math.ceil(b[2] * S) + 2, H = Math.ceil(b[3] * S) + 2;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var g2 = cv.getContext('2d');
    g2.setTransform(S, 0, 0, S, (1 - b[0] * S), (1 - b[1] * S)); g2.fillStyle = '#000'; g2.fill(new Path2D(N[body].d));
    var px = g2.getImageData(0, 0, W, H).data, inside = new Uint8Array(W * H), dist = new Float32Array(W * H), j, x, y;
    for (j = 0; j < W * H; j++) { inside[j] = px[j * 4 + 3] > 127 ? 1 : 0; dist[j] = inside[j] ? 1e6 : 0; }
    // distance to the outline (two-pass chamfer)
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) { j = y * W + x; if (!dist[j]) continue; var m = dist[j];
      if (x > 0) m = Math.min(m, dist[j - 1] + 1); if (y > 0) m = Math.min(m, dist[j - W] + 1); if (x > 0 && y > 0) m = Math.min(m, dist[j - W - 1] + 1.414); if (x < W - 1 && y > 0) m = Math.min(m, dist[j - W + 1] + 1.414); dist[j] = m; }
    for (y = H - 1; y >= 0; y--) for (x = W - 1; x >= 0; x--) { j = y * W + x; if (!dist[j]) continue; var m2 = dist[j];
      if (x < W - 1) m2 = Math.min(m2, dist[j + 1] + 1); if (y < H - 1) m2 = Math.min(m2, dist[j + W] + 1); if (x < W - 1 && y < H - 1) m2 = Math.min(m2, dist[j + W + 1] + 1.414); if (x > 0 && y < H - 1) m2 = Math.min(m2, dist[j + W - 1] + 1.414); dist[j] = m2; }
    // puffs: the deepest uncovered point each time, so the big ones fill the middle and small ones follow the bumps of the top edge
    var cov = new Float32Array(W * H), puffs = [], maxD = 0;
    for (j = 0; j < W * H; j++) maxD = Math.max(maxD, dist[j]);
    for (var it = 0; it < 60; it++) {
      var best = -1, bd = 0;
      for (j = 0; j < W * H; j++) { var sc = dist[j] - cov[j]; if (sc > bd) { bd = sc; best = j; } }
      if (best < 0 || dist[best] < Math.max(2.6, maxD * 0.2) || puffs.length >= 30) break;
      var bx = best % W, by = (best / W) | 0, r = dist[best] + 1.2;
      puffs.push([bx, by, r]);
      var rr = Math.ceil(r);
      for (y = Math.max(0, by - rr); y < Math.min(H, by + rr + 1); y++) for (x = Math.max(0, bx - rr); x < Math.min(W, bx + rr + 1); x++) {
        var dd = Math.hypot(x - bx, y - by); if (dd < r) { var q = y * W + x; cov[q] = Math.max(cov[q], dist[q] * (1 - dd / r * 0.55)); } }
    }
    if (!puffs.length) return;
    // into the world: far away (behind the city), the painted size kept, round in depth
    var D = rain ? 3200 + k * 120 : 3600 + k * 260, sW = D / F, baseY = b[1] + b[3] * 0.97, topY = b[1];
    var mid = at(b[0] + b[2] / 2, b[1] + b[3] * 0.62, D), half = [b[2] / 2 * sW, b[3] * 0.5 * sW, b[3] * 0.35 * sW];
    var pos = [], nor = [], aC = [], idx = [];
    puffs.forEach(function (p, pi) {
      var cx = b[0] + (p[0] - 1) / S, cy = b[1] + (p[1] - 1) / S, rp = p[2] / S, w = at(cx, cy, D), rw = rp * sW, zj = (R() - 0.5) * rw * 0.3, base = pos.length / 3;
      for (var v = 0; v < ip.count; v++) {
        var nx = ip.getX(v), ny = ip.getY(v), nz = ip.getZ(v), X = w[0] + nx * rw, Y = w[1] + ny * rw * 0.92, Z = w[2] + zj + nz * rw * 0.45;
        // the flat painted base: where a vertex would show below the cloud's base line, it sits on it (seen from the painting's eye)
        var py = HZ - (Y - HC) * F / (ZC - Z), flat = py > baseY;
        if (flat) { Y = HC - (baseY - HZ) * (ZC - Z) / F; py = baseY; }
        // shading normals: each puff's own, blended with the whole cloud's, so the light falls in broad painted bands
        var ex = (X - mid[0]) / half[0], ey = (Y - mid[1]) / half[1], ez = (Z - mid[2]) / half[2], el = Math.hypot(ex, ey, ez) || 1;
        var qx = nx * 0.5 + ex / el * 0.5, qy = ny * 0.5 + ey / el * 0.5, qz = nz * 0.5 + ez / el * 0.5;
        if (flat) { qx = 0; qy = -1; qz = 0; }
        pos.push(X, Y, Z); nor.push(qx, qy, qz); aC.push(flat ? 1 : 0, pi, clamp((baseY - py) / Math.max(1, baseY - topY), 0, 1));
      }
      for (var t = 0; t < (iIdx ? iIdx.length : ip.count); t++) idx.push(base + (iIdx ? iIdx[t] : t));
    });
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); geo.setAttribute('aC', new T.Float32BufferAttribute(aC, 3)); geo.setIndex(idx);
    var U = { uBody: { value: new T.Color() }, uShade: { value: new T.Color() }, uRim: { value: new T.Color() }, uBelly: { value: new T.Color(1, 0.83, 0.54) }, uInk: { value: new T.Color() },
      uL: { value: new T.Vector3(0, 1, 0.5) }, uOp: { value: 1 }, uRimA: { value: 0 }, uBellyA: { value: 0 }, uShadeA: { value: 0.55 }, uInkA: { value: 0.9 }, uW: { value: 1.8 * sW * 0.8 } };
    var ord = vec.order ? vec.order(ci) : ci;
    // depth first (the same vertex code as the colour pass, so the depths match exactly), then the ink hull, then the colours on the front surface only
    var pre = new T.Mesh(geo, new T.ShaderMaterial({ uniforms: U, vertexShader: vsh, fragmentShader: 'void main(){ gl_FragColor = vec4(0.); }', colorWrite: false, depthWrite: true, depthTest: true, transparent: true }));
    var hull = new T.Mesh(geo, new T.ShaderMaterial({ uniforms: U, vertexShader: ivs, fragmentShader: ish, side: T.BackSide, transparent: true, depthWrite: false, depthTest: true }));
    var col = new T.Mesh(geo, new T.ShaderMaterial({ uniforms: U, vertexShader: vsh, fragmentShader: fsh, transparent: true, depthWrite: false, depthTest: true, depthFunc: T.LessEqualDepth }));
    pre.renderOrder = ord - 0.3; hull.renderOrder = ord - 0.2; col.renderOrder = ord - 0.1;
    var grp = new T.Group(); grp.add(pre); grp.add(hull); grp.add(col); grp.name = 'cloud3d'; [pre, hull, col].forEach(function (m) { m.frustumCulled = false; });
    vec.skyScene.add(grp);
    clouds.push({ i: ci, g: grp, U: U, sW: sW, body: body, shade: shade, ink: ink, edge: edge, bel: bel, rain: rain, key: '' });
  });
  var tmp = [0, 0, 0, 1], colAt = -9;
  function update(now) {
    var readCols = now - colAt > 0.3 || now < colAt; if (readCols) colAt = now;
    clouds.forEach(function (c) {
      // the painted cloud's place and visibility: its layer's drift and its own animation (rain clouds sway)
      var vis = vec.visible(c.i), op = vis ? vec.opacity(c.i) : 0;
      c.g.visible = op > 0.004; if (!c.g.visible) return;
      var m = vec.worldM(c.i);      // painting-space matrix of the cloud (layer drift × its own transform)
      c.g.position.x = m[4] * c.sW; c.g.position.y = -m[5] * c.sW;
      c.U.uOp.value = op; c.U.uL.value.copy(ctx.Ldir);
      if (!readCols) return;
      var cs = getComputedStyle(E[c.body]); parseCol(cs.fill, tmp); c.U.uBody.value.setRGB(tmp[0], tmp[1], tmp[2]);
      if (c.shade.length) { var ss = getComputedStyle(E[c.shade[0]]); parseCol(ss.fill, tmp); c.U.uShade.value.setRGB(tmp[0], tmp[1], tmp[2]); c.U.uShadeA.value = clamp(vec.num(ss.opacity, 0.5) * 1.1, 0.2, 0.9); }
      if (c.ink >= 0) { var ks = getComputedStyle(E[c.ink]); parseCol(ks.stroke, tmp); c.U.uInk.value.setRGB(tmp[0], tmp[1], tmp[2]); c.U.uInkA.value = vec.num(ks.opacity, 0.9) * (ks.display === 'none' ? 0 : 1); }
      if (c.edge >= 0) { var es = getComputedStyle(E[c.edge]); parseCol(es.stroke, tmp); c.U.uRim.value.setRGB(tmp[0], tmp[1], tmp[2]); c.U.uRimA.value = es.display === 'none' ? 0 : vec.num(es.opacity, 0); }
      if (c.bel >= 0) { var bs = getComputedStyle(E[c.bel]); c.U.uBellyA.value = bs.display === 'none' ? 0 : vec.num(bs.opacity, 0) * 0.8; }
    });
  }
  return { clouds: clouds, update: update };
}
