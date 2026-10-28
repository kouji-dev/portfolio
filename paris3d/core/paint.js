import * as T from 'three';
import { F, ZC, HC } from './view.js';

// ---------------------------------------------------------------- the paint material: flat token colours in three light bands + strokes
export function patSrc(name, P) { var s = PATS[name] || ''; return s.replace(/\b(LV1|LV2|LV3|LF1|LF2|SOIL|STRAW)\b/g, function (m) { var t = { LV1: 'lv1', LV2: 'lv2', LV3: 'lv3', LF1: 'bqL', LF2: 'bq', SOIL: 'lv4', STRAW: 'hay' }[m]; return 'pal(' + P.i(t).toFixed(1) + ')'; }); }
export function paintMaterial(U, opt) {
  opt = opt || {};
  var m = new T.MeshLambertMaterial({ color: 0xffffff, map: opt.map || null, side: opt.side || T.FrontSide });
  var key = 'paint' + (opt.detail ? 'D' : '') + (opt.sway ? 'S' + opt.sway : '') + (opt.map ? 'M' : '') + (opt.pat ? 'P' + opt.pat : '') + (opt.vkey ? 'V' + opt.vkey : '');
  m.customProgramCacheKey = function () { return key; };
  m.onBeforeCompile = function (sh) {
    ['uPal', 'uScr', 'uTime', 'uWind', 'uBand', 'uStyle', 'uCloud', 'uWarm', 'uPn', 'uPx', 'uSeason', 'uSnow', 'uRain', 'uFrost', 'uFount', 'uFL', 'uLamps', 'uMoon', 'uFog', 'uFogC', 'uSnowAmt', 'uHw', 'uHwOn', 'uBst', 'uBstC', 'uRimP'].forEach(function (k) { sh.uniforms[k] = U[k]; });
    if (opt.detail) sh.uniforms.uDet = { value: opt.detail };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aTok; attribute vec2 aTok2; attribute float aScr; uniform float uTime, uWind;\nvarying vec4 vTok; varying vec2 vTok2; varying float vScr; varying vec3 vWP; varying vec2 vUv2;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTok = aTok; vTok2 = aTok2; vScr = aScr; vUv2 = uv;' + (opt.sway ? sway(opt.sway) : '') + (opt.vsnip || ''))
      .replace('#include <project_vertex>', '#include <project_vertex>\nvec4 wp4 = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwp4 = instanceMatrix * wp4;\n#endif\nvWP = (modelMatrix * wp4).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uPal; uniform sampler2D uScr; uniform vec2 uBand; uniform vec4 uStyle;' + (opt.detail ? ' uniform sampler2D uDet;' : '') +
        '\nvarying vec4 vTok; varying vec2 vTok2; varying float vScr; varying vec3 vWP; varying vec2 vUv2; uniform vec3 uCloud, uFL, uFogC; uniform float uWarm, uPn, uPx, uTime, uSnow, uRain, uFrost, uFount, uWind, uMoon, uFog, uSnowAmt; uniform vec4 uSeason; uniform vec4 uLamps[24]; uniform vec4 uHw[24]; uniform float uHwOn, uRimP; uniform vec4 uBst[4]; uniform vec3 uBstC[4];\nvec3 pal(float i){ return texelFetch(uPal, ivec2(int(i + .5), 0), 0).rgb; }\n' +
        'float ln(float dpx, float w){ w *= uPx; return 1. - smoothstep(w, w + 1., dpx); }\n' +
        'float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\nfloat vn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y); }')
      .replace('#include <color_fragment>', '#include <color_fragment>\n' +
        'vec3 pBase = pal(vTok.x);\n' +
        (opt.map ? 'vec3 cBase = diffuseColor.rgb; vec3 cShade = cBase * pal(vTok.y) / max(pBase, vec3(.02));\n' : 'vec3 cBase = pBase; vec3 cShade = pal(vTok.y);\n') +
        'vec3 cLit = vTok.z >= 0. ? pal(vTok.z) : cBase;\n' +
        (opt.detail ? 'vec4 dt = texture2D(uDet, vUv2); if (dt.a < .5) discard;\n' : '') +
        'diffuseColor.rgb = vec3(1.);')
      .replace('vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
        'float lum = dot(reflectedLight.directDiffuse, vec3(.3333));\n' +
        // cloud shadows sliding over the city and the gardens by day
        'vec2 cq = vWP.xz * vec2(.0042, .009) + uCloud.yz; float cn = vn2(cq) * .65 + vn2(cq * 2.3 + 7.) * .35; lum *= 1. - smoothstep(.56, .66, cn) * uCloud.x;\n' +
        'vec3 Ld = directionalLights[0].direction; float ndl = dot(normal, Ld);\n' +
        'float b1 = smoothstep(uBand.x - .03, uBand.x + .03, lum);\n' +
        'vec3 col = mix(cShade, cBase, b1);\n' +
        'col = mix(col, cLit, smoothstep(uBand.y - .04, uBand.y + .04, lum));\n' +
        'float wedge = smoothstep(.0, .25, lum) * (1. - smoothstep(.25, .6, lum)); col = mix(col, col * vec3(1.18, .98, .82) + vec3(.06, .02, 0.), wedge * uCloud.x * 0. + wedge * uStyle.z * uWarm);\n' +
        // screen-like coordinates anchored to the world (the painting's own scale), strokes turned to follow the form
        'vec3 wn = normalize((vec4(normal, 0.) * viewMatrix).xyz); float dd = max(4., ' + ZC.toFixed(1) + ' - vWP.z);\n' +
        'vec2 suv = abs(wn.y) > .7 ? vec2(vWP.x, ' + HC.toFixed(1) + ' - vWP.y) : abs(wn.x) > abs(wn.z) ? vec2(vWP.z * .6, -vWP.y) : vec2(vWP.x, -vWP.y);\n' +
        'suv = suv * ' + F.toFixed(1) + ' / (dd * 150.);\n' +
        'vec2 nxy = normal.xy; float nl = length(nxy);\n' +
        'if (nl > .35 && abs(wn.y) < .9 && uStyle.w > .5) { float an = atan(nxy.y, nxy.x) + 1.5708; float ca = cos(an), sa = sin(an); suv = vec2(ca * suv.x + sa * suv.y, -sa * suv.x + ca * suv.y); }\n' +
        // the deep core shadow, then hatching inside the shade (denser where it is deeper)
        'float core = (1. - smoothstep(0., .05, lum)) * smoothstep(-.05, -.45, ndl);\n' +
        'vec3 deep = cShade * .74;\n' +
        'col = mix(col, deep, core * .55 * uStyle.x);\n' +
        'float hl = abs(fract((suv.x - suv.y * .55) * 22.) - .5);\n' +
        'float hatch = (1. - smoothstep(.1, .17, hl)) * (1. - b1) * (.55 + .45 * core);\n' +
        'col = mix(col, deep, hatch * uStyle.y);\n' +
        // rim light: a thin bright edge on the side facing the light
        'vec3 Vv = normalize(vViewPosition); float fr = 1. - abs(dot(normal, Vv));\n' +
        'float rim = smoothstep(.5, .75, fr) * smoothstep(.05, .35, dot(normalize(normal.xy + 1e-4), normalize(Ld.xy + 1e-4))) * step(.0, ndl + .25) * (1. - smoothstep(.55, .85, abs(wn.y)));\n' +
        'col = mix(col, mix(mix(cLit + vec3(.12), vec3(.62, .74, 1.), uPn * .75), vec3(1., .58, .76), uRimP), rim * .8 * uStyle.z * (1. + uPn * uMoon * .4 + uRimP * .4));\n' +
        (opt.pat ? patSrc(opt.pat, U.P) : opt.detail ? 'if (vTok2.x >= 0.) col = mix(col, pal(vTok2.x), dt.g); if (vTok.w >= 0.) col = mix(col, pal(vTok.w), dt.r);\n' :
        'if (vScr > 0.) {\n' +
        '  vec4 s4 = texture2D(uScr, suv);\n' +
        '  if (vTok.w >= 0.) col = mix(col, pal(vTok.w), s4.r * vScr);\n' +
        '  if (vTok2.x >= 0.) col = mix(col, pal(vTok2.x), s4.g * vScr);\n' +
        '  if (vTok2.y >= 0.) col = mix(col, pal(vTok2.y), s4.b * vScr);\n' +
        '}\n') +
        // small dots and specks like the painting's dust: a few light ones in the light, dark ones in the shade
        'vec2 spw = abs(wn.y) > .7 ? vWP.xz : abs(wn.x) > abs(wn.z) ? vWP.zy : vWP.xy; float spl = exp2(floor(log2(max(dd, 20.) * .02))); vec2 spq = spw * 3. / spl; vec2 spc = floor(spq) + floor(log2(spl)) * 13.; float sph = h21(spc + 17.); float spd = length(fract(spq) - .5 - (vec2(h21(spc + 3.), h21(spc + 9.)) - .5) * .5);\n' +
        'col = mix(col, sph > .983 ? min(col * 1.22 + .07, vec3(1.)) : col * .72, step(.966, sph) * (1. - smoothstep(.15, .24, spd)) * .8);\n' +
        // snow settling slowly on everything that faces the sky: crowns, roofs, railings, parked cars
        'if (uSnowAmt > .01) { float sup = smoothstep(.45, .8, wn.y) * step(.25, vWP.y); float sn = sup * smoothstep(.35, .6, vn2(vWP.xz * 1.7 + vWP.y) * .6 + uSnowAmt * .55); col = mix(col, mix(vec3(.86, .9, 1.), vec3(1.), b1), sn); }\n' +
        // at night: full-moon nights brighter and bluer, new-moon nights darker; surfaces near a lit lamp catch its light on the side facing it
        'col = mix(col * (1. - .22 * uPn * (1. - uMoon)), col * vec3(.95, 1.02, 1.18) + vec3(0., .02, .07), uPn * uMoon * .7);\n' +
        'if (uPn > .25) { vec3 lampC = vec3(0.); for (int li = 0; li < 24; li++) { vec4 Lp = uLamps[li]; if (Lp.y < -900.) break; vec3 dl = Lp.xyz - vWP; float ds = length(dl); if (ds > 9. || ds < .45) continue; float lon = smoothstep(Lp.w - .04, Lp.w + .04, uPn); lampC += vec3(1., .76, .42) * max(0., dot(wn, dl / ds)) * (1. - smoothstep(1.5, 9., ds)) * lon; } col += lampC * .32 * min(1., uPn * 1.3); }\n' +
        // fog: layers by depth, so near trees stand out and the tower's top fades away
        'if (uFog > .01) { float fdist = length(vWP - cameraPosition); float fa = uFog * clamp(1. - exp(-fdist * .0013) + smoothstep(60., 320., vWP.y) * .5 - .04, 0., .93); col = mix(col, uFogC, fa); }\n' +
        // Halloween: the jack-o'-lanterns' candle light, flickering at 12 frames a second
        'if (uHwOn > .01) { vec3 hc = vec3(0.); for (int hi = 0; hi < 24; hi++) { vec4 Hp = uHw[hi]; if (Hp.y < -900.) break; vec3 dh = Hp.xyz - vWP; float dsh = length(dh); if (dsh > 7.5) continue; float fl = .6 + .4 * h21(vec2(floor(uTime * 12.), Hp.w)); hc += vec3(1., .5, .12) * (max(0., dot(wn, dh / max(dsh, .01))) * .75 + .25) * (1. - smoothstep(.8, 7.5, dsh)) * fl; } col += hc * .5 * uHwOn; }\n' +
        // fireworks: each burst flashes its colour on everything that faces it
        'for (int bj = 0; bj < 4; bj++) { if (uBst[bj].w > .01) { vec3 bd = normalize(uBst[bj].xyz - vWP); col += uBstC[bj] * uBst[bj].w * (pow(max(0., dot(wn, bd)), 1.5) * .38 + .03); } }\n' +
        'vec3 outgoingLight = col;');
  };
  return m;
}
export function sway(kind) {
  // trees and bushes lean in the breeze (a gust on hover or a click)
  if (kind === 'grass') return '\nvec4 ipw = vec4(0.);\n#ifdef USE_INSTANCING\nipw = instanceMatrix[3];\n#endif\ntransformed.x += position.y * position.y * (sin(uTime * 2.3 + ipw.x * .7 + ipw.z * .3) * .35 + .2) * (.4 + uWind);';
  return '\nvec4 ipw = vec4(0.);\n#ifdef USE_INSTANCING\nipw = instanceMatrix[3];\n#endif\nfloat ph = ipw.x * .11 + ipw.z * .07 + position.x * .02; float kk = max(position.y + ' + (kind === 'bush' ? '6.' : '20.') + ', 0.) * uWind * ' + (kind === 'bush' ? '.006' : '.0035') + ';\n' +
    'float wave = smoothstep(.55, 1., sin(uTime * .7 - ipw.x * .025 - ipw.z * .01)) * uWind;\n' +
    'transformed.x += (sin(uTime * 1.9 + ph) * .6 + sin(uTime * 3.7 + ph * 1.7) * .25 + .35 + wave * 1.4) * kk * 6.; transformed.z += cos(uTime * 1.5 + ph) * kk * 2.;\n' +
    'transformed.xz += vec2(sin(uTime * 4.3 + position.y * .35 + position.x * .2), cos(uTime * 3.9 + position.y * .3)) * (.25 + wave * 1.2) * kk * 2.2;';
}

