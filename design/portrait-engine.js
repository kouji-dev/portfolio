/* PortraitEngine — renders a photo as relief / particles / halftone / ascii /
   duotone / wireframe, plus a drawn low-poly mascot. Canvas 2D + a tiny
   software rasterizer with a z-buffer (no WebGL, no deps). */
(function () {
  'use strict';
  var ASCII = ' .:-=+*#%@';

  function hexRgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function PortraitEngine(canvas, opts) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.o = Object.assign({
      src: 'uploads/e2.jpg',
      mode: 'relief',
      accent: '#60a5fa',
      crop: [0.05, 0.0, 0.90, 0.84],
      bgFloor: 0.42,
      bgTol: 0.075,
      depth: 0.62,
      grid: 84,
      autorotate: true,
      pointer: true
    }, opts || {});
    this.mx = 0; this.my = 0; this.tx = 0; this.ty = 0;
    this.hover = 0; this.thover = 0;
    this.blink = 0; this.nextBlink = performance.now() + 1800;
    this.ready = false; this.dead = false;
    this.ramp = new Uint8Array(768);
    window.__portrait = this;
    this._ramp();
    this._bind();
    this._load();
  }

  PortraitEngine.prototype._ramp = function () {
    var a = hexRgb(this.o.accent);
    var c0 = [3, 5, 11], c1 = [a[0] * 0.42, a[1] * 0.46, a[2] * 0.62],
      c2 = a, c3 = [236, 244, 255];
    for (var i = 0; i < 256; i++) {
      var t = i / 255, c;
      if (t < 0.34) c = mix(c0, c1, t / 0.34);
      else if (t < 0.72) c = mix(c1, c2, (t - 0.34) / 0.38);
      else c = mix(c2, c3, (t - 0.72) / 0.28);
      this.ramp[i * 3] = c[0] | 0; this.ramp[i * 3 + 1] = c[1] | 0; this.ramp[i * 3 + 2] = c[2] | 0;
    }
  };

  PortraitEngine.prototype._bind = function () {
    var self = this;
    this._onMove = function (e) {
      if (!self.o.pointer) return;
      self.tx = (e.clientX / window.innerWidth) * 2 - 1;
      self.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    this._onEnter = function () { self.thover = 1; };
    this._onLeave = function () { self.thover = 0; };
    window.addEventListener('pointermove', this._onMove, { passive: true });
    this.cv.addEventListener('pointerenter', this._onEnter);
    this.cv.addEventListener('pointerleave', this._onLeave);
  };

  PortraitEngine.prototype._load = function () {
    var self = this, img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () { self.img = img; self._sample(); self.ready = true; self._start(); };
    img.onerror = function () { self.failed = true; self._start(); };
    img.src = this.o.src;
  };

  PortraitEngine.prototype._sample = function () {
    var img = this.img, cr = this.o.crop, gw = this.o.grid;
    var sw = img.width * cr[2], sh = img.height * cr[3];
    var gh = Math.round(gw * (sh / sw));
    var oc = document.createElement('canvas');
    oc.width = gw; oc.height = gh;
    var octx = oc.getContext('2d', { willReadFrequently: true });
    octx.drawImage(img, img.width * cr[0], img.height * cr[1], sw, sh, 0, 0, gw, gh);
    var d = octx.getImageData(0, 0, gw, gh).data;
    var n = gw * gh;
    var lum = new Float32Array(n), rnd = new Float32Array(n * 4);
    for (var i = 0; i < n; i++) {
      lum[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) / 255;
      rnd[i * 4] = Math.random() * 2 - 1; rnd[i * 4 + 1] = Math.random() * 2 - 1;
      rnd[i * 4 + 2] = Math.random() * 2 - 1; rnd[i * 4 + 3] = Math.random() * 6.283;
    }
    // background = flood fill inward from the border across smooth, light pixels
    var bg = new Uint8Array(n), q = new Int32Array(n), head = 0, tail = 0;
    var floor = this.o.bgFloor, tol = this.o.bgTol;
    function seed(k) { if (!bg[k] && lum[k] > floor) { bg[k] = 1; q[tail++] = k; } }
    for (var x0 = 0; x0 < gw; x0++) { seed(x0); seed((gh - 1) * gw + x0); }
    for (var y0 = 0; y0 < gh; y0++) { seed(y0 * gw); seed(y0 * gw + gw - 1); }
    while (head < tail) {
      var k0 = q[head++], kx = k0 % gw, ky = (k0 / gw) | 0, L0 = lum[k0];
      for (var e = 0; e < 4; e++) {
        var nx = kx + (e === 0 ? -1 : e === 1 ? 1 : 0), ny = ky + (e === 2 ? -1 : e === 3 ? 1 : 0);
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        var nk = ny * gw + nx;
        if (bg[nk] || lum[nk] < floor) continue;
        if (Math.abs(lum[nk] - L0) > tol) continue;
        bg[nk] = 1; q[tail++] = nk;
      }
    }
    var alive = new Uint8Array(n);
    for (var a0 = 0; a0 < n; a0++) alive[a0] = bg[a0] ? 0 : 1;
    // erode one cell so the silhouette edge stays clean
    var alive2 = alive.slice();
    for (var y = 0; y < gh; y++) for (var x = 0; x < gw; x++) {
      var k = y * gw + x;
      if (!alive[k]) continue;
      var c = (x > 0 ? alive[k - 1] : 0) + (x < gw - 1 ? alive[k + 1] : 0) +
        (y > 0 ? alive[k - gw] : 0) + (y < gh - 1 ? alive[k + gw] : 0);
      if (c < 3) alive2[k] = 0;
    }
    this.mask = alive2;
    // fake normals from the luminance gradient
    var shade = new Float32Array(n);
    for (var y2 = 0; y2 < gh; y2++) for (var x2 = 0; x2 < gw; x2++) {
      var k2 = y2 * gw + x2;
      var xl = x2 > 0 ? lum[k2 - 1] : lum[k2], xr = x2 < gw - 1 ? lum[k2 + 1] : lum[k2];
      var yu = y2 > 0 ? lum[k2 - gw] : lum[k2], yd = y2 < gh - 1 ? lum[k2 + gw] : lum[k2];
      shade[k2] = clamp(0.86 + (xl - xr) * 1.5 + (yu - yd) * 1.1, 0.4, 1.6);
    }
    this.gw = gw; this.gh = gh; this.lum = lum; this.alive = alive2; this.shade = shade; this.rnd = rnd;
    this._duotone();
  };

  PortraitEngine.prototype._duotone = function () {
    if (!this.img) return;
    var img = this.img, cr = this.o.crop, W = 340;
    var sw = img.width * cr[2], sh = img.height * cr[3];
    var H = Math.round(W * (sh / sw));
    var oc = document.createElement('canvas'); oc.width = W; oc.height = H;
    var c = oc.getContext('2d', { willReadFrequently: true });
    c.drawImage(img, img.width * cr[0], img.height * cr[1], sw, sh, 0, 0, W, H);
    var id = c.getImageData(0, 0, W, H), d = id.data, r = this.ramp;
    var gw = this.gw, gh = this.gh, mask = this.mask;
    for (var i = 0; i < d.length; i += 4) {
      var p = i >> 2, px = p % W, py = (p / W) | 0;
      var l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
      var q = (l * 255) | 0;
      d[i] = r[q * 3]; d[i + 1] = r[q * 3 + 1]; d[i + 2] = r[q * 3 + 2];
      var a = 255;
      if (mask) {
        var gx = Math.min(gw - 1, (px / W * gw) | 0), gy = Math.min(gh - 1, (py / H * gh) | 0);
        var s = 0, cnt = 0;
        for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
          var mx2 = gx + ox, my2 = gy + oy;
          if (mx2 < 0 || my2 < 0 || mx2 >= gw || my2 >= gh) continue;
          s += mask[my2 * gw + mx2]; cnt++;
        }
        a = Math.round(255 * clamp((s / cnt) * 1.45 - 0.2, 0, 1));
      }
      d[i + 3] = a;
    }
    c.putImageData(id, 0, 0);
    this.duo = oc;
  };

  PortraitEngine.prototype._buf = function () {
    var w = this.cv.width, h = this.cv.height;
    if (!this.imgData || this.bw !== w || this.bh !== h) {
      this.imgData = this.ctx.createImageData(w, h);
      this.buf = new Uint32Array(this.imgData.data.buffer);
      this.zb = new Float32Array(w * h);
      this.bw = w; this.bh = h;
    }
    this.buf.fill(0);
    this.zb.fill(-1e9);
  };

  PortraitEngine.prototype._splat = function (x, y, z, col, s) {
    var w = this.bw, h = this.bh, buf = this.buf, zb = this.zb;
    var x0 = x | 0, y0 = y | 0, x1 = (x + s) | 0, y1 = (y + s) | 0;
    if (x1 < 0 || y1 < 0 || x0 >= w || y0 >= h) return;
    if (x0 < 0) x0 = 0; if (y0 < 0) y0 = 0;
    if (x1 >= w) x1 = w - 1; if (y1 >= h) y1 = h - 1;
    for (var py = y0; py <= y1; py++) {
      var row = py * w;
      for (var px = x0; px <= x1; px++) {
        var k = row + px;
        if (z > zb[k]) { zb[k] = z; buf[k] = col; }
      }
    }
  };

  PortraitEngine.prototype.resize = function () {
    var r = this.cv.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
  };

  PortraitEngine.prototype._start = function () {
    var self = this;
    var loop = function (t) {
      if (self.dead) return;
      self.raf = requestAnimationFrame(loop);
      self.resize();
      self.mx += (self.tx - self.mx) * 0.07;
      self.my += (self.ty - self.my) * 0.07;
      self.hover += (self.thover - self.hover) * 0.09;
      self.draw(t);
    };
    this.raf = requestAnimationFrame(loop);
  };

  PortraitEngine.prototype.draw = function (t) {
    var ctx = this.ctx, w = this.cv.width, h = this.cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var m = this.o.mode;
    if (m === 'mascot') return this._mascot(t, w, h);
    if (!this.ready) return;
    if (m === 'relief' || m === 'particles') this._points(t, w, h, m === 'particles');
    else if (m === 'halftone') this._halftone(t, w, h);
    else if (m === 'ascii') this._ascii(t, w, h);
    else if (m === 'duotone') this._flat(t, w, h);
    else if (m === 'wireframe') this._wire(t, w, h);
    else this._points(t, w, h, false);
  };

  /* ---------- relief + particle field ---------- */
  PortraitEngine.prototype._points = function (t, w, h, scatter) {
    this._buf();
    var gw = this.gw, gh = this.gh, lum = this.lum, alive = this.alive, sh = this.shade,
      rnd = this.rnd, ramp = this.ramp, auto = this.o.autorotate;
    var yaw = this.mx * 0.62 + (auto ? Math.sin(t * 0.00035) * 0.3 : 0);
    var pit = -this.my * 0.34 + (auto ? Math.sin(t * 0.00047) * 0.06 : 0);
    var cy0 = Math.cos(yaw), sy0 = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit);
    var ar = gh / gw;
    var S = Math.min(w * 0.98, h * 0.98 / ar);
    var cx = w / 2, cy = h / 2, f = 2.7, depth = this.o.depth;
    var cell = Math.max(1, S / gw);
    var spread = scatter ? (1 - this.hover) * 0.55 : 0;
    var psize = scatter ? Math.max(1, cell * 0.85) : cell * 1.25;
    for (var j = 0; j < gh; j++) {
      for (var i = 0; i < gw; i++) {
        var k = j * gw + i;
        if (!alive[k]) continue;
        var L = lum[k];
        var x = (i / gw - 0.5), y = (j / gh - 0.5) * ar, z = (L - 0.42) * depth;
        if (spread > 0) {
          var ph = rnd[k * 4 + 3];
          x += rnd[k * 4] * spread * 0.55 + Math.sin(t * 0.0009 + ph) * 0.012 * spread * 40 / 40;
          y += rnd[k * 4 + 1] * spread * 0.6;
          z += rnd[k * 4 + 2] * spread * 0.5;
        }
        var x1 = x * cy0 + z * sy0, z1 = -x * sy0 + z * cy0;
        var y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        var s = f / (f - z2);
        var sx = cx + x1 * s * S, sy2 = cy + y1 * s * S;
        var q = clamp(L * (scatter ? 1 : sh[k]) * (0.82 + z2 * 0.5), 0, 1) * 255 | 0;
        var col = (255 << 24) | (ramp[q * 3 + 2] << 16) | (ramp[q * 3 + 1] << 8) | ramp[q * 3];
        this._splat(sx, sy2, z2, col, psize * s);
      }
    }
    this.ctx.putImageData(this.imgData, 0, 0);
  };

  /* ---------- halftone ---------- */
  PortraitEngine.prototype._halftone = function (t, w, h) {
    var ctx = this.ctx, gw = this.gw, gh = this.gh, step = 2;
    var ar = gh / gw, S = Math.min(w * 0.96, h * 0.96 / ar);
    var cell = S / gw * step, ox = (w - S) / 2, oy = (h - S * ar) / 2;
    var a = hexRgb(this.o.accent);
    for (var j = 0; j < gh; j += step) {
      for (var i = 0; i < gw; i += step) {
        var k = j * gw + i;
        if (!this.alive[k]) continue;
        var L = this.lum[k];
        var r = (1 - L) * cell * 0.78;
        if (r < 0.25) continue;
        var px = ox + i / gw * S + Math.sin(t * 0.0012 + j * 0.2) * this.mx * cell * 0.5;
        var py = oy + j / gw * S;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, 6.2832);
        ctx.fillStyle = 'rgba(' + ((a[0] * (0.5 + L * 0.8)) | 0) + ',' + ((a[1] * (0.5 + L * 0.8)) | 0) + ',' + ((a[2] * (0.55 + L * 0.7)) | 0) + ',' + (0.35 + L * 0.65) + ')';
        ctx.fill();
      }
    }
  };

  /* ---------- ascii ---------- */
  PortraitEngine.prototype._ascii = function (t, w, h) {
    var ctx = this.ctx, gw = this.gw, gh = this.gh, step = 2;
    var ar = gh / gw, S = Math.min(w * 0.96, h * 0.96 / ar);
    var cw = S / gw * step, ox = (w - S) / 2, oy = (h - S * ar) / 2;
    ctx.font = (cw * 1.5).toFixed(1) + 'px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    var ramp = this.ramp;
    for (var j = 0; j < gh; j += step) {
      for (var i = 0; i < gw; i += step) {
        var k = j * gw + i;
        if (!this.alive[k]) continue;
        var L = clamp(this.lum[k] * 1.12, 0, 1);
        var ch = ASCII[Math.min(ASCII.length - 1, (L * ASCII.length) | 0)];
        if (ch === ' ') continue;
        var q = (L * 255) | 0;
        ctx.fillStyle = 'rgb(' + ramp[q * 3] + ',' + ramp[q * 3 + 1] + ',' + ramp[q * 3 + 2] + ')';
        ctx.fillText(ch, ox + i / gw * S + cw / 2, oy + j / gw * S + cw / 2);
      }
    }
  };

  /* ---------- flat duotone ---------- */
  PortraitEngine.prototype._flat = function (t, w, h) {
    if (!this.duo) return;
    var ctx = this.ctx, ar = this.duo.height / this.duo.width;
    var W = Math.min(w * 0.94, h * 0.94 / ar), H = W * ar;
    ctx.drawImage(this.duo, (w - W) / 2 + this.mx * w * 0.02, (h - H) / 2 + this.my * h * 0.015, W, H);
  };

  /* ---------- wireframe mesh over the photo ---------- */
  PortraitEngine.prototype._wire = function (t, w, h) {
    var ctx = this.ctx;
    if (this.duo) {
      ctx.globalAlpha = 0.3;
      this._flat(t, w, h);
      ctx.globalAlpha = 1;
    }
    var gw = this.gw, gh = this.gh, lum = this.lum, alive = this.alive, step = 4;
    var yaw = this.mx * 0.45 + Math.sin(t * 0.00035) * 0.16, pit = -this.my * 0.24;
    var cyv = Math.cos(yaw), syv = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit);
    var ar = gh / gw, S = Math.min(w * 0.94, h * 0.94 / ar), cx = w / 2, cy = h / 2, f = 2.7;
    var a = hexRgb(this.o.accent);
    ctx.lineWidth = Math.max(0.6, S / 500);
    ctx.strokeStyle = 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',0.5)';
    var self = this;
    function pt(i, j) {
      var k = j * gw + i;
      var x = (i / gw - 0.5), y = (j / gh - 0.5) * ar, z = (lum[k] - 0.42) * self.o.depth;
      var x1 = x * cyv + z * syv, z1 = -x * syv + z * cyv;
      var y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      var s = f / (f - z2);
      return [cx + x1 * s * S, cy + y1 * s * S, alive[k]];
    }
    for (var j2 = 0; j2 < gh; j2 += step) {
      ctx.beginPath(); var open = false;
      for (var i2 = 0; i2 < gw; i2 += step) {
        var p = pt(i2, j2);
        if (!p[2]) { open = false; continue; }
        if (!open) { ctx.moveTo(p[0], p[1]); open = true; } else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    }
    for (var i3 = 0; i3 < gw; i3 += step) {
      ctx.beginPath(); var open2 = false;
      for (var j3 = 0; j3 < gh; j3 += step) {
        var p2 = pt(i3, j3);
        if (!p2[2]) { open2 = false; continue; }
        if (!open2) { ctx.moveTo(p2[0], p2[1]); open2 = true; } else ctx.lineTo(p2[0], p2[1]);
      }
      ctx.stroke();
    }
  };

  /* ---------- drawn low-poly mascot ---------- */
  var FACETS = [
    { p: [[17, 44], [21, 40], [22, 54], [18, 54]], l: 0.44 },
    { p: [[83, 44], [79, 40], [78, 54], [82, 54]], l: 0.5 },
    { p: [[19, 38], [18, 22], [25, 9], [38, 2], [56, 1], [72, 6], [81, 18], [81, 38], [75, 32], [64, 26], [48, 25], [33, 28], [25, 33]], l: 0.13 },
    { p: [[38, 2], [56, 1], [72, 6], [74, 11], [58, 5], [42, 7]], l: 0.21 },
    { p: [[25, 33], [33, 28], [48, 25], [64, 26], [75, 32], [73, 44], [50, 47], [27, 44]], l: 0.72 },
    { p: [[19, 38], [25, 33], [27, 44], [24, 54]], l: 0.57 },
    { p: [[81, 38], [75, 32], [73, 44], [76, 54]], l: 0.66 },
    { p: [[24, 54], [27, 44], [50, 47], [46, 66], [30, 66]], l: 0.62 },
    { p: [[76, 54], [73, 44], [50, 47], [54, 66], [70, 66]], l: 0.7 },
    { p: [[50, 47], [54, 66], [46, 66]], l: 0.89 },
    { p: [[30, 66], [46, 66], [50, 71], [50, 88], [38, 83], [26, 70]], l: 0.21 },
    { p: [[70, 66], [54, 66], [50, 71], [50, 88], [62, 83], [74, 70]], l: 0.26 },
    { p: [[44, 74], [56, 74], [50, 78]], l: 0.46 },
    { p: [[42, 87], [58, 87], [60, 99], [40, 99]], l: 0.3 },
    { p: [[14, 122], [30, 100], [42, 96], [50, 107], [58, 96], [70, 100], [86, 122]], l: 0.1 },
    { p: [[42, 96], [50, 107], [58, 96], [55, 114], [45, 114]], l: 0.82 },
    { p: [[45, 114], [55, 114], [53, 122], [47, 122]], l: 0.28 }
  ];

  PortraitEngine.prototype._mascot = function (t, w, h) {
    var ctx = this.ctx, ramp = this.ramp;
    var S = Math.min(w / 100, h / 122) * 0.94;
    var ox = (w - 100 * S) / 2, oy = (h - 122 * S) / 2;
    ctx.save();
    ctx.translate(ox + this.mx * w * 0.015, oy + this.my * h * 0.01);
    ctx.scale(S, S);
    ctx.lineJoin = 'round';
    for (var f = 0; f < FACETS.length; f++) {
      var fa = FACETS[f], q = (clamp(fa.l, 0, 1) * 255) | 0;
      ctx.beginPath();
      ctx.moveTo(fa.p[0][0], fa.p[0][1]);
      for (var i = 1; i < fa.p.length; i++) ctx.lineTo(fa.p[i][0], fa.p[i][1]);
      ctx.closePath();
      ctx.fillStyle = 'rgb(' + ramp[q * 3] + ',' + ramp[q * 3 + 1] + ',' + ramp[q * 3 + 2] + ')';
      ctx.fill();
      ctx.strokeStyle = 'rgba(3,5,11,0.55)'; ctx.lineWidth = 0.5; ctx.stroke();
    }
    // brows
    ctx.strokeStyle = 'rgb(' + ramp[36] + ',' + ramp[37] + ',' + ramp[38] + ')';
    ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(30, 46.5); ctx.lineTo(44, 43.8);
    ctx.moveTo(70, 46.5); ctx.lineTo(56, 43.8); ctx.stroke();
    // blink
    if (t > this.nextBlink) { this.blink = 1; this.nextBlink = t + 2200 + Math.random() * 2600; }
    this.blink = Math.max(0, this.blink - 0.14);
    var open = 1 - Math.sin(this.blink * Math.PI);
    var eyes = [[37.5, 52.5], [62.5, 52.5]];
    for (var e = 0; e < 2; e++) {
      var ex = eyes[e][0], ey = eyes[e][1];
      ctx.save(); ctx.translate(ex, ey); ctx.scale(1, Math.max(0.04, open));
      ctx.beginPath(); ctx.ellipse(0, 0, 5.2, 2.9, 0, 0, 6.2832);
      ctx.fillStyle = '#f2f6ff'; ctx.fill();
      ctx.beginPath();
      ctx.arc(clamp(this.mx, -1, 1) * 1.9, clamp(this.my, -1, 1) * 1.1, 2.1, 0, 6.2832);
      ctx.fillStyle = '#0a0d18'; ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  PortraitEngine.prototype.setMode = function (m) { this.o.mode = m; };
  PortraitEngine.prototype.setAccent = function (c) { this.o.accent = c; this._ramp(); this._duotone(); };
  PortraitEngine.prototype.set = function (k, v) { this.o[k] = v; };
  PortraitEngine.prototype.destroy = function () {
    this.dead = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener('pointermove', this._onMove);
  };

  PortraitEngine.MODES = ['relief', 'particles', 'halftone', 'ascii', 'duotone', 'mascot', 'wireframe'];
  window.PortraitEngine = PortraitEngine;
})();
