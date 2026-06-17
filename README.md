# Driss Najih — Portfolio

A dark, orbital, single-page portfolio for a senior software engineer focused on
AI-driven applications. The whole page sits behind a live **WebGL cosmos**: a
Three.js GLSL shader that blends a flowing, domain-warped nebula with a
twinkling glitter overlay.

> Built from a [Claude Design](https://claude.ai/design) handoff
> (`Portfolio WebGL`), recreated as a clean, zero-build static site.

## Stack

- **Plain static site** — `index.html`, `styles.css`, `cosmos.js`. No build step.
- **[Three.js](https://threejs.org/) 0.160.0** (from CDN) for the GLSL cosmos backdrop.
- Fonts: Space Grotesk (display), Sora (body), JetBrains Mono (mono) via Google Fonts.

## Structure

| File          | Purpose                                                         |
|---------------|-----------------------------------------------------------------|
| `index.html`  | All page markup (nav, hero, about, work, experience, contact).  |
| `styles.css`  | Stellar palette tokens, layout, responsive grids, hover states. |
| `cosmos.js`   | WebGL shader backdrop + scroll-reveal (IntersectionObserver).   |
| `favicon.svg` | Orbital mark.                                                   |
| `vercel.json` | Clean URLs + caching/security headers.                          |

## Sections

- **Hero** — animated cosmos, shimmering gradient headline, quick links.
- **About** — positioning + key stats + a 6-cell skills grid.
- **Featured Work** — Orrery and Kouji UI as *live, interactive* embeds in browser frames.
- **Also building** — AI Portal, Pages, GamerGG, Chartify → GitHub.
- **Experience** — seven-year timeline (Amundi → Scor).
- **Contact** — email, LinkedIn, GitHub.

## Accessibility & performance

- Honors `prefers-reduced-motion`: the cosmos renders one still frame and
  reveal/shimmer animations are disabled.
- The shader loop pauses when the tab is hidden.
- A CSS gradient is painted underneath as a fallback while Three.js loads or if
  WebGL is unavailable.

## Local preview

It's a static site — open `index.html` directly, or serve the folder:

```bash
npx serve .
# or
python -m http.server 8000
```

## Deploy (Vercel)

No framework, no build. Import the repo in Vercel (or `vercel` from the CLI) and
deploy — `vercel.json` handles clean URLs and headers. Output is the repo root.
