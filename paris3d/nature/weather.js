import * as T from 'three';
import { clamp, lerp, rng } from '../core/util.js';

// ---------------------------------------------------------------- weather in the scene: snowflakes of three sizes, morning mist, light cones in the fog,
// breath clouds on frosty mornings, leaves and petals on a gust, rain splashing off the bridge parapets and dripping from the awnings
export function buildWeather(ctx) {
  var U = ctx.U, P = ctx.P, scene = ctx.scene, R = rng(321);
  // snow: flakes of three sizes in a box in front of us; the nearest and biggest drift slowly and out of line
  var fp = [], fa = [];
  for (var i = 0; i < 1400; i++) { var sz = i % 10 === 0 ? 2 : i % 3 === 0 ? 1 : 0, zz = sz === 2 ? 520 + R() * 70 : sz === 1 ? 430 + R() * 140 : 200 + R() * 380; fp.push((R() - 0.5) * (sz === 2 ? 60 : 160), R() * 40, zz); fa.push(sz, R() * 6.28, 0.6 + R() * 0.8); }
  var fg = new T.BufferGeometry(); fg.setAttribute('position', new T.Float32BufferAttribute(fp, 3)); fg.setAttribute('aF', new T.Float32BufferAttribute(fa, 3));
  var flM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uOn: { value: 0 }, uWind: U.uWind },
    vertexShader: 'attribute vec3 aF; uniform float uTime, uScale, uOn, uWind; varying float vS; void main(){ float sz = aF.x; vS = sz; float sp = (sz > 1.5 ? .9 : sz > .5 ? 1.5 : 2.2) * aF.z; vec3 p = position;\n' +
      ' p.y = mod(p.y - uTime * sp, 40.) - 2.; float sw = sz > 1.5 ? 1.6 : sz > .5 ? .7 : .3; p.x += sin(uTime * (.7 + aF.z * .4) + aF.y) * sw + uWind * uTime * .3 * (sz + 1.) - floor((uWind * uTime * .3 * (sz + 1.) + 80.) / 160.) * 160.; p.z += cos(uTime * .5 + aF.y * 2.) * sw * .6;\n' +
      ' vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uOn > .01 ? (sz > 1.5 ? .5 : sz > .5 ? .28 : .17) * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform float uOn; varying float vS; void main(){ vec2 q = gl_PointCoord - .5; float d = length(q) * 2.; if (d > 1.) discard; float a = (1. - smoothstep(.55, 1., d)) * uOn; vec3 c = vec3(1.); if (vS > 1.5) { c = mix(vec3(.62, .7, .86), vec3(1.), smoothstep(.95, .7, d)); }\n gl_FragColor = vec4(c, a * (vS > 1.5 ? .95 : .85));\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var flakes = new T.Points(fg, flM); flakes.frustumCulled = false; flakes.renderOrder = 8; flakes.name = 'snowflakes'; scene.add(flakes);
  // morning mist lying low over the Seine and the gardens
  var mp = [], ma = [];
  for (i = 0; i < 70; i++) { var onRiver = i < 40; mp.push((R() - 0.5) * (onRiver ? 260 : 120), onRiver ? -ctx.WL + 0.6 + R() * 1.2 : 0.5 + R() * 1.4, onRiver ? 300 + R() * 80 : 450 + R() * 120); ma.push(R() * 6.28, (onRiver ? 26 : 16) + R() * 14); }
  var mgeo = new T.BufferGeometry(); mgeo.setAttribute('position', new T.Float32BufferAttribute(mp, 3)); mgeo.setAttribute('aM', new T.Float32BufferAttribute(ma, 2));
  var miM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uA: { value: 0 }, uPal: U.uPal, uMist: { value: P.i('mist') } },
    vertexShader: 'attribute vec2 aM; uniform float uTime, uScale, uA; varying float vR; void main(){ vec3 p = position + vec3(sin(uTime * .03 + aM.x) * 12. + uTime * .4 - floor((uTime * .4 + 130.) / 260.) * 260., 0., 0.); vR = aM.x; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uA > .01 ? aM.y * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uPal; uniform float uA, uMist; varying float vR; vec3 pal(float i){ return texelFetch(uPal, ivec2(int(i + .5), 0), 0).rgb; } void main(){ vec2 q = gl_PointCoord - .5; q.y *= 3.2; float d = length(q) * 2.; if (d > 1.) discard; gl_FragColor = vec4(mix(pal(uMist), vec3(1.), .35), (1. - smoothstep(.2, 1., d)) * uA * .42);\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var mists = new T.Points(mgeo, miM); mists.frustumCulled = false; mists.renderOrder = 5; mists.name = 'morning-mist'; scene.add(mists);
  // light cones under the lamps, seen in the fog
  var coneG = new T.CylinderGeometry(0.12, 1, 1, 18, 1, true).translate(0, -0.5, 0), cones = [];
  var coneM = new T.ShaderMaterial({ uniforms: { uFog: { value: 0 }, uPn: U.uPn, uThr: { value: 0.5 } }, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
    vertexShader: 'varying float vY; varying vec3 vN, vV; void main(){ vY = -position.y; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uFog, uPn, uThr; varying float vY; varying vec3 vN, vV; void main(){ float on = smoothstep(uThr - .04, uThr + .04, uPn); float rim = pow(abs(dot(normalize(vN), normalize(vV))), 1.2); float a = uFog * on * (1. - vY * .65) * (.35 + .65 * rim) * .4; gl_FragColor = vec4(vec3(1., .85, .6) * a, a);\n#include <colorspace_fragment>\n}' });
  (ctx.lampLights || []).forEach(function (l) { var m = coneM.clone(); m.uniforms.uFog = U.uFog; m.uniforms.uPn = U.uPn; m.uniforms.uThr = { value: l[3] }; var c = new T.Mesh(coneG, m); var h = l[1] - 0.1; c.scale.set(h * 0.55, h, h * 0.55); c.position.set(l[0], l[1] - 0.3, l[2]); c.renderOrder = 4; c.frustumCulled = false; c.name = 'lamp-fog-cone'; c.userData.off = function () { return U.uFog.value < 1e-3 || U.uPn.value <= l[3] - .04; }; scene.add(c); cones.push(c); });
  // breath clouds from people on frosty mornings
  var bp = [], ba = [];
  (ctx.heads || []).forEach(function (h) { bp.push(h[0], h[1], h[2]); ba.push(R() * 3, h[3] || 1); });
  var bg = new T.BufferGeometry(); bg.setAttribute('position', new T.Float32BufferAttribute(bp, 3)); bg.setAttribute('aB', new T.Float32BufferAttribute(ba, 2));
  var brM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uOn: { value: 0 } },
    vertexShader: 'attribute vec2 aB; uniform float uTime, uScale, uOn; varying float vA; void main(){ float f = fract(uTime / 3. + aB.x); vec3 p = position + vec3(f * .5 * aB.y, f * .25 * aB.y, .1); vA = uOn * sin(f * 3.1416) * step(f, .9); vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? (.3 + f * .6) * aB.y * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'varying float vA; void main(){ vec2 q = gl_PointCoord - .5; q.x += sin(q.y * 9.) * .04; float d = length(q) * 2.; if (d > 1.) discard; vec3 c = mix(vec3(.97, .99, 1.), vec3(.55, .62, .78), smoothstep(.72, .86, d)); gl_FragColor = vec4(c, (1. - smoothstep(.88, 1., d)) * vA * .85);\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var breath = new T.Points(bg, brM); breath.frustumCulled = false; breath.renderOrder = 6; breath.name = 'breath'; scene.add(breath);
  // a gust: leaves or petals flying across the scene
  var gp_ = [], ga = [];
  for (i = 0; i < 120; i++) { gp_.push(0, 2 + R() * 22, 380 + R() * 190); ga.push(R(), R() * 6.28, 0.7 + R() * 0.6); }
  var gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(gp_, 3)); gg.setAttribute('aG', new T.Float32BufferAttribute(ga, 3));
  var guM = new T.ShaderMaterial({ uniforms: { uT: { value: 99 }, uScale: U.uScale, uC1: { value: new T.Color('#e48a2c') }, uC2: { value: new T.Color('#c4542a') }, uPetal: { value: 0 } },
    vertexShader: 'attribute vec3 aG; uniform float uT, uScale; varying float vA, vR, vK; void main(){ float t = uT - aG.x * 1.2; vA = step(0., t) * (1. - smoothstep(2.6, 3.4, t)); vec3 p = position + vec3(-70. + t * 48. * aG.z, sin(t * 3. + aG.y) * 2. + t * 1.5, cos(t * 2. + aG.y) * 3.); vR = t * 6. * aG.z + aG.y; vK = aG.y;\n' +
      ' vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? .55 * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform vec3 uC1, uC2; uniform float uPetal; varying float vA, vR, vK; void main(){ vec2 q = gl_PointCoord - .5; float c = cos(vR), s = sin(vR); q = mat2(c, -s, s, c) * q; q.x *= .5 + .5 * abs(sin(vR * .7));\n' +
      ' float d = uPetal > .5 ? length(q / vec2(.32, .22)) : length(q / vec2(.42, .18)); if (d > 1.) discard; vec3 col = fract(vK * 3.7) > .5 ? uC1 : uC2; col = mix(col * .55, col, smoothstep(1., .8, d)); gl_FragColor = vec4(col, vA);\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: true });
  var gusts = new T.Points(gg, guM); gusts.frustumCulled = false; gusts.renderOrder = 7; gusts.name = 'gust-leaves'; scene.add(gusts);
  // rain: splashes off the bridge parapets, drips from the café awnings
  var rp = [], ra = [], bi = ctx.bridgeInfo;
  if (bi) for (i = 0; i < 160; i++) { var z = lerp(bi.z0, bi.z1, R()), hw = lerp(bi.hw0, bi.hw1, (z - bi.z0) / (bi.z1 - bi.z0)) + 0.4, sd = R() < 0.5 ? -1 : 1; rp.push(sd * hw, 1.7, z); ra.push(0, R(), 0); }
  (ctx.awnings || []).forEach(function (a) { for (var k = 0; k < 6; k++) { rp.push(lerp(a[0], a[1], (k + 0.5) / 6), a[2], a[3]); ra.push(1, R(), a[2]); } });
  var rg = new T.BufferGeometry(); rg.setAttribute('position', new T.Float32BufferAttribute(rp, 3)); rg.setAttribute('aR', new T.Float32BufferAttribute(ra, 3));
  var rsM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale, uOn: { value: 0 } },
    vertexShader: 'attribute vec3 aR; uniform float uTime, uScale, uOn; varying float vA, vK; void main(){ vK = aR.x; vec3 p = position; float f;\n' +
      ' if (aR.x < .5) { f = fract(uTime * 1.7 + aR.y * 7.); p += vec3(sin(aR.y * 40.) * .15, f * .35 - f * f * .3, cos(aR.y * 30.) * .15); vA = (1. - f) * uOn; }\n' +
      ' else { f = fract(uTime * .9 + aR.y * 5.); p.y -= f * f * aR.z; vA = uOn * (1. - smoothstep(.85, 1., f)); }\n' +
      ' vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? (aR.x < .5 ? .14 : .1) * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'varying float vA, vK; void main(){ vec2 q = gl_PointCoord - .5; q.y *= vK > .5 ? .6 : 1.; float d = length(q) * 2.; if (d > 1.) discard; gl_FragColor = vec4(.86, .93, 1., vA * (1. - smoothstep(.6, 1., d)));\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var rsp = new T.Points(rg, rsM); rsp.frustumCulled = false; rsp.renderOrder = 6; rsp.name = 'rain-splashes'; scene.add(rsp);
  // rain: spray thrown up behind the cars' wheels on the wet road
  var cp = new Float32Array(8 * 40 * 3), ca = [], CR = rng(77);
  for (i = 0; i < 8 * 40; i++) ca.push(CR(), CR(), CR());
  var cg = new T.BufferGeometry(); cg.setAttribute('position', new T.BufferAttribute(cp, 3)); cg.setAttribute('aS', new T.Float32BufferAttribute(ca, 3));
  var csM = new T.ShaderMaterial({ uniforms: { uTime: U.uTime, uScale: U.uScale },
    vertexShader: 'attribute vec3 aS; uniform float uTime, uScale; varying float vA; void main(){ float f = fract(uTime * 2.2 + aS.x); vec3 p = position; vA = position.y > -50. ? (1. - f) * .8 : 0.; p.y = max(position.y, 0.) + f * (.8 + aS.y * .7) - f * f * 1.; vec4 mv = modelViewMatrix * vec4(p + vec3(0., 0., (aS.z - .5) * f * .9), 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? (.16 + f * .12) * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'varying float vA; void main(){ vec2 q = gl_PointCoord - .5; float d = length(q) * 2.; if (d > 1.) discard; gl_FragColor = vec4(.88, .94, 1., vA * (1. - smoothstep(.6, 1., d)));\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var cspr = new T.Points(cg, csM); cspr.frustumCulled = false; cspr.renderOrder = 6; cspr.name = 'car-spray'; scene.add(cspr);
  // ✦ on the wet ground after rain: on the avenue, the esplanade and the paths, catching the light
  var wsP = [], wsA = [];
  for (i = 0; i < 260; i++) { var wz = R() < 0.5 ? 436 + R() * 30 : 470 + R() * 110, wx = (R() - 0.5) * (wz < 470 ? 160 : 60); if (wz >= 470 && Math.abs(wx) > 26) continue; wsP.push(wx, 0.2, wz); wsA.push(R(), R()); }
  var wsg = new T.BufferGeometry(); wsg.setAttribute('position', new T.Float32BufferAttribute(wsP, 3)); wsg.setAttribute('aW', new T.Float32BufferAttribute(wsA, 2));
  var wsM = new T.ShaderMaterial({ uniforms: { uTime: U.uStep, uScale: U.uScale, uOn: { value: 0 }, uMap: { value: ctx.tex.star } },
    vertexShader: 'attribute vec2 aW; uniform float uTime, uScale, uOn; varying float vA; void main(){ float per = 1.4 + aW.y * 2.; vA = uOn * step(.82, fract(uTime / per + aW.x * 7.)); vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = vA > .01 ? (.5 + aW.y * .5) * uScale / max(-mv.z, 1.) : 0.; }',
    fragmentShader: 'uniform sampler2D uMap; varying float vA; void main(){ gl_FragColor = vec4(1., 1., .96, texture2D(uMap, gl_PointCoord).a * vA);\n#include <colorspace_fragment>\n}', transparent: true, depthWrite: false });
  var wetStars = new T.Points(wsg, wsM); wetStars.frustumCulled = false; wetStars.renderOrder = 7; wetStars.name = 'wet-sparkles'; scene.add(wetStars);
  var gustT = 99, lastGust = 0;
  return {
    update: function (st, now, dt, gust) {
      var snowing = st.wx === 'snow' || st.event === 'christmas';
      flM.uniforms.uOn.value += ((snowing ? (st.wx === 'snow' ? 1 : 0.6) : 0) - flM.uniforms.uOn.value) * Math.min(1, dt * 0.5); if (st.snap) flM.uniforms.uOn.value = snowing ? (st.wx === 'snow' ? 1 : 0.6) : 0;
      var m = ctx.minutes || 780, burn = st.wx === 'mist' ? clamp(1 - (m - 480) / 200, 0, 1) * (m > 300 ? 1 : 0) : 0; miM.uniforms.uA.value = burn;
      brM.uniforms.uOn.value = st.wx === 'frost' || (st.season === 'winter' && m < 660) ? (st.sky !== 'night' ? 1 : 0.6) : 0;
      rsM.uniforms.uOn.value = st.wx === 'rain' ? 1 : 0;
      wsM.uniforms.uOn.value = st.wx === 'rain' || (st.wx === 'snow' && st.sky === 'day') ? 1 : 0;
      var cars = st.wx === 'rain' ? (ctx.carsW || []) : [];
      for (var ci = 0; ci < 8; ci++) { var c = cars[ci]; for (var k = 0; k < 40; k++) { var o = (ci * 40 + k) * 3; if (!c) { cp[o + 1] = -99; continue; }
        var back = (k % 2 ? 0.25 : c[3] * 0.72) - (ca[(ci * 40 + k) * 3] * 1.1) * Math.min(1, c[4] / 8), side = (k % 4 < 2 ? -1 : 1) * 0.85, cs = Math.cos(c[2]), sn = Math.sin(c[2]);
        cp[o] = c[0] + back * cs + side * sn; cp[o + 1] = 0.05; cp[o + 2] = c[1] - back * sn + side * cs; } }
      cg.attributes.position.needsUpdate = true;
      if (gust > 0.95 && now - lastGust > 1) { lastGust = now; gustT = 0; var c = st.season === 'spring' ? ['#ffd3e0', '#fff6f8'] : st.season === 'summer' ? ['#6fb35a', '#9ccc5a'] : st.season === 'autumn' ? ['#e48a2c', '#c4542a'] : ['#b9a27a', '#d8c9a8']; guM.uniforms.uC1.value.set(c[0]); guM.uniforms.uC2.value.set(c[1]); guM.uniforms.uPetal.value = st.season === 'spring' ? 1 : 0; }
      gustT += dt; guM.uniforms.uT.value = gustT;
    }
  };
}
