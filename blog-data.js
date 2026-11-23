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
     { t: 'figure',  svg | src, alt?, caption?, field? }   an illustration inside the body, same rules as `cover`.
                     field: 'shader' (also on `cover`) swaps the dotted paper for Orrery's drifting multicolour field;
                     draw on it in white (fill="#fff"), the theme classes are for the paper
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
    tags: ['Harness', 'Rust', 'AI'],
    cover: {
      alt: 'A box labelled IDE splits into four parallel branches, each ending in a coloured agent dot; dashed lines carry the four to the Orrery monogram',
      caption: 'One checkout became many worktrees, one agent each. Orrery is where they meet.',
      svg: "<rect class=\"ink f-w\" x=\"44\" y=\"140\" width=\"116\" height=\"80\" rx=\"14\"></rect><text class=\"txt big\" x=\"102\" y=\"188\" text-anchor=\"middle\">IDE</text><path class=\"ink\" d=\"M160 180C215 180 215 72 270 72H322\"></path><path class=\"ink\" d=\"M160 180C215 180 215 144 270 144H322\"></path><path class=\"ink\" d=\"M160 180C215 180 215 216 270 216H322\"></path><path class=\"ink\" d=\"M160 180C215 180 215 288 270 288H322\"></path><circle class=\"f-p\" cx=\"334\" cy=\"72\" r=\"10\"></circle><circle class=\"f-v\" cx=\"334\" cy=\"144\" r=\"10\"></circle><circle class=\"f-c\" cx=\"334\" cy=\"216\" r=\"10\"></circle><circle class=\"f-l\" cx=\"334\" cy=\"288\" r=\"10\"></circle><text class=\"txt\" x=\"232\" y=\"58\">worktree</text><text class=\"txt\" x=\"232\" y=\"310\">worktree</text><path class=\"ink thin dash\" d=\"M350 72C420 72 440 128 476 152\"></path><path class=\"ink thin dash\" d=\"M350 144C400 144 430 160 466 170\"></path><path class=\"ink thin dash\" d=\"M350 216C400 216 430 200 466 190\"></path><path class=\"ink thin dash\" d=\"M350 288C420 288 440 232 476 208\"></path><defs><linearGradient id=\"cv-orr-g\" gradientUnits=\"userSpaceOnUse\" x1=\"30\" y1=\"30\" x2=\"170\" y2=\"170\"><stop offset=\"0\" stop-color=\"#ff5d9e\"></stop><stop offset=\".55\" stop-color=\"#a855f7\"></stop><stop offset=\"1\" stop-color=\"#6d6af8\"></stop></linearGradient><mask id=\"cv-orr-m\" maskUnits=\"userSpaceOnUse\" x=\"-20\" y=\"-20\" width=\"240\" height=\"240\"><rect x=\"-20\" y=\"-20\" width=\"240\" height=\"240\" fill=\"#fff\"></rect><circle cx=\"139.6\" cy=\"60.4\" r=\"26\" fill=\"#000\"></circle></mask></defs><g transform=\"translate(470 110) scale(0.7)\"><g mask=\"url(#cv-orr-m)\"><circle cx=\"100\" cy=\"100\" r=\"56\" fill=\"none\" stroke=\"url(#cv-orr-g)\" stroke-width=\"32\"></circle></g><circle class=\"f-i\" cx=\"139.6\" cy=\"60.4\" r=\"16\"></circle></g><text class=\"txt\" x=\"540\" y=\"282\" text-anchor=\"middle\">orrery</text>"
    },
    body: [
      { t: 'lead', text: 'Two years ago I was a developer with an IDE. Today I spend my days directing coding agents and reviewing what they hand back. None of it was planned. It happened one annoyance at a time, and each annoyance ended with me building something.' },

      { t: 'h2', text: 'The uncomfortable middle' },
      { t: 'p', text: 'When you start using AI seriously, you hit a choice almost at once. Either you automate the problem and let the agent run, or you leave AI out of it because the task comes down to one decision you have to take yourself.' },
      { t: 'p', text: 'The middle is the hard place. Half driving, half watching, you end up working more, not less.' },
      { t: 'figure', alt: "Three boxes in a row: By hand, one decision that is yours; The middle, drawn with a dashed outline, half driving and half watching; Agents, let them run. Under the middle one: more work, not less", caption: "Two ends work. The middle is where the time goes.",
        svg: "<rect class=\"ink f-w\" x=\"28\" y=\"96\" width=\"184\" height=\"150\" rx=\"16\"></rect><circle class=\"f-i\" cx=\"120\" cy=\"124\" r=\"6\"></circle><text class=\"txt big\" x=\"120\" y=\"168\" text-anchor=\"middle\">By hand</text><text class=\"txt\" x=\"120\" y=\"198\" text-anchor=\"middle\">one decision, yours</text><rect class=\"ink dash\" x=\"228\" y=\"96\" width=\"184\" height=\"150\" rx=\"16\"></rect><circle class=\"f-i\" cx=\"311\" cy=\"124\" r=\"6\"></circle><circle class=\"f-v\" cx=\"329\" cy=\"124\" r=\"6\"></circle><text class=\"txt big\" x=\"320\" y=\"168\" text-anchor=\"middle\">The middle</text><text class=\"txt\" x=\"320\" y=\"198\" text-anchor=\"middle\">half driving,</text><text class=\"txt\" x=\"320\" y=\"218\" text-anchor=\"middle\">half watching</text><rect class=\"ink f-w\" x=\"428\" y=\"96\" width=\"184\" height=\"150\" rx=\"16\"></rect><circle class=\"f-p\" cx=\"502\" cy=\"124\" r=\"6\"></circle><circle class=\"f-v\" cx=\"520\" cy=\"124\" r=\"6\"></circle><circle class=\"f-c\" cx=\"538\" cy=\"124\" r=\"6\"></circle><text class=\"txt big\" x=\"520\" y=\"168\" text-anchor=\"middle\">Agents</text><text class=\"txt\" x=\"520\" y=\"198\" text-anchor=\"middle\">let them run</text><path class=\"ink thin\" d=\"M320 262V286\"></path><text class=\"txt\" x=\"320\" y=\"308\" text-anchor=\"middle\">more work, not less</text>" },
      { t: 'p', text: 'What got me out of it was to stop treating an agent as a faster version of me. The gain is in running several pieces of work at the same time. To benefit most from AI, parallelize as much as the work allows.' },

      { t: 'h2', text: 'Worktrees, or how I stopped copying folders' },
      { t: 'p', text: 'Parallel work has an obvious problem: two agents cannot edit the same checkout. My first answer was the crude one. I duplicated the project.' },
      { t: 'p', text: 'Then I discovered git worktrees, later than I would like to admit. One repository, many working folders, each on its own branch. It solved exactly the problem I had.' },
      { t: 'code', lang: 'terminal', text: "$ git worktree add ../shop-checkout -b feat/checkout\n$ git worktree add ../shop-search -b feat/search\n$ git worktree list\n/code/shop           3f2a1c9 [main]\n/code/shop-checkout  3f2a1c9 [feat/checkout]\n/code/shop-search    3f2a1c9 [feat/search]" },

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


      { t: 'h2', text: 'So I built one' },
      { t: 'p', text: 'That is where the fun idea came from: a side project to build my own environment for agents. I did not even know the category existed. I found other products later, and they were not optimized the way I wanted. I started learning Rust in parallel and got to work.' },
      { t: 'p', text: 'Version one of [Orrery ADE](https://getorrery.dev) was deliberately small.' },
      { t: 'tasks', title: 'V1', items: [
        { text: 'Register a directory as a project', done: true },
        { text: 'Create every agent in its own worktree, with the CLI I choose: Claude Code, Gemini, Codex', done: true },
        { text: 'Pick the model and the effort, and save that configuration', done: true },
        { text: 'List the files, track the ones that changed and show them in a tree, with syntax highlighting', done: true }
      ] },
      { t: 'figure', alt: "A sketch of the Orrery ADE window: across the top, one tab per agent, claude, codex and gemini, with claude selected; on the left the selected agent’s terminal, one worktree per agent; on the right the review, a list of changed files above the added and removed lines", caption: "The whole idea of V1: switch between agents at the top, talk to one on the left, review its changes on the right.",
        svg: "<rect class=\"ink f-w\" x=\"40\" y=\"36\" width=\"560\" height=\"288\" rx=\"16\"></rect><path class=\"ink thin\" d=\"M40 70H600\"></path><circle class=\"f-p\" cx=\"62\" cy=\"53\" r=\"5\"></circle><circle class=\"f-l\" cx=\"80\" cy=\"53\" r=\"5\"></circle><circle class=\"f-c\" cx=\"98\" cy=\"53\" r=\"5\"></circle><circle class=\"f-p\" cx=\"64\" cy=\"90\" r=\"6\"></circle><text class=\"txt\" x=\"78\" y=\"95\">claude</text><circle class=\"f-v\" cx=\"170\" cy=\"90\" r=\"6\"></circle><text class=\"txt\" x=\"184\" y=\"95\">codex</text><circle class=\"f-c\" cx=\"268\" cy=\"90\" r=\"6\"></circle><text class=\"txt\" x=\"282\" y=\"95\">gemini</text><path class=\"ink thin\" d=\"M40 110H600\"></path><path class=\"ink\" d=\"M52 110H138\"></path><path class=\"ink thin\" d=\"M372 110V324\"></path><text class=\"txt\" x=\"356\" y=\"134\" text-anchor=\"end\">agent</text><text class=\"txt\" x=\"58\" y=\"138\">$ claude</text><path class=\"ink thin\" d=\"M58 162H300\"></path><path class=\"ink thin\" d=\"M58 184H240\"></path><path class=\"ink thin\" d=\"M58 206H320\"></path><path class=\"ink thin\" d=\"M58 228H210\"></path><text class=\"txt\" x=\"58\" y=\"304\">one worktree per agent</text><text class=\"txt\" x=\"584\" y=\"134\" text-anchor=\"end\">review</text><text class=\"txt\" x=\"390\" y=\"138\">changed</text><circle class=\"f-l\" cx=\"396\" cy=\"160\" r=\"4\"></circle><text class=\"txt\" x=\"408\" y=\"165\">cart.ts</text><circle class=\"f-l\" cx=\"396\" cy=\"182\" r=\"4\"></circle><text class=\"txt\" x=\"408\" y=\"187\">pay.ts</text><path class=\"ink thin dash\" d=\"M390 204H584\"></path><rect class=\"f-l\" x=\"390\" y=\"218\" width=\"170\" height=\"16\" rx=\"4\" opacity=\".45\"></rect><text class=\"txt\" x=\"396\" y=\"231\">+</text><rect class=\"f-p\" x=\"390\" y=\"242\" width=\"120\" height=\"16\" rx=\"4\" opacity=\".4\"></rect><text class=\"txt\" x=\"396\" y=\"255\">-</text><rect class=\"f-l\" x=\"390\" y=\"266\" width=\"190\" height=\"16\" rx=\"4\" opacity=\".45\"></rect><text class=\"txt\" x=\"396\" y=\"279\">+</text><rect class=\"f-l\" x=\"390\" y=\"290\" width=\"140\" height=\"16\" rx=\"4\" opacity=\".45\"></rect><text class=\"txt\" x=\"396\" y=\"303\">+</text>" },
      { t: 'p', text: 'That was all of it, and it worked. It did the job well enough that I was soon building Orrery with Orrery.' },
      { t: 'p', text: 'The bigger features came later: a full git graph and git operations, symbol search across every worktree, which is really fast, and language servers for Java, TypeScript, Go and Rust.' },

      { t: 'table', label: 'The tools I went through: what each did well, why I moved on and what Orrery does better', head: ['Tool', 'What it did well', 'Why I moved on', 'What Orrery does better'], rows: [
        ['IntelliJ', 'The IDE I knew by heart', 'Slow, heavy, and no worktree management at the time', 'Light, and every agent gets its own worktree'],
        ['Terminal + Vim', 'As light as it gets', 'A wall of shortcuts for simple needs', 'Talk to the agent and review its output, nothing to memorize'],
        ['Zed', 'Fast, free, built with Rust', 'Poor git graph, and review did not fit my workflow', 'A better developer experience: the git graph and the UI']
      ] },

      { t: 'h2', text: 'Then the agent itself became the problem' },
      { t: 'p', text: 'With the environment sorted, the next bottleneck was the agent CLI. I mostly ran Claude Code, and I want to be fair to it: it is a beautiful tool with one of the greatest harnesses, on top of a very smart model.' },
      { t: 'p', text: 'But it runs on a JavaScript runtime. On my machine an instance started at around 200 MB before it had done anything. Run several in parallel and that adds up quickly.' },
      { t: 'p', text: 'That became the second project: [Orrery Harness](https://getorrery.dev), an agent runtime written in Rust. I set three goals for it.' },
      { t: 'list', ordered: true, items: [
        '**Use the least resources.** The target is scale: on one VPS, a hundred Orrery instances should cost less than ten Claude Code instances.',
        '**Be plugin-based.** Anyone on a team, especially in an enterprise, can write their own extension, for tooling, for MCP or for anything else, and plug it in.',
        '**Be language-agnostic.** An extension can be written in any language and it still works.'
      ] },
      { t: 'figure', alt: "The Orrery Harness in the middle, a Rust core holding the loop and the permissions, with four boxes plugged into it: tools, MCP, providers and clients. Extensions run out of process, in any language", caption: "A small core, and everything else plugs in.",
        svg: "<rect class=\"ink f-w\" x=\"205\" y=\"108\" width=\"230\" height=\"144\" rx=\"18\"></rect><defs><linearGradient id=\"hn-orr-g\" gradientUnits=\"userSpaceOnUse\" x1=\"30\" y1=\"30\" x2=\"170\" y2=\"170\"><stop offset=\"0\" stop-color=\"#ff5d9e\"></stop><stop offset=\".55\" stop-color=\"#a855f7\"></stop><stop offset=\"1\" stop-color=\"#6d6af8\"></stop></linearGradient><mask id=\"hn-orr-m\" maskUnits=\"userSpaceOnUse\" x=\"-20\" y=\"-20\" width=\"240\" height=\"240\"><rect x=\"-20\" y=\"-20\" width=\"240\" height=\"240\" fill=\"#fff\"></rect><circle cx=\"139.6\" cy=\"60.4\" r=\"26\" fill=\"#000\"></circle></mask></defs><g transform=\"translate(222 122) scale(0.36)\"><g mask=\"url(#hn-orr-m)\"><circle cx=\"100\" cy=\"100\" r=\"56\" fill=\"none\" stroke=\"url(#hn-orr-g)\" stroke-width=\"32\"></circle></g><circle class=\"f-i\" cx=\"139.6\" cy=\"60.4\" r=\"16\"></circle></g><text class=\"txt big\" x=\"308\" y=\"166\">Harness</text><text class=\"txt\" x=\"320\" y=\"226\" text-anchor=\"middle\">Rust core: loop, permissions</text><rect class=\"ink f-w\" x=\"36\" y=\"46\" width=\"130\" height=\"50\" rx=\"12\"></rect><circle class=\"f-p\" cx=\"58\" cy=\"71\" r=\"6\"></circle><text class=\"txt\" x=\"74\" y=\"76\">tools</text><rect class=\"ink f-w\" x=\"36\" y=\"264\" width=\"130\" height=\"50\" rx=\"12\"></rect><circle class=\"f-v\" cx=\"58\" cy=\"289\" r=\"6\"></circle><text class=\"txt\" x=\"74\" y=\"294\">MCP</text><rect class=\"ink f-w\" x=\"474\" y=\"46\" width=\"130\" height=\"50\" rx=\"12\"></rect><circle class=\"f-c\" cx=\"496\" cy=\"71\" r=\"6\"></circle><text class=\"txt\" x=\"512\" y=\"76\">providers</text><rect class=\"ink f-w\" x=\"474\" y=\"264\" width=\"130\" height=\"50\" rx=\"12\"></rect><circle class=\"f-l\" cx=\"496\" cy=\"289\" r=\"6\"></circle><text class=\"txt\" x=\"512\" y=\"294\">clients</text><path class=\"ink thin dash\" d=\"M166 84C196 92 212 98 230 108\"></path><path class=\"ink thin dash\" d=\"M166 276C196 268 212 262 230 252\"></path><path class=\"ink thin dash\" d=\"M474 84C444 92 428 98 410 108\"></path><path class=\"ink thin dash\" d=\"M474 276C444 268 428 262 410 252\"></path><text class=\"txt\" x=\"320\" y=\"346\" text-anchor=\"middle\">extensions run out of process, in any language</text>" },
      { t: 'p', text: 'Here is what any language means in practice: a complete extension in Python, with no SDK. A manifest says how to run it, and the script answers the harness over stdin and stdout.' },
      { t: 'tabs', label: 'A Python extension for the Orrery Harness', tabs: [
        { label: 'orrery.toml', lang: 'toml', file: 'orrery.toml', hl: [2, 9], text: "api     = \"orrery-ext/2\"\nruntime = \"python\"\n\n[extension]\nid      = \"python-hello-raw\"\nversion = \"0.1.0\"\n\n[provides]\ntools = [\"greet\"]" },
        { label: 'main.py', lang: 'python', file: 'main.py (trimmed)', hl: [5, 8], text: "def answer(method, params):\n    \"\"\"The result for one host request, or None for a method we do not handle.\"\"\"\n    if method == \"ext/load\":\n        # Handshake: the host's first request. Reply with the tools we really have.\n        return {\"tools\": [GREET], \"problems\": []}\n    if method == \"tool/call\":\n        # A call: `tool` is the bare name, `input` already checked against the schema.\n        return {\"outcome\": {\"t\": \"ok\", \"value\": \"hello, %s\" % params[\"input\"][\"name\"]}}\n    if method == \"$/ping\":\n        return {}  # heartbeat: an empty answer says we are alive\n    return None" }
      ] },
      { t: 'p', text: 'The highlighted lines are the whole contract: the manifest names the runtime and the tool, the script announces the tool and answers the call. The same tool exists in Node, Go and Rust in the examples.' },
      { t: 'callout', tone: 'note', title: 'A target, not a benchmark', text: 'The hundred-to-ten ratio is the goal I am building toward. I have not published a measurement of it yet.' },

      { t: 'h2', text: 'One session, every screen' },
      { t: 'p', text: 'A harness that runs on a machine leaves one more question: why should I have to sit at that machine? An agent can work for a long while, and when it needs an answer I want to give it from whatever is in front of me.' },
      { t: 'p', text: 'That is the job of **Orrery Relay**. It joins any client to any session on any machine I have enrolled. Each machine dials out to the relay, and the relay is one binary you can host yourself.' },
      { t: 'figure', field: 'shader', alt: "The Orrery Relay mark, a white letter R with the monogram’s planet in its bowl, on a drifting field of pink, violet, blue, green and cyan streaks, with the words Orrery Relay, one session, every screen",
        svg: "<defs><clipPath id=\"rl-orr-c\"><rect x=\"0\" y=\"20\" width=\"200\" height=\"160\"></rect></clipPath><mask id=\"rl-orr-m\" maskUnits=\"userSpaceOnUse\" x=\"-20\" y=\"-20\" width=\"240\" height=\"240\"><rect x=\"-20\" y=\"-20\" width=\"240\" height=\"240\" fill=\"#fff\"></rect><circle cx=\"119.87\" cy=\"47.13\" r=\"26\" fill=\"#000\"></circle></mask></defs><g transform=\"translate(216 34) scale(1.1)\"><g clip-path=\"url(#rl-orr-c)\"><g mask=\"url(#rl-orr-m)\"><g stroke=\"#fff\" stroke-width=\"32\" fill=\"none\"><path d=\"M51 20 V196\"></path><path d=\"M51 36 H93 A38 38 0 0 1 93 112 H51\" stroke-linejoin=\"miter\"></path><path d=\"M95 104 L159 194\"></path></g></g></g><circle cx=\"119.87\" cy=\"47.13\" r=\"16\" fill=\"#fff\"></circle></g><text class=\"txt big\" x=\"320\" y=\"290\" text-anchor=\"middle\" style=\"fill:#fff\">Orrery Relay</text><text class=\"txt\" x=\"320\" y=\"316\" text-anchor=\"middle\" style=\"fill:#fff\">one session, every screen</text>" },
      { t: 'p', text: 'The aim is one session on every platform: the terminal, the desktop app, the browser and the phone. A reply from any of them shows on all of them.' },
      { t: 'h2', text: 'Where it stands' },
      { t: 'p', text: '[Orrery](https://getorrery.dev) is now two things: a harness and an ADE. The harness runs the agent. The ADE is where I run many of them side by side, review what they did and ship it. The relay carries a session between them, and to every other screen.' },
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
