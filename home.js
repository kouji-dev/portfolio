/* =========================================================================
   Home page — ported from the Component logic in design/Minimal.dc.html.

   - Theme: follows the Paris sun (day → light, dusk/night → dark) until the
     visitor picks one with the toggle; the pick is saved as `dn-theme`.
   - Sky: loads sky.js (window.SKY_SVG) after the page, injects it and drives its data-*
     switches (sky state, fountain hours, hourly sparkle, click gust/sparkle, off-screen
     pause, animation quality).
   - Activity: weekly commits summed over every repo in trajectory-data.js.
   - AI layer: hovering a project lights its label in the painting; a cursor trail.
   - Writing: latest posts from blog-data.js (section stays hidden when empty).
   ========================================================================= */
(function () {
  'use strict';

  var html = document.documentElement;
  var state = { theme: html.getAttribute('data-theme'), sky: null, auto: true, fount: 'on', hourly: false, poke: false };
  try {
    var saved = localStorage.getItem('dn-theme');
    if (saved === 'light' || saved === 'dark') { state.auto = false; state.sky = saved === 'light' ? 'day' : 'night'; }
  } catch (e) {}
  state.sky = state.sky || (state.theme === 'light' ? 'day' : 'night');

  /* ---------- Paris clock ---------- */
  function paris() {
    var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    var g = function (t) { return +parts.find(function (p) { return p.type === t; }).value; };
    return { mo: g('month'), d: g('day'), h: g('hour'), mi: g('minute') };
  }
  // Paris sunrise / sunset (local minutes) on the 15th of each month, interpolated by day
  function sunTimes(mo, d) {
    var R = [518, 486, 432, 424, 376, 346, 364, 406, 451, 495, 483, 518];
    var S = [1041, 1086, 1127, 1233, 1275, 1316, 1311, 1267, 1204, 1140, 1032, 1014];
    var i = mo - 1, j = d < 15 ? (i + 11) % 12 : (i + 1) % 12, t = Math.abs(d - 15) / 30;
    return [R[i] + (R[j] - R[i]) * t, S[i] + (S[j] - S[i]) * t];
  }
  function tick() {
    var p;
    try { p = paris(); } catch (e) { return; }
    var now = p.h * 60 + p.mi, st = sunTimes(p.mo, p.d), rise = st[0], set = st[1];
    var twilight = (now >= set - 45 && now < set + 30) || (now >= rise - 30 && now < rise + 30);
    var night = now >= set + 30 || now < rise - 30;
    state.fount = p.h >= 10 && p.h < 23 ? 'on' : 'off';
    state.hourly = p.mi < 5;
    if (state.auto) {
      state.sky = twilight ? 'dusk' : night ? 'night' : 'day';
      state.theme = state.sky === 'day' ? 'light' : 'dark';
    }
    render();
  }

  /* ---------- theme + sky attributes ---------- */
  var btn = document.querySelector('[data-theme-toggle]');
  var skyEl = document.querySelector('[data-sky]');
  var SKY_LABEL = {
    dusk: 'A hand-painted view of the Eiffel Tower from the Trocadéro at dusk: a pink and orange sky, the tower and Haussmann windows lighting up, the Warsaw fountain, the Pont d’Iéna over the Seine, Les Invalides to the left and the Tour Montparnasse between the tower’s legs',
    night: 'A hand-painted night view of the Eiffel Tower from the Trocadéro: the Warsaw fountain lit up in the foreground, traffic on Avenue de New-York, the lamp-lined Pont d’Iéna crossing the Seine with bateaux-mouches moored at the quay, the golden tower sparkling under its rotating beacon, the Tour Montparnasse between its legs, the gilded dome of Les Invalides to the left, Haussmann blocks and a crescent moon among drifting clouds',
    day: 'A hand-painted view of the Eiffel Tower from the Trocadéro by day: the Warsaw fountain’s water cannons in the foreground, cars on Avenue de New-York, the Pont d’Iéna with its equestrian statues leading across the Seine to the bronze tower, the Champ de Mars and Tour Montparnasse seen through its arch, the gilded dome of Les Invalides to the left, cream Haussmann blocks with zinc roofs, swaying trees and flowerbeds, and slow clouds'
  };
  function pt() { return skyEl && skyEl.querySelector('.pt'); }
  function render() {
    var dark = state.theme !== 'light';
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
    var label = dark ? 'Switch to light mode' : 'Switch to dark mode';
    btn.setAttribute('aria-label', label);
    btn.title = label;
    if (skyEl) skyEl.setAttribute('aria-label', SKY_LABEL[state.sky] || SKY_LABEL.night);
    var el = pt();
    if (!el) return;
    el.setAttribute('data-sky', state.sky);
    el.setAttribute('data-fount', state.fount);
    el.setAttribute('data-sparkle', state.sky === 'night' && (state.hourly || state.poke) ? '1' : '0');
  }

  btn.addEventListener('click', function () {
    var next = state.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('dn-theme', next); } catch (e) {}
    state.theme = next;
    state.sky = next === 'light' ? 'day' : 'night';
    state.auto = false;
    // replay the icon-in animation on the newly shown icon
    var svg = btn.querySelector(next === 'light' ? '.icon-moon' : '.icon-sun');
    svg.style.animation = 'none'; void svg.getBoundingClientRect(); svg.style.animation = '';
    render();
  });

  /* ---------- the painting ---------- */
  var gustT, pokeT;
  if (skyEl) {
    skyEl.addEventListener('click', function () {
      var el = pt();
      if (!el) return;
      if (state.sky === 'day') {
        el.setAttribute('data-gust', '1');
        clearTimeout(gustT); gustT = setTimeout(function () { el.setAttribute('data-gust', '0'); }, 3500);
      } else {
        state.poke = true; render();
        clearTimeout(pokeT); pokeT = setTimeout(function () { state.poke = false; render(); }, 12000);
      }
    });
    // the painting is ~550 KB of SVG: fetch it only once the page itself has loaded
    var loadSky = function () {
      var s = document.createElement('script');
      s.src = 'sky.js';
      s.onload = mountSky;
      document.head.appendChild(s);
    };
    if (document.readyState === 'complete') loadSky();
    else window.addEventListener('load', loadSky);
  }

  function mountSky() {
    var inner = skyEl.querySelector('[data-sky-inner]');
    inner.innerHTML = window.SKY_SVG;
    var el = pt();
    quality(el);
    render();
    requestAnimationFrame(function () { inner.classList.add('is-in'); });
    // pause the painting when it is off screen or the tab is hidden
    var off = false;
    var update = function () {
      el.setAttribute('data-paused', off || document.hidden ? '1' : '0');
      if (!off && !document.hidden) el.dispatchEvent(new Event('sky:visible'));
    };
    document.addEventListener('visibilitychange', update);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { off = !es[0].isIntersecting; update(); }).observe(el);
    } else update();
  }

  /* ---------- painting quality: full → lite → static ----------
     Every animated SVG shape costs main-thread work each frame, so weak devices get fewer.
     Start from device hints, then watch real frames once the painting is on screen and step
     down while the median frame is slower than ~45 fps. Never steps back up within a session. */
  function quality(el) {
    var LEVELS = ['full', 'lite', 'static'];
    var nav = navigator, saved = null;
    try { saved = sessionStorage.getItem('dn-sky-q'); } catch (e) {}
    var q = LEVELS.indexOf(saved) >= 0 ? saved
      : nav.connection && nav.connection.saveData ? 'static'
      : (nav.hardwareConcurrency || 8) < 4 || (nav.deviceMemory || 8) < 4 ? 'lite' : 'full';
    var set = function (v) {
      q = v; el.setAttribute('data-q', v);
      try { sessionStorage.setItem('dn-sky-q', v); } catch (e) {}
    };
    set(q);
    var probing = false;
    var probe = function () {
      if (probing || q === 'static' || el.getAttribute('data-paused') === '1') return;
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
  setInterval(tick, 30000);

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
