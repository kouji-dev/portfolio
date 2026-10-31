// Vercel Routing Middleware, for agents asking for markdown (Accept: text/markdown):
// / gets index.md, and a path that isn't a page gets a markdown 404 pointing at the sitemap and llms.txt.
// A vercel.json rewrite can't do it: the filesystem (index.html) wins over rewrites.
// Browsers (no text/markdown in Accept) pass straight through to the static site.

// only extensionless paths: files (.css, .txt, .pdf…) never reach this
export const config = { matcher: '/((?!.*\\.).*)' };

// the site's pages (keep in step with sitemap.xml), plus /about and /contact, which vercel.json redirects to the home sections
const PAGES = new Set(['/', '/blogs', '/privacy', '/about', '/contact']);

const NOT_FOUND = `# 404 — page not found

Nothing lives at this address on kouji.dev, the site of Driss Najih (senior AI-augmented developer, Paris).

Where to look next:

- [Home, as markdown](https://www.kouji.dev/index.md)
- [llms.txt](https://www.kouji.dev/llms.txt): the site summarised for AI agents
- [Sitemap](https://www.kouji.dev/sitemap.xml): every page on the site
`;

export default function middleware(request) {
  if (!/\btext\/markdown\b/i.test(request.headers.get('accept') || '')) return;
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
  if (path === '/') {
    return new Response(null, {
      headers: { 'x-middleware-rewrite': new URL('/index.md', request.url).toString(), Vary: 'Accept, Accept-Encoding' },
    });
  }
  if (PAGES.has(path)) return;
  return new Response(NOT_FOUND, {
    status: 404,
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', Vary: 'Accept, Accept-Encoding' },
  });
}
