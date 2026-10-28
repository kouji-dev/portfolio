/* Paris 3D: the hand-painted Trocadéro view rebuilt in Three.js (r158, classic script; prod: home.js imports three.js
   as an ES module through the page's import map and hands it over as window.THREE).
   The camera reproduces the painting's own perspective, so every shape lands where it is painted; colours are the
   painting's tokens, read live from the panel's CSS (day / dusk / night, seasons, events), shaded in flat bands with
   the painting's scratch strokes. The SVG sky stays behind the canvas and the skins' SVG layers stay in front.
   window.Paris3D.mount(canvas, { layout, state: () => ({...}) }) → { poke(info), dispose() } */
/* PRODUCTION FORK of design/paris3d.js (kouji.dev). Changes, each measured on an Intel UHD laptop:
   - mount is async (Paris3D.mountAsync): the scene builds in steps between frames and its shaders are all queued at once,
     then polled with KHR_parallel_shader_compile before the first frame, instead of a 30–45 s frozen page;
   - each tree crown kind draws only its own trees (the design drew all four kinds for every tree: 2.3M → 275K triangles);
   - the reflections clip at the water line with their camera (oblique near plane), not a clipping plane, so they share
     the main pass's shader programs instead of a second copy of each;
   - the canvas size comes from the ResizeObserver, not a layout read every frame;
   - the lowest tier freezes the shadow map instead of switching shadows off (that recompiled every shader: a 15 s freeze);
   - no throwaway WebGL context to test support (each costs ~0.7 s);
   - lazy shader programs: only what the frame draws is compiled; the rest the first time it shows (see gate()).
   - the vector layers (buildVec: the design's former SVG sky and skin layers) build in their own steps, and their
     scenes' shaders are queued with the rest before the first frame;
   - the ink pass writes sRGB itself and feeds an FXAA pass; the sky picture is composited in it as in the design.
   - vector layers: small chunks share an atlas and are drawn as instanced runs in paint order (485 → 111 draws a frame);
     only moving layers are read every frame, the rest on the full passes (forced at once by a state change on .pt). */
import './layout.js';
import { mount, supported } from './mount.js';

window.Paris3D = { mountAsync: mount, supported: supported };
