/**
 * Tiny HTML + inline-markdown helpers shared by both templates.
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

// Escape, then apply a minimal, ordered set of inline markdown rules.
function inlineMd(s) {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, t, u) => `<a href="${u}">${t}</a>`
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, b) => `<strong>${b}</strong>`);
  out = out.replace(
    /(^|[^*])\*([^*\n]+)\*(?!\*)/g,
    (_, pre, i) => `${pre}<em>${i}</em>`
  );
  return out;
}

module.exports = { escapeHtml, inlineMd };
