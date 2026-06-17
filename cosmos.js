/* =========================================================================
   Cosmos backdrop — a single Three.js GLSL fullscreen quad that combines a
   flowing domain-warped nebula with a twinkling glitter overlay. Runs as a
   fixed full-viewport layer behind the whole page for visual continuity.

   Ported from the Claude Design "Portfolio WebGL" prototype. One GPU quad,
   one renderer (no per-tweak context churn), CSS-gradient fallback while
   Three.js loads or if WebGL is unavailable.
   ========================================================================= */
(function () {
  'use strict';

  // --- Config (the values the design landed on) -------------------------
  var CONFIG = {
    heroStyle: 'nebula',   // nebula | aurora | plasma | midnight
    flowSpeed: 0.2,
    glitterIntensity: 0.4
  };

  var THEME = {
    accent:  '#7AA2FF',
    accent2: '#C792EA',
    warm:    '#FFB454',
    glow:    'rgba(122,162,255,.4)'
  };

  var prefersReduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =======================================================================
     Scroll reveal
     ======================================================================= */
  function setupReveal() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    if (!els.length) return;

    // No IntersectionObserver / reduced motion → show everything immediately.
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      document.body.classList.remove('js-reveal');
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    document.body.classList.add('js-reveal');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });

    els.forEach(function (el) { io.observe(el); });

    // Safety net: reveal anything still hidden after a few seconds (covers
    // never-scrolled short viewports and any observer hiccup).
    setTimeout(function () {
      els.forEach(function (el) { el.classList.add('is-visible'); });
    }, 3500);
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
    'uniform float uTime,uSpeed,uIntensity,uMode;',
    'uniform vec2 uRes;',
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
    '  float t=uTime*uSpeed;',
    // domain-warped flow field
    '  vec2 q=vec2(fbm(p*2.2+vec2(0.0,t*0.15)), fbm(p*2.2+vec2(5.2,-t*0.12)));',
    '  vec2 rr=vec2(fbm(p*2.2+q*1.4+vec2(1.7,9.2)+t*0.10), fbm(p*2.2+q*1.4+vec2(8.3,2.8)-t*0.08));',
    '  float f=fbm(p*2.2+rr*1.4);',
    '  if(uMode>0.5 && uMode<1.5){ f=fbm(vec2(p.x*1.6, p.y*3.2 - t*0.35)+rr*1.2); }',   // aurora: vertical bands
    '  if(uMode>1.5 && uMode<2.5){ f=fbm(p*3.0+rr*2.2+t*0.05); f=0.5+0.5*sin(f*6.2831+t); }', // plasma: swirling
    '  vec3 base=vec3(0.016,0.022,0.045);',
    '  if(uMode>2.5){ base=vec3(0.01,0.012,0.03); f*=0.8; }', // midnight: darker
    '  vec3 col=base;',
    '  col=mix(col,uA, smoothstep(0.18,0.78,f)*0.75);',
    '  col=mix(col,uB, smoothstep(0.42,0.95,f+rr.x*0.3)*0.6);',
    '  col=mix(col,uC, smoothstep(0.7,1.0,f*rr.y+0.18)*0.45);',
    '  float glow=exp(-dot(p,p)*2.6); col+=uA*glow*0.28;',
    '  col*=mix(0.5,1.0, smoothstep(1.05,0.0,length(p)));', // vignette
    // glitter overlay (additive), brighter in midnight mode
    '  float gM=(uMode>2.5)?1.35:1.0;',
    '  float spk=glitter(p,12.0,t*1.3,0.0)+glitter(p,21.0,t*1.6,11.3);',
    '  spk*=uIntensity*gM;',
    '  col+=vec3(1.0,1.0,1.06)*clamp(spk,0.0,2.0)*0.85;',
    '  col+=uA*clamp(spk,0.0,2.0)*0.12;',
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
      uMode:      { value: mode }
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
    buildCosmos();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
