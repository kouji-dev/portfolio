import * as T from 'three';
// ---------------------------------------------------------------- night glow and moonbeams
// The rain's technique for light: the finished frame goes to a target, small copies of it are blurred, and one pass puts it
// back on. What is bright (lanterns, lit windows, the tower's lights, fireworks) bleeds a soft halo in its own colour, and
// the moon throws beams through the gaps in the clouds. Screen-blended so the painting's flat colours never wash out.
// Only at dusk and night, and only on the full tier (mount.js).
export function Glow(renderer) {
  var W = 0, H = 0, k = 0, ray = new T.Vector4();
  function rt() { var r = new T.WebGLRenderTarget(4, 4); r.texture.generateMipmaps = false; return r; }
  var rtF = rt(), rtQ = rt(), rtB = rt(), rtB2 = rt(), rtE = rt(), rtE2 = rt(), rtR = rt();
  var cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), geo = new T.PlaneGeometry(2, 2), vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
  function pass(fs, u) { var m = new T.ShaderMaterial({ uniforms: u, vertexShader: vs, fragmentShader: fs, depthTest: false, depthWrite: false, transparent: false, blending: T.NoBlending }); var q = new T.Mesh(geo, m); q.frustumCulled = false; var s = new T.Scene(); s.add(q); return { scene: s, mat: m }; }
  function draw(p, to) { renderer.setRenderTarget(to); renderer.render(p.scene, cam); }
  // a 4-tap box at offsets of one source texel (as the rain's)
  var down = pass('uniform sampler2D tS; uniform vec2 uT; varying vec2 vUv; void main(){ gl_FragColor = .25 * (texture2D(tS, vUv - uT) + texture2D(tS, vUv + vec2(uT.x, -uT.y)) + texture2D(tS, vUv + vec2(-uT.x, uT.y)) + texture2D(tS, vUv + uT)); }',
    { tS: { value: null }, uT: { value: new T.Vector2() } });
  // what glows: the part of each colour above a soft knee (the frame is sRGB, premultiplied)
  var bright = pass('uniform sampler2D tS; varying vec2 vUv; void main(){ vec4 c = texture2D(tS, vUv); vec3 s = c.rgb; float l = max(s.r, max(s.g, s.b));\n' +
    ' gl_FragColor = vec4(s * smoothstep(.72, 1., l), 1.); }', { tS: { value: null } });
  // a 9-tap gaussian along uD (one texel steps)
  var blur = pass('uniform sampler2D tS; uniform vec2 uD; varying vec2 vUv; void main(){ vec4 c = texture2D(tS, vUv) * .2270;\n' +
    ' c += (texture2D(tS, vUv + uD * 1.3846) + texture2D(tS, vUv - uD * 1.3846)) * .3162; c += (texture2D(tS, vUv + uD * 3.2308) + texture2D(tS, vUv - uD * 3.2308)) * .0703; gl_FragColor = c; }',
    { tS: { value: null }, uD: { value: new T.Vector2() } });
  // moonbeams: from each pixel towards the moon, the light of the moon's disc (clouds in between block it), fading with distance
  var rays = pass('uniform sampler2D tS; uniform vec4 uM; uniform float uAsp; varying vec2 vUv;\n' +
    'void main(){ vec2 d = (uM.xy - vUv) / 30., p = vUv; float decay = 1.; vec3 acc = vec3(0.);\n' +
    ' for (int i = 0; i < 30; i++) { vec2 q = (p - uM.xy) * vec2(uAsp, 1.); float m = 1. - smoothstep(uM.w * .6, uM.w, length(q)); acc += texture2D(tS, p).rgb * m * decay; decay *= .955; p += d; }\n' +
    // painted beams rather than a plain halo: the light comes in soft spokes (an angle-hashed pattern), like the tower's searchlights
    ' vec2 r = (vUv - uM.xy) * vec2(uAsp, 1.); float an = atan(r.y, r.x) * 7.; float i0 = floor(an), sp = mix(fract(sin(i0 * 12.9898) * 43758.5), fract(sin((i0 + 1.) * 12.9898) * 43758.5), smoothstep(0., 1., fract(an)));\n' +
    ' float far = 1. - smoothstep(.0, .45, length(r)); gl_FragColor = vec4(acc / 30. * 1.8 * far * far * (.2 + 1. * sp) * uM.z, 1.); }',
    { tS: { value: null }, uM: { value: ray }, uAsp: { value: 1 } });
  // the frame plus its glow, screen-blended: lights soften and spread, nothing burns to white
  var comp = pass('uniform sampler2D tF, tB, tE, tR; uniform float uK, uR; varying vec2 vUv;\n' +
    'void main(){ vec4 c = texture2D(tF, vUv); vec3 g = (texture2D(tB, vUv).rgb * .5 + texture2D(tE, vUv).rgb * .65) * uK + texture2D(tR, vUv).rgb * uR;\n' +
    ' g = min(g, vec3(1.)); gl_FragColor = vec4(c.rgb + g * (1. - c.rgb) * c.a, c.a); }',
    { tF: { value: rtF.texture }, tB: { value: rtB.texture }, tE: { value: rtE.texture }, tR: { value: rtR.texture }, uK: { value: 0 }, uR: { value: 0 } });
  return {
    target: rtF,
    setSize: function (w, h) {
      if (w === W && h === H) return; W = w; H = h;
      var q = [Math.max(1, w >> 2), Math.max(1, h >> 2)], e = [Math.max(1, w >> 3), Math.max(1, h >> 3)];
      rtF.setSize(w, h); rtQ.setSize(q[0], q[1]); rtB.setSize(q[0], q[1]); rtB2.setSize(q[0], q[1]); rtR.setSize(q[0], q[1]); rtE.setSize(e[0], e[1]); rtE2.setSize(e[0], e[1]);
      rays.mat.uniforms.uAsp.value = w / h;
    },
    // strength: 0 by day .. 1 at night; moon: null or { x, y } (0..1, y up), r (disc radius in screen heights), a (0..1)
    update: function (strength, moon) {
      k = strength;
      if (moon && moon.a > 0.01) ray.set(moon.x, moon.y, moon.a, moon.r); else ray.z = 0;
    },
    active: function () { return k > 0.02; },
    // the frame (in target) with its glow, into out (null: the canvas)
    render: function (out) {
      var u = down.mat.uniforms; u.tS.value = rtF.texture; u.uT.value.set(1 / W, 1 / H); draw(down, rtQ);
      bright.mat.uniforms.tS.value = rtQ.texture; draw(bright, rtB);
      var b = blur.mat.uniforms, qw = rtB.width, qh = rtB.height;
      b.tS.value = rtB.texture; b.uD.value.set(1 / qw, 0); draw(blur, rtB2); b.tS.value = rtB2.texture; b.uD.value.set(0, 1 / qh); draw(blur, rtB);
      u.tS.value = rtB.texture; u.uT.value.set(0.5 / qw, 0.5 / qh); draw(down, rtE);
      b.tS.value = rtE.texture; b.uD.value.set(1 / rtE.width, 0); draw(blur, rtE2); b.tS.value = rtE2.texture; b.uD.value.set(0, 1 / rtE.height); draw(blur, rtE);
      var c = comp.mat.uniforms; c.uK.value = k; c.uR.value = ray.z > 0.01 ? k : 0;
      if (ray.z > 0.01) { rays.mat.uniforms.tS.value = rtQ.texture; draw(rays, rtR); }
      draw(comp, out || null);
    },
    dispose: function () { [rtF, rtQ, rtB, rtB2, rtE, rtE2, rtR].forEach(function (r) { r.dispose(); }); [down, bright, blur, rays, comp].forEach(function (p) { p.mat.dispose(); }); geo.dispose(); }
  };
}
