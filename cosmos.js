/* =========================================================================
   Cosmos backdrop + page FX — ported from the Claude Design "Portfolio"
   prototype (design/Portfolio.dc.html).

   - Three.js GLSL fullscreen quad: domain-warped nebula + twinkling glitter,
     with scroll drift (nebula rises, glitter thins, colors deepen) and mouse
     parallax. One GPU quad, one renderer, CSS-gradient fallback.
   - Scroll FX: nav progress ring, experience timeline draw + dot ignition,
     optional per-section palette journey.
   - Pointer FX: custom cursor (dot + trailing ring), magnetic CTAs,
     card spotlight. Fine pointers only; disabled under reduced motion.
   - Staggered scroll-reveal, hero headline word cascade, lazy live iframes,
     mobile menu, case-study panels.
   ========================================================================= */
(function () {
  'use strict';

  // --- Config (the values the design landed on) -------------------------
  var CONFIG = {
    heroStyle: 'nebula',    // nebula | aurora | plasma | midnight
    flowSpeed: 0.2,
    glitterIntensity: 0.4,
    accentJourney: false    // per-section palette morph (design default: off)
  };

  var THEME = {
    accent:  '#7AA2FF',
    accent2: '#C792EA',
    warm:    '#FFB454',
    glow:    'rgba(122,162,255,.4)'
  };

  // per-section palette journey stops (used when CONFIG.accentJourney)
  var PALETTE_STOPS = [
    { id: 'top',        accent: '#7AA2FF', accent2: '#C792EA', warm: '#FFB454' },
    { id: 'about',      accent: '#7AA2FF', accent2: '#C792EA', warm: '#FFB454' },
    { id: 'work',       accent: '#A78BFA', accent2: '#7AA2FF', warm: '#F2A6E8' },
    { id: 'stack',      accent: '#5EEAD4', accent2: '#7AA2FF', warm: '#FFB454' },
    { id: 'experience', accent: '#FFB454', accent2: '#C792EA', warm: '#7AA2FF' },
    { id: 'contact',    accent: '#7AA2FF', accent2: '#C792EA', warm: '#FFB454' }
  ];

  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var finePointer = window.matchMedia &&
    window.matchMedia('(pointer: fine)').matches;

  // shader targets (eased toward inside the render loop)
  var scrollTarget = 0;   // scroll position in viewport-heights
  var mouseXT = 0, mouseYT = 0;

  /* =======================================================================
     Scroll reveal — elements entering in the same pass cascade in (85ms)
     ======================================================================= */
  function setupReveal() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!els.length) return;

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      document.body.classList.remove('js-reveal');
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    document.body.classList.add('js-reveal');
    var io = new IntersectionObserver(function (entries) {
      var batch = [];
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          batch.push({ el: entry.target, top: entry.boundingClientRect.top });
          io.unobserve(entry.target);
        }
      });
      batch.sort(function (a, b) { return a.top - b.top; });
      batch.forEach(function (b, i) {
        setTimeout(function () { b.el.classList.add('is-visible'); }, i * 85);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });

    els.forEach(function (el) { io.observe(el); });

    // Safety net: reveal anything still hidden after a few seconds.
    setTimeout(function () {
      els.forEach(function (el) { el.classList.add('is-visible'); });
    }, 3500);
  }

  /* =======================================================================
     Hero headline — staggered word-by-word cascade
     ======================================================================= */
  function setupHeroSplit() {
    var h1 = document.querySelector('[data-splitwords]');
    if (!h1 || h1.dataset.split === '1' || prefersReduced) return;
    h1.dataset.split = '1';

    var units = [];
    Array.prototype.slice.call(h1.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var parts = node.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var s = document.createElement('span');
          s.style.display = 'inline-block';
          s.textContent = part;
          frag.appendChild(s);
          units.push(s);
        });
        h1.replaceChild(frag, node);
      } else if (node.nodeType === 1 && node.tagName !== 'BR') {
        node.style.display = 'inline-block';
        units.push(node);
      }
    });

    units.forEach(function (s, i) {
      s.style.opacity = '0';
      s.style.transform = 'translateY(26px)';
      s.style.transition =
        'opacity .7s cubic-bezier(.2,.7,.2,1) ' + (120 + i * 70) + 'ms,' +
        'transform .7s cubic-bezier(.2,.7,.2,1) ' + (120 + i * 70) + 'ms';
    });
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      units.forEach(function (s) { s.style.opacity = '1'; s.style.transform = 'none'; });
    }); });
    // safety: force visible if transitions never ran (print, throttled tab)
    setTimeout(function () {
      units.forEach(function (s) {
        if (parseFloat(getComputedStyle(s).opacity) < 0.05) {
          s.style.transition = 'none'; s.style.opacity = '1'; s.style.transform = 'none';
        }
      });
    }, 2200);
  }

  /* =======================================================================
     Mobile menu
     ======================================================================= */
  function setupMenu() {
    var btn = document.querySelector('[data-menubtn]');
    var menu = document.querySelector('[data-mobile-menu]');
    if (!btn || !menu) return;
    var closeBtn = menu.querySelector('[data-menuclose]');

    function open() {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
    btn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    Array.prototype.slice.call(menu.querySelectorAll('a')).forEach(function (a) {
      a.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) close();
    });
  }

  /* =======================================================================
     Case-study panels (+ / − toggle)
     ======================================================================= */
  function setupCasePanels() {
    Array.prototype.slice.call(document.querySelectorAll('[data-case-toggle]')).forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;
      btn.addEventListener('click', function () {
        var openNow = panel.classList.toggle('open');
        btn.setAttribute('aria-expanded', openNow ? 'true' : 'false');
        btn.textContent = openNow ? '− case study' : '+ case study';
      });
    });
  }

  /* =======================================================================
     Lazy live iframes — load when scrolled near (±700px)
     ======================================================================= */
  function setupLazyIframes() {
    var frames = Array.prototype.slice.call(document.querySelectorAll('iframe[data-lazy-src]'));
    if (!frames.length) return;

    function load(f) {
      var u = f.getAttribute('data-lazy-src');
      if (u && !f.getAttribute('src')) f.src = u;
    }
    if (typeof IntersectionObserver === 'undefined') {
      frames.forEach(load);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { load(entry.target); io.unobserve(entry.target); }
      });
    }, { rootMargin: '700px 0px' });
    frames.forEach(function (f) { io.observe(f); });
  }

  /* =======================================================================
     Card spotlight — radial highlight follows the cursor inside cards
     ======================================================================= */
  function setupCardFX() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.card, .stack-card'));
    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.background = 'radial-gradient(260px circle at ' + x + 'px ' + y + 'px, rgba(255,255,255,.06), rgba(255,255,255,.02))';
      });
      card.addEventListener('mouseleave', function () {
        card.style.background = '';
      });
    });
  }

  /* =======================================================================
     Pointer FX — custom cursor (dot + trailing ring), magnetic CTAs,
     shader mouse-parallax targets. Fine pointers only.
     ======================================================================= */
  function setupPointerFX() {
    var dot = document.querySelector('[data-cursor-dot]');
    var ring = document.querySelector('[data-cursor-ring]');
    var cx = -100, cy = -100, rx = -100, ry = -100, rs = 1, rsT = 1, seen = false;
    var magnet = null;
    var cursorStyle = null;

    document.addEventListener('mousemove', function (e) {
      // shader parallax targets (normalized -0.5..0.5, y flipped for GL)
      var w = window.innerWidth || 1, h = window.innerHeight || 1;
      mouseXT = (e.clientX / w - 0.5);
      mouseYT = (0.5 - e.clientY / h);

      if (!finePointer || prefersReduced) return;
      cx = e.clientX; cy = e.clientY; seen = true;

      // cursor grows over interactive elements
      var inter = e.target && e.target.closest && e.target.closest('a,button,[data-card]');
      rsT = inter ? 1.7 : 1;

      // magnetic CTAs
      var m = e.target && e.target.closest && e.target.closest('[data-magnet]');
      if (m !== magnet) {
        if (magnet) {
          magnet.style.transform = '';
          magnet.style.transition = 'transform .35s cubic-bezier(.2,.8,.2,1)';
        }
        magnet = m;
        if (magnet) magnet.style.transition = 'transform .12s ease-out';
      }
      if (magnet) {
        var r = magnet.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.28;
        magnet.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
      }
    }, { passive: true });

    if (!finePointer || prefersReduced || !dot || !ring) return;

    function setCursorHidden(on) {
      if (on && !cursorStyle) {
        cursorStyle = document.createElement('style');
        cursorStyle.textContent = '*{cursor:none !important}';
        document.head.appendChild(cursorStyle);
      } else if (!on && cursorStyle) {
        cursorStyle.remove();
        cursorStyle = null;
      }
    }

    function loop() {
      if (seen) {
        if (dot.style.display !== 'block') {
          dot.style.display = 'block'; ring.style.display = 'block'; setCursorHidden(true);
        }
        rx += (cx - rx) * 0.16; ry += (cy - ry) * 0.16; rs += (rsT - rs) * 0.18;
        dot.style.transform = 'translate(' + (cx - 3) + 'px,' + (cy - 3) + 'px)';
        ring.style.transform = 'translate(' + (rx - 18) + 'px,' + (ry - 18) + 'px) scale(' + rs.toFixed(3) + ')';
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* =======================================================================
     Scroll FX — progress ring, timeline draw + dots, palette journey,
     shader scroll target
     ======================================================================= */
  function hexRGB(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function lerpHex(a, b, t) {
    var A = hexRGB(a), B = hexRGB(b);
    var c = A.map(function (v, i) { return Math.round(v + (B[i] - v) * t); });
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }
  function lerpArr(a, b, t) {
    return a.map(function (v, i) { return v + (b[i] - v) * t; });
  }

  function setupScrollFX() {
    var ring = document.querySelector('[data-progress-ring]');
    var wrap = document.querySelector('[data-timeline-wrap]');
    var fill = document.querySelector('[data-timeline-fill]');
    var dots = Array.prototype.slice.call(document.querySelectorAll('.tl-dot'));

    function update() {
      var sy = window.scrollY || 0;
      var vh = window.innerHeight || 800;
      var docH = Math.max(document.documentElement.scrollHeight - vh, 1);

      // shader scroll target (in viewport-heights)
      scrollTarget = sy / vh;

      // nav progress ring
      if (ring) ring.style.strokeDashoffset = String(87.96 * (1 - Math.min(sy / docH, 1)));

      // experience timeline draw + dot ignition
      if (wrap && fill) {
        var r = wrap.getBoundingClientRect();
        var prog = Math.min(Math.max((vh * 0.72 - r.top) / r.height, 0), 1);
        fill.style.height = (prog * 100) + '%';
        dots.forEach(function (d) {
          d.classList.toggle('on', d.getBoundingClientRect().top < vh * 0.72);
        });
      }

      // section palette journey (off by default, matches design)
      if (!CONFIG.accentJourney) return;
      var stops = PALETTE_STOPS.map(function (s) {
        var el = document.getElementById(s.id);
        return el ? { s: s, pos: el.offsetTop + el.offsetHeight * 0.5 } : null;
      }).filter(Boolean);
      if (stops.length < 2) return;
      var c = sy + vh * 0.45;
      var a = stops[0], b = stops[0], t = 0;
      if (c <= stops[0].pos) { a = b = stops[0]; }
      else if (c >= stops[stops.length - 1].pos) { a = b = stops[stops.length - 1]; }
      else {
        for (var i = 0; i < stops.length - 1; i++) {
          if (c >= stops[i].pos && c <= stops[i + 1].pos) {
            a = stops[i]; b = stops[i + 1];
            t = (c - a.pos) / Math.max(b.pos - a.pos, 1);
            break;
          }
        }
      }
      var root = document.documentElement;
      var av = lerpArr(hexRGB(a.s.accent), hexRGB(b.s.accent), t);
      root.style.setProperty('--accent', lerpHex(a.s.accent, b.s.accent, t));
      root.style.setProperty('--accent2', lerpHex(a.s.accent2, b.s.accent2, t));
      root.style.setProperty('--warm', lerpHex(a.s.warm, b.s.warm, t));
      root.style.setProperty('--glow', 'rgba(' + Math.round(av[0]) + ',' + Math.round(av[1]) + ',' + Math.round(av[2]) + ',.4)');
      if (gl) {
        var bv = lerpArr(hexRGB(a.s.accent2), hexRGB(b.s.accent2), t);
        var cv = lerpArr(hexRGB(a.s.warm), hexRGB(b.s.warm), t);
        gl.uniforms.uA.value.setRGB(av[0] / 255, av[1] / 255, av[2] / 255);
        gl.uniforms.uB.value.setRGB(bv[0] / 255, bv[1] / 255, bv[2] / 255);
        gl.uniforms.uC.value.setRGB(cv[0] / 255, cv[1] / 255, cv[2] / 255);
        if (paused) gl.renderer.render(gl.scene, gl.camera);
      }
    }

    var raf = null;
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(function () { raf = null; update(); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* =======================================================================
     WebGL cosmos
     ======================================================================= */
  var gl = null;          // { renderer, scene, camera, uniforms, canvas }
  var heroRaf = 0;
  var heroResizeRaf = 0;
  var paused = false;
  var startTime = 0;

  function hexv(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255
    ];
  }

  var VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position,1.0); }';

  var FRAG = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform float uTime,uSpeed,uIntensity,uMode,uScroll;',
    'uniform vec2 uRes,uMouse;',
    'uniform vec3 uA,uB,uC;',
    'float hash(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.345); return fract(p.x*p.y); }',
    'float noise(vec2 p){ vec2 i=floor(p),f=fract(p); float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+vec2(1.,1.)); vec2 u=f*f*(3.-2.*f); return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }',
    'float fbm(vec2 p){ float v=0.,a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<6;i++){ v+=a*noise(p); p=m*p; a*=0.5; } return v; }',
    // sparkle / glitter layer — twinkling star points with cross rays
    'float glitter(vec2 uv,float scale,float t,float seed){',
    '  vec2 g=uv*scale; vec2 id=floor(g); vec2 f=fract(g)-0.5;',
    '  float r=hash(id+seed);',
    '  if(r<0.82) return 0.0;',
    '  vec2 off=(vec2(hash(id+seed+1.7),hash(id+seed+4.3))-0.5)*0.7;',
    '  vec2 d=f-off; float dist=length(d);',
    '  float tw=max(0.0,sin(t*(0.7+r*1.6)+r*6.2831)); tw=pow(tw,7.0);',
    '  float core=smoothstep(0.07,0.0,dist);',
    '  float rayx=smoothstep(0.45,0.0,abs(d.x))*smoothstep(0.045,0.0,abs(d.y));',
    '  float rayy=smoothstep(0.45,0.0,abs(d.y))*smoothstep(0.045,0.0,abs(d.x));',
    '  return (core+(rayx+rayy)*0.6)*tw;',
    '}',
    'void main(){',
    '  vec2 uv=vUv; vec2 p=(uv-0.5); p.x*=uRes.x/uRes.y;',
    // mouse parallax on the whole field, scroll drifts the nebula upward
    '  p+=uMouse*0.07;',
    '  vec2 ps=p+vec2(uMouse.x*0.03, uScroll*0.22);',
    '  float t=uTime*uSpeed;',
    // domain-warped flow field
    '  vec2 q=vec2(fbm(ps*2.2+vec2(0.0,t*0.15)), fbm(ps*2.2+vec2(5.2,-t*0.12)));',
    '  vec2 rr=vec2(fbm(ps*2.2+q*1.4+vec2(1.7,9.2)+t*0.10), fbm(ps*2.2+q*1.4+vec2(8.3,2.8)-t*0.08));',
    '  float f=fbm(ps*2.2+rr*1.4);',
    '  if(uMode>0.5 && uMode<1.5){ f=fbm(vec2(ps.x*1.6, ps.y*3.2 - t*0.35)+rr*1.2); }',   // aurora: vertical bands
    '  if(uMode>1.5 && uMode<2.5){ f=fbm(ps*3.0+rr*2.2+t*0.05); f=0.5+0.5*sin(f*6.2831+t); }', // plasma: swirling
    '  vec3 base=vec3(0.016,0.022,0.045);',
    '  if(uMode>2.5){ base=vec3(0.01,0.012,0.03); f*=0.8; }', // midnight: darker
    '  vec3 col=base;',
    '  col=mix(col,uA, smoothstep(0.18,0.78,f)*0.75);',
    '  col=mix(col,uB, smoothstep(0.42,0.95,f+rr.x*0.3)*0.6);',
    '  col=mix(col,uC, smoothstep(0.7,1.0,f*rr.y+0.18)*0.45);',
    // glow pocket trails the cursor slightly
    '  vec2 gp=p-uMouse*0.18;',
    '  float glow=exp(-dot(gp,gp)*2.6); col+=uA*glow*0.28;',
    '  col*=mix(0.5,1.0, smoothstep(1.05,0.0,length(p)));', // vignette
    // glitter overlay (additive), thins out slightly as you scroll into the page
    '  float gM=(uMode>2.5)?1.35:1.0;',
    '  float spk=glitter(p,12.0,t*1.3,0.0)+glitter(p,21.0,t*1.6,11.3);',
    '  spk*=uIntensity*gM*(1.0-clamp(uScroll*0.10,0.0,0.45));',
    '  col+=vec3(1.0,1.0,1.06)*clamp(spk,0.0,2.0)*0.85;',
    '  col+=uA*clamp(spk,0.0,2.0)*0.12;',
    // deepen slightly with scroll so content sits on calmer space
    '  col*=1.0-clamp(uScroll*0.05,0.0,0.22);',
    '  col=pow(col, vec3(0.95));',
    '  gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  function buildCosmos(attempt) {
    var host = document.querySelector('[data-hero-bg]');
    if (!host) return;

    // Soft CSS fallback painted underneath while WebGL spins up (or if it fails).
    host.style.background =
      'radial-gradient(120% 90% at 50% 32%, ' + THEME.glow + ' 0%, transparent 55%),' +
      'radial-gradient(80% 70% at 78% 80%, color-mix(in srgb,' + THEME.accent2 + ' 22%, transparent), transparent 60%),' +
      '#05060B';

    // Three.js may still be loading from the CDN — wait, then build.
    if (typeof THREE === 'undefined') {
      attempt = (attempt || 0) + 1;
      if (attempt < 60) setTimeout(function () { buildCosmos(attempt); }, 80);
      return;
    }

    var A = hexv(THEME.accent), B = hexv(THEME.accent2), C = hexv(THEME.warm);
    var modeMap = { nebula: 0.0, aurora: 1.0, plasma: 2.0, midnight: 3.0 };
    var mode = modeMap[CONFIG.heroStyle] != null ? modeMap[CONFIG.heroStyle] : 0.0;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        // persist the buffer so screenshots / PDF exports / OG captures of the
        // fixed canvas render correctly (negligible cost for a single quad)
        preserveDrawingBuffer: true
      });
    } catch (e) {
      return; // keep CSS fallback
    }
    renderer.setClearColor(0x05060B, 1);

    var canvas = renderer.domElement;
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    host.innerHTML = '';
    host.appendChild(canvas);

    var scene = new THREE.Scene();
    var camera = new THREE.Camera();
    var uniforms = {
      uTime:      { value: 0 },
      uRes:       { value: new THREE.Vector2(1, 1) },
      uA:         { value: new THREE.Color(A[0], A[1], A[2]) },
      uB:         { value: new THREE.Color(B[0], B[1], B[2]) },
      uC:         { value: new THREE.Color(C[0], C[1], C[2]) },
      uSpeed:     { value: CONFIG.flowSpeed },
      uIntensity: { value: CONFIG.glitterIntensity },
      uMode:      { value: mode },
      uScroll:    { value: 0 },
      uMouse:     { value: new THREE.Vector2(0, 0) }
    };

    var material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    gl = { renderer: renderer, scene: scene, camera: camera, uniforms: uniforms, canvas: canvas };

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var W = host.clientWidth || window.innerWidth || 0;
      var H = host.clientHeight || window.innerHeight || 0;
      if (W < 2 || H < 2) { heroResizeRaf = requestAnimationFrame(resize); return; }
      renderer.setPixelRatio(dpr);
      renderer.setSize(W, H, false);
      uniforms.uRes.value.set(W, H);
    }
    window.addEventListener('resize', resize);
    resize();

    startTime = performance.now();
    function frame(now) {
      uniforms.uTime.value = (now - startTime) / 1000;
      // ease scroll + mouse toward their targets for smooth parallax
      uniforms.uScroll.value += (scrollTarget - uniforms.uScroll.value) * 0.06;
      uniforms.uMouse.value.x += (mouseXT - uniforms.uMouse.value.x) * 0.05;
      uniforms.uMouse.value.y += (mouseYT - uniforms.uMouse.value.y) * 0.05;
      renderer.render(scene, camera);
      if (!paused) heroRaf = requestAnimationFrame(frame);
    }

    if (prefersReduced) {
      // Render one rich still frame and stop.
      paused = true;
      uniforms.uTime.value = 8.0;
      renderer.render(scene, camera);
    } else {
      paused = false;
      heroRaf = requestAnimationFrame(frame);
      // Pause the loop when the tab is hidden to save the GPU.
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          paused = true;
          if (heroRaf) cancelAnimationFrame(heroRaf);
        } else if (paused) {
          paused = false;
          startTime = performance.now() - uniforms.uTime.value * 1000;
          heroRaf = requestAnimationFrame(frame);
        }
      });
    }
  }

  function init() {
    setupReveal();
    setupHeroSplit();
    setupMenu();
    setupCasePanels();
    setupLazyIframes();
    setupCardFX();
    setupPointerFX();
    setupScrollFX();
    buildCosmos();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
