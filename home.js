/* =========================================================================
   Home page — ported from the Component logic in design/Main.dc.html.

   - Sky clock: the visitor's local time drives the painting — sun and moon positions,
     light (CSS vars on .pt), the real moon phase — and the page theme (day → light,
     dusk/night → dark). The theme button fast-forwards to the next sunrise / sunset.
   - Skins: season, weather and event (Halloween, Christmas, New Year…) from the date;
     short "moments" from the skin's pool; a click shoots the skin's shaped firework.
     The design's skin picker is for testing only and is deliberately not shipped.
   - Sky: loads sky.js (window.SKY_SVG + SKY_SK) after the page, injects it, pauses it
     off screen and picks an animation quality for the device.
   - Activity: weekly commits summed over every repo in trajectory-data.js.
   - AI layer: hovering a project lights its label in the painting; a cursor trail.
   - Writing: latest posts from blog-data.js (section stays hidden when empty).
   ========================================================================= */
(function () {
  'use strict';

  var html = document.documentElement;
  var btn = document.querySelector('[data-theme-toggle]');
  var skyEl = document.querySelector('[data-sky]');
  var vo = 0; // fast-forward offset (ms) added to the clock
  var skinMode = 'auto'; // the skin picker's choice ('auto' follows the date; the picker shows only off https)
  var skinBtn = document.querySelector('[data-skin-picker]');
  var SKIN_NAMES = { auto: 'Automatic', autumn: 'Autumn', halloween: 'Halloween', winter: 'Winter', christmas: 'Christmas', valentine: 'Valentine’s Day', newyear: 'New Year’s Eve', spring: 'Spring', summer: 'Summer', perseids: 'The Perseids', none: 'None' };
  var st = { moment: '', fw: 0, shape: '', slot: '', corner: 'tl', cx: '50%', cy: '50%', poke: false, gust: 0, gl: 0 };
  var sig = '', ffRaf = null, hooks = null, gl = null;

  function reduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function pt() { return skyEl && skyEl.querySelector('.pt'); }

  /* ---------- the sky clock ---------- */
  function clock() { return new Date(Date.now() + vo); }
  // sunrise / sunset (local minutes) on the 15th of each month at Paris' latitude, interpolated by day
  function sunTimes(mo, d) {
    var R = [518, 486, 432, 424, 376, 346, 364, 406, 451, 495, 483, 518];
    var S = [1041, 1086, 1127, 1233, 1275, 1316, 1311, 1267, 1204, 1140, 1032, 1014];
    var i = mo - 1, j = d < 15 ? (i + 11) % 12 : (i + 1) % 12, t = Math.abs(d - 15) / 30;
    return [R[i] + (R[j] - R[i]) * t, S[i] + (S[j] - S[i]) * t];
  }
  function sky(d) {
    var m = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60, s = sunTimes(d.getMonth() + 1, d.getDate()), rise = s[0], set = s[1];
    var cl = function (v) { return Math.max(0, Math.min(1, v)); };
    var t, fd = null, fn = null;
    if (m >= rise && m < set) { fd = (m - rise) / (set - rise); t = Math.min(m - rise, set - m); }
    else { var len = 1440 - set + rise, since = m >= set ? m - set : m + 1440 - set; fn = since / len; t = -Math.min(since, len - since); }
    // t = minutes of sun above (+) or below (−) the horizon: drives the light; fd / fn = how far through the day / the night
    var peak = 560 - 260 * cl((set - rise - 500) / 470);
    var sun = fd == null ? [m >= set ? 1100 : -70, 1100] : [-40 + fd * 1100, 1000 - (1000 - peak) * Math.sin(Math.PI * fd)];   // rises left (east), noon to the right (south), sets behind us
    var moon = fn == null ? [m < 720 ? 900 : -70, 1100] : [-40 + fn * 940, 980 - 680 * Math.sin(Math.PI * fn)];
    var name = t > 40 ? 'day' : t < -35 ? 'night' : 'dusk';
    var r1 = function (v) { return Math.round(v * 2) / 2; }, r2 = function (v) { return Math.round(v * 100) / 100; };
    var vars = {
      pd: r2(cl((t + 15) / 60)), ps: r2(cl((-t - 20) / 50)), pk: r2(cl(1 - Math.abs(t + 5) / 45)), pn: r2(cl((25 - t) / 40)),
      sunx: r1(sun[0]) + 'px', suny: r1(sun[1]) + 'px', monx: r1(moon[0]) + 'px', mony: r1(moon[1]) + 'px', mono: r2(cl(-t / 30)),
      flyy: r1(name === 'night' ? moon[1] : 330) + 'px',
      dawn: m < 720 ? 1 : 0, sune: r2(fd == null ? 0 : Math.sin(Math.PI * fd)), ghost: r2(fd == null ? 0 : Math.max(0, 1 - Math.abs(sun[0] - 430) / 130))
    };
    return { name: name, t: t, m: m, rise: rise, set: set, vars: vars, sun: sun, moon: moon };
  }
  // the moon's lit part from its real phase (age since a known new moon)
  function moonD(d) {
    var age = ((d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % 29.530588853; if (age < 0) age += 29.530588853;
    var p = age / 29.530588853, r = 25, k = Math.cos(2 * Math.PI * p), rx = (Math.abs(k) * r).toFixed(1);
    return p < .5 ? 'M0 -25A25 25 0 0 1 0 25A' + rx + ' 25 0 0 ' + (k > 0 ? 0 : 1) + ' 0 -25Z' : 'M0 -25A25 25 0 0 0 0 25A' + rx + ' 25 0 0 ' + (k > 0 ? 1 : 0) + ' 0 -25Z';
  }

  /* ---------- seasons and events from the local date ---------- */
  function season(mo, d) {
    var md = mo * 100 + d;
    if (md >= 922 && md <= 1130) return ['autumn', md <= 1010 ? 1 : md <= 1110 ? 2 : 3];
    if (md >= 1201 || md <= 319) return ['winter', 1];
    if (md <= 620) return ['spring', md <= 410 ? 1 : md <= 505 ? 2 : 3];
    return ['summer', md <= 630 ? 1 : md <= 831 ? 2 : 3];
  }
  function eventOf(mo, d) {
    var md = mo * 100 + d;
    if (md >= 1015 && md <= 1102) return 'halloween';
    if (md >= 1201 && md <= 1230) return 'christmas';
    if (md >= 1231 || md <= 102) return 'newyear';
    if (md >= 212 && md <= 215) return 'valentine';
    if (md >= 810 && md <= 814) return 'perseids';
    return '';
  }
  // the New Year's Eve programme, as words in data-ny
  function newYear(d, skyName) {
    var mo = d.getMonth() + 1, day = d.getDate(), h = d.getHours(), sec = h * 3600 + d.getMinutes() * 60 + d.getSeconds();
    var eve = mo === 12 && day === 31, jan1 = mo === 1 && day === 1, w = [], count = '';
    if (eve && skyName !== 'day') w.push('crowd');
    if ((eve && h >= 22) || (jan1 && h < 2)) w.push('nocars', 'crowd');
    if (eve && sec >= 86390) { w.push('count'); count = String(86400 - sec); }
    else if (jan1 && sec < 22) w.push('finale', 'year');
    else if (jan1 && sec < 60) w.push('year', 'party');
    else if (jan1 && h < 2) w.push('party');
    else if (skyName !== 'day') w.push('volleys');
    if (!eve && skyName === 'day') w.push('after');
    return { ny: w.filter(function (v, i) { return w.indexOf(v) === i; }).join(' '), count: count };
  }
  function snap() {
    var d = clock(), sk = sky(d), mo = d.getMonth() + 1, day = d.getDate(), h = d.getHours(), y = d.getFullYear();
    var sp = season(mo, day), sea = sp[0], phase = sp[1], event = eventOf(mo, day), wx = '';
    // the skin picker (testing only) overrides the date's skin, as in the design
    var mode = skinMode.split(':')[0], forceWx = skinMode.split(':')[1] || '';
    if (mode === 'none') { sea = ''; event = ''; phase = 1; }
    else if (mode !== 'auto') {
      var S = { autumn: 2, winter: 1, spring: 2, summer: 2 }, E = { halloween: 'autumn', christmas: 'winter', newyear: 'winter', valentine: 'winter', perseids: 'summer' };
      if (S[mode]) { sea = mode; phase = S[mode]; event = ''; if (mode === 'winter' && !forceWx) forceWx = 'snow'; } else { event = mode; sea = E[mode]; phase = event === 'halloween' || event === 'perseids' ? 2 : 1; }
    }
    if (sea === 'winter' && event !== 'christmas') {
      var r = (Math.sin(y * 374.1 + mo * 31.7 + day * 7.13) * 43758.5453) % 1, v = r < 0 ? r + 1 : r;   // the same weather all day
      wx = v < .45 ? 'snow' : v < .75 ? 'rain' : 'fog';
    }
    if (sea === 'autumn' && h < 10) wx = 'mist';
    if (event === 'newyear') wx = 'snow';   // a white New Year's Eve: no fog or rain on the fireworks
    if (forceWx) wx = forceWx;
    var dayTag = '';
    if (event === 'christmas' && ((day === 24 && h >= 23) || (day === 25 && h < 1))) dayTag = 'eve';
    else if (event === 'christmas' && day === 25 && sk.name === 'day') dayTag = 'xmorning';
    var ny = event === 'newyear' ? newYear(d, sk.name) : { ny: '', count: '' };
    return { d: d, sk: sk, season: sea, phase: phase, event: event, wx: wx, dayTag: dayTag, ny: ny.ny, count: ny.count, year: y, h: h, mi: d.getMinutes() };
  }
  function tick() {
    var k = snap();
    var s = [k.sk.name, k.season, k.phase, k.wx, k.event, k.ny, k.count, k.dayTag, k.h, k.mi].join('|');
    if (s !== sig) { sig = s; render(); }
  }

  /* ---------- render: theme, labels, the painting's attributes ---------- */
  var SKY_LABEL = {
    dusk: 'A hand-painted view of the Eiffel Tower from the Trocadéro at dusk: a pink and orange sky, the tower and Haussmann windows lighting up, the Warsaw fountain, the Pont d’Iéna over the Seine, Les Invalides to the left and the Tour Montparnasse between the tower’s legs',
    night: 'A hand-painted night view of the Eiffel Tower from the Trocadéro: the Warsaw fountain lit up in the foreground, traffic on Avenue de New-York, the lamp-lined Pont d’Iéna crossing the Seine with bateaux-mouches moored at the quay, the golden tower sparkling under its rotating beacon, the Tour Montparnasse between its legs, the gilded dome of Les Invalides to the left, Haussmann blocks and a crescent moon among drifting clouds',
    day: 'A hand-painted view of the Eiffel Tower from the Trocadéro by day: the Warsaw fountain’s water cannons in the foreground, cars on Avenue de New-York, the Pont d’Iéna with its equestrian statues leading across the Seine to the bronze tower, the Champ de Mars and Tour Montparnasse seen through its arch, the gilded dome of Les Invalides to the left, cream Haussmann blocks with zinc roofs, swaying trees and flowerbeds, and slow clouds'
  };
  function skyLabel(k, name) {
    var seasonText = k.season === 'autumn' ? '. Autumn: the trees turn amber and rust and leaves drift down'
      : k.season === 'winter' ? '. Winter: bare trees' + (k.wx === 'snow' ? ', snow falling on the roofs and lawns' : k.wx === 'rain' ? ', rain and umbrellas on the esplanade' : k.wx === 'fog' ? ', fog drifting around the tower over the snow' : '')
      : k.season === 'spring' ? (k.phase === 2 ? '. Spring: the cherry trees are in pink bloom and petals drift down' : k.phase === 1 ? '. Early spring: buds on the bare branches' : '. Spring: fresh green trees and tulips')
      : k.season === 'summer' ? '. Summer: picnics on the lawns and children splashing at the fountain' : '';
    var evText = k.event === 'halloween' ? '. Dressed for Halloween: jack-o’-lanterns from the tower’s feet to the gardens, bats circling the tower' + (name === 'day' ? '' : ', an orange harvest moon')
      : k.event === 'christmas' ? '. Dressed for Christmas: a Santa hat on the tower, snow everywhere, a Christmas tree, a market and a carousel, skaters on the frozen basin and falling snow'
      : k.event === 'newyear' ? '. New Year’s Eve: a crowd on the esplanade and fireworks around the tower'
      : k.event === 'valentine' ? '. Valentine’s Day: red heart garlands on the bridge' : k.event === 'perseids' ? '. The Perseids: shooting stars streak across the night sky' : '';
    return SKY_LABEL[name] + seasonText + evText;
  }
  // the sky-clock variables go only on the elements whose rules read them (sky.js SKY_LIT):
  // on the .pt root every change would restyle all ~12,000 shapes, ~70 ms a frame during a fast-forward
  var lastVars = {};
  function light(v) {
    for (var n in v) {
      if (lastVars[n] === v[n]) continue;
      lastVars[n] = v[n];
      for (var i = 0; i < hooks.lit.length; i++) hooks.lit[i].style.setProperty('--' + n, v[n]);
    }
  }
  // the skin picker's label and icon: the chosen skin, or the date's
  function skinLabel(k) {
    var mode = skinMode.split(':')[0], today = k.event ? SKIN_NAMES[k.event] : k.season ? SKIN_NAMES[k.season] : 'none';
    var label = 'Seasonal skin: ' + (mode === 'auto' ? 'automatic (' + today + ' today)' : SKIN_NAMES[mode] + (k.wx === 'snow' ? ', snow' : k.wx === 'rain' ? ', rain' : k.wx === 'fog' ? ', fog' : ''));
    skinBtn.title = label; skinBtn.querySelector('select').setAttribute('aria-label', label);
    [].forEach.call(skinBtn.querySelectorAll('svg[data-sk]'), function (g) { g.style.display = g.getAttribute('data-sk') === mode ? '' : 'none'; });
  }
  function render() {
    var k = snap(), name = k.sk.name, dark = name !== 'day';
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
    var label = dark ? 'Fast-forward to sunrise' : 'Fast-forward to sunset';
    btn.setAttribute('aria-label', label);
    btn.title = label;
    if (skyEl) skyEl.setAttribute('aria-label', skyLabel(k, name));
    if (skinBtn && !skinBtn.hidden) skinLabel(k);
    var el = pt();
    if (!el) return;
    light(k.sk.vars);
    el.style.setProperty('--cx', st.cx);
    el.style.setProperty('--cy', st.cy);
    var a = {
      sky: name, fount: k.h >= 10 && k.h < 23 ? 'on' : 'off', gust: st.gust,
      sparkle: name === 'night' && (k.mi < 5 || st.poke) ? 1 : 0,
      season: k.season, phase: k.phase, wx: k.wx, event: k.event, moment: st.moment, day: k.dayTag, ny: k.ny, year: k.year,
      fw: st.fw, shape: st.shape, slot: st.slot, corner: st.corner, gl: st.gl
    };
    for (var n in a) if (el.getAttribute('data-' + n) !== String(a[n])) el.setAttribute('data-' + n, a[n]);
    var md = moonD(k.d);
    hooks.moon.forEach(function (p) { if (p.getAttribute('d') !== md) p.setAttribute('d', md); });
    hooks.count.forEach(function (t) { t.textContent = k.count; });
    hooks.year.forEach(function (t) { t.textContent = k.year; });
    var hv = { 'data-h-moond': md, 'data-h-count': k.count, 'data-h-year': k.year };
    hooks.holes.forEach(function (e) { for (var a in hv) if (e.hasAttribute('data-h-' + a) && e.getAttribute(a) !== String(hv[a])) e.setAttribute(a, hv[a]); });
    // stop the animations of every hidden skin / moment / firework group (Chrome keeps ticking them under display:none)
    hooks.toggles.forEach(function (g) {
      var off = getComputedStyle(g).display === 'none';
      if (g.classList.contains('off') !== off) g.classList.toggle('off', off);
    });
  }
  function set(next) { for (var n in next) st[n] = next[n]; render(); }

  /* ---------- the theme button: speed time up to the next sunrise or sunset (~4 s) ---------- */
  btn.addEventListener('click', function () {
    if (ffRaf) return;
    var d = clock(), s = sky(d), target = new Date(d);
    if (s.t > 0) target.setHours(0, Math.round(s.set + 70), 0, 0);
    else { if (s.m >= s.set) target.setDate(target.getDate() + 1); var tt = sunTimes(target.getMonth() + 1, target.getDate()); target.setHours(0, Math.round(tt[0] + 60), 0, 0); }
    var from = vo, to = from + (target.getTime() - d.getTime()), dur = reduced() ? 0 : 4200, t0 = performance.now(), lastName = s.name;
    var step = function (ts) {
      var q = dur ? Math.min(1, (ts - t0) / dur) : 1, e = q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
      vo = from + (to - from) * e;
      var sk2 = sky(clock());
      if (hooks) light(sk2.vars);
      if (sk2.name !== lastName) { lastName = sk2.name; render(); }
      if (q < 1) ffRaf = requestAnimationFrame(step);
      else {
        ffRaf = null; render();
        // drop the flag a frame after the last render, so nothing starts a transition at the end
        requestAnimationFrame(function () { html.removeAttribute('data-ff'); });
      }
    };
    // the script drives the light every frame: CSS transitions on ~12,000 shapes would only fight it
    html.setAttribute('data-ff', '');
    ffRaf = requestAnimationFrame(step);
  });

  /* ---------- moments: one short scene at a time, from the skin's pool, never the same twice in a row ---------- */
  var momentT, momentEnd, santaT, lastMoment = '', first = true, sinceStar = 0;
  function moments() { return (window.SKY_SK && window.SKY_SK.moments) || {}; }
  function scheduleMoment(ms) { clearTimeout(momentT); momentT = setTimeout(playMoment, ms); }
  function fits(when, k) {
    var parts = when.split('@'), tod = parts[0], req = parts[1], s = k.sk.name;
    var okT = tod === 'any' || tod === s || (tod === 'dark' && s !== 'day') || (tod === 'light' && s !== 'night');
    var okR = !req || req === k.wx || (req[0] === 'p' && req.slice(1).indexOf(String(k.phase)) >= 0);
    return okT && okR;
  }
  // the skin picker: only where the page isn't served over https (localhost, file://); production follows the date
  if (skinBtn && location.protocol !== 'https:') {
    skinBtn.hidden = false; skinLabel(snap());
    var skinSel = skinBtn.querySelector('select');
    skinSel.addEventListener('change', function () {
      var v = skinSel.value; skinSel.selectedIndex = 0;
      if (!v) return;
      // the light stays as it is (day stays day, night stays night); New Year's Eve moves to 31 December, and at night
      // jumps to 23:59:47 so the countdown and the finale play straight away
      var now = new Date(), night = sky(clock()).name === 'night';
      var t = v !== 'newyear' ? sameLight(now) : night ? new Date(now.getFullYear(), 11, 31, 23, 59, 47) : sameLight(new Date(now.getFullYear(), 11, 31));
      vo = t.getTime() - now.getTime();
      skinMode = v; clearTimeout(momentT); lastMoment = ''; first = true;
      set({ moment: '' }); scheduleMoment(900);
    });
  }
  // on `day`, the time closest to the clock's time of day that has the same light (day / dusk / night) as now
  function sameLight(day) {
    var cur = clock(), want = sky(cur).name, base = cur.getHours() * 60 + cur.getMinutes(), t;
    for (var k = 0; k <= 720; k += 5) for (var sg = 1; sg >= -1; sg -= 2) {
      t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, ((base + sg * k) % 1440 + 1440) % 1440, cur.getSeconds());
      if (sky(t).name === want) return t;
    }
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), cur.getHours(), cur.getMinutes(), cur.getSeconds());
  }
  function playMoment() {
    var el = pt();
    // nothing to see while paused, and the static level would freeze a scene mid-flight
    if (!el || el.getAttribute('data-paused') === '1' || el.getAttribute('data-q') === 'static' || reduced()) { scheduleMoment(8000); return; }
    var k = snap(), M = moments();
    var all = (M[k.event] || M[k.season] || []).filter(function (m) { return fits(m.k, k); });
    var pool = all.filter(function (m) { return m.n !== lastMoment; });
    if (!pool.length) { scheduleMoment(20000); return; }
    var r = Math.random() * pool.reduce(function (a, m) { return a + m.w; }, 0), pick = pool[0];
    for (var i = 0; i < pool.length; i++) { r -= pool[i].w; if (r <= 0) { pick = pool[i]; break; } }
    // the skin's signature scene comes first, then every other time: Santa's sleigh at Christmas, the witch on Halloween nights
    var star = k.event === 'christmas' ? 'sleigh' : k.event === 'halloween' ? 'witch' : '';
    var starM = all.filter(function (m) { return m.n === star; })[0];
    if (starM && lastMoment !== star && (first || sinceStar >= 1)) pick = starM;
    first = false; sinceStar = pick.n === star ? 0 : sinceStar + 1;
    startMoment(pick);
  }
  function startMoment(m) {
    clearTimeout(momentEnd); clearTimeout(momentT);
    lastMoment = m.n;
    set({ moment: m.n });
    momentEnd = setTimeout(function () { set({ moment: '' }); scheduleMoment(20000 + Math.random() * 25000); }, m.s * 1000 + 300);
  }
  // a click at Christmas brings the sleigh across within a couple of seconds (after the firework), unless it is already flying
  function callSanta() {
    if (st.moment === 'sleigh' || santaT) return;
    var m = (moments().christmas || []).filter(function (x) { return x.n === 'sleigh'; })[0];
    if (!m) return;
    santaT = setTimeout(function () {
      santaT = null; if (st.moment === 'sleigh') return;
      set({ moment: '' }); setTimeout(function () { startMoment(m); }, 60); sinceStar = 0;
    }, 1800);
  }

  /* ---------- the painting ---------- */
  // a click: a shaped firework (the skin's shapes in turn), the skin's flourish, and the sparkle (night) or a gust (day)
  var gustT, pokeT, fwT, shapeIx = {};
  if (skyEl) {
    skyEl.addEventListener('click', function (e) {
      if (!pt()) return;
      var k = snap(), name = k.sk.name, key = k.event || k.season || '', S = (window.SKY_SK && window.SKY_SK.shapes) || {};
      var list = S[key] || S[''] || ['smiley'], ix = shapeIx[key] || 0; shapeIx[key] = ix + 1;
      var shape = list[ix % list.length]; if (shape === 'year') shape = 'y' + k.year;
      var next = { fw: st.fw === 1 ? 2 : 1, shape: shape, slot: st.slot === 'r' ? '' : 'r' };
      var r = skyEl.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      next.corner = (y < r.height / 2 ? 't' : 'b') + (x < r.width / 2 ? 'l' : 'r'); next.cx = Math.round(x) + 'px'; next.cy = Math.round(y) + 'px';
      if (name === 'day') next.gust = 1; else next.poke = true;
      set(next);
      if (gl) gl.poke({ day: name === 'day', event: k.event, season: k.season });
      if (k.event === 'christmas') callSanta();
      clearTimeout(fwT); fwT = setTimeout(function () { set({ fw: 0 }); }, 8500);
      if (name === 'day') { clearTimeout(gustT); gustT = setTimeout(function () { set({ gust: 0 }); }, 3500); }
      else { clearTimeout(pokeT); pokeT = setTimeout(function () { set({ poke: false }); }, 12000); }
    });
    // the painting is ~1.2 MB of SVG: fetch it only once the page itself has loaded
    // the 3D painting's markup (sky.js), or straight away the SVG painting where the 3D can't run
    var loadSky = function () {
      var three = can3d();
      (three ? script('sky.js?v=' + SKY_V) : loadSvgPainting()).then(function () { mountSky(three); });
    };
    if (document.readyState === 'complete') loadSky();
    else window.addEventListener('load', loadSky);
  }


  var SKY_V = '7'; // ?v= for sky.js, sky-svg.js and home-svg.css: bump with home.css / home.js
  // the SVG painting (the design before it moved into the 3D scene): its markup and CSS load only when the 3D can't run
  function loadSvgPainting() {
    var css = new Promise(function (ok) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'home-svg.css?v=' + SKY_V; l.onload = l.onerror = ok; document.head.appendChild(l); });
    return Promise.all([css, script('sky-svg.js?v=' + SKY_V)]);
  }
  // put the painting's markup (window.SKY_SVG) in the panel and find the elements the clock drives
  function paintSky() {
    skyEl.querySelector('[data-sky-inner]').innerHTML = window.SKY_SVG;
    bindHooks(pt());
  }
  function mountSky(three) {
    var inner = skyEl.querySelector('[data-sky-inner]');
    paintSky();
    var el = pt();
    // the painting's quality is measured once the 3D scene is up (or not coming): its build would skew the probe
    var measured = false;
    var done = function () { if (!measured) { measured = true; quality(pt()); } };
    if (three) load3d(el, done); else done();
    render();
    scheduleMoment(4000 + Math.random() * 1500);
    requestAnimationFrame(function () { inner.classList.add('is-in'); });
    // pause the painting when it is off screen or the tab is hidden (the panel is observed: the painting inside may be swapped)
    var off = false;
    var update = function () {
      var p = pt(); if (!p) return;
      p.setAttribute('data-paused', off || document.hidden ? '1' : '0');
      if (!off && !document.hidden) p.dispatchEvent(new Event('sky:visible'));
    };
    document.addEventListener('visibilitychange', update);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { off = !es[0].isIntersecting; update(); }).observe(inner);
    } else update();
  }
  function bindHooks(el) {
    hooks = {
      moon: [].slice.call(el.querySelectorAll('[data-h-d="moonD"]')),
      count: [].slice.call(el.querySelectorAll('[data-h="count"]')),
      year: [].slice.call(el.querySelectorAll('[data-h="year"]')),
      // the 3D painting's mirror layers carry the moon path, the countdown and the year as attributes the scene reads
      holes: [].slice.call(el.querySelectorAll('[data-h-data-h-moond],[data-h-data-h-count],[data-h-data-h-year]')),
      lit: el.querySelectorAll((window.SKY_LIT || []).map(function (c) { return '.' + CSS.escape(c); }).join(',') || 'x-none'),
      toggles: [].slice.call(el.querySelectorAll((window.SKY_TOGGLES || []).map(function (c) { return '.' + CSS.escape(c); }).join(',') || 'x-none'))
    };
  }

  /* ---------- painting quality: full → lite → static ----------
     Every animated SVG shape costs main-thread work each frame, so weak devices get fewer.
     Start from device hints, then watch real frames once the painting is on screen and step
     down while the median frame is slower than ~45 fps. Never steps back up within a session. */
  function quality(el) {
    // with the 3D scene up, the probe measures its frames too: never down to "static" then, which hides the weather
    // (falling rain, snow, leaves) and the moments; "lite" only stops the small decorative animations
    var LEVELS = gl ? ['full', 'lite'] : ['full', 'lite', 'static'];
    var nav = navigator, saved = null;
    try { saved = sessionStorage.getItem('dn-sky-q'); } catch (e) {}
    var q = LEVELS.indexOf(saved) >= 0 ? saved
      : gl ? ((nav.hardwareConcurrency || 8) < 4 || (nav.deviceMemory || 8) < 4 || saved === 'static' ? 'lite' : 'full')
      : nav.connection && nav.connection.saveData ? 'static'
      : (nav.hardwareConcurrency || 8) < 4 || (nav.deviceMemory || 8) < 4 ? 'lite' : 'full';
    var set = function (v) {
      q = v; el.setAttribute('data-q', v);
      try { sessionStorage.setItem('dn-sky-q', v); } catch (e) {}
    };
    set(q);
    var probing = false;
    var probe = function () {
      if (probing || q === LEVELS[LEVELS.length - 1] || el.getAttribute('data-paused') === '1') return;
      probing = true;
      var frames = [], prev = 0, t0 = 0;
      requestAnimationFrame(function f(now) {
        if (prev) frames.push(now - prev);
        prev = now; t0 = t0 || now;
        if (now - t0 < 2000) return requestAnimationFrame(f);
        probing = false;
        frames.sort(function (a, b) { return a - b; });
        if (frames[frames.length >> 1] > 22) { set(LEVELS[LEVELS.indexOf(q) + 1]); setTimeout(probe, 500); }
        else el.removeEventListener('sky:visible', later);
      });
    };
    // let the injection, first raster, chart draw and gtag.js settle before measuring
    var later = function () { setTimeout(probe, 2500); };
    el.addEventListener('sky:visible', later);
    if (el.getAttribute('data-paused') === '0') later();
  }

  /* ---------- the painting in 3D (design/Main.dc.html + design/paris3d.js) ----------
     The painting is the 3D scene wherever WebGL 2 runs: while it loads, only the sky and the chip show; the old SVG
     painting (its base layers) appears only if WebGL 2 is missing, the scripts or the scene fail, or the GPU context is lost. After the page's load, three.js (pinned in index.html's import map, from jsDelivr) and paris3d.js (built from the modules in paris3d/) load; the scene builds in
     small steps between frames and compiles only the shaders today's frame draws, without blocking (the rest compile the
     first time they show), while a chip shows the progress; then the canvas fades in over the SVG. */
  var GL_V = '5'; // ?v= for paris3d.js: bump when the scene changes (three.js is pinned by version in the import map)
  // three.js through the import map, imported via Function: a browser without dynamic import rejects here instead of
  // failing to parse home.js. The scene itself is paris3d.js, one classic script built from the modules in paris3d/
  // (pnpm run scene): it also runs from file://, where browsers refuse ES modules
  function importThree() { try { return new Function('return import("three")')(); } catch (e) { return Promise.reject(e); } }
  function can3d() {
    // sessionStorage dn-svg-painting = "1" forces the SVG painting (the e2e tests set it); a failure is never remembered.
    // Older builds saved dn-sky-3d = "no" after any failure, which kept a tab on the SVG painting: drop it
    try { sessionStorage.removeItem('dn-sky-3d'); if (sessionStorage.getItem('dn-svg-painting') === '1') return false; } catch (e) {}
    // no throwaway context to test (~0.7 s on an Intel UHD): mounting fails cleanly without WebGL 2
    return !!window.WebGL2RenderingContext;
  }
  function script(src) {
    return new Promise(function (ok, ko) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  }
  // what the scene reads every frame: the sky clock (sun and moon where the painting puts them) and today's skin
  function state3d() {
    var k = snap(), d = k.d, sk = k.sk, age = ((d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % 29.530588853;
    if (age < 0) age += 29.530588853;
    return { t: sk.t, m: sk.m, sunx: sk.sun[0], suny: sk.sun[1], monx: sk.moon[0], mony: sk.moon[1], season: k.season, phase: k.phase, wx: k.wx, event: k.event, ny: k.ny,
      fount: k.h >= 10 && k.h < 23, moment: st.moment || '', moon: (1 - Math.cos(2 * Math.PI * age / 29.530588853)) / 2, sparkle: sk.name === 'night' && (k.mi < 5 || st.poke), fw: st.fw };
  }
  function load3d(el, done) {
    if (gl) return done();
    if (!can3d()) { if (window.console) console.warn('[painting] 3D off, SVG painting instead:', window.WebGL2RenderingContext ? 'forced (dn-svg-painting)' : 'no WebGL 2'); return done(); }
    var cv = el.querySelector('.pt3d'), bar = document.createElement('div');
    if (!cv) return done();
    bar.className = 'gl-load'; bar.setAttribute('role', 'status');
    bar.innerHTML = '<span class="gl-load-t">Painting in 3D</span><span class="gl-load-b"><i></i></span>';
    skyEl.appendChild(bar);
    var progress = function (f) { bar.style.setProperty('--p', Math.round(f * 100) + '%'); };
    // 3D mode from the start: the SVG base layers stay hidden; the canvas lays out invisible (so the scene can size itself)
    el.setAttribute('data-gl-warm', ''); set({ gl: 1 });
    // the 3D can't run (scripts, scene or GPU context failed): the SVG painting replaces it for this page load only, so a
    // passing failure (a stale cached script, a GPU switch) doesn't stick; the reason goes to the console
    var no = function (why) {
      if (window.console) console.warn('[painting] 3D off, SVG painting instead:', why || 'unknown');
      if (gl) { gl.dispose(); gl = null; }
      bar.remove();
      loadSvgPainting().then(function () { st.gl = 0; paintSky(); render(); done(); });
    };
    progress(0.04);
    importThree()
      .then(function (T) { window.THREE = T; return script('paris3d.js?v=' + GL_V); })
      .then(function () {
        progress(0.3);
        return window.Paris3D.mountAsync(cv, { layout: window.PARIS3D_LAYOUT, tokens: el, state: state3d, onProgress: function (f) { progress(0.3 + f * 0.65); } });
      })
      .then(function (h) {
        if (!h) return no('the scene did not mount');
        gl = h;
        cv.addEventListener('webglcontextlost', function () { no('WebGL context lost'); });
        progress(1);
        el.removeAttribute('data-gl-warm');
        bar.classList.add('is-done'); setTimeout(function () { bar.remove(); }, 700); done();
      })
      .catch(no);
  }

  // hovered / focused project → its label in the painting
  var projects = document.querySelector('.rows-proj');
  if (projects) {
    var focus = function (e) { var li = e.target.closest && e.target.closest('li[data-p]'), el = pt(); if (el) el.setAttribute('data-focus', li ? li.getAttribute('data-p') : ''); };
    projects.addEventListener('mouseover', focus);
    projects.addEventListener('focusin', focus);
    projects.addEventListener('mouseleave', function () { var el = pt(); if (el) el.setAttribute('data-focus', ''); });
    projects.addEventListener('focusout', function (e) { if (!projects.contains(e.relatedTarget)) { var el = pt(); if (el) el.setAttribute('data-focus', ''); } });
  }

  /* ---------- cursor trail ---------- */
  if (window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var dots = [], pos = { x: -100, y: -100 }, last = 0;
    for (var t = 0; t < 7; t++) {
      var d = document.createElement('span');
      d.className = 'ai-trail'; d.style.transform = 'scale(' + (1 - t * .11) + ')';
      document.body.appendChild(d); dots.push({ el: d, x: -100, y: -100 });
    }
    var running = false;
    var step = function () {
      var px = pos.x, py = pos.y, idle = performance.now() - last > 900;
      dots.forEach(function (d, i) {
        d.x += (px - d.x) * (0.42 - i * 0.04); d.y += (py - d.y) * (0.42 - i * 0.04);
        d.el.style.translate = d.x + 'px ' + d.y + 'px'; d.el.style.opacity = idle ? 0 : (0.55 - i * 0.07);
        px = d.x; py = d.y;
      });
      // the loop sleeps once the trail has faded and wakes on the next move
      if (idle) running = false;
      else requestAnimationFrame(step);
    };
    window.addEventListener('pointermove', function (e) {
      pos.x = e.clientX; pos.y = e.clientY; last = performance.now();
      if (!running) { running = true; requestAnimationFrame(step); }
    }, { passive: true });
  }

  tick();
  setInterval(tick, 1000);

  /* ---------- activity sparkline ---------- */
  (function () {
    var data = window.TRAJECTORY_DATA;
    var chart = document.querySelector('[data-act-chart]');
    if (!data || !chart) return;
    var repos = Object.keys(data.m), n = data.weekCount;
    var w = [];
    for (var i = 0; i < n; i++) w.push(repos.reduce(function (s, k) { return s + (data.m[k][i] || 0); }, 0));
    var W = 600, H = 64, pad = 3, peak = Math.max.apply(null, w) || 1;
    var pts = w.map(function (v, i) { return [(i / (n - 1)) * W, H - pad - (Math.sqrt(v) / Math.sqrt(peak)) * (H - pad * 2)]; });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    chart.querySelector('[data-act-line]').setAttribute('d', line);
    chart.querySelector('[data-act-area]').setAttribute('d', line + ' L' + W + ' ' + H + ' L0 ' + H + ' Z');

    var start = Date.parse(data.weekStart + 'T00:00:00Z');
    var weekDate = function (i) { return new Date(start + i * 7 * 864e5); };
    var fmt = function (d, o) { o.timeZone = 'UTC'; return d.toLocaleDateString('en-GB', o); };
    var monYY = function (d) { return fmt(d, { month: 'short' }) + ' ’' + String(d.getUTCFullYear()).slice(2); };
    var total = w.reduce(function (a, b) { return a + b; }, 0);
    var summary = total.toLocaleString('en-GB') + ' commits · ' + monYY(weekDate(0)) + ' → ' + monYY(weekDate(n - 1));
    chart.setAttribute('aria-label', 'Weekly commits, ' + fmt(weekDate(0), { month: 'long', year: 'numeric' }) + ' to ' +
      fmt(weekDate(n - 1), { month: 'long', year: 'numeric' }) + '. Use the left and right arrow keys to read each week.');

    // month ticks every two months, spread like the design
    var ticks = [], d0 = weekDate(0), dN = weekDate(n - 1);
    for (var m = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), 1)); m <= dN; m.setUTCMonth(m.getUTCMonth() + 2)) {
      ticks.push('<span>' + fmt(m, { month: 'short' }) + '</span>');
    }
    document.querySelector('[data-act-ticks]').innerHTML = ticks.join('');

    var hits = chart.querySelector('[data-act-hits]');
    hits.innerHTML = w.map(function (_, i) { return '<span data-i="' + i + '"></span>'; }).join('');
    var readout = document.querySelector('[data-act-readout]');
    var mark = chart.querySelector('[data-act-mark]'), dot = chart.querySelector('[data-act-dot]');
    var hi = null;
    function setHi(i) {
      hi = i;
      mark.hidden = dot.hidden = i == null;
      readout.classList.toggle('is-hi', i != null);
      if (i == null) { readout.textContent = summary; return; }
      var x = (i / (n - 1)) * 100 + '%';
      mark.style.left = dot.style.left = x;
      dot.style.top = pts[i][1].toFixed(1) + 'px';
      readout.textContent = 'Week of ' + fmt(weekDate(i), { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' + w[i] + (w[i] === 1 ? ' commit' : ' commits');
    }
    setHi(null);
    // draw the line once the chart scrolls into view
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { chart.setAttribute('data-drawn', '1'); cio.disconnect(); } }, { threshold: 0.4 });
      cio.observe(chart);
    } else chart.setAttribute('data-drawn', '1');
    hits.addEventListener('mouseover', function (e) { var i = e.target.getAttribute('data-i'); if (i != null) setHi(+i); });
    chart.addEventListener('mouseleave', function () { setHi(null); });
    chart.addEventListener('blur', function () { setHi(null); });
    chart.addEventListener('keydown', function (e) {
      var k = e.key, cur = hi == null ? n - 1 : hi;
      if (k === 'ArrowLeft') { e.preventDefault(); setHi(hi == null ? n - 1 : Math.max(0, cur - 1)); }
      else if (k === 'ArrowRight') { e.preventDefault(); setHi(hi == null ? n - 1 : Math.min(n - 1, cur + 1)); }
      else if (k === 'Home') { e.preventDefault(); setHi(0); }
      else if (k === 'End') { e.preventDefault(); setHi(n - 1); }
      else if (k === 'Escape') setHi(null);
    });
  })();

  /* ---------- writing: latest posts ---------- */
  (function () {
    var posts = window.BLOG_POSTS_SORTED || [];
    var host = document.querySelector('[data-latest-posts]');
    if (!host || !posts.length) return;
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    host.innerHTML = posts.slice(0, 6).map(function (p) {
      var month = new Date(p.date + 'T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      return '<li><a class="post-row" href="' + window.SITE_LINKS.blogs(p.slug) + '">' + esc(p.title) + '</a><span class="meta">' + month + '</span></li>';
    }).join('');
    document.getElementById('writing').hidden = false;
  })();
})();
