// The canvas loads the production scene (kouji-dev/portfolio, paris3d/ modules built into one classic script by
// `pnpm run scene`) exactly as kouji.dev does: three.js through the page's import map, handed over as window.THREE,
// then paris3d.js; the page's component mounts it with Paris3D.mountAsync once 'paris3d-ready' fires.
import * as T from 'three';
window.THREE = T;
const s = document.createElement('script');
s.src = 'paris3d.js';
s.onload = () => window.dispatchEvent(new Event('paris3d-ready'));
s.onerror = () => window.dispatchEvent(new Event('paris3d-failed'));
document.head.appendChild(s);
