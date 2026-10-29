import * as T from 'three';
// ---------------------------------------------------------------- ink contours: a post pass on the depth buffer
export function Ink(renderer) {
  // prod: no MSAA (4× multisampling cost ~55 ms a frame on an Intel UHD); FXAA on the finished image instead (aa pass below)
  var rt = new T.WebGLRenderTarget(4, 4, { type: T.HalfFloatType });
  var rtA = new T.WebGLRenderTarget(4, 4); rtA.texture.generateMipmaps = false;
  rt.depthTexture = new T.DepthTexture(4, 4); rt.depthTexture.type = T.FloatType;
  var mat = new T.ShaderMaterial({
    uniforms: { tC: { value: rt.texture }, tD: { value: rt.depthTexture }, uTex: { value: new T.Vector2() }, uIw: { value: new T.Vector2(1 / 3, 1 / 3 - 1 / 9000) }, uW: { value: 1 }, uOn: { value: 1 }, uShim: { value: new T.Vector4() }, uFlash: { value: 0 }, tSky: { value: null }, uSky: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: 'uniform sampler2D tC, tD, tSky; uniform vec2 uTex, uIw; uniform float uW, uOn, uFlash, uSky; uniform vec4 uShim; varying vec2 vUv;\n' +
      // prod: 1/-perspectiveDepthToViewZ(d) = 1/near - d*(1/near - 1/far): one fma per tap instead of two divides (uIw set in render)
      // prod: textureLod: the depth texture is nearest with one level, so no derivatives are needed for the 9 taps
      'float iw(vec2 uv){ float d = textureLod(tD, uv, 0.).x; return d >= .99999 ? 0. : uIw.x - d * uIw.y; }\n' +
      // a heat shimmer over the road and the esplanade on hot afternoons
      'void main(){ vec2 suv = vUv; if (uShim.x > .01) { float band = smoothstep(uShim.y - .03, uShim.y, vUv.y) * (1. - smoothstep(uShim.z, uShim.z + .04, vUv.y)); suv.x += sin(vUv.y * 380. + uShim.w * 9.) * .0018 * band * uShim.x; suv.y += sin(vUv.x * 240. + uShim.w * 7.) * .0009 * band * uShim.x; }\n' +
      ' vec4 c = texture2D(tC, suv); gl_FragColor = c;\n' +
      ' if (uOn > .5) {\n' +
      ' float wc = iw(vUv); float z = wc > 0. ? 1. / wc : 1e5;\n' +
      ' float r = uW * clamp(260. / z, .75, 1.7) * (.85 + .3 * fract(sin(dot(floor(vUv * 90.), vec2(12.9898, 78.233))) * 43758.5453));\n' +
      ' float edge = 0.; vec2 best = vUv; float bw = wc;\n' +
      ' for (int i = 0; i < 4; i++) { vec2 dir = i == 0 ? vec2(1., 0.) : i == 1 ? vec2(0., 1.) : i == 2 ? vec2(.7071, .7071) : vec2(.7071, -.7071);\n' +
      '   vec2 o = dir * r * uTex; float wa = iw(vUv + o), wb = iw(vUv - o); float m = max(max(wa, wb), wc);\n' +
      // prod: |lap| / m > .16 tested as |lap| > .16 m (m > 0): no divide per direction
      '   if (abs(wa + wb - 2. * wc) > .16 * max(m, 1e-6)) { edge = 1.;\n' +
      '     if (wa > bw) { bw = wa; best = vUv + o; } if (wb > bw) { bw = wb; best = vUv - o; } } }\n' +
      ' if (edge > 0.) { vec4 n = texture2D(tC, best); vec3 ink = n.rgb * .5 / max(n.a, .001); gl_FragColor = vec4(mix(c.rgb / max(c.a, .001), ink, .9) * max(n.a, c.a), max(n.a, c.a)); }\n' +
      ' }\n' +
      // prod: sRGB written here (the pass renders into the FXAA target, where three would leave it linear)
      ' gl_FragColor.rgb /= max(gl_FragColor.a, .001);\ngl_FragColor = sRGBTransferOETF(gl_FragColor);\n gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(.93, .95, 1.), uFlash * .5); gl_FragColor.rgb *= gl_FragColor.a;\n' +
      // the sky picture under the 3D frame, composited in sRGB like the browser composited the SVG sky under the canvas
      ' if (uSky > .5) { vec4 sk = texture2D(tSky, vUv); gl_FragColor += sk * (1. - gl_FragColor.a); } }',
    depthTest: false, depthWrite: false, transparent: false, blending: T.NoBlending
  });
  var quad = new T.Mesh(new T.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
  var sc = new T.Scene(); sc.add(quad); var cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  // prod: FXAA (Lottes' FXAA 3.11, console variant) on the inked image, premultiplied alpha and all, straight to the canvas
  var aaMat = new T.ShaderMaterial({
    uniforms: { tA: { value: rtA.texture }, uTex: mat.uniforms.uTex },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: 'uniform sampler2D tA; uniform vec2 uTex; varying vec2 vUv;\n' +
      'void main(){ vec4 nw = texture2D(tA, vUv + vec2(-1., -1.) * uTex), ne = texture2D(tA, vUv + vec2(1., -1.) * uTex), sw = texture2D(tA, vUv + vec2(-1., 1.) * uTex), se = texture2D(tA, vUv + vec2(1., 1.) * uTex), m = texture2D(tA, vUv);\n' +
      ' vec3 L = vec3(.299, .587, .114); float lnw = dot(nw.rgb, L), lne = dot(ne.rgb, L), lsw = dot(sw.rgb, L), lse = dot(se.rgb, L), lm = dot(m.rgb, L);\n' +
      ' float lmin = min(lm, min(min(lnw, lne), min(lsw, lse))), lmax = max(lm, max(max(lnw, lne), max(lsw, lse)));\n' +
      ' vec2 dir = vec2(-((lnw + lne) - (lsw + lse)), (lnw + lsw) - (lne + lse)); float red = max((lnw + lne + lsw + lse) * (.25 / 8.), 1. / 128.);\n' +
      // prod: dir == 0 (flat areas) puts all 4 taps on vUv, so a == b == m exactly: skip them
      ' if (dir.x == 0. && dir.y == 0.) { gl_FragColor = m; return; }\n' +
      ' dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + red), vec2(-8.), vec2(8.)) * uTex;\n' +
      // prod: textureLod after the divergent branch: one linear level, so the implicit LOD never mattered
      ' vec4 a = .5 * (textureLod(tA, vUv + dir * (1. / 3. - .5), 0.) + textureLod(tA, vUv + dir * (2. / 3. - .5), 0.));\n' +
      ' vec4 b = a * .5 + .25 * (textureLod(tA, vUv - dir * .5, 0.) + textureLod(tA, vUv + dir * .5, 0.)); float lb = dot(b.rgb, L);\n' +
      ' gl_FragColor = lb < lmin || lb > lmax ? a : b; }',
    depthTest: false, depthWrite: false, transparent: false, blending: T.NoBlending
  });
  var aaQuad = new T.Mesh(quad.geometry, aaMat); aaQuad.frustumCulled = false; var aaSc = new T.Scene(); aaSc.add(aaQuad);
  return {
    mat: mat, rt: rt, quad: sc, aa: aaSc,
    setSize: function (w, h) { rt.setSize(w, h); rtA.setSize(w, h); mat.uniforms.uTex.value.set(1 / w, 1 / h); },
    // target: where the finished frame goes (the canvas by default; the rain's target while it rains)
    render: function (scene, camera, on, target) {
      mat.uniforms.uIw.value.set(1 / camera.near, 1 / camera.near - 1 / camera.far); mat.uniforms.uOn.value = on ? 1 : 0;
      renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera);
      renderer.setRenderTarget(rtA); renderer.clear(); renderer.render(sc, cam);
      renderer.setRenderTarget(target || null); renderer.clear(); renderer.render(aaSc, cam);
    },
    dispose: function () { rt.dispose(); rtA.dispose(); mat.dispose(); aaMat.dispose(); }
  };
}

