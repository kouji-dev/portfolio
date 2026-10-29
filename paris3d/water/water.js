import * as T from 'three';
import { EX, HZ, F, ZC, HC } from '../core/view.js';

// ---------------------------------------------------------------- the Seine and the basin: painted water
export function waterMaterial(ctx, toks, mode) {
  var P = ctx.P, U = ctx.U;
  return new T.ShaderMaterial({
    uniforms: { uPal: U.uPal, uW: { value: ctx.tex.water }, uTime: U.uTime, uPn: U.uPn, uGlint: U.uGlint, uTok: { value: new T.Vector4(P.i(toks[0]), P.i(toks[1]), P.i(toks[2]), P.i(toks[3])) }, uTok2: { value: new T.Vector2(P.i(toks[4]), mode) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform sampler2D uPal, uW; uniform float uTime, uPn, uGlint; uniform vec4 uTok; uniform vec2 uTok2; varying vec3 vW;\n' +
      'vec3 pal(float i){ return texelFetch(uPal, ivec2(int(i + .5), 0), 0).rgb; }\n' +
      'void main(){ float d = max(4., ' + ZC.toFixed(1) + ' - vW.z); float sx = vW.x * ' + F.toFixed(1) + ' / d + ' + EX.toFixed(1) + '; float sy = ' + F.toFixed(1) + ' * (' + HC.toFixed(1) + ' - vW.y) / d + ' + HZ.toFixed(1) + ';\n' +
      ' vec3 c = pal(uTok.x); float sh = sin(uTime * .9) * 6.;\n' +
      ' vec4 a = texture2D(uW, vec2((sx + sh) / 420., sy / 150.)); vec4 b = texture2D(uW, vec2((sx - sh * .7 + 130.) / 560., (sy + 40.) / 190.));\n' +
      ' c = mix(c, pal(uTok.y), a.r * .55); c = mix(c, pal(uTok.z), a.g * .5); c = mix(c, pal(uTok.w), b.b * .7);\n' +
      ' float gx = sx - uGlint; float gw = 12. + max(sy - 1050., 0.) * .3; c = mix(c, pal(uTok.w), b.r * exp(-gx * gx / (2. * gw * gw)) * .9);\n' +
      (mode > 0.5 ? '' : ' float lamp = 0.; for (int i = 0; i < 7; i++) { float px = i == 0 ? 184. : i == 1 ? 224. : i == 2 ? 304. : i == 3 ? 344. : i == 4 ? 604. : i == 5 ? 364. : 496.; lamp += exp(-pow((sx - px) / 5., 2.)) * step(sy, 1100.); }\n c = mix(c, pal(uTok2.x), clamp(lamp * (a.r + a.g) * 1.6, 0., 1.) * uPn * .85);\n') +
      ' gl_FragColor = vec4(c, 1.);\n#include <colorspace_fragment>\n}'
  });
}

// ---------------------------------------------------------------- the Seine: flowing strokes, painted reflections broken into strokes, sun or moon path,
// ripple rings, wind ruffles, shade under the bridge and along the walls, a foam line, the cruiser's wake
export function seineMaterial(ctx, refl) {
  var P = ctx.P, U = ctx.U, b = ctx.bridgeInfo;
  return new T.ShaderMaterial({
    uniforms: { uPal: U.uPal, uW: { value: ctx.tex.water }, uTime: U.uTime, uPn: U.uPn, uGlint: U.uGlint, uWind: U.uWind,
      uTok: { value: new T.Vector4(P.i('sea'), P.i('seaL'), P.i('seaD'), P.i('seaH')) }, uTok2: { value: new T.Vector4(P.i('wl'), P.i('qwS'), P.i('white'), P.i('ice')) },
      uRefl: { value: refl.tex }, uTM: { value: refl.mat }, uReflOn: U.uReflOn, uBoat: U.uBoat, uRain: U.uRain, uFog: U.uFog, uFogC: U.uFogC, uBst: U.uBst, uBstC: U.uBstC, uBsx: U.uBsx, uMet: U.uMet, uTree: U.uTree,
      uBr: { value: new T.Vector4(b.hw0, b.hw1, b.z0, b.z1) }, uWall: { value: new T.Vector2(ctx.qz1, ctx.nbz) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform sampler2D uPal, uW, uRefl; uniform float uTime, uPn, uGlint, uWind, uReflOn, uRain, uFog; uniform vec3 uFogC; uniform vec4 uBst[4], uMet, uTree; uniform vec3 uBstC[4]; uniform vec2 uBsx[4]; uniform vec4 uTok, uTok2, uBoat, uBr; uniform vec2 uWall; uniform mat4 uTM; varying vec3 vW;\n' +
      'vec3 pal(float i){ return texelFetch(uPal, ivec2(int(i + .5), 0), 0).rgb; }\n' +
      'float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' +
      'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }\n' +
      'void main(){ float d = max(4., ' + ZC.toFixed(1) + ' - vW.z); float sx = vW.x * ' + F.toFixed(1) + ' / d + ' + EX.toFixed(1) + '; float sy = ' + F.toFixed(1) + ' * (' + HC.toFixed(1) + ' - vW.y) / d + ' + HZ.toFixed(1) + ';\n' +
      ' vec3 c = pal(uTok.x);\n' +
      // strokes flowing downstream, left to right
      ' vec4 a = texture2D(uW, vec2((vW.x - uTime * .9) / 95., vW.z / 34.)); vec4 b = texture2D(uW, vec2((vW.x - uTime * .55 + 37.) / 140., vW.z / 46. + .3));\n' +
      ' c = mix(c, pal(uTok.y), a.r * .45); c = mix(c, pal(uTok.z), a.g * .4); c = mix(c, pal(uTok.w), b.b * .45);\n' +
      // wind ruffles: darker cat's-paws drifting across
      ' float ruf = smoothstep(.62, .78, vn(vW.xz * vec2(.035, .09) + vec2(-uTime * .1 * (.5 + uWind), uTime * .03)));\n' +
      ' vec4 rr = texture2D(uW, vec2((vW.x - uTime * 2.) / 30., vW.z / 10.)); c = mix(c, mix(pal(uTok.z), pal(uTok.y), rr.r), ruf * .45);\n' +
      // painted reflections, wobbling and broken into horizontal strokes
      ' float band = floor(sy * .6); vec4 rp = uTM * vec4(vW, 1.); vec2 ruv = rp.xy / rp.w;\n' +
      ' ruv.x += (h21(vec2(band, floor(uTime * 1.5))) - .5) * .007 + sin(sy * 1.3 + uTime * 2.1) * .0035; ruv.y += (h21(vec2(band, 7.)) - .5) * .006;\n' +
      // rain: rings spreading from each drop (three scales of cells), and each ring bends the reflection as it passes
      ' float rring = 0.; vec2 rdis = vec2(0.); if (uRain > .5) { for (int j = 0; j < 3; j++) { vec2 rq = vW.xz * (j == 0 ? .3 : j == 1 ? .45 : 0.63) + float(j) * 7.3; vec2 rcl = floor(rq); vec2 rfl = fract(rq) - .5 - (vec2(h21(rcl + 1.), h21(rcl + 2.)) - .5) * .5; float rt = fract(uTime * (1.1 + .4 * float(j)) + h21(rcl)); float re = length(rfl * vec2(1., 1.25)) - rt * .42;\n' +
        '   rring = max(rring, (1. - smoothstep(.0, .035, abs(re))) * (1. - rt)); rdis += normalize(rfl + 1e-4) * exp(-re * re / .0025) * (1. - rt); } ruv += rdis * .006; }\n' +
      ' vec4 r4 = texture2D(uRefl, ruv); vec3 rc = r4.rgb / max(r4.a, .001);\n' +
      ' float gap = step(.22, h21(vec2(band, floor(sx * .07 + h21(vec2(band, 1.)) * 5.)))) * (1. - ruf * .5);\n' +
      ' c = mix(c, mix(rc, c, .38), clamp(r4.a, 0., 1.) * uReflOn * gap * (.62 + .25 * a.r));\n' +
      // lights stretched into long wobbly streaks at night
      ' vec3 st = vec3(0.); for (int k = -4; k <= 4; k++) { vec4 s = texture2D(uRefl, ruv + vec2(sin(sy * .9 + float(k)) * .002, float(k) * .012)); vec3 sc = s.rgb / max(s.a, .001); st = max(st, sc * smoothstep(.62, .9, dot(sc, vec3(.33))) * s.a * (1. - abs(float(k)) / 5.)); }\n' +
      ' c = max(c, mix(c, st, .85 * uPn * uReflOn * gap));\n' +
      // the sun path (day) or the moon path (night): bright slivers under the light
      ' float gx = sx - uGlint; float gw = 10. + max(sy - 1045., 0.) * .35; c = mix(c, mix(pal(uTok.w), vec3(1., .96, .85), .4), (b.r + a.r * .6) * exp(-gx * gx / (2. * gw * gw)) * .85);\n' +
      // ripple rings (a fish, a drop)
      ' for (int i = 0; i < 4; i++) { float fi = float(i); float per = 5. + fi * 1.9; float t = uTime / per + fi * .37; float k = floor(t), f = fract(t);\n' +
      '   vec2 ctr = vec2(mix(-160., 220., h21(vec2(k, fi))), mix(uWall.x + 8., uWall.y - 8., h21(vec2(fi, k + 3.)))); float dd = length(vW.xz - ctr);\n' +
      '   float ring = (1. - smoothstep(0., .25 + f * .4, abs(dd - f * 7.))) * (1. - f) + (1. - smoothstep(0., .2 + f * .3, abs(dd - f * 4.5))) * (1. - f) * .6; c = mix(c, pal(uTok.w), ring * .75); }\n' +
      // shade under the bridge, darker along the quay walls, a foam line where water meets stone
      ' float bt = clamp((vW.z - uBr.z) / (uBr.w - uBr.z), 0., 1.); float bhw = mix(uBr.x, uBr.y, bt) + 1.5;\n' +
      ' float under = (1. - smoothstep(bhw, bhw + 7. + 3. * vn(vW.xz * .4), abs(vW.x))) * smoothstep(uBr.z - 6., uBr.z, vW.z) * (1. - smoothstep(uBr.w, uBr.w + 4., vW.z));\n' +
      ' float wallS = (1. - smoothstep(0., 9., vW.z - uWall.x)) + (1. - smoothstep(0., 6., uWall.y - vW.z)) * .6;\n' +
      ' c = mix(c, c * vec3(.62, .66, .78), clamp(wallS * .4, 0., 1.)); c = mix(c, pal(uTok.z) * .7, clamp(under, 0., 1.) * .82);\n' +
      ' float foam = (1. - smoothstep(.15, .9, vW.z - uWall.x)) * (.55 + .45 * a.r) + (1. - smoothstep(.15, .9, uWall.y - vW.z)) * (.5 + .5 * a.g);\n' +
      // the cruiser's wake: a V of white strokes behind the bow, foam at the bow, waves reaching the quays
      ' float dxw = uBoat.x - vW.x, lat = abs(vW.z - uBoat.y), arm = abs(lat - dxw * .36);\n' +
      ' float brk = step(.22, h21(vec2(floor(dxw * .25), floor(lat * .4))));\n' +
      ' float wk = uBoat.w * step(0., dxw) * (1. - smoothstep(110., 150., dxw)) * ((1. - smoothstep(.7, 2.4, arm)) * exp(-dxw / 75.) * (.25 + .75 * smoothstep(.15, .5, texture2D(uW, vec2(dxw / 26., arm / 2.2 + lat * .02)).r)) * brk + step(lat, dxw * .33) * step(.8, fract(dxw * .2 + lat * lat * .01 - uTime * .7)) * .22 * exp(-dxw / 18.) * brk);\n' +
      ' wk += uBoat.w * (1. - smoothstep(0., 7., abs(dxw))) * (1. - smoothstep(3.5, 6., lat)) * (.6 + .4 * b.g);\n' +
      ' float wallZ = vW.z > uBoat.y ? uWall.y : uWall.x, hitX = abs(wallZ - uBoat.y) / .36;\n' +
      ' float hitWall = uBoat.w * step(0., dxw) * (1. - smoothstep(3., 14., abs(dxw - hitX))) * exp(-hitX / 700.) * 1.3 * (1. - smoothstep(0., 3.5, abs(vW.z - wallZ)));\n' +
      ' foam = max(foam, hitWall * (.45 + .55 * step(.45, a.g + .3 * sin(vW.x * 1.7 - uTime * 3.)))); c = mix(c, mix(pal(uTok2.z), pal(uTok.w), .3), clamp(wk, 0., 1.) * .85);\n' +
      ' c = mix(c, mix(pal(uTok2.z), pal(uTok.w), .5), clamp(foam, 0., 1.) * .7);\n' +
      // specks of light dust on the water
      ' vec2 wq = vW.xz * vec2(.5, 1.2); vec2 wc = floor(wq); c = mix(c, pal(uTok.w), step(.985, h21(wc + 5.)) * (1. - smoothstep(.12, .22, length(fract(wq) - .5))) * .6);\n' +
      // rain rings all over the river; fog
      ' for (int bj = 0; bj < 4; bj++) { if (uBst[bj].w > .01) { float bxd = sx - uBsx[bj].x; float bw = 10. + max(sy - 1045., 0.) * .25; c = mix(c, mix(uBstC[bj], vec3(1.), .25), clamp(exp(-bxd * bxd / (2. * bw * bw)) * (a.r * .9 + b.b * .4 + .15) * uBst[bj].w * 1.2, 0., 1.)); } }\n' +
      ' if (uMet.w > .5) { float mxd = sx - uMet.x; c = mix(c, vec3(.88, .94, 1.), clamp(exp(-mxd * mxd / 120.) * (a.r * 1.2 + .45) * uMet.y * step(.3, fract(sy * .35 + h21(vec2(floor(sy * .35), 3.)))), 0., 1.) * .95); }\n' +
      ' c = mix(c, pal(uTok.w), rring * .65); if (uFog > .01) c = mix(c, uFogC, uFog * clamp(1. - exp(-length(vW - cameraPosition) * .0013), 0., .9));\n' +
      ' gl_FragColor = vec4(c, 1.);\n#include <colorspace_fragment>\n}'
  });
}

// ---------------------------------------------------------------- the basin: a painted reflection that wobbles while the fountain plays and turns clear when it rests,
// ripple rings and foam where every jet lands, coins on the bottom near the edge, underwater lights at night, ice at Christmas and on frozen days
export function basinMaterial(ctx, refl) {
  var P = ctx.P, U = ctx.U, bw = ctx.basin, land = [];
  for (var i = 0; i < 72; i++) { var l = ctx.land[i] || [0, 0, -1, 0]; land.push(new T.Vector4(l[0], l[1], l[2], l[3])); }
  return new T.ShaderMaterial({
    uniforms: { uPal: U.uPal, uW: { value: ctx.tex.water }, uTime: U.uTime, uPn: U.uPn, uGlint: U.uGlint, uWind: U.uWind, uFount: U.uFount, uFL: U.uFL, uIce: U.uIce,
      uRefl: { value: refl.tex }, uTM: { value: refl.mat }, uReflOn: U.uReflOn, uLand: { value: land }, uRain: U.uRain, uFog: U.uFog, uFogC: U.uFogC, uBst: U.uBst, uBstC: U.uBstC, uBsx: U.uBsx, uMet: U.uMet, uTree: U.uTree,
      uTok: { value: new T.Vector4(P.i('water'), P.i('waterL'), P.i('seaH'), P.i('white')) }, uTok2: { value: new T.Vector4(P.i('seaD'), P.i('basin'), P.i('ice'), P.i('wl')) },
      uB: { value: new T.Vector4(bw[0][0], bw[3][0], bw[0][2], bw[3][2]) }, uSky: { value: new T.Vector2(P.i('skb1'), P.i('sks1')) } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: 'uniform sampler2D uPal, uW, uRefl; uniform float uTime, uPn, uGlint, uWind, uFount, uReflOn, uIce, uRain, uFog; uniform vec3 uFL, uFogC; uniform vec4 uBst[4], uMet, uTree; uniform vec3 uBstC[4]; uniform vec2 uBsx[4]; uniform vec4 uTok, uTok2, uB; uniform vec2 uSky; uniform vec4 uLand[72]; uniform mat4 uTM; varying vec3 vW;\n' +
      'vec3 pal(float i){ return texelFetch(uPal, ivec2(int(i + .5), 0), 0).rgb; }\n' +
      'float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' +
      'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }\n' +
      'void main(){ float d = max(4., ' + ZC.toFixed(1) + ' - vW.z); float sx = vW.x * ' + F.toFixed(1) + ' / d + ' + EX.toFixed(1) + '; float sy = ' + F.toFixed(1) + ' * (' + HC.toFixed(1) + ' - vW.y) / d + ' + HZ.toFixed(1) + ';\n' +
      ' float act = clamp(uFount, 0., 1.), calm = 1. - act;\n' +
      ' vec3 c = pal(uTok.x); float sh = sin(uTime * .9) * 6. * (.2 + .8 * act);\n' +
      ' vec4 a = texture2D(uW, vec2((sx + sh) / 420., sy / 150.)); vec4 b = texture2D(uW, vec2((sx - sh * .7 + 130.) / 560., (sy + 40.) / 190.));\n' +
      ' c = mix(c, pal(uTok.y), a.r * (.18 + .37 * act)); c = mix(c, pal(uTok.z), b.b * (.2 + .5 * act));\n' +
      // wind ruffles: cat's-paws crossing the surface
      ' float ruf = smoothstep(.6, .78, vn(vW.xz * vec2(.2, .45) + vec2(-uTime * .3 * (.4 + uWind), uTime * .05))) * (.3 + .7 * min(1., uWind / 1.2));\n' +
      ' vec4 rr = texture2D(uW, vec2((vW.x - uTime * 1.5) / 6., vW.z / 2.5)); c = mix(c, mix(pal(uTok2.x), pal(uTok.y), rr.r), ruf * .42);\n' +
      // the painted reflection: wobbly and broken into strokes while the jets play, a clear mirror when they rest
      ' vec4 rp = uTM * vec4(vW, 1.); vec2 ruv = rp.xy / rp.w; float band = floor(sy * .8);\n' +
      ' ruv.x += (sin(sy * 1.1 + uTime * 2.3) * .0045 + (h21(vec2(band, floor(uTime * 2.))) - .5) * .007) * act + sin(sy * .9 + uTime * 1.4) * .0012 * calm + ruf * .003;\n' +
      ' ruv.y += sin(sx * .3 + uTime * 1.7) * .002 * act;\n' +
      // rain: rings spreading from each drop (three scales of cells), and each ring bends the reflection as it passes
      ' float rring = 0.; vec2 rdis = vec2(0.); if (uRain > .5) { for (int j = 0; j < 3; j++) { vec2 rq = vW.xz * (j == 0 ? .7 : j == 1 ? 1. : 1.4) + float(j) * 7.3; vec2 rcl = floor(rq); vec2 rfl = fract(rq) - .5 - (vec2(h21(rcl + 1.), h21(rcl + 2.)) - .5) * .5; float rt = fract(uTime * (1.1 + .4 * float(j)) + h21(rcl)); float re = length(rfl * vec2(1., 1.25)) - rt * .42;\n' +
        '   rring = max(rring, (1. - smoothstep(.0, .035, abs(re))) * (1. - rt)); rdis += normalize(rfl + 1e-4) * exp(-re * re / .0025) * (1. - rt); } ruv += rdis * .006; }\n' +
      ' vec4 r4 = texture2D(uRefl, ruv); vec3 rc = r4.rgb / max(r4.a, .001);\n' +
      ' float gap = mix(1., step(.13, h21(vec2(band, floor(sx * .06 + h21(vec2(band, 1.)) * 5.)))), act * .8) * (1. - ruf * .35);\n' +
      ' vec3 skyR = mix(pal(uSky.y), pal(uSky.x), smoothstep(-.2, .9, ruv.y)); c = mix(c, mix(skyR, c, .45), (1. - clamp(r4.a, 0., 1.)) * uReflOn * (.35 + .15 * calm) * (1. - ruf * .5));\n' +
      ' c = mix(c, mix(rc, c, .22 + .14 * act), clamp(r4.a, 0., 1.) * uReflOn * gap);\n' +
      // the sun path by day, the moon path by night
      ' float gx = sx - uGlint; float gw = 12. + max(sy - 1050., 0.) * .3; c = mix(c, mix(pal(uTok.w), vec3(1., .96, .85), .4), clamp(b.r + a.r * .6 * uPn, 0., 1.) * exp(-gx * gx / (2. * gw * gw)) * (.75 + .2 * uPn) * step(uIce, .5));\n' +
      // at night the moon path breaks into bright slivers that shimmer
      ' float sl = step(.45, h21(vec2(floor(sy * .55), floor((sx + sin(sy * .4 + uTime * 1.3) * 4.) / 14.)))) * (1. - smoothstep(.25, .5, abs(fract(sy * .55) - .5))); c = mix(c, vec3(.92, .95, 1.), sl * exp(-gx * gx / (2. * gw * gw * .28)) * uPn * .65 * step(uIce, .5));\n' +
      // distance to the rim
      ' float tz = clamp((vW.z - uB.z) / (uB.w - uB.z), 0., 1.); float hx = -mix(uB.x, uB.y, tz); float de = min(min(hx - abs(vW.x), vW.z - uB.z), uB.w - vW.z);\n' +
      // coins on the bottom near the edge, one glinting now and then in the sun
      ' vec2 cq = vW.xz * 2.4; vec2 cc = floor(cq), cf = fract(cq) - .5; float ch = h21(cc + 3.1);\n' +
      ' float coin = step(.8, ch) * (1. - smoothstep(.15, .19, length((cf - (vec2(h21(cc), h21(cc + 1.)) - .5) * .3) * vec2(1., 1.7)))) * (1. - smoothstep(.5, 1.8, de)) * step(uIce, .5);\n' +
      ' vec3 coinC = ch > .94 ? vec3(.9, .7, .3) : ch > .87 ? vec3(.74, .46, .26) : vec3(.78, .78, .74);\n' +
      ' c = mix(c, mix(c, coinC, .7), coin * (1. - .5 * uPn)); c = mix(c, vec3(1., .98, .9), coin * step(.9, h21(cc + floor(uTime * 1.5))) * (1. - uPn));\n' +
      // ripple rings where the jets land, foam round them, the underwater lights at night
      ' float ring = 0., foam = 0., glow = 0.;\n' +
      ' for (int i = 0; i < 72; i++) { vec4 L = uLand[i]; if (L.z < -.5) break; float k = L.z; vec2 q = vW.xz - L.xy; float dd = length(q * vec2(1., .9));\n' +
      '   float on = k < .5 ? smoothstep(.9, 1., uFount) : smoothstep(.35, .7, uFount); if (on < .01) continue;\n' +
      '   float rmax = k < .5 ? 2.4 : k < 1.5 ? 2.8 : k < 2.5 ? .9 : 1.3;\n' +
      '   for (int j = 0; j < 2; j++) { float r = fract(uTime * (k < .5 ? .9 : .6) + L.w + float(j) * .5) * rmax; ring += (1. - smoothstep(.0, .05 + .05 * r, abs(dd - r))) * (1. - r / rmax) * on; }\n' +
      '   float fr = k < .5 ? .65 : k < 1.5 ? .95 : k < 2.5 ? .22 : .35; float wob = (vn(q * 3. + uTime * 2.) - .5) * fr * .5;\n' +
      '   foam = max(foam, (1. - smoothstep(fr * .55, fr, dd + wob)) * on);\n' +
      '   if (k > .5 && k < 1.5) foam = max(foam, (1. - smoothstep(.0, .12, abs(dd + wob * .5 - fr * 1.25))) * on * .9);\n' +
      '   glow += exp(-dd * dd / (k < .5 ? 3. : k < 1.5 ? 2.2 : .5)) * (k < 1.5 ? 1. : .45) * on; }\n' +
      ' c = mix(c, pal(uTok.w), clamp(ring, 0., 1.) * .75);\n' +
      ' float rimF = (1. - smoothstep(.04, .2, de + (a.g - .5) * .12)) * (.45 + .55 * act); foam = max(foam, rimF * step(uIce, .5));\n' +
      ' c = mix(c, mix(pal(uTok.w), vec3(1.), .5), clamp(foam, 0., 1.) * .85);\n' +
      ' c += uFL * clamp(glow, 0., 1.4) * uPn * act * .6;\n' +
      ' for (int bj = 0; bj < 4; bj++) { if (uBst[bj].w > .01) { float bxd = sx - uBsx[bj].x; float bw = 10. + max(sy - 1045., 0.) * .25; c = mix(c, mix(uBstC[bj], vec3(1.), .25), clamp(exp(-bxd * bxd / (2. * bw * bw)) * (a.r * .9 + b.b * .4 + .15) * uBst[bj].w * 1.2, 0., 1.) * step(uIce, .5)); } }\n' +
      ' if (uMet.w > .5) { float mxd = sx - uMet.x; c = mix(c, vec3(.88, .94, 1.), clamp(exp(-mxd * mxd / 120.) * (a.r * 1.2 + .45) * uMet.y * step(.3, fract(sy * .35 + h21(vec2(floor(sy * .35), 3.)))), 0., 1.) * .95); }\n' +
      ' c = mix(c, pal(uTok.w), rring * .65 * step(uIce, .5)); if (uFog > .01) c = mix(c, uFogC, uFog * clamp(1. - exp(-length(vW - cameraPosition) * .0013), 0., .9));\n' +
      // ice: skate marks at Christmas, cracks on frozen days
      ' if (uIce > .5) { vec3 ic = mix(pal(uTok2.z), vec3(.93, .96, 1.), .45 + .3 * a.r); ic = mix(ic, mix(rc, ic, .65), clamp(r4.a, 0., 1.) * uReflOn * .55);\n' +
      '   if (uIce < 1.5) { float sk = 0.; for (int k = 0; k < 7; k++) { float fk = float(k); vec2 ce = vec2(sin(fk * 2.1) * 5., uB.z + 10. + fk * 10.); float rad = 3.5 + fk * 1.3 + sin(fk) * 1.2; vec2 dq = (vW.xz - ce) * vec2(1., .55);\n' +
      '     float e = abs(length(dq) - rad); float arcM = step(.35, fract(atan(dq.y, dq.x) * .9 + fk * .37)); sk = max(sk, (1. - smoothstep(.0, .045, e)) * arcM); sk = max(sk, (1. - smoothstep(.0, .03, abs(e - .14))) * arcM * .6); }\n' +
      '     ic = mix(ic, pal(uTok2.x) * .9, sk * .55); }\n' +
      '   else { vec2 vq = vW.xz * .42; vec2 vi = floor(vq), vf = fract(vq); float m1 = 9., m2 = 9.;\n' +
      '     for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 o = vec2(h21(vi + g), h21(vi + g + 7.)); float dq = length(g + o - vf); if (dq < m1) { m2 = m1; m1 = dq; } else if (dq < m2) m2 = dq; }\n' +
      '     float cr = 1. - smoothstep(.0, .035, m2 - m1); ic = mix(ic, pal(uTok2.x) * .75, cr * .75); ic = mix(ic, vec3(1.), (1. - smoothstep(.0, .09, m2 - m1)) * (1. - cr) * .25); }\n' +
      '   c = mix(ic, vec3(1.), (1. - smoothstep(.0, .25, de)) * .5); }\n' +
      // Christmas: the tree's lights and its star mirrored in the ice
      ' if (uIce > .5 && uIce < 1.5 && uTree.z > .5) { for (int tk = 0; tk < 16; tk++) { float fk = float(tk); vec2 tl = vec2(uTree.x + 8.5 + (h21(vec2(fk, 1.)) - .5) * 5., uTree.y + 3. + h21(vec2(fk, 2.)) * 9.); vec2 dq = (vW.xz - tl) * vec2(1., .38); float on = step(.35, h21(vec2(fk, floor(uTime * 3.))));\n' +
      '   vec3 lc = tk % 5 == 0 ? vec3(1., .2, .25) : tk % 5 == 1 ? vec3(1., .82, .4) : tk % 5 == 2 ? vec3(.3, .64, 1.) : tk % 5 == 3 ? vec3(1.) : vec3(1., .48, .82); c = mix(c, lc, (1. - smoothstep(.16, .42, length(dq))) * (.55 + .45 * on)); }\n' +
      '   float stx = vW.x - uTree.x - 8.5; c = mix(c, vec3(1., .95, .75), exp(-stx * stx / .6) * (1. - smoothstep(0., 16., vW.z - uTree.y)) * smoothstep(0., 1.5, vW.z - uTree.y) * (.55 + .2 * sin(uTime * 4.))); }\n' +
      ' gl_FragColor = vec4(c, 1.);\n#include <colorspace_fragment>\n}'
  });
}
