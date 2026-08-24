/**
 * Tiny HTML + inline-markdown helpers shared by the templates.
 *
 * The YAML text keeps light inline markdown (`**bold**`, `` `code` ``,
 * `[label](url)`) so the long CV reproduces the previous marked-rendered look
 * without pulling in a full markdown engine.
 */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Tag vocabulary per output flavour. html-to-docx silently drops <em> and
// <code> (it maps neither to a run property), so the docx flavour emits <i>
// and an inline-styled monospace <span> instead.
const FLAVOURS = {
  html: {
    em: (t) => `<em>${t}</em>`,
    strong: (t) => `<strong>${t}</strong>`,
    code: (t) => `<code>${t}</code>`,
  },
  docx: {
    em: (t) => `<i>${t}</i>`,
    strong: (t) => `<b>${t}</b>`,
    code: (t) => `<span style="font-family:Consolas;">${t}</span>`,
  },
};

// Escape, then apply a minimal, ordered set of inline markdown rules.
function inlineMd(s, flavour = "html") {
  const T = FLAVOURS[flavour] || FLAVOURS.html;
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, (_, c) => T.code(c));
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, t, u) => `<a href="${u}">${t}</a>`
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, b) => T.strong(b));
  out = out.replace(
    /(^|[^*])\*([^*\n]+)\*(?!\*)/g,
    (_, pre, i) => `${pre}${T.em(i)}`
  );
  return out;
}

module.exports = { escapeHtml, inlineMd };
