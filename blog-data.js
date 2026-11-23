/* =========================================================================
   Blog posts — single source of truth.

   Real posts only: the mock posts from the design handoff stay out.

   Consumed by:
   - blog.js     (blogs.html — index + post rendering, ?id= and ?tag= routing)
   - home.js     (index.html — the latest posts in the "Writing" section,
                  hidden while there are no posts; reads slug, title, date)

   Post shape (fields marked ? are optional):
   {
     slug: 'url-safe-id',            // /blogs?id=<slug>; unique
     title: '…',                     // plain text
     dek: 'one-paragraph standfirst',// plain text; also the meta description
     date: 'YYYY-MM-DD',             // sorts the posts; shown as "Mon YYYY"
     category: 'Agents',             // the main topic: breadcrumb, first filter chip
     tags: ['…'],                    // more topics; each one is a filter chip and /blogs?tag=<name>
     read?: 'N min',                 // else worked out from the body, 220 words a minute
     cover?: {                       // the illustration on the cards and above the post;
       svg: '<path class="ink" …>',  //   inner SVG markup on a 640×360 canvas, trusted (not escaped). Classes from
                                     //   blog.css follow the theme: ink, thin, dash, f-p f-v f-c f-l f-w f-i, txt, big
       src: 'assets/blog/x.png',     //   OR an image file (16:9); it does not follow the theme
       alt: '…', caption: '…'        //   both optional
     },                              //   without a cover the cards show dotted paper with the category's name
     series?: { name: '…', part: 1, of: 3 },  // posts sharing `name` are listed in the side column by `part`;
                                     //   `of` (optional) announces parts that are "not out yet"
     notes?: ['…'],                  // footnotes, cited in any text as [^1], [^2]… ; add a "Notes" section
     changelog?: ['Mon YYYY · what changed'],  // lines under the notes
     body: [ …blocks ]
   }

   Blocks. Every `text`, `title`, `caption`, `cite`, list item and table cell takes the inline marks below;
   headings, post titles and deks are plain text. Text is always escaped: raw HTML shows as typed.
     { t: 'lead',    text }                          opening paragraph, larger
     { t: 'p',       text }
     { t: 'h2',      text }                          a section: gets an id, a # anchor, a line in "On this page"
     { t: 'h3',      text }
     { t: 'quote',   text, cite? }                   blockquote with its source
     { t: 'pull',    text }                          large centred pull quote
     { t: 'list',    items: [text], ordered?, title? }
     { t: 'tasks',   items: [{ text, done? }], title? }   read-only checklist
     { t: 'code',    lang, text, file?, hl?: [lineNo] }   numbered, coloured, Copy button; `hl` marks lines.
                     lang 'terminal': lines starting "$ " are commands, the rest output; Copy takes the commands
                     lang 'diff':     lines starting "+" / "-" are added / removed; no Copy
                     lang '' | 'text': no colouring
     { t: 'tabs',    label?, tabs: [{ label, lang, text, file?, hl? }] }   one code block per tab
     { t: 'callout', tone: 'note' | 'tip' | 'warn' | 'bad', title?, text }
     { t: 'table',   head: [text], rows: [[text]], label? }   scrolls sideways when narrow; label names it for a11y
     { t: 'figure',  svg | src, alt?, caption? }     an illustration inside the body, same rules as `cover`
     { t: 'flow',    nodes: [{ title, sub?, tone?: 'orr' | 'note' | 'tip' | 'warn' | 'bad', fail? }], caption? }
                     numbered boxes joined by arrows; `fail` hangs a dashed "what happens on failure" note under one
     { t: 'metrics', items: [{ n, label }] }         big numbers
     { t: 'faq',     items: [{ q, a }] }             collapsible questions
     { t: 'cards',   items: [{ title, text?, href }] }    link cards; the host name is shown under the text
     { t: 'hr' }
   An unknown `t` renders nothing.

   Inline marks:  **strong**  *em*  ~~struck~~  ==highlight==  `code`  [[Key]]  [text](url)
                  [abbr]{what it stands for}  [^1] (footnote, see `notes`)
   Links only accept http(s):, mailto:, / and # targets; anything else stays as typed.

   Worked out by blog.js, nothing to write: read time, contents list, copy link + share buttons, newer / older,
   "Read next" (two other posts, most shared topics first), filter chips, pages (9 cards a page), meta + JSON-LD.

   Limits:
   - Code colouring is line by line: a comment or string spanning lines is coloured on its first line only.
   - A footnote should be cited once; cited twice, "back" returns to the first.
   - Many topics mean many chips: they wrap, there is no "more" menu.
   - `cover.svg` and `figure.svg` are inserted as written: only ever paste your own markup there.
   ========================================================================= */

