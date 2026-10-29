import * as T from 'three';
import { clamp } from '../core/util.js';

export function Reflection(renderer, dv) {
  dv = dv || 2; var clip = [new T.Plane(new T.Vector3(0, 1, 0), 0)];
  var rt = new T.WebGLRenderTarget(4, 4, { type: T.HalfFloatType }); rt.texture.generateMipmaps = false;
  var vc = new T.PerspectiveCamera(), TM = new T.Matrix4(), n = new T.Vector3(0, 1, 0), rp = new T.Vector3(), cp = new T.Vector3(), rot = new T.Matrix4(), look = new T.Vector3(), view = new T.Vector3(), target = new T.Vector3(), cc = new T.Color();
  var pl = new T.Plane(), q4 = new T.Vector4(), c4 = new T.Vector4(), area = null, v4 = new T.Vector4(), shadowed = false, was = [];
  return {
    tex: rt.texture, mat: TM, rt: rt,
    // prod: the water's corners in the world; only the part of the reflection the water can sample is rendered
    setArea: function (pts) { area = pts.map(function (p) { return new T.Vector4(p[0], p[1], p[2], 1); }); },
    setSize: function (w, h) { rt.setSize(Math.max(2, Math.round(w / dv)), Math.max(2, Math.round(h / dv))); },
    render: function (scene, camera, fr, level, hide) {
      rp.set(0, level, 0); cp.setFromMatrixPosition(camera.matrixWorld); rot.extractRotation(camera.matrixWorld);
      look.set(0, 0, -1).applyMatrix4(rot).add(cp);
      view.subVectors(rp, cp).reflect(n).negate().add(rp); target.subVectors(rp, look).reflect(n).negate().add(rp);
      vc.position.copy(view); vc.up.set(0, 1, 0).applyMatrix4(rot).reflect(n); vc.lookAt(target);
      vc.near = camera.near; vc.far = camera.far; vc.updateMatrixWorld();
      vc.projectionMatrix.makePerspective(-fr.r, -fr.l, fr.t, fr.b, camera.near, camera.far); vc.projectionMatrixInverse.copy(vc.projectionMatrix).invert();
      TM.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1); TM.multiply(vc.projectionMatrix); TM.multiply(vc.matrixWorldInverse);
      // prod: render only the rectangle of the reflection the water samples: its corners through TM (what its shader does),
      // plus the shaders' largest offsets (ripples ±1.2 % across, the night light streaks ±5 % up and down), snapped to whole
      // texels; the camera's frustum shrinks to match, so three.js culls everything outside it
      var RW = rt.width, RH = rt.height, px0 = 0, px1 = RW, py0 = 0, py1 = RH;
      if (area) {
        var u0 = 1, u1 = 0, w0 = 1, w1 = 0;
        for (var j = 0; j < area.length; j++) { v4.copy(area[j]).applyMatrix4(TM); if (v4.w <= 0) { u0 = w0 = 0; u1 = w1 = 1; break; } var u = v4.x / v4.w, w = v4.y / v4.w; u0 = Math.min(u0, u); u1 = Math.max(u1, u); w0 = Math.min(w0, w); w1 = Math.max(w1, w); }
        px0 = Math.floor(clamp(u0 - 0.02, 0, 1) * RW); px1 = Math.ceil(clamp(u1 + 0.02, 0, 1) * RW); py0 = Math.floor(clamp(w0 - 0.06, 0, 1) * RH); py1 = Math.ceil(clamp(w1 + 0.06, 0, 1) * RH);
        if (px1 <= px0 || py1 <= py0) return;  // the water is off screen: nothing samples the reflection
        var L = -fr.r, Rr = -fr.l;
        vc.projectionMatrix.makePerspective(L + (Rr - L) * px0 / RW, L + (Rr - L) * px1 / RW, fr.b + (fr.t - fr.b) * py1 / RH, fr.b + (fr.t - fr.b) * py0 / RH, camera.near, camera.far);
      }
      // prod: the water line becomes the camera's near plane (oblique projection, as three.js's Reflector does) instead of a
      // clipping plane, which gave every material a second shader program (~110 more programs to compile)
      clip[0].constant = -(level + 0.03); pl.copy(clip[0]).applyMatrix4(vc.matrixWorldInverse);
      var e = vc.projectionMatrix.elements; q4.set((Math.sign(pl.normal.x) + e[8]) / e[0], (Math.sign(pl.normal.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
      c4.set(pl.normal.x, pl.normal.y, pl.normal.z, pl.constant); c4.multiplyScalar(2 / c4.dot(q4));
      e[2] = c4.x; e[6] = c4.y; e[10] = c4.z + 1; e[14] = c4.w; vc.projectionMatrixInverse.copy(vc.projectionMatrix).invert();
      // what the water doesn't show is hidden for the pass, then put back as it was (not forced visible: an object switched
      // off by its scene stays off)
      for (var i = 0; i < hide.length; i++) { was[i] = hide[i].visible; hide[i].visible = false; }
      // the main pass updates the shadow map; the reflection reuses it, except on the very first frame, when it renders before
      // any shadow map exists (r186 reads shadows through a compare sampler and drops draws against a missing map)
      var au = renderer.shadowMap.autoUpdate; if (shadowed) renderer.shadowMap.autoUpdate = false; shadowed = true;
      renderer.getClearColor(cc); var ca = renderer.getClearAlpha();
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); rt.viewport.set(px0, py0, px1 - px0, py1 - py0); renderer.setRenderTarget(rt);
      renderer.render(scene, vc); rt.viewport.set(0, 0, RW, RH); renderer.setRenderTarget(null);
      renderer.setClearColor(cc, ca); renderer.shadowMap.autoUpdate = au;
      for (i = 0; i < hide.length; i++) hide[i].visible = was[i];
    },
    dispose: function () { rt.dispose(); }
  };
}
