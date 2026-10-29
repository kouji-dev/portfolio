import * as T from 'three';
// ---------------------------------------------------------------- rain on the glass
// After Lucas Bebber's "Rain & Water Effect Experiments" (Codrops, 2015: github.com/codrops/RainEffect, free to integrate
// and build upon; the two drop sprites below are theirs). The drops live in a 2D "water map": each one is stamped from a
// sprite whose colours give the way light bends through it (red, green) and its thickness (blue), its alpha the shape.
// One shader then shows the scene through them: through each drop the frame is bent (a lens: upside down, sharp), around
// them the scene behind the glass is out of focus. Big drops creep down in fits and starts, join, and leave trails of small
// drops; a field of fine droplets covers the glass and is wiped where the drops slide.
var DROP_ALPHA = 'data:image/png;base64,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';
var DROP_COLOR = 'data:image/png;base64,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';
function rnd(from, to, f) { if (from == null) { from = 0; to = 1; } else if (to == null) { to = from; from = 0; } return from + (f ? f(Math.random()) : Math.random()) * (to - from); }
function chance(c) { return Math.random() <= c; }
function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// the demo's rain and storm settings (sizes in CSS pixels; they are scaled to the panel, the demo was full-screen)
var RAIN = { minR: 20, maxR: 50, rainChance: 0.35, rainLimit: 6, dropletsRate: 50, dropletsSize: [3, 5.5], trailRate: 1, trailScaleRange: [0.25, 0.35],
  collisionRadius: 0.45, collisionRadiusIncrease: 0.0002, dropletsCleaningRadiusMultiplier: 0.28, autoShrink: true, spawnArea: [-0.1, 0.95],
  dropFallMultiplier: 1, collisionBoostMultiplier: 0.05, collisionBoost: 1, maxDrops: 900 };
var STORM = { maxR: 55, rainChance: 0.4, dropletsRate: 80, trailRate: 2.5, trailScaleRange: [0.25, 0.4] };
var SHOWER = { rainChance: 0.15, rainLimit: 2, dropletsRate: 10, dropletsSize: [3.5, 6] };   // the demo's drizzle

