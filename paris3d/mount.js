import * as T from 'three';
import { state } from './state.js';
import { buildBushes } from './nature/bushes.js';
import { buildClouds } from './sky/clouds.js';
import { buildCruiser } from './water/cruiser.js';
import { buildEvents } from './events/events.js';
import { buildFountain } from './water/fountain.js';
import { buildGardenLife } from './nature/garden.js';
import { Glass } from './effects/glass.js';
import { buildGlints } from './effects/glints.js';
import { Glows } from './core/glows.js';
import { Ink } from './effects/ink.js';
import { Rain } from './effects/rain.js';
import { paintMaterial } from './core/paint.js';
import { Palette } from './core/palette.js';
import { Reflection } from './water/reflection.js';
import { buildRiver } from './water/river.js';
import { buildScene } from './city/scene.js';
import { buildSky } from './sky/skydome.js';
import { scratchTexture, starTexture, waterTexture, radialTexture } from './core/textures.js';
import { buildTraffic } from './traffic/traffic.js';
import { buildTrees } from './nature/trees.js';
import { rng, clamp } from './core/util.js';
import { buildVec } from './sky/vec.js';
import { F, HC, HZ, ZC, gY0, gp, VBW, VBH, VBY, EX } from './core/view.js';
import { seineMaterial, basinMaterial } from './water/water.js';
import { buildWeather } from './nature/weather.js';
// ---------------------------------------------------------------- mount
export function supported() {
  try { var c = document.createElement('canvas'); return !!(window.WebGL2RenderingContext && c.getContext('webgl2')); } catch (e) { return false; }
}

