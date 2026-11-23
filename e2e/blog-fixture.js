// Fixture posts for e2e/blogs.spec.js — never shipped (e2e/ is in .vercelignore).
// `full` uses every block type and every optional post field documented in blog-data.js.
const full = {
  slug: 'fixture-full',
  title: 'Fixture: every block',
  dek: 'A post that uses each block type once.',
  date: '2026-03-10',
  category: 'Testing',
  tags: ['Fixtures', 'Blocks'],
  series: { name: 'Fixture series', part: 1, of: 2 },
  cover: { svg: '<circle class="ink" cx="320" cy="180" r="60"></circle>', alt: 'A circle', caption: 'The cover caption.' },
  notes: ['The first note, with `code`.'],
  changelog: ['Mar 2026 · first published'],
  body: [
    { t: 'lead', text: 'Lead with **strong**, *em*, ~~struck~~, ==marked==, `code`, [[Ctrl]], [CI]{continuous integration}, [a link](https://example.com) and a note.[^1] <b>raw</b>' },
    { t: 'h2', text: 'First section' },
    { t: 'p', text: 'A paragraph. [bad](javascript:alert(1))' },
    { t: 'h3', text: 'A sub heading' },
    { t: 'quote', text: 'A quote.', cite: 'its source' },
    { t: 'pull', text: 'A pull quote.' },
    { t: 'list', items: ['one', 'two'] },
    { t: 'list', ordered: true, title: 'Steps', items: ['first', 'second'] },
    { t: 'tasks', title: 'Checklist', items: [{ text: 'done', done: true }, { text: 'todo' }] },
    { t: 'code', lang: 'ts', file: 'a.ts', hl: [2], text: 'const a = 1; // one\nfoo("x");\n' },
    { t: 'code', lang: 'terminal', text: '$ echo hi\nhi\n$ ls' },
    { t: 'code', lang: 'diff', file: 'ci.yml', text: ' on:\n-  push:\n+  pull_request:' },
    { t: 'tabs', label: 'Shell', tabs: [
      { label: 'bash', lang: 'bash', file: 'a.sh', text: 'echo bash # hi' },
      { label: 'PowerShell', lang: 'powershell', file: 'a.ps1', text: 'echo ps' },
    ] },
    { t: 'callout', tone: 'warn', title: 'Careful', text: 'A warning.' },
    { t: 'table', label: 'Owners', head: ['Branch', 'Owns'], rows: [['one', '`src/**`'], ['two', '`docs/**`']] },
    { t: 'figure', svg: '<rect class="ink" x="40" y="40" width="80" height="80"></rect>', alt: 'A square', caption: 'A figure.' },
    { t: 'flow', caption: 'A flow.', nodes: [{ title: 'Start', sub: 'here' }, { title: 'Gate', tone: 'warn', fail: 'fails: back' }, { title: 'End', tone: 'tip' }] },
    { t: 'h2', text: 'Second section' },
    { t: 'metrics', items: [{ n: '6', label: 'agents' }, { n: '0', label: 'conflicts' }] },
    { t: 'faq', items: [{ q: 'Why?', a: 'Because.' }] },
    { t: 'cards', items: [{ title: 'Example', text: 'A link card.', href: 'https://example.com/docs' }] },
    { t: 'hr' },
    { t: 'unknown-block', text: 'renders nothing' },
  ],
};

// `n` plain posts, older than `full`, alternating between two topics
const plain = (n) => Array.from({ length: n }, (_, i) => ({
  slug: 'fixture-' + (i + 1),
  title: 'Fixture post ' + (i + 1),
  dek: 'Plain fixture number ' + (i + 1) + '.',
  date: '2025-' + String(12 - (i % 12)).padStart(2, '0') + '-' + String(28 - Math.floor(i / 12)).padStart(2, '0'),
  category: i % 2 ? 'Odd' : 'Even',
  tags: [],
  body: [{ t: 'p', text: 'Body ' + (i + 1) + '.' }],
}));

module.exports = { full, plain };
