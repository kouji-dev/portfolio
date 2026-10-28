import * as T from 'three';

// ---------------------------------------------------------------- glow sprites (night lights): world-sized soft discs
export function Glows(U, tex) { this.U = U; this.list = []; this.tex = tex; }
Glows.prototype.add = function (p, size, color, op, kind, thr) { this.list.push({ p: p, s: size, c: new T.Color(color), o: op, k: kind || 'nt', thr: thr || 0 }); return this.list.length - 1; };
Glows.prototype.build = function () {
  var n = this.list.length, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sz = new Float32Array(n), op = new Float32Array(n), kd = new Float32Array(n);
  this.list.forEach(function (g, i) { pos.set(g.p, i * 3); col.set([g.c.r, g.c.g, g.c.b], i * 3); sz[i] = g.s; op[i] = g.o; kd[i] = g.k === 'nt' ? 0 : g.k === 'blink' ? 1 : g.k === 'jet' ? 2 : g.k === 'flash' ? 4 : g.k === 'dusk' ? 5 + Math.min(0.95, g.thr) * 0.98 : 3; });
  var geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('aCol', new T.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new T.BufferAttribute(sz, 1)); geo.setAttribute('aOp', new T.BufferAttribute(op, 1)); geo.setAttribute('aKind', new T.BufferAttribute(kd, 1));
  var mat = new T.ShaderMaterial({
    uniforms: { uScale: this.U.uScale, uPn: this.U.uPn, uTime: this.U.uStep, uMap: { value: this.tex }, uFount: this.U.uFount, uFog: this.U.uFog },
    vertexShader: 'attribute vec3 aCol; attribute float aSize, aOp, aKind; uniform float uScale, uPn, uTime, uFount, uFog; varying vec3 vC; varying float vO;\n' +
      'void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = min(aSize * (1. + .7 * uFog) * uScale / max(-mv.z, 1.), 512.);\n' +
      ' float o = aOp * uPn; if (aKind > .5 && aKind < 1.5) o *= step(.5, fract(uTime * .5 + position.y * .013)); if (aKind > 1.5 && aKind < 2.5) o *= uFount; if (aKind > 4.5) { o = aOp * smoothstep(fract(aKind) - .03, fract(aKind) + .03, uPn); if (position.z < 0.) o *= .7 + .3 * sin(uTime * (2. + fract(position.x * .37) * 3.) + position.x * 1.7); } if (aKind > 3.5 && aKind < 4.5) o *= step(.955, fract(sin(floor(uTime * 3.) * 12.9898 + position.x * 78.233 + position.z * 3.17) * 43758.5453));\n' +
      ' vC = aCol; vO = o; if (o <= .001) gl_PointSize = 0.; }',
    fragmentShader: 'uniform sampler2D uMap; varying vec3 vC; varying float vO; void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vC * t.rgb, t.a * vO);\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false
  });
  var pts = new T.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 5;
  return pts;
};