export async function mount(canvas, opts) {
  // prod: no throwaway test context (~0.7 s on an Intel UHD): creating the renderer below throws if WebGL 2 is missing
  if (!window.WebGL2RenderingContext || !opts || !opts.layout) return null;
  var progress = opts.onProgress || function () {};
  // hand the main thread back between build steps so the page stays responsive
  function step(f) { progress(f); return new Promise(function (r) { setTimeout(r, 0); }); }
  var L = opts.layout, el = opts.tokens || canvas.parentElement;
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  await step(0.02);
  renderer.setClearColor(0x000000, 0); renderer.toneMapping = T.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
  var scene = new T.Scene(), camera = new T.PerspectiveCamera(50, 1, 3, 9000), ink = Ink(renderer), inkOn = opts.ink !== false, rain = Rain(renderer);
  var P = new Palette(L.tokens, el); P.read();
  var U = {
    uPal: { value: P.tex }, uScr: { value: scratchTexture() }, uTime: { value: 0 }, uWind: { value: 0.45 }, uDrift: { value: 0 }, uBand: { value: new T.Vector2(0.14, 0.8) },
    uScale: { value: 800 }, uPn: { value: 0 }, uFount: { value: 1 }, uGlint: { value: 270 }, uLeap: { value: 0 }, uHalf: { value: 0 }, uStyle: { value: new T.Vector4(1, 1.8, 1, 1) }, uCloud: { value: new T.Vector3(0, 0, 0) }, uWarm: { value: 0 }, uStep: { value: 0 }, uQ: { value: 1 }, uPx: { value: 1 }, uSeason: { value: new T.Vector4(0, 0, 1, 2) }, uSnow: { value: 0 }, uRain: { value: 0 }, uFrost: { value: 0 }, uFL: { value: new T.Vector3(.85, .93, 1) }, uIce: { value: 0 }, uPat: { value: 0 }, uHw: { value: (function () { var a = []; for (var i = 0; i < 24; i++) a.push(new T.Vector4(0, -999, 0, 0)); return a; })() }, uHwOn: { value: 0 }, uBst: { value: [new T.Vector4(), new T.Vector4(), new T.Vector4(), new T.Vector4()] }, uBstC: { value: [new T.Color(), new T.Color(), new T.Color(), new T.Color()] }, uBsx: { value: [new T.Vector2(), new T.Vector2(), new T.Vector2(), new T.Vector2()] }, uRimP: { value: 0 }, uTree: { value: new T.Vector4() }, uMet: { value: new T.Vector4() }, uFog: { value: 0 }, uFogC: { value: new T.Vector3(.8, .82, .86) }, uSnowAmt: { value: 0 }, uFlash: { value: 0 }, uMoon: { value: 0.5 }, uLamps: { value: (function () { var a = []; for (var i = 0; i < 24; i++) a.push(new T.Vector4(0, -999, 0, 1)); return a; })() }, uReflOn: { value: 1 }, uBoat: { value: new T.Vector4(0, 0, 0, 0) }
  };
  U.P = P;
  var tex = { star: starTexture(), water: waterTexture(), warm: radialTexture([[0, 'rgba(255,211,138,0.95)'], [1, 'rgba(255,180,84,0)']]) };
  var ctx = { L: L, P: P, U: U, scene: scene, tex: tex, glows: new Glows(U, tex.warm), mats: { paint: paintMaterial(U) }, pools: [], blinkers: [], spray: [], contacts: [], WL: 2.6, BWL: -0.2, host: canvas.parentElement, canvas: canvas };
  ctx.contactMat = new T.MeshBasicMaterial({ color: 0x000000, map: radialTexture([[0, 'rgba(0,0,0,1)'], [0.55, 'rgba(0,0,0,0.75)'], [1, 'rgba(0,0,0,0)']]), transparent: true, opacity: 0.26, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  ctx.waterD = function (y) { return F * (HC + ctx.WL) / (y - HZ); };
  ctx.waterZ = function (y) { return ZC - ctx.waterD(y); };

  await buildScene(ctx, step); await step(0.15);
  var trees = buildTrees(ctx); await step(0.25); buildBushes(ctx); var garden = buildGardenLife(ctx); await step(0.32);
  // soft contact shadows where things meet the ground
  (function () {
    var n = ctx.contacts.length, im = new T.InstancedMesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), ctx.contactMat, n), M = new T.Matrix4();
    ctx.contacts.forEach(function (c, i) { M.makeScale(c[2] * 2, 1, c[3] * 2).setPosition(c[0], gY0(c[0], c[1]) + 0.14, c[1]); im.setMatrixAt(i, M); });
    im.frustumCulled = false; im.renderOrder = 1; scene.add(im);
  })();
  var fountain = buildFountain(ctx); await step(0.38); var traffic = buildTraffic(ctx); await step(0.44); var cruiser = buildCruiser(ctx), river = buildRiver(ctx), glints = buildGlints(ctx), glintPts = glints.pts; await step(0.5);
  var wz0 = gp(0, 1043)[2], wz1 = gp(0, 1123)[2];
  var refl = Reflection(renderer), seine = new T.Mesh(new T.PlaneGeometry(5200, wz1 - wz0 + 2).rotateX(-Math.PI / 2).translate(0, -ctx.WL, (wz0 + wz1) / 2), seineMaterial(ctx, refl)); seine.name = 'seine'; scene.add(seine);
  refl.setArea([[-2600, -ctx.WL, wz0 - 1], [2600, -ctx.WL, wz0 - 1], [-2600, -ctx.WL, wz1 + 1], [2600, -ctx.WL, wz1 + 1]]);
  var bw = ctx.basin, bg = new T.BufferGeometry();
  bg.setAttribute('position', new T.Float32BufferAttribute([bw[0][0], -ctx.BWL, bw[0][2], bw[1][0], -ctx.BWL, bw[1][2], bw[2][0], -ctx.BWL, bw[2][2], bw[3][0], -ctx.BWL, bw[3][2]], 3)); bg.setIndex([0, 3, 2, 0, 2, 1]);
  var reflB = Reflection(renderer, 2.5), basinW = new T.Mesh(bg, basinMaterial(ctx, reflB)); basinW.name = 'basin-water'; scene.add(basinW);
  reflB.setArea(bw.map(function (c) { return [c[0], -ctx.BWL, c[2]]; }));
  // lamp pools on the ground and the windows that light up now and then
  ctx.pools.forEach(function (p) { ctx.glows.add([p[0], 0.4, p[1] + 0.5], p[2], '#ffd38a', 0.45, p[3] ? 'dusk' : 'nt', p[3] || 0); });
  var blinkG = new T.BufferGeometry(), bp = [], bs = [], br = [], RB = rng(91);
  ctx.blinkers.forEach(function (b) { bp.push(b[0], b[1], b[2]); bs.push(b[3]); br.push(RB() * 34, 18 + RB() * 16); });
  blinkG.setAttribute('position', new T.Float32BufferAttribute(bp, 3)); blinkG.setAttribute('aS', new T.Float32BufferAttribute(bs, 1)); blinkG.setAttribute('aR', new T.Float32BufferAttribute(br, 2));
  var blink = new T.Points(blinkG, new T.ShaderMaterial({
    uniforms: { uTime: U.uStep, uScale: U.uScale, uPn: U.uPn },
    vertexShader: 'attribute float aS; attribute vec2 aR; uniform float uTime, uScale, uPn; varying float vO; void main(){ float f = fract((uTime + aR.x) / aR.y); vO = smoothstep(.38, .42, f) * (1. - smoothstep(.86, .9, f)) * uPn * .95; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vO > 0. ? aS * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'varying float vO; void main(){ vec2 q = abs(gl_PointCoord - .5); if (q.x > .3 || q.y > .48) discard; gl_FragColor = vec4(1., .827, .541, vO);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false
  }));
  blink.frustumCulled = false; scene.add(blink);
  var glowPts = ctx.glows.build(); scene.add(glowPts);
  var glowPos = glowPts.geometry.attributes.position; ctx.glowOp = glowPts.geometry.attributes.aOp; ctx.glowPos = glowPos; ctx.glowCol = glowPts.geometry.attributes.aCol;

  // the key light: from the camera's side, swinging with the sun (or the moon) through the day
  var sun = new T.DirectionalLight(0xffffff, Math.PI); sun.castShadow = true;
  var small = Math.min(window.innerWidth, window.innerHeight) < 700;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  var sc = sun.shadow.camera; sc.left = -460; sc.right = 460; sc.top = 560; sc.bottom = -560; sc.near = 20; sc.far = 2800;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
  sun.target.position.set(0, 0, 150); scene.add(sun); scene.add(sun.target);

  var host = canvas.parentElement;
  var net = host ? host.querySelector('.pt-net') : null, netV = 0, lastCx = 0, netKey = '';
  var ptr = { x: 0, y: 0, sx: 0, sy: 0, hover: 0 }, aside = host && host.closest ? (host.closest('aside') || host) : host;
  function onMove(e) { var r = aside.getBoundingClientRect(); ptr.x = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1); ptr.y = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1); ptr.hover = 1; }
  function onLeave() { ptr.x = 0; ptr.y = 0; ptr.hover = 0; }
  // on a touch screen the panel keeps sideways swipes (home.css: touch-action pan-y), so a swipe wipes the misted pane like
  // the mouse does; the browser takes a vertical swipe for scrolling and cancels the pointer
  if (aside) { aside.addEventListener('pointermove', onMove, { passive: true }); aside.addEventListener('pointerleave', onLeave); aside.addEventListener('pointercancel', onLeave); }

  var maxPR = Math.min(window.devicePixelRatio || 1, 2), minPR = Math.min(maxPR, 1), pr = maxPR, prAt = 0, jsAcc = 0, tier = 0, slow = 0, W = 0, H = 0, view = { x0: 0, y0: 0, vw: 816, vh: 1130, scale: 1 };
  var cw = canvas.clientWidth, ch = canvas.clientHeight;
  function resize() {
    var w = Math.max(1, cw), h = Math.max(1, ch);
    if (w === W && h === H && renderer.getPixelRatio() === pr) return;
    W = w; H = h; renderer.setPixelRatio(pr); renderer.setSize(w, h, false); ink.setSize(Math.round(w * pr), Math.round(h * pr)); rain.setSize(Math.round(w * pr), Math.round(h * pr), pr, w); refl.setSize(Math.round(w * pr), Math.round(h * pr)); reflB.setSize(Math.round(w * pr), Math.round(h * pr)); ink.mat.uniforms.uW.value = Math.max(1, pr * 0.75); U.uPx.value = pr;
    // the SVG viewBox with preserveAspectRatio="xMidYMid slice": the part of the painting the panel shows
    var s = Math.max(w / VBW, h / VBH); view.scale = s; view.vw = w / s; view.vh = h / s;
    view.x0 = VBW / 2 - view.vw / 2; view.y0 = VBY + VBH / 2 - view.vh / 2;
    U.uScale.value = h * pr / (view.vh / F);
  }
  var glass = host && opts.glass !== false ? Glass(host, canvas, view) : null, skyCol = ['#9fc0e0', '#d8e6f2'], skyAt = -9; var fogCol = null, fogAt = -9;
  var fr = { l: -1, r: 1, t: 1, b: -1 };
  function project() {
    var n = camera.near;
    fr.l = (view.x0 - EX) / F * n; fr.r = (view.x0 + view.vw - EX) / F * n; fr.t = (HZ - view.y0) / F * n; fr.b = (HZ - view.y0 - view.vh) / F * n;
    camera.projectionMatrix.makePerspective(fr.l, fr.r, fr.t, fr.b, n, camera.far);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  // the painting's vector layers (sky, clouds, fireworks, the skins), painted by Three.js from the mirror's styles
  var vec = buildVec(ctx, view); ctx.vec = vec; state.vec = vec; await step(0.5);
  var sky = buildSky(ctx, vec); ctx.sky = sky; var clouds3 = buildClouds(ctx, vec); ctx.clouds3 = clouds3; await step(0.52);
  // the sky picture, behind everything in the 3D scene
  var skyRT = new T.WebGLRenderTarget(4, 4, { depthBuffer: true }), tmpC = new T.Color();
  ink.mat.uniforms.tSky.value = skyRT.texture; ink.mat.uniforms.uSky.value = vec ? 1 : 0;
  function skyPass() {
    if (!vec) return;
    var bw = Math.round(W * pr), bh = Math.round(H * pr); if (skyRT.width !== bw || skyRT.height !== bh) skyRT.setSize(bw, bh);
    renderer.getClearColor(tmpC); var ca = renderer.getClearAlpha();
    renderer.setRenderTarget(skyRT); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(vec.skyScene, camera); renderer.setRenderTarget(null); renderer.setClearColor(tmpC, ca);
  }
  function frontPass() { if (!vec) return; var ac = renderer.autoClear; renderer.autoClear = false; renderer.render(vec.frontScene, camera); renderer.autoClear = ac; }
  // rain on the glass (effects/rain.js): the finished frame goes to the rain's target, the water pass puts it on the canvas;
  // the front layer (the project labels) stays in front of the glass, sharp
  function paintFrame() { var wet = tier < 1 && rain.active(); skyPass(); reflect(); ink.render(scene, camera, inkOn, wet ? rain.target : null); if (wet) rain.render(); frontPass(); if (glass && tier < 1) glass.draw(); }
  var weather = buildWeather(ctx); await step(0.54); var events = buildEvents(ctx, renderer); await step(0.58);
  var reflHide = [seine, basinW, glintPts, glowPts]; ['lamp-halo', 'moths'].forEach(function (n) { var o = scene.getObjectByName(n); if (o) reflHide.push(o); }); events.reflHide.forEach(function (o) { reflHide.push(o); }); ctx.reflHide = reflHide;
  // prod: one reflection a frame, in turn: the Seine on even frames, the basin on odd ones (each is a full render of the
  // scene, ~6 ms a frame for both); the water shaders move the ripples every frame over the reflection drawn the frame before
  var reflN = 0; function reflect() { if (U.uReflOn.value > 0.5) { if (reflN++ % 2 === 0) refl.render(scene, camera, fr, -ctx.WL, reflHide); else reflB.render(scene, camera, fr, -ctx.BWL, reflHide); } }
  // prod: lazy shader programs. Most of the scene's extras (each event's, weather's and moment's objects) sit in the scene
  // all day, visible but switched off by a uniform; the design compiled and drew all of them. Here an object is drawn only
  // while it can show something (visible, and not switched off by its uA / uOn), and its shader programs compile the first time it does,
  // in the background; it stays hidden (layer mask 0: no pass draws it) until they are ready.
  // prod: automatic instancing. Opaque meshes that share one geometry and one material (the cars' wheels, cars of one model,
  // lamps, the trees' sun flecks...) are drawn as one InstancedMesh: one draw call instead of one each, in every pass.
  // The meshes stay in the scene as proxies (the scene's code keeps moving and hiding them; no pass draws them) and their
  // world matrices are copied into the instances every frame. Swaying materials are left alone: under instancing their
  // sway would take its phase from the instance's position.
  var batches = [], ZERO = new T.Matrix4().makeScale(0, 0, 0);
  (function () {
    var groups = new Map(), skip = new Set(reflHide);
    scene.traverse(function (o) {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.children.length || skip.has(o) || Array.isArray(o.material)) return;
      var m = o.material, k = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
      if ((m.transparent || m.isShaderMaterial) && !m.userData.instancing) return;
      if (/S(tree|bush|grass)/.test(k)) return;
      var key = o.geometry.uuid + m.uuid + '|' + o.renderOrder + '|' + o.castShadow + o.receiveShadow;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(o);
    });
    groups.forEach(function (list) {
      if (list.length < 2) return;
      var a = list[0], im = new T.InstancedMesh(a.geometry, a.material, list.length);
      im.name = (a.name || 'batch') + '*'; im.renderOrder = a.renderOrder; im.castShadow = a.castShadow; im.receiveShadow = a.receiveShadow; im.frustumCulled = false;
      list.forEach(function (o) { o.userData.proxy = true; o.layers.mask = 0; });
      scene.add(im); batches.push({ im: im, list: list });
    });
  })();
  // prod: multi-shape batching (what three.js's BatchedMesh does in later versions). Opaque meshes sharing one paint material
  // but not one shape (the cars' bodies, glass, plates and lamps across models...) become one merged geometry whose vertices
  // carry their part's index; each part's world matrix sits in a float texture (4 texels a matrix), written every frame and
  // applied in the vertex shader, the shadow's depth shader included. The parts stay in the scene as proxies, like above.
  var mbatches = [];
  function batchVS(sh, tex) {
    sh.uniforms.uBM = { value: tex };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aBid; uniform highp sampler2D uBM;\nmat4 bmat(){ int x = int(aBid + .5) * 4; return mat4(texelFetch(uBM, ivec2(x, 0), 0), texelFetch(uBM, ivec2(x + 1, 0), 0), texelFetch(uBM, ivec2(x + 2, 0), 0), texelFetch(uBM, ivec2(x + 3, 0), 0)); }')
      // prod: inverse-transpose, as an unbatched mesh's normalMatrix, so a non-uniform scale lights the same
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = transpose(inverse(mat3(bmat()))) * objectNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = (bmat() * vec4(transformed, 1.)).xyz;');
  }
  (function () {
    var groups = new Map(), skip = new Set(reflHide), oid = new WeakMap(), nid = 0, OBR = T.Object3D.prototype.onBeforeRender, OAR = T.Object3D.prototype.onAfterRender, OBC = T.Material.prototype.onBeforeCompile;
    function ref(v) { if (!oid.has(v)) oid.set(v, ++nid); return '#' + oid.get(v); }
    // prod: paint materials of one program key differ only in what the material object holds (map, side...), so equal properties
    // draw equal pixels; 'D' keeps its detail texture in the onBeforeCompile closure, so it only merges with itself
    function msig(m, k) {
      if (!/^paint/.test(k) || /^paintD/.test(k)) return ref(m);
      var s = k + '|' + m.alphaTest;
      for (var p in m) {
        var v = m[p];
        if (p === 'uuid' || p === 'id' || p === 'name' || p === 'userData' || p === 'version' || p.charAt(0) === '_' || typeof v === 'function') continue;
        s += '|' + p + ':' + (v && typeof v === 'object' ? (v.toArray ? v.toArray().join() : ref(v)) : v);
      }
      return s;
    }
    scene.updateMatrixWorld();
    scene.traverse(function (o) {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.proxy || o.userData.off || o.children.length || Array.isArray(o.material) || o.layers.mask !== 1) return;
      // prod: a mirrored part would flip its winding (culling, gl_FrontFacing) once drawn with the batch's identity model matrix
      if (o.onBeforeRender !== OBR || o.onAfterRender !== OAR || o.matrixWorld.determinant() < 0) return;
      for (var x = o; x; x = x.parent) if (skip.has(x)) return;
      var m = o.material, k = m.customProgramCacheKey ? m.customProgramCacheKey() : '', g = o.geometry;
      if (m.transparent || m.isShaderMaterial) return;
      // prod: built-in materials only when their onBeforeCompile leaves the vertex shader alone (a vertex edit may read modelMatrix)
      if (/^paint/.test(k) ? /S(tree|bush|grass)|V/.test(k) : !(m.isMeshLambertMaterial || m.isMeshBasicMaterial) || (m.onBeforeCompile !== OBC && /vertexShader/.test(String(m.onBeforeCompile)))) return;
      if (!g.index || Object.keys(g.morphAttributes).length || g.drawRange.start || g.drawRange.count !== Infinity) return;
      var names = Object.keys(g.attributes).sort(), as = [];
      for (var i = 0; i < names.length; i++) {
        var at = g.attributes[names[i]];
        // prod: the merge copies the buffers once; a geometry rewritten at runtime has to stay its own draw
        if (at.isInterleavedBufferAttribute || at.usage !== T.StaticDrawUsage) return;
        as.push(names[i] + at.itemSize + at.array.constructor.name + at.normalized);
      }
      var key = msig(m, k) + '|' + o.renderOrder + '|' + o.castShadow + o.receiveShadow + '|' + as.join(',');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(o);
    });
    groups.forEach(function (list) {
      if (list.length < 2) return;
      var a = list[0], names = Object.keys(a.geometry.attributes), arrs = {}, idx = [], ids = [], base = 0;
      names.forEach(function (n) { arrs[n] = []; });
      list.forEach(function (o, i) {
        var g = o.geometry, cnt = g.attributes.position.count, j;
        names.forEach(function (n) { var at = g.attributes[n].array; for (j = 0; j < at.length; j++) arrs[n].push(at[j]); });
        for (j = 0; j < cnt; j++) ids.push(i);
        for (j = 0; j < g.index.count; j++) idx.push(g.index.array[j] + base);
        base += cnt;
      });
      var g2 = new T.BufferGeometry();
      names.forEach(function (n) { var at = a.geometry.attributes[n]; g2.setAttribute(n, new T.BufferAttribute(new at.array.constructor(arrs[n]), at.itemSize, at.normalized)); });
      g2.setAttribute('aBid', new T.Float32BufferAttribute(ids, 1)); g2.setIndex(idx);
      var N = list.length, data = new Float32Array(N * 16), tex = new T.DataTexture(data, N * 4, 1, T.RGBAFormat, T.FloatType); tex.needsUpdate = true;
      var m0 = a.material, mb = m0.clone(), key0 = m0.customProgramCacheKey();
      mb.color = m0.color; if (m0.emissive) mb.emissive = m0.emissive;  // prod: a colour the scene sets at runtime reaches the batch
      mb.customProgramCacheKey = function () { return key0 + 'B'; };
      mb.onBeforeCompile = function (sh, r) { m0.onBeforeCompile(sh, r); batchVS(sh, tex); };
      var dm = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking });
      dm.customProgramCacheKey = function () { return 'bdepth'; };
      dm.onBeforeCompile = function (sh) { batchVS(sh, tex); };
      var bm = new T.Mesh(g2, mb); bm.customDepthMaterial = dm; bm.name = (a.name || 'mbatch') + '+'; bm.renderOrder = a.renderOrder; bm.castShadow = a.castShadow; bm.receiveShadow = a.receiveShadow; bm.frustumCulled = false;
      list.forEach(function (o) { o.userData.proxy = true; o.layers.mask = 0; });
      scene.add(bm); mbatches.push({ list: list, data: data, tex: tex, bm: bm });
    });
  })();
  // prod: the reflections skip what the water can't show: objects under ~3 units (grass tufts, leaves, sun flecks, lamps'
  // parts, wires, people), a few pixels in the reflection targets and blurred by the ripples; ~40 % of their draws
  (function () {
    var inHide = new Set(reflHide);
    scene.updateMatrixWorld();
    scene.traverse(function (o) {
      if (!(o.isMesh || o.isLine || o.isPoints) || o.userData.proxy || inHide.has(o) || !o.geometry || !o.geometry.attributes.position) return;
      for (var x = o.parent; x; x = x.parent) if (inHide.has(x)) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      if (o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() < 3) reflHide.push(o);
    });
  })();
  // prod: world matrices are updated once a frame here, not again by each of the frame's render calls (reflections, main)
  scene.matrixWorldAutoUpdate = false;
  // prod: a matrix is recomposed only when its object moved. three recomposes every auto-updated object's matrix on each
  // update and so redoes its world matrix and its children's: 1,026 a frame, most of them for objects that never move.
  // Unchanged position, rotation, scale and parent: nothing to do (and the world matrix stays as it is)
  var UM = T.Object3D.prototype.updateMatrix;
  if (!UM.ifMoved) {
    T.Object3D.prototype.updateMatrix = function () {
      var p = this.position, q = this.quaternion, s = this.scale, v = this._mv;
      if (v && this.pivot == null && v[0] === p.x && v[1] === p.y && v[2] === p.z && v[3] === q.x && v[4] === q.y && v[5] === q.z && v[6] === q.w &&
        v[7] === s.x && v[8] === s.y && v[9] === s.z && v[10] === this.parent) return;
      if (!v) v = this._mv = [];
      v[0] = p.x; v[1] = p.y; v[2] = p.z; v[3] = q.x; v[4] = q.y; v[5] = q.z; v[6] = q.w; v[7] = s.x; v[8] = s.y; v[9] = s.z; v[10] = this.parent;
      UM.call(this);
    };
    T.Object3D.prototype.updateMatrix.ifMoved = true;
  }
  function sync() {
    if (vec) vec.sync();
    scene.updateMatrixWorld();
    for (var mb = 0; mb < mbatches.length; mb++) {
      var Q = mbatches[mb], qa = false;
      for (var qi = 0; qi < Q.list.length; qi++) {
        var qo = Q.list[qi], qv = true;
        for (var qx = qo; qx; qx = qx.parent) if (!qx.visible) { qv = false; break; }
        if (qv) { Q.data.set(qo.matrixWorld.elements, qi * 16); qa = true; } else Q.data.fill(0, qi * 16, qi * 16 + 16);
      }
      // prod: no draw (and no compile, via the lazy gate) while every part is hidden, as the unbatched parts had
      Q.bm.visible = qa; Q.tex.needsUpdate = true;
    }
    if (!batches.length) return;
    for (var b = 0; b < batches.length; b++) {
      var B = batches[b];
      for (var i = 0; i < B.list.length; i++) {
        var o = B.list[i], v = true;
        for (var x = o; x; x = x.parent) if (!x.visible) { v = false; break; }
        B.im.setMatrixAt(i, v ? o.matrixWorld : ZERO);
      }
      B.im.instanceMatrix.needsUpdate = true;
    }
  }
  var lazy = [], todo = [], pending = [];  // st: 0 never shown, 1 waiting to be compiled, 2 compiling, 3 ready
  scene.traverse(function (o) { if (o.material && !o.userData.proxy) lazy.push({ o: o, ms: Array.isArray(o.material) ? o.material : [o.material], st: 0 }); });
  function shows(e) {
    for (var x = e.o; x; x = x.parent) if (!x.visible) return false;
    if (e.o.userData.off && e.o.userData.off()) return false;
    // switched off = transparent, no depth written, and its uA / uOn ~0: drawing it would change no pixel
    return !e.ms.every(function (m) { var u = m.uniforms; return u && m.transparent && !m.depthWrite && ((u.uA && typeof u.uA.value === 'number' && u.uA.value < 1e-3) || (u.uOn && typeof u.uOn.value === 'number' && u.uOn.value < 1e-3)); });
  }
  function ready(e) { for (var i = 0; i < e.ms.length; i++) { var pr = renderer.properties.get(e.ms[i]).currentProgram; if (!pr || !pr.isReady()) return false; } return true; }
  // building a program (its source, then queuing the GPU's compile) costs main-thread time: spend at most `ms` per call
  function compileSome(ms) {
    if (!todo.length) return;
    var t1 = performance.now(); renderer.setRenderTarget(ink.rt);
    do { var e = todo.shift(); renderer.compile(e.o, camera, scene); e.st = 2; pending.push(e); } while (todo.length && performance.now() - t1 < ms);
    renderer.setRenderTarget(null);
  }
  // the GPU compiles in the order programs were queued, and a "ready?" question can itself stall (up to ~0.4 s seen),
  // so only the oldest pending object is asked
  function settle() { while (pending.length && ready(pending[0])) { var e = pending.shift(); e.st = 3; e.o.layers.mask = shows(e) ? 1 : 0; } }
  function gate(ms) {
    for (var i = 0; i < lazy.length; i++) {
      var e = lazy[i], w = shows(e);
      if (w && e.st === 0) { e.st = 1; todo.push(e); }
      e.o.layers.mask = w && e.st === 3 ? 1 : 0;
    }
    compileSome(ms || 4); settle();
  }
  function whenReady() { return new Promise(function (ok) { (function poll() { compileSome(30); settle(); if (disposed || !(todo.length + pending.length)) ok(); else setTimeout(poll, todo.length ? 0 : 50); })(); }); }
  var ro = window.ResizeObserver ? new ResizeObserver(function (es) { var r = es[0].contentRect; cw = r.width; ch = r.height; resize(); }) : null; if (ro) ro.observe(canvas);

  var st = { sky: 'day', pn: 0, season: '', phase: 2, event: '', wx: '', ny: '' };
  // prod: the painting's colour tokens depend only on these attributes of .pt (home.css); read them when one changes,
  // not on timers (each read forced a style recalc of the page every 1.5–3 s). tokV counts the changes.
  var tokV = 1, palV = 0, skyV = 0, fogV = 0;
  var tokMo = window.MutationObserver && host ? new MutationObserver(function () { tokV++; }) : null;
  if (tokMo) tokMo.observe(host, { attributes: true, attributeFilter: ['data-sky', 'data-event', 'data-season', 'data-phase', 'data-wx'] });
  var flashAt = -9, nextFlash = 0, shake = 0, hot = 0, PV = new T.Vector3(), RW = rng(808);
  var lastT = performance.now(), t0 = lastT, raf = 0, visible = true, onScreen = true, frames = 0, acc = 0, disposed = false, sig = '', readAt = -10, lastFw = 0, leap = 0, wind = 0.45, gust = 0, bakeAt = -1;
  var Ldir = new T.Vector3(); ctx.Ldir = Ldir;
  function update(dt, now) {
    var s = (opts.state && opts.state()) || {};
    var t = s.t == null ? 240 : s.t;
    st.pn = clamp((25 - t) / 40, 0, 1); st.season = s.season || ''; st.phase = s.phase || 2; st.event = s.event || ''; st.wx = s.wx || ''; st.ny = s.ny || ''; st.moment = s.moment || '';
    st.storm = st.moment === 'storm'; st.shower = st.moment === 'shower'; if (/^(rain|shower|storm)$/.test(st.moment)) st.wx = 'rain'; else if (st.moment === 'flurry' && st.wx !== 'rain') st.wx = 'snow'; else if (st.moment === 'fogroll') st.wx = 'fog';
    st.sky = t > 40 ? 'day' : t < -35 ? 'night' : 'dusk';
    st.sparkleOn = !!s.sparkle || /\b(party|finale|year|count)\b/.test(st.ny);
    st.nocars = /\bnocars\b/.test(st.ny); st.snap = !!s.snap;
    st.beacon = st.sky === 'night' ? (st.wx === 'fog' ? 0.7 : 1) : 0;
    // colours: re-read the tokens whenever the painting's state changes (the CSS swaps them), then ease like the SVG's 1.2 s transitions
    var k = [st.sky, st.season, st.phase, st.event, st.wx, st.ny].join('|');
    if (k !== sig || palV !== tokV || (!tokMo && now - readAt > 3)) { sig = k; palV = tokV; readAt = now; P.read(); if (s.snap) P.snap(); }
    var moved = P.step(dt);
    ctx.minutes = s.m == null ? 780 : s.m;
    ctx.rows.update(st, now, dt);
    if (bakeAt < 0 || ctx.rowsDirty || (moved && now - bakeAt > 0.12) || (!P.moving && bakeAt < readAt)) { ctx.rowsDirty = false; ctx.rows.bake(); bakeAt = now; }
    U.uPn.value = st.pn; U.uWarm.value = clamp(1 - Math.abs(t - 20) / 45, 0, 1) * 0.9;
    // clouds' shadows: by day only, drifting with the wind (the painted clouds move west to east)
    U.uCloud.value.set((1 - st.pn) * (st.wx === 'rain' || st.wx === 'fog' ? 0 : 0.85), now * 0.012, now * 0.002);
    // the fountain: runs 10:00–23:00, off in winter; every other cannon rests in early spring
    var fon = s.fount && st.season !== 'winter' ? 1 : 0;
    // the show starts cannon after cannon over a few seconds, and runs down over a few seconds when it ends
    if (fon > U.uFount.value) U.uFount.value = Math.min(fon, U.uFount.value + dt / 6); else U.uFount.value = Math.max(fon, U.uFount.value - dt / 4); if (s.snap) U.uFount.value = fon;
    // now and then the columns rise and fall in a pattern, like the real show
    var pt = now % 55; U.uPat.value = pt < 16 ? Math.sin(pt / 16 * Math.PI) : 0;
    // the underwater lights: white and pale blue, event colours on event nights
    var ev = st.event, fl = ev === 'valentine' ? [1, 0.45, 0.72] : ev === 'halloween' ? (Math.sin(now * 0.5) > 0 ? [0.42, 1, 0.5] : [0.66, 0.36, 1]) : ev === 'newyear' ? [1, 0.84, 0.4] : ev === 'perseids' ? [0.6, 0.62, 1] : [0.82 + 0.06 * Math.sin(now * 0.3), 0.92, 1];
    U.uFL.value.set(fl[0], fl[1], fl[2]);
    if (ctx.jetGlows && ctx.glowCol) { ctx.jetGlows.forEach(function (gi) { ctx.glowCol.setXYZ(gi, fl[0], fl[1], fl[2]); }); ctx.glowCol.needsUpdate = true; }
    U.uMoon.value = s.moon == null ? 0.5 : s.moon; U.uIce.value = st.event === 'christmas' ? 1 : st.season === 'winter' && (st.wx === 'frost' || st.wx === 'snow') ? 2 : 0;
    if (fountain.update) fountain.update(st, now);
    fountain.visible = U.uFount.value > 0.01; U.uHalf.value = st.season === 'spring' && st.phase === 1 ? 1 : 0;
    // the key light swings with the sun (or the moon at night)
    var sx = s.sunx != null ? s.sunx : 430, sy = s.suny != null ? s.suny : 300;
    if (st.sky !== 'day' && s.monx != null && t < -10) { sx = s.monx; sy = s.mony; }
    var el2 = clamp((900 - sy) / 700, 0.3, 0.85);
    Ldir.set(clamp((sx - 430) / 520, -0.9, 0.9) - 0.25, el2 * 1.3, 0.75).normalize();
    sun.position.copy(Ldir).multiplyScalar(1400).add(sun.target.position);
    U.uGlint.value = clamp(st.sky === 'night' ? (s.monx || 270) : sx, 120, 420);
    // wind: a breeze, more under the pointer, a gust on a click by day
    gust = Math.max(0, gust - dt / 3.2);
    var tw = gust > 0 ? 2.4 : ptr.hover ? 1.25 : 0.45; wind += (tw - wind) * Math.min(1, dt * (gust > 0 ? 3 : 1));
    U.uWind.value = wind;
    // how far the wind has carried things so far (the snow drifts by it): a stronger wind speeds the drift up from now on;
    // wind × time moved every flake at once by the change × the time since the page opened
    U.uDrift.value += wind * dt;
    // summer: a click makes the columns leap
    if (s.fw && s.fw !== lastFw) { lastFw = s.fw; if (st.season === 'summer') leap = 1; }
    leap = Math.max(0, leap - dt / 2.8); U.uLeap.value = Math.sin(Math.min(1, 1 - leap) * Math.PI) * (leap > 0 ? 1 : 0);
    if (ctx.moths) ctx.moths.uniforms.uOn.value = st.season === 'summer' && st.pn > 0.6 ? 1 : 0;
    U.uSeason.value.set(st.season === 'spring' ? 1 : 0, st.season === 'summer' ? 1 : 0, st.season === 'autumn' ? 1 : 0, st.season === 'winter' ? 5 : st.phase);
    U.uSnow.value = st.event === 'christmas' || st.wx === 'snow' ? 1 : 0; U.uRain.value = st.wx === 'rain' ? 1 : 0; U.uFrost.value = st.wx === 'frost' ? 1 : 0;
    // settling snow (slowly), fog, lightning in a storm, the heat of a summer afternoon
    var snowT = U.uSnow.value > 0.5 ? 1 : 0; U.uSnowAmt.value += (snowT - U.uSnowAmt.value) * Math.min(1, dt / (snowT ? 70 : 120)); if (s.snap) U.uSnowAmt.value = snowT;
    if (host && (fogV !== tokV || (!tokMo && now - fogAt > 2))) { fogV = tokV; fogAt = now; try { var fv = getComputedStyle(host).getPropertyValue('--c-fog').trim(); if (fv) { fogCol = new T.Color(fv); } } catch (e) {} }
    var fogT = st.wx === 'fog' ? (st.moment === 'fogroll' ? 0.7 : 1) : 0; U.uFog.value += (fogT - U.uFog.value) * Math.min(1, dt * 0.4); if (s.snap) U.uFog.value = fogT;
    if (fogCol) U.uFogC.value.set(fogCol.r, fogCol.g, fogCol.b);
    if (st.storm) { if (now > nextFlash) { flashAt = now; nextFlash = now + 5 + RW() * 7; shake = 0.45; } } else nextFlash = now + 2;
    var ft = now - flashAt; U.uFlash.value = ft < 0 ? 0 : ft < 0.07 ? 1 : ft < 0.14 ? 0.25 : ft < 0.22 ? 0.85 : Math.max(0, 0.85 - (ft - 0.22) * 3);
    shake = Math.max(0, shake - dt);
    var mm = ctx.minutes || 780, hotT = st.season === 'summer' && st.sky === 'day' && mm >= 690 && mm <= 1050 && !/rain|fog|mist|snow/.test(st.wx) ? 1 : 0; hot += (hotT - hot) * Math.min(1, dt * 0.5); if (s.snap) hot = hotT;
    weather.update(st, now, dt, gust); events.update(st, s, now, dt);
    trees.update(st); garden.update(st, now); if (ctx.lampShadows) ctx.lampShadows(); ctx.tower.update(st, now); ctx.city.invGlint(st); ctx.city.champ(st, now);
    traffic.update(st, now, glowPos); cruiser.update(now, glowPos, st); river.update(st, now, dt, glowPos); glowPos.needsUpdate = true; ctx.glowOp.needsUpdate = true;
    // camera: a slow drift and a little parallax under the pointer; the SVG layers follow at their depth
    ptr.sx += (ptr.x - ptr.sx) * Math.min(1, dt * 2.2); ptr.sy += (ptr.y - ptr.sy) * Math.min(1, dt * 2.2);
    var cx = opts.still ? 0 : ptr.sx * 2.6 + Math.sin(now * 0.07) * 0.9, cy = opts.still ? 0 : -ptr.sy * 0.9 + Math.cos(now * 0.05) * 0.3;
    if (shake > 0) { cx += (RW() - 0.5) * shake * 0.5; cy += (RW() - 0.5) * shake * 0.3; }
    camera.position.set(cx, HC + cy, ZC); camera.rotation.set(0, 0, 0); camera.updateMatrixWorld();
    // the heat shimmer's band on screen: from the near edge of the esplanade to the far kerb of the avenue
    ink.mat.uniforms.uFlash.value = U.uFlash.value;
    if (hot > 0.01) { PV.set(0, 0.1, 466).project(camera); var v0 = PV.y * 0.5 + 0.5; PV.set(0, 0.1, 436).project(camera); var v1 = PV.y * 0.5 + 0.5; ink.mat.uniforms.uShim.value.set(hot, v0, v1, now); } else ink.mat.uniforms.uShim.value.x = 0;
    if (glass) {
      if (host && (skyV !== tokV || (!tokMo && now - skyAt > 1.5))) { skyV = tokV; skyAt = now; var cs = getComputedStyle(host); skyCol = [(cs.getPropertyValue('--c-skb1') || '#9fc0e0').trim() || '#9fc0e0', (cs.getPropertyValue('--c-sks1') || '#d8e6f2').trim() || '#d8e6f2']; }
      // the rain on the glass is the WebGL pass (rain.js); the 2D glass keeps the fog, the frost, the snow, the rest
      rain.update(dt, tier < 1 ? (st.storm ? 'storm' : st.shower ? 'shower' : st.wx === 'rain' ? 'rain' : '') : '', ptr.sx, ptr.sy);
      glass.update(dt, now, st, ptr, { ev: st.event, conf: events.confetti, met: events.meteor, tint: events.burstTint, rain: false, storm: st.storm, shower: st.shower, snow: st.wx === 'snow', fog: st.wx === 'fog', frost: st.wx === 'frost', hw: st.event === 'halloween', flash: U.uFlash.value, hot: hot, sunx: s.sunx || 430, suny: s.suny || 300, sky: skyCol[0], sky2: skyCol[1], snap: s.snap });
      glass.el.style.visibility = tier < 1 ? '' : 'hidden';
    }
    netV = Math.max(netV * Math.exp(-dt * 1.5), clamp(Math.abs(cx - lastCx) / Math.max(dt, 0.001) / 3, 0, 1)); lastCx = cx;
    if (net) { var nk = (netV > 0.15 ? 'running' : 'paused') + (netV * 10 | 0); if (nk !== netKey) { netKey = nk; net.style.setProperty('--netplay', netV > 0.15 ? 'running' : 'paused'); net.style.setProperty('--netv', netV.toFixed(1)); } }
    if (vec) vec.update(now);
    if (sky) sky.update(now, camera);
    if (clouds3) clouds3.update(now);
  }

  function frame() {
    raf = 0;
    if (disposed || !visible || !onScreen) return;
    raf = requestAnimationFrame(frame);
    var n = performance.now(), dt = Math.min(0.1, (n - lastT) / 1000); lastT = n;
    var now = (n - t0) / 1000; U.uTime.value = now; U.uStep.value = Math.floor(now * 12) / 12;
    resize(); update(dt, now); sync(); gate(); project();
    paintFrame();
    // ready for the page's loading overlay: a few frames drawn and every painted layer checked and drawn once
    if (!readySent && ++readyFrames >= 4 && (!vec || vec.scanned())) { readySent = true; if (opts.onReady) setTimeout(opts.onReady, 0); }
    acc += dt; frames++; jsAcc += performance.now() - n;
    if (frames >= 40) {
      var avg = acc / frames, js = jsAcc / frames / 1000; frames = 0; acc = 0; jsAcc = 0;
      // prod: dynamic resolution. Frames late while our own work (update + draw calls) takes under 60 % of the frame:
      // the GPU is the limit, so render fewer pixels, 15 % at a time, never under 1 device pixel per CSS pixel (standard
      // screens keep full sharpness); back up once there is room again, at most every 4 s. This comes before the
      // design's own fallbacks below (dropping the ink pass, then live shadows).
      if (avg > 0.019 && js < avg * 0.6 && pr > minPR) { pr = Math.max(minPR, pr * 0.85); prAt = now; slow = 0; return; }
      if (avg < 0.0135 && pr < maxPR && now - prAt > 4) { pr = Math.min(maxPR, pr / 0.85); prAt = now; return; }
      slow = avg > 0.03 ? slow + 1 : 0;
      if (slow >= 2 && tier < 2) { tier++; slow = 0; setTier(tier); }
    }
  }
  // effect tiers for slow devices: 1 = no ink pass, fewer particles; 2 = no shadows either
  function setTier(t) {
    inkOn = opts.ink !== false && t < 1; U.uQ.value = t < 1 ? 1 : 0.5; U.uReflOn.value = t < 1 ? 1 : 0;
    // shadows stay where they are instead of switching off: turning shadowMap off changes every program and recompiles them all
    renderer.shadowMap.autoUpdate = t < 2; if (t >= 2) renderer.shadowMap.needsUpdate = true;
  }
  function start() { if (opts.manual) return; if (!raf && !disposed && visible && onScreen) { lastT = performance.now(); raf = requestAnimationFrame(frame); } }
  function onVis() { visible = !document.hidden; start(); }
  document.addEventListener('visibilitychange', onVis);
  var io = window.IntersectionObserver ? new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; start(); }) : null;
  if (io) io.observe(canvas);
  var readySent = false, readyFrames = 0;
  // compile the scene's shaders without blocking, then the first frame (the shadow pass compiles there)
  renderer.debug.checkShaderErrors = false;
  resize(); update(0, 0); project();
  // Chrome runs WebGL commands in order in the GPU process: any question about a program (its uniforms, its link status)
  // blocks the page until every program queued before it has compiled. So queue at once the programs today's first frame
  // draws (gate(), into the ink pass's target, which the reflections share since they clip with their camera) and the ink
  // quad's, then poll the non-blocking "ready?" flag (KHR_parallel_shader_compile) until all are done.
  sync(); gate(0); renderer.compile(ink.quad, camera); renderer.compile(ink.aa, camera); if (vec) { renderer.compile(vec.skyScene, camera); renderer.compile(vec.frontScene, camera); }
  var all = todo.length + pending.length;
  await new Promise(function (ok) {
    (function poll() {
      compileSome(30); settle(); var q = renderer.properties.get(ink.quad.children[0].material).currentProgram, left = todo.length + pending.length;
      progress(0.6 + 0.3 * (1 - left / Math.max(1, all)));
      if (disposed || (!left && q && q.isReady())) ok(); else setTimeout(poll, todo.length ? 0 : 50);
    })();
  });
  await step(0.9);
  if (disposed) return null;
  sync(); paintFrame(); await step(1);
  start();
  return {
    renderer: renderer, scene: scene, camera: camera, U: U, ctx: ctx, whenReady: whenReady, setTier: function (t) { tier = t; setTier(t); },
    // the wipe button (home.js): the rain and the mist swept off the glass
    wipe: function () { rain.wipe(); if (glass) glass.wipe(); },
    poke: function (info) { info = info || {}; if (info.day) gust = 1; if (glass) glass.poke(st.season, !!info.day); },
    step: function (dt) { var now = U.uTime.value + dt; U.uTime.value = now; U.uStep.value = Math.floor(now * 12) / 12; update(dt, now); },
    renderOnce: function (dt) { var now = U.uTime.value + (dt || 0); U.uTime.value = now; U.uStep.value = Math.floor(now * 12) / 12; resize(); update(dt || 0.016, now); sync(); gate(); project(); if (window.__dbgCam) window.__dbgCam(camera, T); paintFrame(); },
    dispose: function () {
      disposed = true; if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis); if (io) io.disconnect(); if (ro) ro.disconnect(); if (tokMo) tokMo.disconnect();
      if (aside) { aside.removeEventListener('pointermove', onMove); aside.removeEventListener('pointerleave', onLeave); aside.removeEventListener('pointercancel', onLeave); }
      if (vec) vec.dispose();
      scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); }); } });
      refl.dispose(); rain.dispose(); if (glass) glass.dispose(); renderer.dispose();
    }
  };
}