/* Link helpers — clean URLs (/blogs, /#about) need a server that maps them
   (Vercel cleanUrls, `serve`). Opened straight from disk (file://) those
   resolve to the drive root, so fall back to explicit .html links. */
window.SITE_LINKS = (function () {
  var isFile = location.protocol === 'file:';
  return {
    blogs: function (slug) {
      return (isFile ? 'blogs.html' : '/blogs') +
        (slug ? '?id=' + encodeURIComponent(slug) : '');
    },
    home: function (anchor) {
      return (isFile ? 'index.html' : '/') + (anchor ? '#' + anchor : '');
    }
  };
})();

/* rewrite the static root-absolute anchors in the HTML when on file://
   (runs at deferred-script time, so the DOM is already parsed) */
if (location.protocol === 'file:') {
  Array.prototype.slice.call(document.querySelectorAll('a[href^="/"]'))
    .forEach(function (a) {
      var h = a.getAttribute('href');
      if (h === '/') a.setAttribute('href', 'index.html');
      else if (h.indexOf('/#') === 0) a.setAttribute('href', 'index.html' + h.slice(1));
      else if (h.indexOf('/blogs') === 0) a.setAttribute('href', 'blogs.html' + h.slice(6));
    });
}

window.BLOG_POSTS = [
  {
    slug: 'why-i-built-orrery',
    title: 'My IDE got slow, so I built an agent harness',
    dek: 'Two years of working with AI changed my job one annoyance at a time. This is how a heavy IDE, a pile of copied folders and one hungry CLI turned into Orrery.',
    date: '2026-11-23',
    category: 'Agents',
    tags: ['Orrery', 'Rust', 'Workflow'],
    cover: {
      alt: 'A box labelled IDE splits into four parallel branches, each ending in a coloured agent dot; dashed lines carry the four to the Orrery logo',
      caption: 'One checkout became many worktrees, one agent each. Orrery is where they meet.',
      svg: '<rect class="ink f-w" x="44" y="140" width="116" height="80" rx="14"></rect><text class="txt big" x="102" y="188" text-anchor="middle">IDE</text>' +
        '<path class="ink" d="M160 180C215 180 215 72 270 72H322"></path><path class="ink" d="M160 180C215 180 215 144 270 144H322"></path>' +
        '<path class="ink" d="M160 180C215 180 215 216 270 216H322"></path><path class="ink" d="M160 180C215 180 215 288 270 288H322"></path>' +
        '<circle class="f-p" cx="334" cy="72" r="10"></circle><circle class="f-v" cx="334" cy="144" r="10"></circle><circle class="f-c" cx="334" cy="216" r="10"></circle><circle class="f-l" cx="334" cy="288" r="10"></circle>' +
        '<text class="txt" x="232" y="58">worktree</text><text class="txt" x="232" y="310">worktree</text>' +
        '<path class="ink thin dash" d="M350 72C420 72 440 130 478 160"></path><path class="ink thin dash" d="M350 144C400 144 430 160 470 172"></path>' +
        '<path class="ink thin dash" d="M350 216C400 216 430 200 470 188"></path><path class="ink thin dash" d="M350 288C420 288 440 230 478 200"></path>' +
        '<defs><linearGradient id="cv-orr-r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5d9e"></stop><stop offset=".5" stop-color="#a855f7"></stop><stop offset="1" stop-color="#22d3ee"></stop></linearGradient>' +
        '<radialGradient id="cv-orr-c"><stop offset="0" stop-color="#fff"></stop><stop offset=".45" stop-color="#a855f7"></stop><stop offset="1" stop-color="#a855f7" stop-opacity="0"></stop></radialGradient></defs>' +
        // the Orrery mark as shipped (orrery: landing/img/mark.svg), without its dark tile
        '<g transform="translate(466 106) scale(1.48)"><path d="M85.0 50.0L84.8 48.8L84.3 47.7L83.4 46.7L82.2 45.8L80.8 45.1L79.0 44.6L77.1 44.4L74.9 44.4L72.7 44.8L70.3 45.4L67.9 46.4L65.6 47.6L63.3 49.2L61.1 51.0L59.1 53.0L57.3 55.3L55.7 57.7L54.4 60.3L53.3 62.9L52.6 65.6L52.1 68.2L51.9 70.7L52.0 73.2L52.4 75.4L53.0 77.5L53.9 79.3L54.8 80.8L56.0 82.0L57.2 82.8L58.4 83.3L59.6 83.5L60.8 83.3L61.9 82.8L62.8 81.9L63.5 80.8L64.0 79.4L64.2 77.7L64.1 75.9L63.7 74.0L63.0 72.0L62.0 69.9L60.6 67.9L59.0 65.9L57.1 64.1L54.9 62.4L52.5 60.9L49.9 59.6L47.2 58.6L44.4 57.8L41.6 57.3L38.8 57.1L36.0 57.2L33.3 57.6L30.9 58.2L28.6 59.1L26.6 60.2L24.8 61.4L23.3 62.7L22.2 64.1L21.4 65.6L21.0 67.0L20.9 68.3L21.1 69.5L21.7 70.6L22.5 71.4L23.6 72.0L24.9 72.3L26.4 72.4L28.0 72.1L29.7 71.4L31.4 70.5L33.1 69.2L34.7 67.6L36.2 65.7L37.6 63.5L38.8 61.1L39.7 58.5L40.4 55.7L40.9 52.9L41.0 50.0L40.9 47.1L40.4 44.3L39.7 41.5L38.8 38.9L37.6 36.5L36.2 34.3L34.7 32.4L33.1 30.8L31.4 29.5L29.7 28.6L28.0 27.9L26.4 27.6L24.9 27.7L23.6 28.0L22.5 28.6L21.7 29.4L21.1 30.5L20.9 31.7L21.0 33.0L21.4 34.4L22.2 35.9L23.3 37.3L24.8 38.6L26.6 39.8L28.6 40.9L30.9 41.8L33.3 42.4L36.0 42.8L38.8 42.9L41.6 42.7L44.4 42.2L47.2 41.4L49.9 40.4L52.5 39.1L54.9 37.6L57.1 35.9L59.0 34.1L60.6 32.1L62.0 30.1L63.0 28.0L63.7 26.0L64.1 24.1L64.2 22.3L64.0 20.6L63.5 19.2L62.8 18.1L61.9 17.2L60.8 16.7L59.6 16.5L58.4 16.7L57.2 17.2L56.0 18.0L54.8 19.2L53.9 20.7L53.0 22.5L52.4 24.6L52.0 26.8L51.9 29.3L52.1 31.8L52.6 34.4L53.3 37.1L54.4 39.7L55.7 42.3L57.3 44.7L59.1 47.0L61.1 49.0L63.3 50.8L65.6 52.4L67.9 53.6L70.3 54.6L72.7 55.2L74.9 55.6L77.1 55.6L79.0 55.4L80.8 54.9L82.2 54.2L83.4 53.3L84.3 52.3L84.8 51.2L85.0 50.0Z" fill="none" stroke="url(#cv-orr-r)" stroke-width="5" stroke-linejoin="round"></path><circle cx="50" cy="50" r="13" fill="url(#cv-orr-c)"></circle></g>' +
        '<text class="txt" x="540" y="282" text-anchor="middle">orrery</text>'
    },
    body: [
      { t: 'lead', text: 'Two years ago I was a developer with an IDE. Today I spend my days directing coding agents and reviewing what they hand back. None of it was planned. It happened one annoyance at a time, and each annoyance ended with me building something.' },

      { t: 'h2', text: 'The uncomfortable middle' },
      { t: 'p', text: 'When you start using AI seriously, you hit a choice almost at once. Either you automate the problem and let the agent run, or you leave AI out of it because the task comes down to one decision you have to take yourself.' },
      { t: 'p', text: 'The middle is the hard place. Half driving, half watching, you end up working more, not less.' },
      { t: 'p', text: 'What got me out of it was to stop treating an agent as a faster version of me. The gain is in running several pieces of work at the same time. To benefit most from AI, parallelize as much as the work allows.' },

      { t: 'h2', text: 'Worktrees, or how I stopped copying folders' },
      { t: 'p', text: 'Parallel work has an obvious problem: two agents cannot edit the same checkout. My first answer was the crude one. I duplicated the project.' },
      { t: 'p', text: 'Then I discovered git worktrees, later than I would like to admit. One repository, many working folders, each on its own branch. It solved exactly the problem I had.' },
      { t: 'code', lang: 'terminal', text: '$ git worktree add ../shop-checkout -b feat/checkout\n$ git worktree add ../shop-search -b feat/search' },

      { t: 'h2', text: 'My IDE was built for a job I no longer did' },
      { t: 'p', text: 'With agents working in parallel, IntelliJ could not keep up. It was slow, it ate memory and it felt clunky, and at the time it had no way to manage worktrees, the one thing my new workflow was built on. And I noticed something else: I was barely using the rest of it. I had committed to AI in my workflow, so what I needed from an editor had shrunk to a short list.' },
      { t: 'list', items: ['Find a file.', 'Open it.', 'Edit it, only when necessary.', 'Review what the agent changed.'] },
      { t: 'p', text: 'So I went looking for the lightest tool that could do just that.' },

      { t: 'h2', text: 'The terminal, and the wall of shortcuts' },
      { t: 'p', text: 'The lightest tool there is, is a terminal. I tried living in it, Vim included. Learning it was fun at the beginning.' },
      { t: 'p', text: 'It did not last. Those tools were not ready for the agentic era, and going fully keyboard-driven meant learning a long list of shortcuts before I could do simple things. All I wanted was to talk to an agent and review its output properly.' },

      { t: 'h2', text: 'Zed came close' },
      { t: 'p', text: 'Next was [Zed](https://zed.dev). It is built with Rust, its whole ecosystem is really fast, and it is free. For me it is the best editor on the market.' },
      { t: 'p', text: 'But it did not match my workflow. The git graph was poor, and reviewing changed files felt off for the way I work. Everything else, I loved.' },
      { t: 'pull', text: 'I did not need a better editor. I needed a place to run agents.' },

      { t: 'table', label: 'The tools I went through, what each did well and why I moved on', head: ['Tool', 'What it did well', 'Why I moved on'], rows: [
        ['IntelliJ', 'The IDE I knew by heart', 'Slow, heavy, and no worktree management at the time'],
        ['Terminal + Vim', 'Light', 'Too many shortcuts for simple needs'],
        ['Zed', 'Fast, free, built with Rust', 'Git graph and review did not fit my workflow'],
        ['**Orrery ADE**', 'Agents, worktrees and review in one window', 'Still here'],
        ['**Orrery Harness**', 'The agent runtime itself, in Rust', 'Still here']
      ] },

      { t: 'h2', text: 'So I built one' },
      { t: 'p', text: 'That is where the fun idea came from: a side project to build my own environment for agents. I did not even know the category existed. I found other products later, and they were not optimized the way I wanted. I started learning Rust in parallel and got to work.' },
      { t: 'p', text: 'Version one of Orrery ADE was deliberately small.' },
      { t: 'tasks', title: 'V1', items: [
        { text: 'Register a directory as a project', done: true },
        { text: 'Create every agent in its own worktree, with the CLI I choose: Claude Code, Gemini, Codex', done: true },
        { text: 'Pick the model and the effort, and save that configuration', done: true },
        { text: 'List the files, track the ones that changed and show them in a tree, with syntax highlighting', done: true }
      ] },
      { t: 'p', text: 'That was all of it, and it worked. It did the job well enough that I was soon building Orrery with Orrery.' },
      { t: 'p', text: 'The bigger features came later: a full git graph and git operations, symbol search across every worktree, which is really fast, and language servers for Java, TypeScript, Go and Rust.' },

      { t: 'h2', text: 'Then the agent itself became the problem' },
      { t: 'p', text: 'With the environment sorted, the next bottleneck was the agent CLI. I mostly ran Claude Code, and I want to be fair to it: it is a beautiful tool with one of the greatest harnesses, on top of a very smart model.' },
      { t: 'p', text: 'But it runs on a JavaScript runtime. On my machine an instance started at around 200 MB before it had done anything. Run several in parallel and that adds up quickly.' },
      { t: 'p', text: 'That became the second project: **Orrery Harness**, an agent runtime written in Rust. I set three goals for it.' },
      { t: 'list', ordered: true, items: [
        '**Use the least resources.** The target is scale: on one VPS, a hundred Orrery instances should cost less than ten Claude Code instances.',
        '**Be plugin-based.** Anyone on a team, especially in an enterprise, can write their own extension, for tooling, for MCP or for anything else, and plug it in.',
        '**Be language-agnostic.** An extension can be written in any language and it still works.'
      ] },
      { t: 'callout', tone: 'note', title: 'A target, not a benchmark', text: 'The hundred-to-ten ratio is the goal I am building toward. I have not published a measurement of it yet.' },

      { t: 'h2', text: 'Where it stands' },
      { t: 'p', text: 'Orrery is now two things: a harness and an ADE. The harness runs the agent. The ADE is where I run many of them side by side, review what they did and ship it.' },
      { t: 'p', text: 'Both exist because of small frustrations I refused to keep living with. If some of them sound familiar, have a look.' },
      { t: 'cards', items: [
        { title: 'Orrery', text: 'A full AI harness and ADE for coding agents.', href: 'https://getorrery.dev' }
      ] }
    ]
  }
];

/* newest first, shared by every consumer */
window.BLOG_POSTS_SORTED = window.BLOG_POSTS.slice().sort(function (a, b) {
  return a.date < b.date ? 1 : -1;
});
