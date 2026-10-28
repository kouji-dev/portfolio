import * as T from 'three';
import { EX, HZ, F, ZC, HC } from '../core/view.js';
import { clamp } from '../core/util.js';
import { parseCol } from './clouds.js';

// ---------------------------------------------------------------- the painting's vector layers, drawn by Three.js
// Everything that used to be SVG (sky, sun and moon, stars, the AI net, clouds, fireworks, the skins' events and moments) is now
// painted with Canvas 2D into textures on planes at real depth. The panel keeps a "mirror" of empty elements (<s data-n="g">, <s data-n="path">, …; plain tags, since React 18 mangles class on custom tags)
// with the SVG's classes and styles, so its CSS still decides what shows, what moves and in which colours: groups that move or
// toggle get their own 3D group (transform, opacity, visibility read from the mirror's computed style every frame); everything
// static around them is drawn once into a texture, and redrawn when its computed colours change.
export function buildVec(ctx, view) {
  var N = ctx.L.vec, host = ctx.host;
  if (!N || !host) return null;
  // the mirror, walked in the same order as the data
  var E = new Array(N.length), u = 0, ok = true;
  var lays = [].filter.call(host.children, function (c) { return c.getAttribute('data-n') === 'svg'; });
  function walkM(el) { E[u++] = el; for (var c = el.firstElementChild; c; c = c.nextElementSibling) walkM(c); }
  lays.forEach(walkM);
  if (u !== N.length) { if (window.console) console.warn('Paris3D: mirror has', u, 'elements, data', N.length); return null; }
  // prod: a moving node is only followed when every group above it has a group of its own (build() draws a static group
  // whole, frozen): promote the static ancestors of moving nodes. On the 2026-10-28 design 387 of 1661 moving nodes were
  // drawn frozen this way, the firework rockets among them (seen only at their burst point).
  N.forEach(function (n) { if (!n.g || n.t === 'svg') return; for (var q = n.p; q >= 0 && N[q].t !== 'svg' && !N[q].g; q = N[q].p) N[q].g = 1; });
  var kids = N.map(function () { return []; }), byId = {}, layerOf = new Int32Array(N.length);
  N.forEach(function (n, i) { if (n.p >= 0) kids[n.p].push(i); layerOf[i] = n.p >= 0 ? layerOf[n.p] : i; if (n.k && n.k.id) byId[n.k.id] = i; });
  var DEF = { defs: 1, clipPath: 1, linearGradient: 1, radialGradient: 1, stop: 1 };
  var SKY_D = 8500;
  // two passes, composited like the SVG was: the sky stack (behind the WebGL canvas) into its own picture, the skins (in front) over the finished frame;
  // both blend in sRGB like the browser did, so glows and tints keep their painted strength
  var skyScene = new T.Scene(), frontScene = new T.Scene(), root = new T.Group(); root.name = 'vec';

  // ---- sprite material: painting-space vertices placed at a depth, so every plane lands exactly where the SVG drew it
  var vs = 'uniform float uD; varying vec2 vUv; void main(){ vUv = uv; vec4 p = modelMatrix * vec4(position, 1.); float s = uD / ' + F.toFixed(1) + ';' +
    ' vec3 w = vec3((p.x - ' + EX.toFixed(1) + ') * s, ' + HC.toFixed(2) + ' - (p.y - ' + HZ.toFixed(1) + ') * s, ' + ZC.toFixed(1) + ' - uD);' +
    ' gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }';
  var fs = 'uniform sampler2D map; uniform float uOp; varying vec2 vUv;' +
    ' void main(){ vec4 t = texture2D(map, vUv); float a = t.a * uOp; if (a < .003) discard; gl_FragColor = vec4(t.rgb / max(t.a, .0001), a); }';
  function spriteMat(tex, d, front) {
    return new T.ShaderMaterial({ uniforms: { map: { value: tex }, uOp: { value: 1 }, uD: { value: d } }, vertexShader: vs, fragmentShader: fs,
      transparent: true, depthWrite: false, depthTest: false, side: T.DoubleSide, fog: false });
  }

  // ---- 2D maths
  function mul(a, b) { return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]]; }
  var I = [1, 0, 0, 1, 0, 0];
  function parseM(tf) {
    if (!tf || tf === 'none') return null;
    var v = tf.slice(tf.indexOf('(') + 1, -1).split(',').map(parseFloat);
    return tf.charCodeAt(6) === 51 ? [v[0], v[1], v[4], v[5], v[12], v[13]] : v;      // matrix3d(…) → its 2D part
  }
  function ownM(i, cs) {
    var m = parseM(cs.transform); if (!m) return null;
    var o = N[i].o; if (!o) return m;
    return mul(mul([1, 0, 0, 1, o[0], o[1]], m), [1, 0, 0, 1, -o[0], -o[1]]);
  }
  function apply(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }

  // ---- paths, holes ({moonD}, {count}, {year}) filled from the mirror layer's attributes
  var P2 = {};
  function hole(i, key) { return E[layerOf[i]].getAttribute('data-h-' + key.toLowerCase()) || ''; }
  function pathOf(i) {
    var d = N[i].d; if (d == null) return null;
    if (d.charCodeAt(0) === 123) d = hole(i, d.slice(1, -1));
    var p = P2[d]; if (!p) { try { p = P2[d] = new Path2D(d); } catch (e) { p = P2[d] = new Path2D(); } }
    return p;
  }
  function textOf(i) { return (N[i].tx || '').replace(/\{(\w+)\}/g, function (m, k) { return hole(i, k); }); }

  // ---- paints
  function num(v, d) { var f = parseFloat(v); return isNaN(f) ? d : f; }
  function frac(v, d) { if (v == null) return d; v = String(v); return /%$/.test(v) ? parseFloat(v) / 100 : num(v, d); }
  function paint(g2, val, i, opac) {
    if (!val || val === 'none') return null;
    if (val.indexOf('url(') < 0) return val;
    var m = /#([\w-]+)/.exec(val), gi = m ? byId[m[1]] : null; if (gi == null) { var fb = /\)\s*(.+)$/.exec(val); return fb ? fb[1] : null; }
    var gn = N[gi], k = gn.k || {}, bb = N[i].b || [0, 0, 1, 1], user = k.gu === 'userSpaceOnUse', gr;
    var cx = (v, dflt) => frac(v, dflt);
    if (gn.t === 'linearGradient') gr = g2.createLinearGradient(cx(k.x1, 0), cx(k.y1, 0), cx(k.x2, 1), cx(k.y2, 0));
    else { var r = cx(k.r, 0.5), ccx = cx(k.cx, 0.5), ccy = cx(k.cy, 0.5); gr = g2.createRadialGradient(cx(k.fx, ccx), cx(k.fy, ccy), 0, ccx, ccy, r); }
    kids[gi].forEach(function (si) {
      var cs = getComputedStyle(E[si]), c = cs.stopColor || '#000', so = num(cs.stopOpacity, 1);
      if (so < 1) { var q = rgba(c); c = 'rgba(' + q[0] + ',' + q[1] + ',' + q[2] + ',' + q[3] * so + ')'; }
      try { gr.addColorStop(clamp(frac((N[si].k || {}).of, 0), 0, 1), c); } catch (e) {}
    });
    // gradient space → user space (object bounding box units, gradientTransform)
    var gm = user ? I : [bb[2] || 1, 0, 0, bb[3] || 1, bb[0], bb[1]];
    if (k.gt) { var t = parseM('matrix(' + svgM(k.gt).join(',') + ')'); if (t) gm = mul(gm, t); }
    return { gr: gr, m: gm };
  }
  var RG = {};
  function rgba(c) {
    var r = RG[c]; if (r) return r;
    var m = /rgba?\(([^)]+)\)/.exec(c);
    if (m) { var v = m[1].split(',').map(parseFloat); r = [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; }
    else { var pc = parseCol(c); r = [Math.round(pc[0] * 255), Math.round(pc[1] * 255), Math.round(pc[2] * 255), pc[3]]; }
    return (RG[c] = r);
  }
  function svgM(t) {      // an SVG transform attribute → [a b c d e f]
    var m = I.slice(), re = /(\w+)\s*\(([^)]*)\)/g, x;
    while ((x = re.exec(t))) {
      var v = x[2].trim().split(/[\s,]+/).map(parseFloat), f = x[1], q;
      if (f === 'translate') q = [1, 0, 0, 1, v[0], v[1] || 0];
      else if (f === 'scale') q = [v[0], 0, 0, v.length > 1 ? v[1] : v[0], 0, 0];
      else if (f === 'rotate') { var a = v[0] * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); q = [c, s, -s, c, 0, 0]; if (v.length > 2) q = mul(mul([1, 0, 0, 1, v[1], v[2]], q), [1, 0, 0, 1, -v[1], -v[2]]); }
      else if (f === 'matrix') q = v;
      else if (f === 'skewX') q = [1, 0, Math.tan(v[0] * Math.PI / 180), 1, 0, 0];
      else if (f === 'skewY') q = [1, Math.tan(v[0] * Math.PI / 180), 0, 1, 0, 0];
      if (q) m = mul(m, q);
    }
    return m;
  }
  function fillWith(g2, p, path, rule, i) {
    if (p == null) return;
    if (typeof p === 'string') { g2.fillStyle = p; g2.fill(path, rule); return; }
    var inv = new DOMMatrix(p.m).inverse(), q = new Path2D(); q.addPath(path, inv);
    g2.save(); g2.transform(p.m[0], p.m[1], p.m[2], p.m[3], p.m[4], p.m[5]); g2.fillStyle = p.gr; g2.fill(q, rule); g2.restore();
  }
  function strokeWith(g2, p, path) {
    if (p == null) return;
    if (typeof p === 'string') { g2.strokeStyle = p; g2.stroke(path); return; }
    // a gradient stroke: map the gradient's ends into user space (good enough for the few gradient strokes)
    g2.strokeStyle = p.gr; g2.save(); g2.transform(p.m[0], p.m[1], p.m[2], p.m[3], p.m[4], p.m[5]);
    var inv = new DOMMatrix(p.m).inverse(), q = new Path2D(); q.addPath(path, inv); g2.lineWidth /= Math.max(1e-3, Math.sqrt(Math.abs(p.m[0] * p.m[3] - p.m[1] * p.m[2])));
    g2.stroke(q); g2.restore();
  }
  function clipTo(g2, cid) {
    var ci = byId[cid]; if (ci == null) return;
    var cp = new Path2D();
    kids[ci].forEach(function (k) { var p = pathOf(k); if (!p) return; var cs = getComputedStyle(E[k]), m = ownM(k, cs); if (m) cp.addPath(p, new DOMMatrix(m)); else cp.addPath(p); });
    g2.clip(cp);
  }

  // ---- drawing a node (and what it holds) with the computed styles of the moment
  function drawNode(g2, i, self) {
    var n = N[i]; if (DEF[n.t]) return;
    var cs = getComputedStyle(E[i]); if (cs.display === 'none') return;
    g2.save();
    if (!self) {
      var m = ownM(i, cs); if (m) g2.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      g2.globalAlpha *= num(cs.opacity, 1);
    }
    if (n.k && n.k.cp) clipTo(g2, n.k.cp);
    if (n.t === 'g') { var ks = kids[i]; for (var j = 0; j < ks.length; j++) drawNode(g2, ks[j], false); }
    else if (cs.visibility !== 'hidden' && g2.globalAlpha > 0.002) drawShape(g2, i, n, cs);
    g2.restore();
  }
  function drawShape(g2, i, n, cs) {
    var k = n.k || {}, a0 = g2.globalAlpha;
    if (cs.filter && cs.filter.indexOf('drop-shadow') >= 0) { g2.shadowColor = '#cfe8ff'; g2.shadowBlur = 4; }
    if (n.t === 'text') {
      var fsz = num(cs.fontSize, 16); if (k.fs) fsz = num(k.fs, fsz);
      g2.font = (k.fw || cs.fontWeight || '400') + ' ' + fsz + 'px ' + (k.ff || cs.fontFamily || 'sans-serif');
      g2.textAlign = k.ta === 'middle' ? 'center' : k.ta === 'end' ? 'right' : 'left'; g2.textBaseline = 'alphabetic';
      if (k.ls && 'letterSpacing' in g2) g2.letterSpacing = num(k.ls, 0) + 'px';
      var f = paint(g2, cs.fill, i); g2.globalAlpha = a0 * num(cs.fillOpacity, 1);
      if (typeof f === 'string') { g2.fillStyle = f; g2.fillText(textOf(i), num(k.x, 0), num(k.y, 0)); }
      if ('letterSpacing' in g2) g2.letterSpacing = '0px';
      return;
    }
    var path = pathOf(i); if (!path) return;
    var fp = paint(g2, cs.fill, i);
    if (fp) { g2.globalAlpha = a0 * num(cs.fillOpacity, 1); fillWith(g2, fp, path, (k.fr || cs.fillRule) === 'evenodd' ? 'evenodd' : 'nonzero', i); }
    var sp = paint(g2, cs.stroke, i), sw = num(cs.strokeWidth, 1);
    if (sp && sw > 0) {
      g2.globalAlpha = a0 * num(cs.strokeOpacity, 1); g2.lineWidth = sw;
      g2.lineCap = k.lc || cs.strokeLinecap || 'butt'; g2.lineJoin = k.lj || cs.strokeLinejoin || 'miter'; g2.miterLimit = num(cs.strokeMiterlimit, 4);
      var da = cs.strokeDasharray; if (da && da !== 'none') { g2.setLineDash(da.split(/[\s,]+/).map(function (x) { return num(x, 0); })); g2.lineDashOffset = num(cs.strokeDashoffset, 0); } else g2.setLineDash([]);
      strokeWith(g2, sp, path);
    }
    g2.globalAlpha = a0; g2.shadowBlur = 0;
  }
  // a style key: what a redraw depends on (cheap to compare)
  function keyOf(i, self) {
    var n = N[i]; if (DEF[n.t]) return '';
    var cs = getComputedStyle(E[i]); if (cs.display === 'none') return '-';
    var s = cs.fill + cs.stroke + cs.strokeWidth + cs.fillOpacity + cs.strokeOpacity + cs.visibility + cs.strokeDasharray + cs.strokeDashoffset;
    if (!self) s += cs.opacity + cs.transform;
    if (n.d && n.d.charCodeAt(0) === 123) s += pathOf(i) && n.d + hole(i, n.d.slice(1, -1));
    if (n.tx) s += textOf(i);
    if (s.indexOf('url(') >= 0) { var m = /#([\w-]+)/.exec(cs.fill + cs.stroke); if (m && byId[m[1]] != null) kids[byId[m[1]]].forEach(function (si) { var c = getComputedStyle(E[si]); s += c.stopColor + c.stopOpacity; }); }
    if (n.t === 'g') { var ks = kids[i]; for (var j = 0; j < ks.length; j++) s += '|' + keyOf(ks[j], false); }
    return s;
  }
  // the extent of a node in its owner's space (from the extraction's boxes, through its own transform)
  function extent(i, self, box) {
    var n = N[i], b = n.b; if (DEF[n.t]) return;
    if (n.t === 'text') b = textBox(i);      // text holes ({count}, {year}) change its width: measure what it says now
    if (!b) return;
    var m = self ? null : svgOwn(i), pad = 3;
    var pts = [[b[0] - pad, b[1] - pad], [b[0] + b[2] + pad, b[1] - pad], [b[0] - pad, b[1] + b[3] + pad], [b[0] + b[2] + pad, b[1] + b[3] + pad]];
    for (var j = 0; j < 4; j++) { var p = m ? apply(m, pts[j][0], pts[j][1]) : pts[j]; box[0] = Math.min(box[0], p[0]); box[1] = Math.min(box[1], p[1]); box[2] = Math.max(box[2], p[0]); box[3] = Math.max(box[3], p[1]); }
  }
  var mg = null;
  function textBox(i) {
    var k = N[i].k || {}, cs = getComputedStyle(E[i]), fsz = num(k.fs || cs.fontSize, 16), x = num(k.x, 0), y = num(k.y, 0);
    mg = mg || document.createElement('canvas').getContext('2d');
    mg.font = (k.fw || cs.fontWeight || '400') + ' ' + fsz + 'px ' + (k.ff || cs.fontFamily || 'sans-serif');
    var w = mg.measureText(textOf(i)).width + (k.ls ? num(k.ls, 0) * textOf(i).length : 0);
    var x0 = k.ta === 'middle' ? x - w / 2 : k.ta === 'end' ? x - w : x;
    return [x0, y - fsz, w, fsz * 1.3];
  }
  function svgOwn(i) { var cs = getComputedStyle(E[i]); return ownM(i, cs); }

  // ---- the 3D tree: a group per moving node, a textured plane per run of static content
  var G = {}, chunks = [], layers = [];
  function mkGroup(i) { var g = new T.Group(); g.matrixAutoUpdate = false; g.userData.i = i; g.userData.op = 1; return g; }
  function addChunk(owner, items, self, layer) {
    chunks.push({ owner: owner, items: items, self: self, layer: layer, key: null, mesh: null, cv: null, tex: null, box: null, ord: items[0], live: false, seen: false });
  }
  N.forEach(function (n, i) {
    if (n.t !== 'svg') return;
    var g = mkGroup(i), cls = ' ' + n.L + ' ', sky = cls.indexOf(' pt-e ') < 0 && cls.indexOf(' pt-ai ') < 0;
    // the layers before the WebGL canvas (sky, clouds, fireworks) sit far behind everything; the skins in front sit at their own depth, on top
    var L = { i: i, g: g, d: sky ? SKY_D : (n.dd || 300), front: !sky, el: E[i] };
    if (cls.indexOf(' pt-ai ') >= 0) L.d = 300;
    g.userData.L = L; layers.push(L); (sky ? skyScene : frontScene).add(g); G[i] = g;
  });
  function build(i, gi, layer) {
    var run = [];
    function flush() { if (run.length) { addChunk(gi, run, false, layer); run = []; } }
    kids[i].forEach(function (k) {
      var n = N[k]; if (DEF[n.t] || n.nx) return;
      if (n.g) {
        flush();
        var g = mkGroup(k); G[gi].add(g); G[k] = g;
        if (n.t !== 'g') addChunk(k, [k], true, layer);
        else build(k, k, layer);
      } else run.push(k);
    });
    flush();
  }
  layers.forEach(function (L) { build(L.i, L.i, L); });
  var gList = Object.keys(G).map(Number).sort(function (a, b) { return a - b; });

  // ---- rasterising a chunk
  var maxPx = Math.min(4096, ctx.renderer ? ctx.renderer.capabilities.maxTextureSize : 4096);
  function raster(c) {
    var box = [1e9, 1e9, -1e9, -1e9];
    c.items.forEach(function (it) { extent(it, c.self, box); });
    if (box[0] > box[2]) return false;
    var w = box[2] - box[0], h = box[3] - box[1];
    var s = Math.min(Math.max(1.5, view.scale * (ctx.U.uPx.value || 1) * 1.15), 3);
    s = Math.min(s, 2048 / w, 2048 / h, Math.sqrt(2.2e6 / Math.max(1, w * h)));
    var W = Math.max(2, Math.ceil(w * s)), H = Math.max(2, Math.ceil(h * s));
    if (!c.cv || c.cv.width !== W || c.cv.height !== H) {
      if (c.tex) c.tex.dispose();
      c.cv = document.createElement('canvas'); c.cv.width = W; c.cv.height = H;
      c.tex = new T.CanvasTexture(c.cv); c.tex.premultiplyAlpha = true; c.tex.minFilter = T.LinearMipmapLinearFilter; c.tex.magFilter = T.LinearFilter;
      if (c.mesh) { c.mesh.material.uniforms.map.value = c.tex; }
    }
    var g2 = c.cv.getContext('2d'); g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, W, H);
    g2.setTransform(W / w, 0, 0, H / h, -box[0] * W / w, -box[1] * H / h); g2.globalAlpha = 1;
    // the inherited clip of a clipped ancestor drawn as one piece is applied by drawNode; here the items themselves
    var on = N[c.owner]; if (!c.self && on.k && on.k.cp) clipTo(g2, on.k.cp);
    c.items.forEach(function (it) { drawNode(g2, it, c.self); });
    c.tex.needsUpdate = true;
    if (c.at !== undefined) toAtlas(c, W, H);
    if (!c.box || c.box[0] !== box[0] || c.box[1] !== box[1] || c.box[2] !== box[2] || c.box[3] !== box[3]) {
      c.box = box;
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute([box[0], box[1], 0, box[2], box[1], 0, box[0], box[3], 0, box[2], box[3], 0], 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2)); geo.setIndex([0, 2, 1, 2, 3, 1]);
      if (c.mesh) { c.mesh.geometry.dispose(); c.mesh.geometry = geo; }
      else {
        c.mesh = new T.Mesh(geo, spriteMat(c.tex, c.layer.d, c.layer.front)); c.mesh.frustumCulled = false; c.mesh.matrixAutoUpdate = false;
        c.mesh.renderOrder = c.ord; G[c.owner].add(c.mesh); c.at = null; runsDirty = true; toAtlas(c, W, H);
      }
    }
    return true;
  }

  // ---- per frame: the moving groups follow the mirror; now and then, every visible chunk checks whether its colours changed
  var tmpM = new T.Matrix4(), scanAt = -9, scanI = 0, dashAt = 0;
  function setM(g, m) { if (!m) { g.matrix.identity(); } else g.matrix.set(m[0], m[2], 0, m[4], m[1], m[3], 0, m[5], 0, 0, 1, 0, 0, 0, 0, 1); g.matrixWorldNeedsUpdate = true; }
  function layerM(L) {
    // the layer element's own CSS transform is in screen px (clouds drift by % of the panel, a Christmas jig): back to painting units
    var cs = getComputedStyle(L.el); L.op = num(cs.opacity, 1); L.vis = cs.display !== 'none' && cs.visibility !== 'hidden';
    // prod: a layer whose transform or opacity can change between state changes (a CSS animation, a running transition,
    // a transform set by the scene's parallax) is followed every frame; the others only on the full passes
    L.live = cs.animationName !== 'none' || !!L.el.style.transform || (cs.transitionDuration !== '0s' && L.el.getAnimations && L.el.getAnimations().length > 0);
    var m = parseM(cs.transform); if (!m) return null;
    var o = cs.transformOrigin.split(' ').map(parseFloat), s = view.scale, x0 = view.x0, y0 = view.y0;
    var M = mul(mul([1, 0, 0, 1, o[0], o[1]], m), [1, 0, 0, 1, -o[0], -o[1]]);
    return mul(mul([1 / s, 0, 0, 1 / s, x0, y0], M), [s, 0, 0, s, -s * x0, -s * y0]);
  }
  function syncGroup(i, opIn, all) {
    var g = G[i], n = N[i], cs, op;
    if (n.t === 'svg') { var L = g.userData.L; setM(g, layerM(L)); g.visible = L.vis; op = L.op; }
    else if (!all && !g.userData.live && g.userData.cop != null) {
      // prod: a group that doesn't animate itself (passed through on the way to moving children) keeps what the last full
      // pass read: no style read per frame (state changes force a full pass)
      if (!g.visible) return; op = g.userData.cop;
    }
    else {
      cs = getComputedStyle(E[i]);
      var vis = cs.display !== 'none' && (cs.visibility !== 'hidden' || n.t === 'g');
      g.visible = vis; if (!vis) return;
      setM(g, ownM(i, cs)); op = num(cs.opacity, 1); g.userData.cop = op;
      g.userData.live = cs.animationName !== 'none' || (cs.transitionDuration !== '0s' && E[i].getAnimations && E[i].getAnimations().length > 0);
    }
    g.userData.op = op * opIn;
    if (!g.visible) return;
    var ch = g.children;
    for (var j = 0; j < ch.length; j++) {
      var o = ch[j];
      if (o.isMesh) { o.material.uniforms.uOp.value = g.userData.op; }
      else if (all || o.userData.live || o.userData.liveIn) syncGroup(o.userData.i, g.userData.op, all);
    }
  }
  // which groups hold live ones (so a per-frame pass can skip the still branches)
  function markLive() {
    for (var k = gList.length - 1; k >= 0; k--) { var g = G[gList[k]]; g.userData.liveIn = false; }
    for (var k2 = gList.length - 1; k2 >= 0; k2--) { var g2 = G[gList[k2]]; if ((g2.userData.live || g2.userData.liveIn) && g2.parent && g2.parent.userData) g2.parent.userData.liveIn = true; }
  }
  function visibleChain(c) { var o = G[c.owner]; while (o && !o.isScene) { if (!o.visible) return false; o = o.parent; } return true; }
  var byOwner = {}; chunks.forEach(function (c) { (byOwner[c.owner] = byOwner[c.owner] || []).push(c); });
  function check(c, force) {
    if (!visibleChain(c)) { if (c.mesh) c.mesh.visible = false; return; }
    var k = ''; for (var j = 0; j < c.items.length; j++) k += '#' + keyOf(c.items[j], c.self);
    if (k !== c.key || force) { c.key = k; if (c.mesh) c.mesh.visible = true; if (!raster(c) && c.mesh) c.mesh.visible = false; }
    else if (c.mesh) c.mesh.visible = true;
  }
  // prod: the painting's state attributes changed: a full pass on the next frame
  var stateMo = window.MutationObserver ? new MutationObserver(function () { scanAt = -9; }) : null;
  if (stateMo && host) stateMo.observe(host, { attributes: true });
  function update(now) {
    // a full pass a few times a second (state changes, colour transitions); the live groups every frame
    if (now - scanAt > 0.25 || now < scanAt) {
      scanAt = now;
      layers.forEach(function (L) { syncGroup(L.i, 1, true); });
      markLive();
      // spread the colour checks: a third of the chunks each pass, all of them the first time
      var n = chunks.length, step = scanI === 0 ? n : Math.ceil(n / 3);
      for (var j = 0; j < step; j++) { var c = chunks[(scanI + j) % n]; check(c, false); }
      scanI = (scanI + step) % n || 1;
    } else {
      // prod: per frame only the layers that move or hold moving groups (each read can force a style recalc of the page)
      layers.forEach(function (L) { var g = G[L.i]; if (L.live || g.userData.liveIn || L.live == null) syncGroup(L.i, 1, false); });
    }
    // dashes and strokes that animate (the net's signals, the fountain jets, the kite string): redraw at 12 fps
    if (now - dashAt > 1 / 12 || now < dashAt) {
      dashAt = now;
      for (var q = 0; q < liveSelf.length; q++) { var c2 = liveSelf[q]; if (G[c2.owner].visible && visibleChain(c2)) check(c2, false); }
    }
  }
  var liveSelf = chunks.filter(function (c) { return c.self && N[c.owner].an && N[c.owner].t !== 'g'; });

  // ---- prod: batching. Every chunk is a sprite with its own texture: ~480 draw calls a frame on the 2026-10-28 design.
  // Small chunks (≤ 256 px) are copied into a shared atlas and drawn as
  // instances: one draw per run of chunks that are consecutive in paint order within one layer (anything else in between,
  // a big chunk, a 3D cloud, the sky dome, ends the run). The chunk meshes stay as proxies (check() and syncGroup() keep
  // driving them, no pass draws them); every frame their visibility, opacity, group matrix and box go to the instances.
  // A chunk redrawn 3 times within 2 s (the net's signal dashes, measured: 12 of 165 animated chunks) leaves the atlas:
  // each redraw re-uploads the whole atlas.
  var AT = 2048, AMAX = 256, APAD = 8, atlasCv = document.createElement('canvas'); atlasCv.width = atlasCv.height = AT;
  var atlasG = atlasCv.getContext('2d'), atlas = new T.CanvasTexture(atlasCv), atlasDirty = false, runsDirty = true, runs = [];
  atlas.premultiplyAlpha = true; atlas.minFilter = T.LinearMipmapLinearFilter; atlas.magFilter = T.LinearFilter;
  var shelf = [0, 0, 0];
  function toAtlas(c, W, H) {
    if (c.at === null) {   // first raster: a slot, if it is small
      c.at = false;
      if (W > AMAX || H > AMAX) return;
      if (shelf[0] + W + APAD > AT) { shelf[0] = 0; shelf[1] += shelf[2] + APAD; shelf[2] = 0; }
      if (shelf[1] + H + APAD > AT) return;
      c.at = [shelf[0] + APAD / 2, shelf[1] + APAD / 2, W, H]; shelf[0] += W + APAD; shelf[2] = Math.max(shelf[2], H);
    }
    if (!c.at) return;
    if (W > c.at[2] || H > c.at[3]) { c.at = false; runsDirty = true; return; }   // outgrew its slot: drawn on its own
    var t = performance.now(); c.rd = (c.rd || []).concat(t).slice(-3);
    if (c.rd.length === 3 && t - c.rd[0] < 2000) { c.at = false; runsDirty = true; return; }   // redrawn often: drawn on its own
    atlasG.clearRect(c.at[0] - APAD / 2, c.at[1] - APAD / 2, c.at[2] + APAD, c.at[3] + APAD); atlasG.drawImage(c.cv, c.at[0], c.at[1]);
    c.at[4] = W; c.at[5] = H; atlasDirty = true;
  }
  var bvs = 'attribute vec4 aBox, aUv; attribute float aOp; uniform float uD; varying vec2 vUv; varying float vOp; void main(){ vUv = mix(aUv.xy, aUv.zw, uv); vOp = aOp;' +
    ' vec4 p = modelMatrix * instanceMatrix * vec4(mix(aBox.x, aBox.z, uv.x), mix(aBox.w, aBox.y, uv.y), 0., 1.); float s = uD / ' + F.toFixed(1) + ';' +
    ' vec3 w = vec3((p.x - ' + EX.toFixed(1) + ') * s, ' + HC.toFixed(2) + ' - (p.y - ' + HZ.toFixed(1) + ') * s, ' + ZC.toFixed(1) + ' - uD);' +
    ' gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.); }';
  var bfs = 'uniform sampler2D map; varying vec2 vUv; varying float vOp;' +
    ' void main(){ vec4 t = texture2D(map, vUv); float a = t.a * vOp; if (a < .003) discard; gl_FragColor = vec4(t.rgb / max(t.a, .0001), a); }';
  var quadG = new T.BufferGeometry();
  quadG.setAttribute('position', new T.Float32BufferAttribute(new Array(12).fill(0), 3)); quadG.setAttribute('uv', new T.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2)); quadG.setIndex([0, 2, 1, 2, 3, 1]);
  function rebuildRuns() {
    runsDirty = false;
    runs.forEach(function (r) { r.im.parent.remove(r.im); r.im.geometry.dispose(); r.im.material.dispose(); r.list.forEach(function (c) { if (c.mesh) c.mesh.layers.mask = 1; }); });
    runs = [];
    [skyScene, frontScene].forEach(function (sc) {
      var all = [];
      sc.traverse(function (o) { if (o.isMesh && !o.isInstancedMesh) all.push(o); });
      all.sort(function (a, b) { return a.renderOrder - b.renderOrder; });
      var cur = null, byMesh = new Map(); chunks.forEach(function (c) { if (c.mesh) byMesh.set(c.mesh, c); });
      all.forEach(function (o) {
        var c = byMesh.get(o);
        if (!c || !c.at) { cur = null; return; }
        if (!cur || cur.layer !== c.layer) { cur = { layer: c.layer, list: [], scene: sc }; runs.push(cur); }
        cur.list.push(c);
      });
    });
    runs = runs.filter(function (r) { return r.list.length > 1; });
    runs.forEach(function (r) {
      var n = r.list.length, g = quadG.clone();
      g.setAttribute('aBox', new T.InstancedBufferAttribute(new Float32Array(n * 4), 4)); g.setAttribute('aUv', new T.InstancedBufferAttribute(new Float32Array(n * 4), 4)); g.setAttribute('aOp', new T.InstancedBufferAttribute(new Float32Array(n), 1));
      var m = new T.ShaderMaterial({ uniforms: { map: { value: atlas }, uD: { value: r.layer.d } }, vertexShader: bvs, fragmentShader: bfs, transparent: true, depthWrite: false, depthTest: false, side: T.DoubleSide, fog: false });
      var im = new T.InstancedMesh(g, m, n); im.frustumCulled = false; im.renderOrder = r.list[0].ord; im.matrixAutoUpdate = false;
      r.scene.add(im); r.im = im;
      r.list.forEach(function (c) { c.mesh.layers.mask = 0; });
    });
  }
  function batchSync() {
    if (runsDirty) rebuildRuns();
    if (atlasDirty) { atlasDirty = false; atlas.needsUpdate = true; }
    if (!runs.length) return;
    skyScene.updateMatrixWorld(); frontScene.updateMatrixWorld();
    runs.forEach(function (r) {
      var g = r.im.geometry, bx = g.attributes.aBox.array, uv = g.attributes.aUv.array, op = g.attributes.aOp.array;
      r.list.forEach(function (c, k) {
        var v = c.mesh.visible; for (var o = c.mesh.parent; v && o && !o.isScene; o = o.parent) if (!o.visible) v = false;
        op[k] = v ? c.mesh.material.uniforms.uOp.value : 0;
        r.im.setMatrixAt(k, c.mesh.parent.matrixWorld);
        var b = c.box || [0, 0, 0, 0]; bx[k * 4] = b[0]; bx[k * 4 + 1] = b[1]; bx[k * 4 + 2] = b[2]; bx[k * 4 + 3] = b[3];
        var a = c.at, W = a[4] || a[2], H = a[5] || a[3];
        uv[k * 4] = a[0] / AT; uv[k * 4 + 1] = 1 - (a[1] + H) / AT; uv[k * 4 + 2] = (a[0] + W) / AT; uv[k * 4 + 3] = 1 - a[1] / AT;
      });
      r.im.instanceMatrix.needsUpdate = true; g.attributes.aBox.needsUpdate = g.attributes.aUv.needsUpdate = g.attributes.aOp.needsUpdate = true;
    });
  }
  // fonts: once the web fonts load, redraw the chunks with text
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { chunks.forEach(function (c) { if (c.items.some(hasText)) c.key = null; }); });
  function hasText(i) { if (N[i].t === 'text') return true; return kids[i].some(hasText); }

  // ---- for the native modules: where a painted node is, whether it shows, how opaque it is (through its groups and layer)
  function chainOf(i) { var c = []; while (i >= 0) { c.push(i); i = N[i].p; } return c.reverse(); }
  function visibleNode(i) {
    var c = chainOf(i);
    for (var q = 0; q < c.length; q++) { var cs = getComputedStyle(E[c[q]]); if (cs.display === 'none') return false; if (q === c.length - 1 && cs.visibility === 'hidden') return false; }
    return true;
  }
  function opacityNode(i) { var c = chainOf(i), o = 1; for (var q = 0; q < c.length; q++) o *= num(getComputedStyle(E[c[q]]).opacity, 1); return o; }
  function worldM(i) {
    var c = chainOf(i), m = I;
    for (var q = 0; q < c.length; q++) { var k = c[q], mm = N[k].t === 'svg' ? layerM(G[k].userData.L) : svgOwn(k); if (mm) m = mul(m, mm); }
    return m;
  }
  // ---- helpers for the rest of the scene
  function find(sel) { var el = host.querySelector(sel); return el ? E.indexOf(el) : -1; }
  // rasterise one node (and its children) into a canvas, as if visible: used for the 3D cut-outs of the flying moments
  function cutout(sel, S) {
    var i = find(sel); if (i < 0) return null;
    var forced = [], a = E[i]; while (a && a !== host) { if (getComputedStyle(a).display === 'none') { forced.push([a, a.style.display]); a.style.display = 'inline'; } a = a.parentElement; }
    var vis = [], b = E[i]; while (b && b !== host) { if (getComputedStyle(b).visibility === 'hidden') { vis.push([b, b.style.visibility]); b.style.visibility = 'visible'; } b = b.parentElement; }
    var box = [1e9, 1e9, -1e9, -1e9]; extent(i, true, box);
    var out = null;
    if (box[0] < box[2]) {
      var w = box[2] - box[0], h = box[3] - box[1], W = Math.ceil(w * S), H = Math.ceil(h * S), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var g2 = cv.getContext('2d'); g2.setTransform(S, 0, 0, S, -box[0] * S, -box[1] * S);
      drawNode(g2, i, true);
      var bb = N[i].b || [box[0], box[1], w, h];
      out = { cv: cv, w: w, h: h, cx: (bb[0] + bb[2] / 2 - box[0]) / w, cy: (bb[1] + bb[3] / 2 - box[1]) / h };
    }
    forced.forEach(function (f) { f[0].style.display = f[1]; }); vis.forEach(function (f) { f[0].style.visibility = f[1]; });
    return out;
  }
  // a node's box on screen (CSS px relative to the panel), through its groups: for the clouds the beacon crosses
  function screenBox(i) {
    var b = N[i].b; if (!b) return null;
    var m = I, j = i; var chain = [];
    while (j >= 0) { chain.push(j); j = N[j].p; }
    for (var q = chain.length - 1; q >= 0; q--) { var k = chain[q]; var mm = N[k].t === 'svg' ? layerM(G[k].userData.L) : svgOwn(k); if (mm && k !== i) m = mul(m, mm); }
    var p0 = apply(m, b[0], b[1]), p1 = apply(m, b[0] + b[2], b[1] + b[3]), s = view.scale;
    return { x: (Math.min(p0[0], p1[0]) - view.x0) * s, y: (Math.min(p0[1], p1[1]) - view.y0) * s, w: Math.abs(p1[0] - p0[0]) * s, h: Math.abs(p1[1] - p0[1]) * s, op: G[layerOf[i]].visible ? G[layerOf[i]].userData.op : 0 };
  }
  function center(el) { var i = E.indexOf(el); if (i < 0 || !N[i].b) return null; var b = N[i].b; return [b[0] + b[2] / 2, b[1] + b[3] / 2]; }
  return { root: root, skyScene: skyScene, frontScene: frontScene, update: function (now) { update(now); batchSync(); }, cutout: cutout, find: find, screenBox: screenBox, center: center, E: E, N: N, chunks: chunks, G: G, kids: kids, byId: byId,
    visible: visibleNode, opacity: opacityNode, worldM: worldM, order: function (i) { return i; },
    layerM: function (i) { return layerM(G[layerOf[i]].userData.L); }, ownM: function (i) { return svgOwn(i); }, raster2D: function (g2, i, self) { drawNode(g2, i, self); }, paint: paint, num: num,
    dispose: function () { chunks.forEach(function (c) { if (c.tex) c.tex.dispose(); }); } };
}