// the drops' simulation (raindrops.js), drawn into the water map
function Drops(width, height, scale, k, alpha, color) {
  var o = {}, drops = [], gfx = [], dropletsCounter = 0, cleaning = 0;
  var cv = canvas(width, height), ctx = cv.getContext('2d'), droplets = canvas(width, height), dctx = droplets.getContext('2d');
  var areaMultiplier = Math.sqrt(width * height / scale / (1024 * 768));
  function opt(base) { o = Object.assign({}, RAIN, base || {}); o.minR *= k; o.maxR *= k; o.deltaR = o.maxR - o.minR; }
  opt();
  // the sprites: 128 depths of the drop (its colour with a blue "thickness"), cut to the drop's shape
  (function () {
    var S = 64, buf = canvas(S, S), b = buf.getContext('2d');
    for (var i = 0; i < 128; i++) {
      var dc = canvas(S, S), d = dc.getContext('2d');
      b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, S, S); b.drawImage(color, 0, 0, S, S);
      b.globalCompositeOperation = 'screen'; b.fillStyle = 'rgba(0,0,' + (i * 2) + ',1)'; b.fillRect(0, 0, S, S);
      d.globalCompositeOperation = 'source-over'; d.drawImage(alpha, 0, 0, S, S); d.globalCompositeOperation = 'source-in'; d.drawImage(buf, 0, 0, S, S);
      gfx.push(dc);
    }
  })();
  var brush = canvas(128, 128), bc = brush.getContext('2d'); bc.fillStyle = '#000'; bc.beginPath(); bc.arc(64, 64, 64, 0, Math.PI * 2); bc.fill();
  function drawDrop(c, dr) {
    var sx = 1, sy = 1.5, dd = Math.max(0, Math.min(1, ((dr.r - o.minR) / o.deltaR) * 0.9)); dd *= 1 / (((dr.spreadX + dr.spreadY) * 0.5) + 1);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.drawImage(gfx[Math.floor(dd * (gfx.length - 1))], (dr.x - dr.r * sx * (dr.spreadX + 1)) * scale, (dr.y - dr.r * sy * (dr.spreadY + 1)) * scale,
      dr.r * 2 * sx * (dr.spreadX + 1) * scale, dr.r * 2 * sy * (dr.spreadY + 1) * scale);
  }
  function drop(p) { return Object.assign({ x: 0, y: 0, r: 0, spreadX: 0, spreadY: 0, momentum: 0, momentumX: 0, lastSpawn: 0, nextSpawn: 0, parent: null, isNew: true, killed: false, shrink: 0 }, p); }
  function full() { return drops.length >= o.maxDrops * areaMultiplier; }
  function droplet() { return drop({ x: rnd(width / scale), y: rnd(height / scale), r: rnd(o.dropletsSize[0], o.dropletsSize[1], function (n) { return n * n; }) }); }
  function updateDroplets(ts) {
    if (cleaning > 0) { cleaning -= ts; dctx.globalCompositeOperation = 'destination-out'; dctx.fillStyle = 'rgba(0,0,0,' + (0.05 * ts) + ')'; dctx.fillRect(0, 0, width, height); }
    if (o.raining) { dropletsCounter += o.dropletsRate * ts * areaMultiplier; while (dropletsCounter >= 1) { dropletsCounter--; drawDrop(dctx, droplet()); } }
    ctx.drawImage(droplets, 0, 0, width, height);
  }
  function updateRain(ts) {
    var out = []; if (!o.raining) return out;
    var limit = o.rainLimit * ts * areaMultiplier, count = 0;
    while (chance(o.rainChance * ts * areaMultiplier) && count < limit) {
      count++; var r = rnd(o.minR, o.maxR, function (n) { return Math.pow(n, 3); });
      if (!full()) out.push(drop({ x: rnd(width / scale), y: rnd(height / scale * o.spawnArea[0], height / scale * o.spawnArea[1]), r: r, momentum: 1 + (r - o.minR) * 0.1 + rnd(2), spreadX: 1.5, spreadY: 1.5 }));
    }
    return out;
  }
  function update(ts) {
    ctx.clearRect(0, 0, width, height);
    var next = []; updateDroplets(ts); next = next.concat(updateRain(ts));
    drops.sort(function (a, b) { var va = a.y * (width / scale) + a.x, vb = b.y * (width / scale) + b.x; return va > vb ? 1 : va === vb ? 0 : -1; });
    drops.forEach(function (d, i) {
      if (d.killed) return;
      // gravity: the bigger, the likelier it creeps down
      if (chance((d.r - o.minR * o.dropFallMultiplier) * (0.1 / o.deltaR) * ts)) d.momentum += rnd((d.r / o.maxR) * 4);
      if (o.autoShrink && d.r <= o.minR && chance(0.05 * ts)) d.shrink += 0.01;
      d.r -= d.shrink * ts; if (d.r <= 0) d.killed = true;
      // trails: a running drop leaves smaller drops behind and loses a little water
      if (o.raining) {
        d.lastSpawn += d.momentum * ts * o.trailRate;
        if (d.lastSpawn > d.nextSpawn && !full()) {
          next.push(drop({ x: d.x + rnd(-d.r, d.r) * 0.1, y: d.y - d.r * 0.01, r: d.r * rnd(o.trailScaleRange[0], o.trailScaleRange[1]), spreadY: d.momentum * 0.1, parent: d }));
          d.r *= Math.pow(0.97, ts); d.lastSpawn = 0; d.nextSpawn = rnd(o.minR, o.maxR) - d.momentum * 2 * o.trailRate + (o.maxR - d.r);
        }
      }
      d.spreadX *= Math.pow(0.4, ts); d.spreadY *= Math.pow(0.7, ts);
      var moved = d.momentum > 0;
      if (moved && !d.killed) { d.y += d.momentum; d.x += d.momentumX; if (d.y > height / scale + d.r) d.killed = true; }
      // collisions: the bigger one takes the other's water and speeds up
      if ((moved || d.isNew) && !d.killed) {
        drops.slice(i + 1, i + 70).forEach(function (d2) {
          if (d === d2 || d.r <= d2.r || d.parent === d2 || d2.parent === d || d2.killed) return;
          var dx = d2.x - d.x, dy = d2.y - d.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < (d.r + d2.r) * (o.collisionRadius + d.momentum * o.collisionRadiusIncrease * ts)) {
            var tr = Math.sqrt((Math.PI * d.r * d.r + Math.PI * d2.r * d2.r * 0.8) / Math.PI);
            d.r = tr; d.momentumX += dx * 0.1; d.spreadX = 0; d.spreadY = 0; d2.killed = true;
            d.momentum = Math.max(d2.momentum, Math.min(40, d.momentum + tr * o.collisionBoostMultiplier + o.collisionBoost));
          }
        });
      }
      d.isNew = false;
      d.momentum -= Math.max(1, o.minR * 0.5 - d.momentum) * 0.1 * ts; if (d.momentum < 0) d.momentum = 0;
      d.momentumX *= Math.pow(0.7, ts);
      if (!d.killed) {
        next.push(d);
        // a sliding drop wipes the fine droplets on its way
        if (moved && o.dropletsRate > 0) { var cr = d.r * o.dropletsCleaningRadiusMultiplier; dctx.globalCompositeOperation = 'destination-out'; dctx.drawImage(brush, (d.x - cr) * scale, (d.y - cr) * scale, cr * 2 * scale, cr * 2 * scale * 1.5); }
        drawDrop(ctx, d);
      }
    });
    drops = next;
  }
  return {
    canvas: cv, update: update,
    // weather: the demo's settings for rain, a storm, a shower (its drizzle); off: the drops shrink away and the glass dries
    set: function (w) {
      var was = o.raining; opt(w === 'storm' ? STORM : w === 'shower' ? SHOWER : null); o.raining = !!w;
      if (was && !w) { drops.forEach(function (d) { setTimeout(function () { d.shrink = 0.1 + rnd(0.5); }, rnd(1200)); }); cleaning = 50; }
    },
    // droplets at once (a page that opens on rain shouldn't show a dry pane)
    wet: function (n) { for (var i = 0; i < n; i++) drawDrop(dctx, droplet()); },
    // the wipe's edge has reached fx (0..1 of the width): what is left of it is gone
    wipeTo: function (fx) { var x = fx * width; drops.forEach(function (d) { if (d.x * scale < x) d.killed = true; }); drops = drops.filter(function (d) { return !d.killed; }); dctx.clearRect(0, 0, x, height); },
    busy: function () { return o.raining || drops.length > 0 || cleaning > 0; }
  };
}

