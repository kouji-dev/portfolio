// Vercel Routing Middleware: agents asking for markdown (Accept: text/markdown) get index.md at /.
// A vercel.json rewrite can't do it: the filesystem (index.html) wins over rewrites.
export const config = { matcher: '/' };

export default function middleware(request) {
  if (!/\btext\/markdown\b/i.test(request.headers.get('accept') || '')) return;
  return new Response(null, {
    headers: { 'x-middleware-rewrite': new URL('/index.md', request.url).toString(), Vary: 'Accept, Accept-Encoding' },
  });
}