// ---------------------------------------------------------------- crisp procedural patterns drawn in the paint shader (lines stay sharp at any size)
// each one works on vUv2 (its own pattern space) and vScr (a per-mesh value), on top of the banded colour `col`
export var PATS = {
  // the tower's lattice: X-bracing, girders, posts, corner rivets; the top and bottom triangles of each X are open to the sky
  lat: 'vec2 tu = vUv2; vec2 aw = max(fwidth(tu), vec2(1e-5)); vec2 f = fract(tu);\n' +
    'float pxD = length(aw) * .7071, dX = min(abs(f.x - f.y), abs(f.x + f.y - 1.)) * .7071, dG = min(f.y, 1. - f.y), dP = min(f.x, 1. - f.x);\n' +
    'float wd = .075, wg = .07, cellPx = 1. / aw.y;\n' +
    'bool tb = abs(f.y - .5) > abs(f.x - .5);\n' +
    'if (tb && cellPx > 9. * uPx && dX > wd * 1.8 && dG > wg * 2.2) discard;\n' +
    'vec3 lineL = mix(pal(vTok2.x), min(cBase * 1.4, vec3(1.)), uPn), inkC = mix(pal(vTok.w) * .78, min(cBase * 1.3, vec3(1.)), uPn);\n' +
    'float lw = smoothstep(5. * uPx, 16. * uPx, cellPx);\n' +
    // night: brightest at the feet, fading upward; faces a little darker under the bright lines
    'float hn = clamp(vWP.y / 290., 0., 1.);\n' +
    'col *= 1. - uPn * (.1 + .32 * smoothstep(.04, .9, hn)); col += uPn * (1. - smoothstep(0., .22, hn)) * .16 * lineL;\n' +
    // long strokes running down each leg (v follows the leg's curve)
    'float sxq = tu.x * 4., sid = floor(sxq), seg = step(.5, h21(vec2(sid, floor(tu.y * 1.6 + h21(vec2(sid, 3.)) * 2.))));\n' +
    'float plate = step(wd * 1.3, dX) * step(wg * 1.4, dG);\n' +
    'col = mix(col, cShade, .4 * lw * seg * plate * ln(abs(fract(sxq) - .5) / (4. * aw.x), .35));\n' +
    // girders: a light band, lit along its top, inked along its bottom
    'col = mix(col, mix(col, lineL, .4 - .15 * uPn), (.2 + .8 * lw) * (1. - smoothstep(wg, wg + aw.y, dG)));\n' +
    'col = mix(col, lineL, (.15 + .85 * lw) * ln(abs(f.y - wg) / aw.y, .45));\n' +
    'col = mix(col, inkC, (.2 + .8 * lw) * ln(abs(f.y - (1. - wg)) / aw.y, .5));\n' +
    // X-bracing: two ink lines along each big member, a single line when it is small on screen
    'float dbl = smoothstep(2.2, 3.6, wd / pxD / uPx);\n' +
    'col = mix(col, inkC, (.15 + .85 * lw) * mix(ln(dX / pxD, .55), ln(abs(dX - wd) / pxD, .45), dbl));\n' +
    'col = mix(col, inkC, .7 * lw * ln(dP / aw.x, .35));\n' +
    // the corner edges: a rim of light on the side facing the light, ink on the other, and a row of rivets
    'float ue = min(tu.x, vScr - tu.x);\n' +
    'col = mix(col, ndl > .02 ? lineL + vec3(.1) * (1. - uPn) : inkC, ln(ue / aw.x, .7));\n' +
    'float rsp = 1. / (6. * aw.y), rv = length(vec2((ue - .1) / aw.x, (fract(tu.y * 6.) - .5) * rsp));\n' +
    'col = mix(col, lineL * 1.08, .9 * smoothstep(3.5 * uPx, 5.5 * uPx, rsp) * (1. - smoothstep(.9 * uPx, 1.7 * uPx, rv)));\n',
  // the platforms' sides: a frieze of small arches below, restaurant windows above (vScr 1: windows only)
  plat: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); float s = vUv2.x, r = vUv2.y, fx = fract(s) - .5;\n' +
    'vec3 trim = pal(vTok2.y), inkC = mix(pal(vTok.w) * .7, trim, uPn);\n' +
    'float wb = vScr > .5 ? .12 : .52;\n' +
    'if (vScr < .5 && r < .46) { vec2 p = vec2(fx / aw.x, (r - .3) / aw.y); float R = .3 / aw.x;\n' +
    '  float sd = p.y > 0. ? length(vec2(p.x, p.y * 1.6)) - R : max(abs(p.x) - R, (.1 - r) / aw.y);\n' +
    '  col = mix(col, deep * (1. - .25 * uPn) + uPn * .25 * trim, step(sd, 0.) * .9); col = mix(col, inkC, ln(abs(sd), .45)); }\n' +
    'float f2 = fract(s * 1.5), mul = min(f2, 1. - f2) / (1.5 * aw.x);\n' +
    'if (r > wb + .04 && r < .9) { vec3 g = pal(vTok2.x) * (1. + .3 * uPn); col = mix(col, g, smoothstep(.6 * uPx, 1.4 * uPx, mul)); col = mix(col, inkC, ln(min(abs(r - wb - .04), abs(r - .9)) / aw.y, .4)); }\n' +
    'col = mix(col, trim, max(ln(abs(r - .96) / aw.y, .55), ln(abs(r - wb) / aw.y, .45)));\n' +
    'col = mix(col, inkC, ln(abs(r - .015) / aw.y, .55));\n',
  // railings: fine ink lines, everything else open
  rail: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); float fx = fract(vUv2.x), r = vUv2.y;\n' +
    'float m = max(max(ln(min(fx, 1. - fx) / aw.x, .45), ln(abs(r - .94) / aw.y, .6)), max(ln(abs(r - .5) / aw.y, .35), ln(abs(r - .04) / aw.y, .45)));\n' +
    'if (m < .4) discard; col = mix(pal(vTok.w) * .72, pal(vTok2.x), uPn);\n',
  // glass: panes between thin mullions, a glare stripe by day, warm light at night
  win: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); vec2 f = fract(vUv2);\n' +
    'float mu = min(min(f.x, 1. - f.x) / aw.x, min(f.y, 1. - f.y) / aw.y);\n' +
    'float gl = (1. - uPn) * step(.78, fract(f.x * .8 + f.y * .45 + floor(vUv2.x) * .37)) * .4;\n' +
    'vec3 pane = mix(pal(vTok2.x), vec3(1.), gl) * (1. + .3 * uPn); pane = mix(pane, pane * .82, (1. - uPn) * smoothstep(.5, 1., f.y));\n' +
    'col = mix(pane, pal(vTok.w) * mix(.75, 1.05, uPn), ln(mu, .5));\n',
  // the decorated band along each arch: border lines and a row of small curls
  band: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); float s = vUv2.x, r = vUv2.y; col = mix(col, min(pal(vTok.y) * 1.12, vec3(1.)), uPn);\n' +
    'float lw = smoothstep(6. * uPx, 18. * uPx, 1. / aw.y);\n' +
    'vec3 lineL = mix(pal(vTok2.x), min(pal(vTok.y) * 1.45, vec3(1.)), uPn), inkC = mix(pal(vTok.w) * .75, pal(vTok.w) * .9, uPn);\n' +
    'col = mix(col, lineL, .85 * ln(abs(r - .03) / aw.y, .5));\n' +
    'col = mix(col, inkC, (.35 + .65 * lw) * max(ln(abs(r - .14) / aw.y, .4), ln(abs(r - .9) / aw.y, .45)));\n' +
    'float kk = floor(s); vec2 p = vec2(fract(s) - .5, (r - .52) * aw.x / aw.y); if (mod(kk, 2.) > .5) p.x = -p.x;\n' +
    'float an = atan(p.y, p.x), rr = length(p), sp = .07 + .13 * (an + 3.1416) / 6.2832;\n' +
    'col = mix(col, inkC, lw * ln(abs(rr - sp) / aw.x, .4) * step(rr, .21));\n' +
    'col = mix(col, inkC, (.4 + .6 * lw) * ln(rr / aw.x, .8));\n',
  // the arch's underside: its own deep core shadow, darker toward the band
  soff: 'col = mix(col, cShade * .5, core * .75 * uStyle.x); col = mix(col, cShade * .42, (1. - b1) * .35 * smoothstep(.6, 1., vUv2.y));\n',
  // facades with a grid of windows (rotundas, École Militaire); vScr 1: floodlit at night
  hwin: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); vec2 f = fract(vUv2);\n' +
    'float inW = step(abs(f.x - .5), .2) * step(.24, f.y) * step(f.y, .84);\n' +
    'if (vScr > .5) col = mix(col, min(col * 1.45 + vec3(.08, .05, .0), vec3(1.)), .55 * uPn);\n' +
    'float dW = max(abs(f.x - .5) - .2, max(.24 - f.y, f.y - .84)); float dpx = abs(dW) / max(aw.x, aw.y);\n' +
    'vec3 g = pal(vTok2.x) * (1. + .25 * uPn); col = mix(col, g, inW);\n' +
    'col = mix(col, pal(vTok.w), .8 * ln(dpx, .45));\n' +
    'col = mix(col, pal(vTok2.y), .7 * ln(abs(f.y - .9) / aw.y, .4) * step(abs(f.x - .5), .26));\n',
  // far Paris: each layer paler, sinking into the haze (vScr = how much)
  haze: 'col = mix(col, pal(vTok2.x), vScr); if (vTok.w >= 0.) col = mix(col, pal(vTok2.x) * .7, vScr * .25 * hatch);\n',
  // the Montparnasse tower's glass: a crisp grid, the sky reflected by day
  mtp: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); vec2 f = fract(vUv2);\n' +
    'float hgt = clamp(vWP.y / 200., 0., 1.); vec3 refl = mix(pal(vTok2.y), pal(vTok2.x), hgt);\n' +
    'col = mix(col, mix(col, refl, .55), 1. - uPn);\n' +
    'col = mix(col, pal(vTok.w), .85 * max(ln(min(f.y, 1. - f.y) / aw.y, .35), .6 * ln(min(f.x, 1. - f.x) / aw.x, .3)));\n',
  // striped canvas awnings with a scalloped edge
  awn: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); float s = vUv2.x, r = vUv2.y;\n' +
    'float sc = .86 + .14 * abs(sin(s * 3.1416 * 2.)); if (r > sc) discard;\n' +
    'col = mix(col, mix(pal(vTok2.x), cShade * 0. + pal(vTok2.x) * .82, 1. - b1), step(.5, fract(s)));\n' +
    'col = mix(col, pal(vTok.w), .7 * ln(abs(r - sc) / aw.y, .5));\n' +
    'col = mix(col, pal(vTok.w), .5 * ln(abs(r - .78) / aw.y, .35));\n',
  // the Champ de Mars: mowing stripes, dotted gravel paths along the sides
  champ: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); float u = vUv2.x, v = vUv2.y;\n' +
    'col = mix(col, mix(col, pal(vTok.w), .55), step(.5, fract(u * 9.)) * step(.07, u) * step(u, .93));\n' +
    'float path = 1. - step(.07, u) * step(u, .93);\n' +
    'vec2 q = vec2(u * 110., v * 360.); float dt = h21(floor(q)); float dq = length(fract(q) - .5);\n' +
    'col = mix(col, pal(vTok2.x), path); col = mix(col, pal(vTok2.y), path * step(.5, dt) * (1. - smoothstep(.2, .34, dq)));\n' +
    'col = mix(col, cShade, .6 * ln(min(abs(u - .07), abs(u - .93)) / aw.x, .4));\n',
  // a picnic blanket: checks
  check: 'vec2 f = floor(vUv2 * 6.); col = mix(col, pal(vTok2.x), mod(f.x + f.y, 2.));\n',
  // the quay walls: stone blocks, a dark wet band and a foam line at the water, ivy and moss
  quay: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); vec2 q = vUv2; float row = floor(q.y), jx = fract(q.x * .5 + .5 * mod(row, 2.));\n' +
    'float dj = min(min(fract(q.y), 1. - fract(q.y)) / aw.y, min(jx, 1. - jx) / (.5 * aw.x));\n' +
    'col = mix(col, cShade * .78, .85 * ln(dj, .4)); col = mix(col, cShade, .2 * step(.8, h21(floor(vec2(q.x * .5 + .5 * mod(row, 2.), row)))));\n' +
    'float wy = vWP.y + 2.6; col = mix(col, col * vec3(.62, .66, .7), 1. - smoothstep(.35, .6, wy));\n' +
    'col = mix(col, pal(vTok2.y), (1. - smoothstep(.15, .45, wy)) * .45 * step(.4, h21(floor(vec2(vWP.x + vWP.z, vWP.y) * vec2(1.5, 4.)))));\n' +
    'float fl = abs(wy - .07 - .05 * sin(vWP.x * .8 + uTime * 2.)); col = mix(col, vec3(.92, .96, 1.), (1. - smoothstep(.03, .09, fl)) * .8);\n' +
    // ivy: a few patches hanging from the top, drawn as small round leaves in two greens with a dark outline
    'vec2 wq = vec2(vWP.x + vWP.z, vWP.y); float hang = smoothstep(.6, .66, vn2(vec2(wq.x * .07, 1.3)) - (2.6 - wy) * .06 * (.6 + .8 * vn2(vec2(wq.x * .6, 7.))));\n' +
    'vec2 lq = wq * 2.4; vec2 lc = floor(lq), lf = fract(lq) - .5 + (vec2(h21(lc), h21(lc + 3.1)) - .5) * .4; float ld = length(lf * vec2(1., 1.3));\n' +
    'float leaf = (1. - smoothstep(.4, .47, ld)) * step(.08, h21(lc + 9.)) * hang; vec3 lcol = mix(pal(vTok2.x), pal(vTok2.x) * 1.3, step(.5, h21(lc + 5.)));\n' +
    'col = mix(col, cShade * .55, hang * .35); col = mix(col, lcol, leaf); col = mix(col, cShade * .5, hang * (1. - smoothstep(.36, .5, abs(ld - .42) * 8.)) * .0);\n',
  // a balustrade: vase-shaped balusters between a base and a rail, open in between
  balus: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); float fx = fract(vUv2.x) - .5, r = vUv2.y;\n' +
    'float bw = .15 + .13 * smoothstep(.15, .38, r) * (1. - smoothstep(.38, .8, r)) - .05 * smoothstep(.8, .9, r) + .06 * smoothstep(.9, .97, r);\n' +
    'float dB = abs(fx) - bw; if (dB > 0.) discard;\n' +
    'col = mix(col, cShade, .35 * smoothstep(-.05, .0, dB) + .25 * smoothstep(.0, -.12, fx));\n' +
    'col = mix(col, pal(vTok.w) * .8, .8 * ln(abs(dB) / aw.x, .4));\n',
  // carved pedestal panels: a moulded frame and a medallion
  panel: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); vec2 f = fract(vUv2);\n' +
    'float fra = min(min(abs(f.x - .12), abs(f.x - .88)), min(abs(f.y - .12), abs(f.y - .88))); float inR = step(.12, f.x) * step(f.x, .88) * step(.12, f.y) * step(f.y, .88);\n' +
    'col = mix(col, cShade * .9, inR * .25); col = mix(col, pal(vTok.w) * .8, .8 * ln(fra / max(aw.x, aw.y), .45) * step(.1, min(min(f.x, 1. - f.x), min(f.y, 1. - f.y)) + .05));\n' +
    'float rm = abs(length(f - .5) - .17); col = mix(col, pal(vTok.w) * .8, .7 * ln(rm / max(aw.x, aw.y), .4)); col = mix(col, cLit, .5 * (1. - smoothstep(.06, .09, length(f - .5))));\n',
  // lantern glass: panes between thin ink mullions, glowing at night
  lant: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); vec2 f = vUv2; float lon = vScr > .05 ? smoothstep(vScr - .04, vScr + .04, uPn) : uPn;\n' +
    'col = mix(col, min(col * 1.35 + vec3(.15, .1, 0.), vec3(1.)), lon); col = mix(col, vec3(1., .97, .86), lon * (1. - smoothstep(.05, .32, length((f - vec2(.5, .42)) * vec2(1., .8))))); col = mix(col, vec3(1.), (1. - lon) * .35 * step(.7, fract(f.x * 1.3 + f.y * .6)));\n' +
    'col = mix(col, pal(vTok.w), .9 * max(ln(min(f.x, 1. - f.x) / aw.x, .6), max(ln(abs(f.x - .5) / aw.x, .35), ln(min(abs(f.y - .5), min(f.y, 1. - f.y)) / aw.y, .45))));\n',
  // boat windows with passengers behind the glass (vScr: which boat), some waving
  pax: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); vec2 f = fract(vUv2); float wi = floor(vUv2.x + 1e-3) + floor(vScr + .5) * 7.; float asp = vScr < 19.5 ? 1.65 : .83;\n' +
    'vec3 gls = pal(vTok2.x) * (1. + .25 * uPn); col = gls; col = mix(col, vec3(1.), (1. - uPn) * .3 * step(.75, fract(f.x * .9 + f.y * .5)));\n' +
    'if (vScr < 90.) { float sil = 1.; for (int i = 0; i < 2; i++) { float fi = float(i); if (h21(vec2(wi, fi + 5.)) < .25) continue; float px = (.3 + fi * .4 + (h21(vec2(wi, fi)) - .5) * .12) * asp;\n' +
    '  vec2 q = vec2(f.x * asp - px, f.y); float hd = length(q - vec2(0., .62)) - .11;\n' +
    '  vec2 sq = q - vec2(0., .22); float sh = length(max(abs(sq) - vec2(.11, .2), 0.)) - .07;\n' +
    '  float wave = step(h21(vec2(wi, fi + 9.)), .3); vec2 a0 = vec2(.14, .42), a1 = vec2(.24 + .05 * sin(uTime * 6. + wi), .82); vec2 pa = q - a0, ba = a1 - a0; float arm = length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)) - .035;\n' +
    '  sil = min(sil, min(min(hd, sh), mix(1., arm, wave))); }\n' +
    '  col = mix(col, pal(vTok2.y) * mix(.85, .35, uPn) + vec3(.05, .03, .01) * uPn, (1. - smoothstep(0., length(fwidth(f * vec2(asp, 1.))) * .8, sil)) * .85); }\n' +
    'col = mix(col, pal(vTok.w), .85 * ln(min(min(f.x, 1. - f.x) / aw.x, min(f.y, 1. - f.y) / aw.y), .5));\n',
  // ---- cars. vScr = kind id * 10 + length. Lines: ink (vTok.w), chrome (vTok2.x), dark trim (vTok2.y)
  carbody: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); float c_x = vUv2.x, c_y = vUv2.y; float c_k = floor(vScr / 10. + .001); float c_len = vScr - c_k * 10.;\n' +
    'float c_side = smoothstep(.4, .7, abs(normal.z)), c_top = smoothstep(.5, .8, normal.y);\n' +
    'float c_belt = c_k < 1.5 ? 1. : c_k < 2.5 ? .95 : c_k < 3.5 ? .8 : c_k < 4.5 ? 1.15 : c_k < 5.5 ? .82 : c_k < 6.5 ? .98 : c_k < 7.5 ? .86 : .98;\n' +
    'float c_four = (abs(c_k - 2.) < .1 || abs(c_k - 4.) < .1 || abs(c_k - 6.) < .1 || abs(c_k - 8.) < .1) ? 1. : 0.;\n' +
    'vec3 c_ink = pal(vTok.w) * .9, c_chr = pal(vTok2.x), c_trim = pal(vTok2.y);\n' +
    'col = mix(col, cShade * .78, c_side * (1. - smoothstep(.43, .47, c_y)));\n' +
    'bool c_chl = abs(c_k - 2.) < .1 || abs(c_k - 6.) < .1; col = mix(col, c_chl ? c_chr : c_ink, c_side * ln(abs(c_y - c_belt + .03) / aw.y, c_chl ? .9 : .5));\n' +
    'float c_d1 = c_len * .62, c_d0 = c_len * (c_four > .5 ? .3 : .36), c_dm = c_len * .47;\n' +
    'float c_dx = min(abs(c_x - c_d1 + (c_y - .4) * .1), abs(c_x - c_d0 + (c_y - .4) * .06)); if (c_four > .5) c_dx = min(c_dx, abs(c_x - c_dm));\n' +
    'col = mix(col, c_ink, c_side * ln(c_dx / aw.x, .45) * step(.44, c_y) * step(c_y, c_belt - .02));\n' +
    'float c_hx = min(abs(c_x - (c_d1 - .3)), c_four > .5 ? abs(c_x - (c_dm - .28)) : 9.); col = mix(col, c_chr, c_side * step(c_hx, .12) * step(abs(c_y - c_belt + .14), .022));\n' +
    'float c_wr = abs(c_k - 4.) < .1 ? .4 : .36; float c_ad = min(length(vec2(c_x - c_len * .18, c_y - .36)), length(vec2(c_x - c_len * .8, c_y - .36)));\n' +
    'col = mix(col, c_ink, c_side * ln(abs(c_ad - c_wr - .09) / aw.x, .45) * step(.38, c_y));\n' +
    'float c_hs = abs(c_x - c_len * (abs(c_k - 2.) < .1 ? .74 : .8)), c_bs = abs(c_x - c_len * .13); col = mix(col, c_ink, c_top * ln(min(c_hs, c_bs) / aw.x, .4) * .85);\n' +
    'if (abs(c_k - 5.) < .1) { float c_sc = abs((c_x - c_len * .55) - (c_y - .5) * 1.4); col = mix(col, c_ink, c_side * ln(c_sc / aw.x, .4) * step(.45, c_y) * step(c_y, c_belt));\n' +
    '  float c_vx = fract((c_x - c_len * .25) / .09); col = mix(col, c_trim, c_side * step(c_len * .25, c_x) * step(c_x, c_len * .34) * step(.5, c_y) * step(c_y, .72) * step(.45, c_vx)); }\n' +
    'if (abs(c_k - 7.) < .1) { vec2 c_rp = vec2(c_x - c_len * .5, c_y - .62); float c_rr = length(c_rp); col = mix(col, vec3(1.), c_side * (1. - smoothstep(.235, .245, c_rr)));\n' +
    '  col = mix(col, c_ink, c_side * ln(abs(c_rr - .24) / aw.x, .4)); float c_e8 = min(abs(length(c_rp - vec2(0., .065)) - .055), abs(length(c_rp - vec2(0., -.07)) - .07));\n' +
    '  col = mix(col, c_ink, c_side * step(c_rr, .235) * (1. - smoothstep(.016, .026, c_e8)));\n' +
    '  col = mix(col, c_trim, c_side * step(c_belt - .2, c_y) * step(c_y, c_belt - .1) * step(.25, abs(c_rr - .0) * 4.) * step(.26, c_rr)); }\n' +
    // rim light: a thin bright line along the shoulders and the roof
    'col = mix(col, cLit + vec3(.14), smoothstep(.3, .42, normal.y) * (1. - smoothstep(.55, .7, normal.y)) * (1. - .5 * uPn) * .8);\n',
  carglass: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); float g_u = vUv2.x, g_v = vUv2.y; float g_k = floor(vScr / 10. + .001); bool g_bub = abs(g_k - 3.) < .1;\n' +
    'float g_four = (abs(g_k - 2.) < .1 || abs(g_k - 4.) < .1 || abs(g_k - 6.) < .1 || abs(g_k - 8.) < .1) ? 1. : 0.; float g_side = smoothstep(.35, .65, abs(normal.z)), g_top = smoothstep(.55, .85, normal.y);\n' +
    'vec3 g_0 = pal(vTok2.x), g_1 = pal(vTok2.y); vec3 g_c = mix(g_0, g_1, smoothstep(.05, .95, g_v) * (1. - .5 * uPn));\n' +
    'float g_b = fract(g_u * 1.4 - g_v * .55 + .1); float g_gl = (1. - smoothstep(0., .015, abs(g_b - .3) - .045)) + .8 * (1. - smoothstep(0., .012, abs(g_b - .4) - .012));\n' +
    'g_c = mix(g_c, vec3(1.), clamp(g_gl, 0., 1.) * (.8 - .55 * uPn));\n' +
    'vec2 g_q = vec2((g_u - .64) * 2.6, g_v - .34); float g_dr = min(length(g_q - vec2(0., .24)) - .15, length(max(abs(g_q - vec2(0., -.12)) - vec2(.2, .12), 0.)) - .08);\n' +
    'g_c = mix(g_c, g_0 * .4, (1. - smoothstep(-.01, .01, g_dr)) * .85 * g_side * (g_bub ? .6 : 1.));\n' +
    'float g_pd = min(min(abs(g_u - .1), abs(g_u - .9)), abs(abs(g_u - .5) - .028)); if (g_four > .5) g_pd = min(g_pd, abs(abs(g_u - .27) - .015));\n' +
    'float g_pil = g_bub ? step(g_u, .04) : max(max(step(g_u, .1), step(.9, g_u)), max(step(abs(g_u - .5), .028), g_four * step(abs(g_u - .27), .015)));\n' +
    'float g_roof = g_bub ? 0. : max(step(.86, g_v), g_top);\n' +
    'float g_body = max(g_pil * g_side, g_roof); col = mix(col, cLit + vec3(.16), g_roof * smoothstep(.3, .45, normal.y) * (1. - smoothstep(.6, .78, normal.y)) * (1. - .5 * uPn) * .85);\n' +
    'col = mix(g_c, col, g_body);\n' +
    'col = mix(col, pal(vTok.w) * .8, (g_bub ? 0. : 1.) * max(ln(abs(g_v - .86) / aw.y, .45), g_side * step(g_v, .86) * ln(g_pd / aw.x, .45)) * (1. - g_top));\n',
  carlamp: 'vec2 q = vUv2 - .5; float l_d;\n' +
    'if (vScr < .5) l_d = length(q) - .42; else if (vScr < 1.5) { q.y += q.x * .35; l_d = length(max(abs(q) - vec2(.4, .18), 0.)) - .06; } else if (vScr < 2.5) l_d = length(max(abs(q) - vec2(.3, .22), 0.)) - .16; else l_d = length(max(abs(q) - vec2(.48, .32), 0.)) - .02;\n' +
    'if (l_d > 0.) discard; float l_fw = max(fwidth(l_d), 1e-4); vec3 l_c = pal(vTok.x);\n' +
    'col = mix(l_c * .85, min(l_c * 1.5 + vec3(.25), vec3(1.)), uPn); col = mix(col, vec3(1.), (1. - smoothstep(.0, .25, length(q - vec2(-.12, .1)))) * .55);\n' +
    'col = mix(col, pal(vTok.w), (1. - smoothstep(.6 * l_fw, 1.6 * l_fw, -l_d)) * (1. - .7 * uPn));\n',
  rim: 'if (vScr > .5) { vec2 q = (vUv2 - .5) * 2.; float r_r = length(q), r_a = atan(q.y, q.x); float r_n = vScr;\n' +
    'float r_s = abs(fract(r_a / 6.2832 * r_n) - .5); float r_sp = step(.5 - (.13 + .12 * (1. - r_r)) * (r_n > 6. ? .55 : 1.), r_s);\n' +
    'float r_cal = step(.5, r_r) * step(r_r, .86) * step(.35, r_a) * step(r_a, 1.55);\n' +
    'vec3 r_gap = mix(pal(vTok.x) * .45, pal(vTok2.x), r_cal);\n' +
    'col = mix(r_gap, pal(vTok2.y) * mix(.9, 1.1, b1), max(r_sp, max(step(.9, r_r), step(r_r, .24))));\n' +
    'float r_fw = max(fwidth(r_r), 1e-4); col = mix(col, pal(vTok.w), (1. - smoothstep(r_fw, 2. * r_fw, abs(r_r - .24))) + (1. - smoothstep(r_fw, 2. * r_fw, abs(r_r - .9))));\n' +
    'col = mix(col, vec3(1.), (1. - smoothstep(.0, .07, length(q - vec2(-.35, .4)))) * .6 * (1. - uPn)); }\n',
  plate: 'vec2 q = vUv2; vec2 p_fw = max(fwidth(q), vec2(1e-4)); col = pal(vTok.x);\n' +
    'float p_e = min(min(q.x, 1. - q.x) / p_fw.x, min(q.y, 1. - q.y) / p_fw.y); col = mix(col, pal(vTok.w), 1. - smoothstep(.8, 1.8, p_e));\n' +
    'col = mix(col, pal(vTok2.x), step(q.x, .1)); col = mix(col, pal(vTok.w) * .9, step(abs(q.y - .5), .17) * step(.17, q.x) * step(q.x, .9) * step(.45, fract(q.x * 9.)));\n',
  // the street painter's canvas: a little painted Eiffel tower on a blue sky
  canvas: 'vec2 q = vUv2; col = mix(pal(vTok2.x) * 1.1, vec3(1.), smoothstep(.3, 1., q.y) * .3); col = mix(col, pal(vTok2.y), step(q.y, .18) * .6);\n' +
    'float tw = abs(q.x - .5) - (.03 + .22 * pow(1. - q.y, 2.2)); col = mix(col, vec3(.35, .25, .18), step(tw, 0.) * step(q.y, .86) * step(.12, q.y) * (.8 + .2 * step(.5, fract(q.y * 14.))));\n' +
    'vec2 aw = max(fwidth(q), vec2(1e-5)); col = mix(col, pal(vTok.w) * .9 + vec3(.2), 1. - smoothstep(1., 2., min(min(q.x, 1. - q.x) / aw.x, min(q.y, 1. - q.y) / aw.y)));\n',
  // a cast-iron tree grate: rings of slots round the trunk
  grate: 'vec2 q = vUv2 * 2. - 1.; vec2 aw = max(fwidth(q), vec2(1e-5)); float r = max(abs(q.x), abs(q.y)); float a = atan(q.y, q.x);\n' +
    'float slot = step(.5, fract(r * 6.)) * step(.35, fract(a / 6.2832 * (8. + floor(r * 6.) * 8.))) * step(.25, r);\n' +
    'col = mix(cShade * .75, col, slot); col = mix(col, pal(vTok2.x), step(.97, r)); col = mix(col, cShade * .4, step(r, .24));\n',
  // the lawns: mowing stripes; daisies in spring, fallen leaves in autumn, frost sparkle on cold mornings
  lawn: 'vec2 lw = vWP.xz; float stripe = step(.5, fract((lw.x + lw.y * .12) / 7.)); col = mix(col, mix(col, cLit, .32), stripe * (1. - uPn * .5));\n' +
    'vec2 dq = lw * 1.3; vec2 dc = floor(dq), df = fract(dq) - .5 + (vec2(h21(dc + 2.), h21(dc + 5.)) - .5) * .5; float dh = h21(dc);\n' +
    'if (uSeason.x > .5 && dh > .86) { float dr = length(df); col = mix(col, vec3(1.), (1. - smoothstep(.07, .1, dr)) * step(.025, dr)); col = mix(col, vec3(1., .82, .2), 1. - smoothstep(.03, .045, dr)); }\n' +
    'if (uSeason.z > .5 && dh > .8) { vec2 lf = mat2(cos(dh * 30.), -sin(dh * 30.), sin(dh * 30.), cos(dh * 30.)) * df; float lv = length(lf * vec2(1., 2.)) - .14; col = mix(col, dh > .92 ? LV1 : dh > .86 ? LV2 : LV3, 1. - smoothstep(-.01, .01, lv)); }\n' +
    'if (uSeason.x > .5 && uSeason.w > 1.5 && dh < .07) { vec2 pf = mat2(cos(dh * 90.), -sin(dh * 90.), sin(dh * 90.), cos(dh * 90.)) * df; col = mix(col, dh < .035 ? vec3(1., .82, .88) : vec3(1., .97, .97), 1. - smoothstep(.05, .07, length(pf * vec2(1., 1.7)))); }\n' +
    'if (uFrost > .5) { float sp = h21(floor(lw * 4.) + floor(uTime * 2.)); col = mix(col, vec3(1.), step(.985, sp) * (1. - uPn)); }\n',
  // the basin's rim: stone blocks with joints on top, a wet dark band down the inside wall, a rounded coping
  rim: 'float rj = fract(vUv2.x / 1.5); float rb = floor(vUv2.x / 1.5);\n' +
    'if (vScr < 1.5) { col *= .93 + .12 * h21(vec2(rb, 3.)); col = mix(col, cShade * .7, (1. - smoothstep(.0, .045, min(rj, 1. - rj) * 1.5)) * .85); col = mix(col, cShade * .8, (1. - smoothstep(.0, .06, abs(vUv2.y - .97))) * .5); }\n' +
    'else if (vScr < 2.5) { col = mix(col, cShade * .75, (1. - smoothstep(.0, .045, min(rj, 1. - rj) * 1.5)) * .8); float wet = 1. - smoothstep(.2, .3, vUv2.y); col = mix(col, cShade * vec3(.62, .7, .78), wet * .75); col = mix(col, vec3(.3, .42, .3), (1. - smoothstep(.0, .025, abs(vUv2.y - .215))) * .6); }\n' +
    'else { col *= .95 + .1 * h21(vec2(rb, 5.)); col = mix(col, cShade * .68, (1. - smoothstep(.0, .045, min(rj, 1. - rj) * 1.5)) * .9); col = mix(col, cLit + .06, smoothstep(.55, .62, vUv2.y) * (1. - smoothstep(.7, .78, vUv2.y)) * .5 * (1. - uPn)); col = mix(col, cShade * vec3(.48, .56, .66), (1. - smoothstep(.3, .4, vUv2.y))); col = mix(col, vec3(.28, .4, .3), (1. - smoothstep(.0, .04, abs(vUv2.y - .14))) * .55); }\n',
  // gravel paths: dots, an edging line; footprints in the snow; puddles after rain
  gravel: 'vec2 gw = vWP.xz; vec2 gq = gw * 3.2; vec2 gc = floor(gq), gf = fract(gq) - .5; float gh = h21(gc);\n' +
    'col = mix(col, gh > .5 ? cShade * .88 : cLit, step(.62, gh) * (1. - smoothstep(.12, .2, length(gf))));\n' +
    'col = mix(col, cShade * .7, (1. - smoothstep(.0, .06, vUv2.y)) + (1. - smoothstep(.0, .06, 1. - vUv2.y)) * step(.5, vScr));\n' +
    'float g_dg = step(.11, vWP.y); float g_ac = mix(vUv2.y * 11.4, vUv2.x * 6., g_dg); float g_al = mix(vWP.x, vWP.z, g_dg);\n' +
    'float g_wet = uFount * (.45 + .55 * min(1., uWind)) * smoothstep(15., 17., vWP.x) * (1. - smoothstep(23., 25., vWP.x)) * (1. - smoothstep(5., 13., abs(vWP.z - 503.))); float g_wn = vn2(vWP.xz * 1.3); col = mix(col, col * vec3(.66, .69, .76), clamp(g_wet * 1.3, 0., 1.) * smoothstep(.25, .45, g_wn + g_wet * .3)); col = mix(col, vec3(.85, .9, .97), g_wet * smoothstep(.7, .72, vn2(vWP.xz * 2.1 + 5.)) * .5);\n' +
    'if (uSnow > .5) { for (int i = 0; i < 2; i++) { float fi = float(i); float lane = 1.8 + fi * 2.3 + sin(g_al * .07 + fi * 3.) * .35; float stp = g_al / .72 + fi * .41; float side = mod(floor(stp), 2.) < .5 ? -1. : 1.;\n' +
    '  vec2 fp = vec2(g_ac - lane - side * .14, (fract(stp) - .5) * .72); float fe = length(fp / vec2(.075, .16)); col = mix(col, cShade * .78, (1. - smoothstep(.8, 1., fe)) * .9); col = mix(col, cShade * .55, (1. - smoothstep(.0, .14, abs(fe - .93))) * .5 * step(fp.y, 0.)); } }\n' +
    'if (uRain > .5) { float pz = vn2(gw * .55 + 3.); float pd = smoothstep(.6, .63, pz); vec3 sky = mix(vec3(.62, .68, .78), vec3(.16, .2, .34), uPn);\n' +
    '  float rg = 0.; for (int i = 0; i < 2; i++) { vec2 rq = gw * 1.2 + float(i) * 3.7; vec2 rc = floor(rq); float rt = fract(uTime * .8 + h21(rc)); float rr = length(fract(rq) - .5); rg = max(rg, (1. - smoothstep(.0, .03, abs(rr - rt * .45))) * (1. - rt)); }\n' +
    '  col = mix(col, mix(sky, col * .55, .3), pd); col = mix(col, vec3(.92, .95, 1.), rg * pd * .8); col = mix(col, cShade * .62, (pd - smoothstep(.63, .66, pz)) * .7); }\n',
  // bushes and flowerbeds: leaves, with flower heads in season (tulips, roses, chrysanthemums); bare soil and straw in winter
  bush: 'vec3 Vw2 = normalize(vViewPosition); float bfr = 1. - abs(dot(normal, Vw2));\n' +
    'vec2 bq = vec2(vWP.x + vWP.z * .6, vWP.y) * (vScr > .5 ? 1.9 : 3.4); vec2 bc = floor(bq), bf = fract(bq) - .5 + (vec2(h21(bc + 1.), h21(bc + 4.)) - .5) * .35; float bh = h21(bc);\n' +
    'vec2 lf = mat2(cos(bh * 6.), -sin(bh * 6.), sin(bh * 6.), cos(bh * 6.)) * bf; float leafS = 1. - smoothstep(.0, .05, length(lf * vec2(1., 2.2)) - .26);\n' +
    'if (vScr > .5) {\n' +
    '  vec3 leafC = mix(LF2 * .8, LF1, b1); col = mix(leafC, col, .25); col = mix(col, LF2 * .65, leafS * step(.5, h21(bc + 9.)) * .6);\n' +
    '  if (uSeason.w > 4.5) { col = mix(SOIL * mix(.75, 1., b1), STRAW, step(.6, h21(floor(bq * vec2(1.6, .7)))) * .85 * step(.3, abs(fract(bq.x * 1.6 + bq.y * .4) - .5) * 2.)); }\n' +
    '  else { float fr = length(bf); vec3 fc = pal(vTok.x); float on = step(.22, bh);\n' +
    '    if (uSeason.x > .5) { vec2 t = bf * vec2(1., .9); float cup = max(abs(t.x) - .17, abs(t.y + .02) - .2); cup = min(cup, length(t - vec2(0., .14)) - .17); float notch = step(abs(t.x), .04) * step(.14, t.y); col = mix(col, fc * mix(.8, 1.08, b1), on * (1. - smoothstep(-.02, .0, cup)) * (1. - notch)); col = mix(col, LF1, on * step(abs(t.x), .03) * step(t.y, -.18) * step(-.42, t.y)); }\n' +
    '    else if (uSeason.y > .5) { col = mix(col, fc * mix(.78, 1.05, b1), on * (1. - smoothstep(.2, .23, fr))); float sw = abs(fract(atan(bf.y, bf.x) / 6.2832 + fr * 3.) - .5); col = mix(col, fc * .6, on * step(fr, .2) * (1. - smoothstep(.06, .12, sw)) * .8); }\n' +
    '    else { float a = atan(bf.y, bf.x); float pet = .17 + .07 * abs(sin(a * 7.)); col = mix(col, fc * mix(.8, 1.05, b1), on * (1. - smoothstep(pet - .02, pet, fr))); col = mix(col, fc * .55, on * (1. - smoothstep(.04, .06, fr))); } } }\n' +
    'else { col = mix(col, cLit, leafS * step(.45, bh) * b1 * .6); col = mix(col, cShade * .75, leafS * step(.6, bh) * (1. - b1) * .6); }\n' +
    'col = mix(col, pal(vTok.x) * .35, smoothstep(.62, .85, bfr) * .9);\n',
  // clipped hedges: leaf texture, a crisp ink line along the top edge
  hedge: 'vec2 hq = vec2(vWP.x + vWP.z, vWP.y) * 3.; vec2 hc = floor(hq), hf = fract(hq) - .5; float hh = h21(hc); col = mix(col, cLit, step(.6, hh) * (1. - smoothstep(.15, .25, length(hf))) * .5 * b1);\n' +
    'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); col = mix(col, pal(vTok.w), max(ln(abs(vUv2.y - .97) / aw.y, .6), ln(abs(vUv2.y - .02) / aw.y, .4) * .6) * step(abs(normal.y), .5));\n' +
    'col = mix(col, mix(col, cLit, .35), step(.5, normal.y));\n',
  // dressed stone: courses and staggered joints
  stone: 'vec2 aw = max(fwidth(vUv2), vec2(1e-5)); vec2 q = vUv2; float row = floor(q.y), jx = fract(q.x * .5 + .5 * mod(row, 2.));\n' +
    'float d = min(min(fract(q.y), 1. - fract(q.y)) / aw.y, min(jx, 1. - jx) / (.5 * aw.x));\n' +
    'col = mix(col, cShade * .8, .85 * ln(d, .4));\n' +
    'col = mix(col, cShade, .25 * step(.82, h21(floor(vec2(q.x * .5 + .5 * mod(row, 2.), row)))));\n'
};
