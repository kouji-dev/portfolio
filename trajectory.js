/* =========================================================================
   Commit trajectory — weekly stacked commit graph in the Experience section.

   Ported from the Claude Design mockup (design/Portfolio.dc.html). Each repo
   carries dated work phases bounded by its plans, specs, releases and design
   captures on the default branch; buildSeries expands them into deterministic
   weekly buckets (seeded sin noise, no Math.random) so every visit renders
   the same chart. The mockup's React state/polling is replaced with direct
   DOM rendering, IntersectionObserver triggers and pointer handlers.
   ========================================================================= */
(function () {
  'use strict';

  var WEEK_START = '2025-12-01';
  var WEEK_COUNT = 37;
  var REPOS = [
    { key: 'pages', name: 'pages', role: 'Delivery + knowledge workspace', color: '#9CA6C4',
      phases: [['2025-12-01', '2026-01-25', 22]] },
    { key: 'acta', name: 'acta', role: 'Task + calendar execution platform', color: '#7BD88F',
      phases: [['2026-01-05', '2026-03-15', 17]] },
    { key: 'asda', name: 'asda', role: 'Commerce ops — POS + admin', color: '#F2777A',
      phases: [['2026-02-09', '2026-04-26', 31]] },
    { key: 'kouji-ui', name: 'kouji-ui', role: 'Angular UI framework + tokens', color: '#5FD3C4',
      phases: [['2026-04-27', '2026-06-07', 38], ['2026-06-29', '2026-07-19', 26]] },
    { key: 'orrery', name: 'Orrery', role: 'Mission control for coding agents', color: '#7AA2FF',
      phases: [['2026-02-16', '2026-05-10', 26], ['2026-05-11', '2026-06-21', 44], ['2026-06-22', '2026-08-17', 30]] },
    { key: 'vortex', name: 'Vortex', role: 'Enterprise LLM gateway', color: '#C792EA',
      phases: [['2026-06-29', '2026-08-17', 29]] },
    { key: 'preesm', name: 'preesm', role: 'Franchisee portal — auth, onboarding', color: '#F5B544',
      phases: [['2026-06-29', '2026-08-17', 25]] }
  ];

  var svgEl = document.querySelector('[data-traj-chart]');
  var legendEl = document.querySelector('[data-traj-legend]');
  var lanesEl = document.querySelector('[data-traj-lanes]');
  var ticksEl = document.querySelector('[data-traj-ticks]');
  var tipEl = document.querySelector('[data-traj-tip]');
  var wrapEl = document.querySelector('[data-traj-chart-wrap]');
  if (!svgEl || !legendEl || !lanesEl || !ticksEl || !tipEl || !wrapEl) return;

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var W = 1000, H = 280, TOP = 14;
  var MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WK = 7 * 864e5;
  var T0 = Date.parse(WEEK_START + 'T00:00:00Z');

  function noise(s) { var x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); }

  function buildSeries() {
    REPOS.forEach(function (r, ri) {
      var m = new Array(WEEK_COUNT).fill(0);
      r.phases.forEach(function (p, pi) {
        var a = Math.round((Date.parse(p[0] + 'T00:00:00Z') - T0) / WK);
        var b = Math.round((Date.parse(p[1] + 'T00:00:00Z') - T0) / WK);
        for (var i = Math.max(0, a); i <= Math.min(WEEK_COUNT - 1, b); i++) {
          var t = b === a ? 1 : (i - a) / (b - a);
          var hump = Math.sin(Math.PI * Math.min(0.94, Math.max(0.1, t)));
          m[i] = Math.max(1, Math.round(p[2] * hump * (0.66 + 0.7 * noise(ri * 31 + pi * 11 + i))));
        }
      });
      r.m = m;
    });
  }

  function dateOf(i) { return new Date(T0 + i * WK); }
  function weekLabel(i) { var d = dateOf(i); return 'Week of ' + MO[d.getUTCMonth()] + ' ' + d.getUTCDate(); }
  // a week belongs to the month holding its midweek, so a Mon-29th week reads as the next month
  function shortLabel(i) { var d = new Date(T0 + i * WK + 3 * 864e5); return MO[d.getUTCMonth()] + " '" + String(d.getUTCFullYear()).slice(2); }
  function x(i) { return (i / (WEEK_COUNT - 1)) * W; }
  function nf(v) { return Math.round(v).toLocaleString('en-US'); }

  function smooth(pts) {
    if (!pts.length) return '';
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1], t = 0.2;
      d += ' C' + (p1[0] + (p2[0] - p0[0]) * t).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) * t).toFixed(1) +
           ',' + (p2[0] - (p3[0] - p1[0]) * t).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) * t).toFixed(1) +
           ',' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  buildSeries();

  var perWeek = [];
  for (var wi = 0; wi < WEEK_COUNT; wi++) {
    perWeek.push(REPOS.reduce(function (s, r) { return s + r.m[wi]; }, 0));
  }
  var peak = Math.max.apply(null, perWeek.concat([1]));
  function y(v) { return H - (v / peak) * (H - TOP); }

  var totals = REPOS.map(function (r) { return r.m.reduce(function (a, b) { return a + b; }, 0); });
  var grand = totals.reduce(function (a, b) { return a + b; }, 0);

  // stacked bands: cum[ri][i] is the stack top for repo ri at week i
  var base = new Array(WEEK_COUNT).fill(0);
  var cum = [];
  var bands = REPOS.map(function (r, ri) {
    var top = base.map(function (b, i) { return b + r.m[i]; });
    cum.push(top.slice());
    var linePts = top.map(function (v, i) { return [x(i), y(v)]; });
    var basePts = base.map(function (v, i) { return [x(i), y(v)]; });
    var dLine = smooth(linePts);
    var dFill = dLine + ' ' + smooth(basePts.reverse()).replace('M', 'L') + ' Z';
    base = top;
    return { name: r.name, color: r.color, dLine: dLine, dFill: dFill,
             share: Math.round((totals[ri] / grand) * 100) + '%' };
  });

  /* ---------- static DOM ---------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function legendDot(color, size) {
    var s = svg('svg', { width: size, height: size, viewBox: '0 0 10 10' });
    s.appendChild(svg('circle', { cx: 5, cy: 5, r: 5, fill: color }));
    return s;
  }

  // legend
  bands.forEach(function (b) {
    var item = el('div', 'traj-legend-item');
    item.appendChild(legendDot(b.color, 9));
    item.appendChild(el('span', 'traj-legend-name', b.name));
    item.appendChild(el('span', 'traj-legend-share', b.share));
    legendEl.appendChild(item);
  });

  // month boundaries → axis ticks + dashed year lines in the chart
  var monthStarts = [];
  for (var mi = 0; mi < WEEK_COUNT; mi++) {
    if (mi === 0 || dateOf(mi).getUTCMonth() !== dateOf(mi - 1).getUTCMonth()) monthStarts.push(mi);
  }
  monthStarts.forEach(function (i) {
    if (i > 0) svgEl.appendChild(svg('line',
      { x1: x(i).toFixed(1), y1: 0, x2: x(i).toFixed(1), y2: H, 'class': 'traj-year' }));
    var tick = el('span', 'traj-tick', MO[dateOf(i).getUTCMonth()]);
    tick.style.left = (i / (WEEK_COUNT - 1)) * 100 + '%';
    tick.style.transform = i === 0 ? 'none'
      : (i > WEEK_COUNT - 3 ? 'translateX(-100%)' : 'translateX(-50%)');
    ticksEl.appendChild(tick);
  });

  // bands: all fills, then all outlines on top
  var fillEls = bands.map(function (b) {
    var p = svg('path', { d: b.dFill, fill: b.color, opacity: '.42' });
    p.style.transformBox = 'fill-box';
    p.style.transformOrigin = 'bottom center';
    svgEl.appendChild(p);
    return p;
  });
  var lineEls = bands.map(function (b) {
    var p = svg('path', { d: b.dLine, fill: 'none', stroke: b.color,
                          'stroke-width': 2, 'stroke-linecap': 'round' });
    svgEl.appendChild(p);
    return p;
  });

  // hover layer: guide line + dots group under the transparent capture columns
  var guideEl = svg('line', { y1: 0, y2: H, 'class': 'traj-guide' });
  guideEl.style.display = 'none';
  svgEl.appendChild(guideEl);
  var dotsG = svg('g', {});
  svgEl.appendChild(dotsG);

  var cw = W / (WEEK_COUNT - 1);
  for (var ci = 0; ci < WEEK_COUNT; ci++) {
    var rect = svg('rect', { x: (x(ci) - cw / 2).toFixed(1), y: 0, width: cw.toFixed(1),
                             height: H, fill: 'transparent', 'data-i': ci, 'class': 'traj-col' });
    rect.addEventListener('mouseenter', onCol);
    rect.addEventListener('mousemove', onCol);
    svgEl.appendChild(rect);
  }
  wrapEl.addEventListener('mouseleave', hideTip);

  // per-repo activity lanes, most recently active first
  var laneVeins = [];
  REPOS.map(function (r, ri) {
    var act = [];
    r.m.forEach(function (v, i) { if (v > 0) act.push(i); });
    var first = act[0] || 0, last = act[act.length - 1] || 0;
    var rPeak = Math.max.apply(null, r.m.concat([1]));
    var topPts = [], botPts = [];
    for (var i = first; i <= last; i++) {
      var half = (2.5 + 17 * (r.m[i] / rPeak)) / 2;
      topPts.push([x(i), 21 - half]);
      botPts.push([x(i), 21 + half]);
    }
    var d = smooth(topPts) + ' ' + smooth(botPts.reverse()).replace('M', 'L') + ' Z';
    return {
      name: r.name, role: r.role, color: r.color, d: d, first: first, last: last,
      span: shortLabel(first) + ' → ' + (last >= WEEK_COUNT - 2 ? 'now' : shortLabel(last)),
      detail: nf(totals[ri]) + ' commits · ' + r.m.filter(function (c) { return c > 0; }).length + ' active weeks'
    };
  }).sort(function (a, b) {
    return (b.last - a.last) || (b.first - a.first);
  }).forEach(function (l) {
    var row = el('div', 'traj-lane');
    var head = el('div');
    head.appendChild(el('div', 'traj-lane-name', l.name));
    head.appendChild(el('div', 'traj-lane-role', l.role));
    row.appendChild(head);
    var s = svg('svg', { viewBox: '0 0 1000 42', preserveAspectRatio: 'none' });
    s.appendChild(svg('line', { x1: 0, y1: 21, x2: 1000, y2: 21, 'class': 'traj-lane-base' }));
    var vein = svg('path', { d: l.d, fill: l.color, opacity: '.7' });
    vein.style.transformBox = 'fill-box';
    vein.style.transformOrigin = 'left center';
    s.appendChild(vein);
    laneVeins.push(vein);
    row.appendChild(s);
    var meta = el('div', 'traj-lane-meta');
    meta.appendChild(el('div', 'traj-lane-span', l.span));
    meta.appendChild(el('div', 'traj-lane-detail', l.detail));
    row.appendChild(meta);
    lanesEl.appendChild(row);
  });

  // stat tiles
  var countEls = document.querySelectorAll('.traj-stats [data-count]');
  if (countEls[0]) countEls[0].setAttribute('data-target', grand);
  if (countEls[1]) countEls[1].setAttribute('data-target', REPOS.length);
  var weeksEl = document.querySelector('[data-traj-weeks]');
  if (weeksEl) weeksEl.textContent = 'in ' + WEEK_COUNT + ' weeks';

  /* ---------- hover tooltip ---------- */

  var hoverIdx = null;

  function onCol(e) {
    var i = parseInt(e.currentTarget.getAttribute('data-i'), 10);
    if (i === hoverIdx) return;
    if (!perWeek[i]) { hideTip(); return; }
    hoverIdx = i;

    guideEl.style.display = '';
    guideEl.setAttribute('x1', x(i).toFixed(1));
    guideEl.setAttribute('x2', x(i).toFixed(1));

    // rebuilt per week so the dotPop animation replays
    while (dotsG.firstChild) dotsG.removeChild(dotsG.firstChild);
    REPOS.forEach(function (r, ri) {
      if (!r.m[i]) return;
      dotsG.appendChild(svg('circle', {
        cx: x(i).toFixed(1), cy: y(cum[ri][i]).toFixed(1), r: 4.5,
        fill: '#05060B', stroke: r.color, 'stroke-width': 2.5, 'class': 'traj-dot'
      }));
    });

    while (tipEl.firstChild) tipEl.removeChild(tipEl.firstChild);
    tipEl.appendChild(el('div', 'traj-tip-label', weekLabel(i)));
    var rows = el('div', 'traj-tip-rows');
    REPOS.map(function (r) { return r; })
      .filter(function (r) { return r.m[i] > 0; })
      .sort(function (a, b) { return b.m[i] - a.m[i]; })
      .forEach(function (r) {
        var row = el('div', 'traj-tip-row');
        row.appendChild(legendDot(r.color, 9));
        row.appendChild(el('span', 'traj-tip-name', r.name));
        row.appendChild(el('span', 'traj-tip-detail', r.m[i] + ' commits'));
        rows.appendChild(row);
      });
    tipEl.appendChild(rows);
    var total = el('div', 'traj-tip-total');
    total.appendChild(el('span', undefined, 'total'));
    total.appendChild(el('span', undefined, perWeek[i] + ' commits'));
    tipEl.appendChild(total);

    var pct = (i / (WEEK_COUNT - 1)) * 100;
    tipEl.style.left = Math.min(88, Math.max(12, pct)) + '%';
    if (tipEl.hidden) tipEl.hidden = false;
  }

  function hideTip() {
    hoverIdx = null;
    tipEl.hidden = true;
    guideEl.style.display = 'none';
    while (dotsG.firstChild) dotsG.removeChild(dotsG.firstChild);
  }

  /* ---------- entrance animations ---------- */

  var EASE = 'cubic-bezier(.2,.8,.2,1)';

  function primeChart() {
    fillEls.forEach(function (p) {
      p.style.transform = 'scaleY(.03)';
      p.style.opacity = '0';
    });
    lineEls.forEach(function (p) {
      var len = 0;
      try { len = p.getTotalLength(); } catch (err) { len = 0; }
      if (!len) return;
      p.dataset.len = len;
      p.style.strokeDasharray = len + ' ' + len;
      p.style.strokeDashoffset = String(len);
    });
  }

  function playChart() {
    fillEls.forEach(function (p, i) {
      p.style.transition = 'transform .9s ' + EASE + ' ' + (i * 80) + 'ms, opacity .5s ease ' + (i * 80) + 'ms';
      p.style.transform = 'none';
      p.style.opacity = '.42';
    });
    lineEls.forEach(function (p, i) {
      if (!p.dataset.len) return;
      p.style.transition = 'stroke-dashoffset 1.2s ' + EASE + ' ' + (i * 80 + 100) + 'ms';
      p.style.strokeDashoffset = '0';
    });
  }

  function primeLanes() {
    laneVeins.forEach(function (p) { p.style.transform = 'scaleX(0)'; });
  }

  function playLanes() {
    laneVeins.forEach(function (p, i) {
      p.style.transition = 'transform .75s ' + EASE + ' ' + (i * 90) + 'ms';
      p.style.transform = 'none';
    });
  }

  function countUp(node) {
    var target = parseFloat(node.getAttribute('data-target') || '0');
    if (!target) return;
    var final = nf(target);
    if (reduceMotion) { node.textContent = final; return; }
    var t0 = performance.now(), dur = 1200;
    function step(t) {
      var p = Math.min(1, (t - t0) / dur);
      node.textContent = p < 1
        ? nf(target * (1 - Math.pow(1 - p, 3)))
        : final;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(countEls, function (n) {
      n.textContent = nf(parseFloat(n.getAttribute('data-target') || '0'));
    });
  } else {
    primeChart();
    primeLanes();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var t = entry.target;
        io.unobserve(t);
        if (t === svgEl) playChart();
        else if (t === lanesEl) playLanes();
        else countUp(t);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    io.observe(svgEl);
    io.observe(lanesEl);
    Array.prototype.forEach.call(countEls, function (n) { io.observe(n); });
  }
})();