export function Rain(renderer) {
  var alpha = new Image(), color = new Image(), loaded = 0, sim = null, W = 0, H = 0, pr = 1, cssW = 518, weather = '', wetness = 0, wipeT = 1;
  alpha.onload = color.onload = function () { loaded++; }; alpha.src = DROP_ALPHA; color.src = DROP_COLOR;
  // while it rains the frame is drawn into rtF instead of the canvas; two smaller copies make the scene behind out of focus
  var rtF = new T.WebGLRenderTarget(4, 4), rtQ = new T.WebGLRenderTarget(4, 4), rtE = new T.WebGLRenderTarget(4, 4);
  [rtF, rtQ, rtE].forEach(function (r) { r.texture.generateMipmaps = false; });
  var water = new T.CanvasTexture(canvas(4, 4)); water.generateMipmaps = false; water.minFilter = water.magFilter = T.LinearFilter;
  var cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), geo = new T.PlaneGeometry(2, 2), vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  function pass(fs, u) { var m = new T.ShaderMaterial({ uniforms: u, vertexShader: vs, fragmentShader: fs, depthTest: false, depthWrite: false, transparent: false, blending: T.NoBlending }); var q = new T.Mesh(geo, m); q.frustumCulled = false; var s = new T.Scene(); s.add(q); return { scene: s, mat: m }; }
  // a 4-tap box at offsets of one source texel: a smoothed copy at a quarter, then an eighth of the size
  var down = pass('uniform sampler2D tS; uniform vec2 uT; varying vec2 vUv; void main(){ gl_FragColor = .25 * (texture2D(tS, vUv - uT) + texture2D(tS, vUv + vec2(uT.x, -uT.y)) + texture2D(tS, vUv + vec2(-uT.x, uT.y)) + texture2D(tS, vUv + uT)); }',
    { tS: { value: null }, uT: { value: new T.Vector2() } });
  // the water pass (water.frag). As in the demo, what a drop shows is a small soft copy of the scene (an eighth of the size:
  // drops are tiny lenses, and sharp pixels from far away would only speckle) and the scene behind is out of focus (a
  // quarter of the size, softened). The map is y down (a canvas), the screen y up: the refraction's y is flipped. Colours
  // stay as the ink pass wrote them (sRGB, premultiplied)
  var wp = pass('uniform sampler2D uWater, uFg, uBg, uSharp; uniform vec2 uRes, uParallax, uBgT, uRefr; uniform float uBlur, uClear; varying vec2 vUv;\n' +
    'const float PFG = 20., PBG = 5., BRIGHT = 1.04, AMUL = 6., ASUB = 3.;\n' +
    'void main(){ vec2 px = 1. / uRes; vec2 sc = (uRes + PFG * 2.) / uRes;\n' +
    ' vec4 cur = texture2D(uWater, vUv / sc + (1. - 1. / sc) / 2. + uParallax * px * PFG);\n' +
    ' float d = cur.b, a = clamp(cur.a * AMUL - ASUB, 0., 1.);\n' +
    ' vec2 refr = (vec2(cur.g, cur.r) - .5) * 2.; refr.y = -refr.y;\n' +
    ' vec4 fg = texture2D(uFg, vUv + px * refr * (uRefr.x + d * uRefr.y) + uParallax * px * (PBG - PFG)); fg.rgb *= BRIGHT;\n' +
    ' vec2 bu = vUv + uParallax * px * PBG, o = uBgT;\n' +
    ' vec4 bl = (2. * texture2D(uBg, bu) + texture2D(uBg, bu + o) + texture2D(uBg, bu - o) + texture2D(uBg, bu + vec2(o.x, -o.y)) + texture2D(uBg, bu + vec2(-o.x, o.y))) / 6.;\n' +
    ' vec4 bg = mix(texture2D(uSharp, vUv), bl, uBlur * step(uClear, vUv.x));\n' +
    ' gl_FragColor = mix(bg, fg, a); }',
    { uWater: { value: water }, uFg: { value: rtE.texture }, uBg: { value: rtQ.texture }, uSharp: { value: rtF.texture }, uRes: { value: new T.Vector2(1, 1) }, uParallax: { value: new T.Vector2() },
      uBgT: { value: new T.Vector2() }, uRefr: { value: new T.Vector2(256, 256) }, uBlur: { value: 0 }, uClear: { value: 0 } });
  function build() {
    if (loaded < 2 || !W) return;
    // sizes and refraction distances scaled to the panel (the demo filled a ~1440 px wide screen)
    var k = Math.min(1, Math.max(0.45, cssW / 900));
    sim = Drops(W, H, pr, k, alpha, color); water.image = sim.canvas; water.needsUpdate = true;
    wp.mat.uniforms.uRefr.value.set(256 * k * pr, 256 * k * pr);
    if (weather) { sim.set(weather); sim.wet(Math.round(W * H / (pr * pr) / 900)); }
  }
  return {
    target: rtF,
    setSize: function (w, h, ratio, cssWidth) {
      if (w === W && h === H) return; W = w; H = h; pr = ratio || 1; cssW = cssWidth || w / pr;
      rtF.setSize(w, h); rtQ.setSize(Math.max(1, w >> 2), Math.max(1, h >> 2)); rtE.setSize(Math.max(1, w >> 3), Math.max(1, h >> 3));
      wp.mat.uniforms.uRes.value.set(w, h); wp.mat.uniforms.uBgT.value.set(1 / Math.max(1, w >> 2), 1 / Math.max(1, h >> 2)); sim = null;
    },
    // w: '' | 'rain' | 'storm' | 'shower'; px, py: the pointer (-1..1), for the parallax
    update: function (dt, w, px, py) {
      if (!sim) build();
      if (w !== weather) { weather = w; if (sim) sim.set(w); }
      // the film of water that blurs the view builds up over ~10 s of rain (again after a wipe), and dries when it stops
      wetness += ((w ? 1 : 0) - wetness) * Math.min(1, dt * (w ? 0.1 : 0.4));
      // a wipe: the edge sweeps left to right in 0.7 s; behind it the pane is clear (the blur comes back with the rain)
      if (wipeT < 1) {
        wipeT = Math.min(1, wipeT + dt / 0.7); var e = 1 - Math.pow(1 - wipeT, 3);
        if (sim) sim.wipeTo(e); wp.mat.uniforms.uClear.value = e;
        if (wipeT >= 1) { wetness = 0; wp.mat.uniforms.uClear.value = 0; }
      }
      if (!this.active()) return;
      sim.update(Math.min(1.1, dt * 60)); water.needsUpdate = true;
      wp.mat.uniforms.uParallax.value.set(px || 0, -(py || 0));
      wp.mat.uniforms.uBlur.value = 0.85 * wetness;
    },
    active: function () { return !!sim && (sim.busy() || wetness > 0.02); },
    wipe: function () { wipeT = 0; },
    // the frame (in target) through the wet glass, onto the canvas
    render: function () {
      down.mat.uniforms.tS.value = rtF.texture; down.mat.uniforms.uT.value.set(1 / W, 1 / H); renderer.setRenderTarget(rtQ); renderer.render(down.scene, cam);
      down.mat.uniforms.tS.value = rtQ.texture; down.mat.uniforms.uT.value.set(0.5 / rtQ.width, 0.5 / rtQ.height); renderer.setRenderTarget(rtE); renderer.render(down.scene, cam);
      renderer.setRenderTarget(null); renderer.render(wp.scene, cam);
    },
    dispose: function () { rtF.dispose(); rtQ.dispose(); rtE.dispose(); water.dispose(); down.mat.dispose(); wp.mat.dispose(); }
  };
}
