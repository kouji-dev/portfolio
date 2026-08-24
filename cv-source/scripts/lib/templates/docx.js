/**
 * DOCX template: Word-native rendering of both CV versions.
 *
 * The PDF templates cannot be reused here. html-to-docx never parses <style>
 * blocks, so every class-based rule in styles.js is silently dropped, and it
 * understands only a short list of *inline* CSS properties:
 *
 *   color · background-color · font-size · font-family · font-weight:bold
 *   text-align · line-height · margin-left · margin-right · width
 *
 * No vertical margins (Word applies a fixed 6pt after every paragraph), no
 * text-transform, no font-style, no flex/grid. It also drops <em>, <code> and
 * <hr>, and throws on percentage table widths. So this renderer emits inline
 * styles only, uppercases in JS, uses <i> for italics, and never reaches for a
 * table: related lines are joined with <br> inside one paragraph so they stay
 * visually grouped despite the fixed paragraph spacing.
 *
 * Content selection mirrors the PDF templates exactly — `long` keeps context,
 * the responsibilities/achievements/challenges split and per-mission detail;
 * `short` flattens sub-groups into one bullet list and drops context.
 */

const { escapeHtml, inlineMd } = require("../format");
const LABELS = require("./labels");
const { datesWithDuration } = require("../duration");

const esc = escapeHtml;
const md = (s) => inlineMd(s, "docx");

// Palette shared with the PDFs (long CSS accent blue, muted grey, near-black).
const ACCENT = "#0969da";
const MUTED = "#57606a";
const INK = "#1a1a1a";
const MONO = "Consolas";

// Point sizes per version. The DOCX is an editable/ATS artefact rather than a
// page-constrained one, so both versions read at normal document sizes.
const SIZES = {
  long: { name: 20, title: 12, contact: 9.5, h2: 12, h3: 11, h4: 10, body: 10.5, tech: 9.5, meta: 10 },
  short: { name: 18, title: 11, contact: 9, h2: 10, h3: 10.5, h4: 10, body: 10, tech: 9, meta: 9 },
};

function p(content, style) {
  return `<p${style ? ` style="${style}"` : ""}>${content}</p>`;
}

function span(content, style) {
  return `<span style="${style}">${content}</span>`;
}

// Display form for a URL: drop protocol + trailing slash.
function shortUrl(u) {
  return esc(String(u).replace(/^https?:\/\//, "").replace(/\/$/, ""));
}

// ATS-safe contact block: text labels, no icons, one <br>-joined paragraph so
// the lines stay tight together.
function contactBlock(c, L, S, { fullUrls }) {
  const show = fullUrls ? (u) => esc(u) : shortUrl;
  const line1 = [
    c.location && esc(c.location),
    c.email && `<a href="mailto:${c.email}">${esc(c.email)}</a>`,
    c.phone && esc(c.phone),
  ]
    .filter(Boolean)
    .join(" · ");

  const links = [
    c.linkedin && `${L.linkedin}: <a href="${c.linkedin}">${show(c.linkedin)}</a>`,
    c.github && `${L.github}: <a href="${c.github}">${show(c.github)}</a>`,
    c.portfolio && `${L.portfolio}: <a href="${c.portfolio}">${show(c.portfolio)}</a>`,
    fullUrls && c.booking && `${L.booking}: <a href="${c.booking}">${show(c.booking)}</a>`,
  ].filter(Boolean);

  // The short CV keeps the links on one row; the long one gives each its own.
  const rows = fullUrls ? links : [links.join(" · ")];
  return p(
    [line1, ...rows].filter(Boolean).join("<br>"),
    `font-size:${S.contact}pt;color:${MUTED};line-height:1.25;`
  );
}

// Section heading. The long version reuses the PDF's blue uppercase rule; the
// short version keeps its signature white-on-black label, which survives as
// run-level shading (the one background-color html-to-docx does honour).
function sectionLabel(text, S, version) {
  const up = String(text).toUpperCase();
  if (version === "short") {
    return p(
      span(
        `&nbsp;${esc(up)}&nbsp;`,
        `background-color:#000000;color:#ffffff;font-weight:bold;font-size:${S.h2}pt;`
      )
    );
  }
  return `<h2 style="font-size:${S.h2}pt;color:${ACCENT};">${esc(up)}</h2>`;
}

function bullets(items, S) {
  if (!items || !items.length) return "";
  const style = `font-size:${S.body}pt;color:${INK};`;
  return `<ul style="${style}">${items
    .map((r) => `<li style="${style}">${md(r.text)}</li>`)
    .join("")}</ul>`;
}

// The separating space lives *inside* the span: html-to-docx discards
// whitespace-only text nodes between elements, which would glue the label to
// the tech list.
function techLine(text, L, S) {
  return p(
    `<b>${esc(L.tech)}:</b>` + span(` ${esc(text)}`, `font-family:${MONO};color:#444444;`),
    `font-size:${S.tech}pt;`
  );
}

// --- long-version bullet handling -------------------------------------------

// Headings appear only when the split exists (an achievements or challenges
// list is present) — responsibilities-only entries stay a plain bullet list.
function sectionedBullets(x, L, S) {
  const hasSplit =
    (x.achievements && x.achievements.length) || (x.challenges && x.challenges.length);
  const label = (t) => p(`<b>${esc(t)}:</b>`, `font-size:${S.body}pt;`);
  const parts = [];
  if (x.responsibilities && x.responsibilities.length) {
    if (hasSplit) parts.push(label(L.responsibilities));
    parts.push(bullets(x.responsibilities, S));
  }
  if (x.achievements && x.achievements.length) {
    parts.push(label(L.achievements));
    parts.push(bullets(x.achievements, S));
  }
  if (x.challenges && x.challenges.length) {
    parts.push(label(L.challenges));
    parts.push(bullets(x.challenges, S));
  }
  return parts.join("");
}

// --- short-version bullet handling ------------------------------------------

// Collapse team-style sub-group bullets (no own tech) + own bullets into one
// flat list. Mission-style sub-groups (with their own tech) keep their label.
function flatBullets(x) {
  const all = [];
  if (x.subgroups) {
    for (const g of x.subgroups) {
      if (g.tech) continue;
      if (g.responsibilities) all.push(...g.responsibilities);
      if (g.achievements) all.push(...g.achievements);
    }
  }
  if (x.responsibilities) all.push(...x.responsibilities);
  if (x.achievements) all.push(...x.achievements);
  return all;
}

// --- entries -----------------------------------------------------------------

function longExperience(x, L, S, lang) {
  const parts = [
    `<h3 style="font-size:${S.h3}pt;color:#0d1117;">${esc(x.company)} — ${esc(x.role)}</h3>`,
  ];
  const meta = [
    x.dates && esc(datesWithDuration(x.dates, x.period, lang, { present: L.present })),
    x.client && `${esc(L.client)}: ${esc(x.client)}`,
  ]
    .filter(Boolean)
    .join("<br>");
  if (meta) parts.push(p(meta, `font-size:${S.meta}pt;color:${MUTED};`));
  if (x.context)
    parts.push(p(`<b>${esc(L.context)}:</b> ${md(x.context)}`, `font-size:${S.body}pt;`));

  let subgroupHasTech = false;
  if (x.subgroups && x.subgroups.length) {
    for (const g of x.subgroups) {
      if (g.label) parts.push(`<h4 style="font-size:${S.h4}pt;color:#0d1117;">${esc(g.label)}</h4>`);
      if (g.context)
        parts.push(p(`<b>${esc(L.context)}:</b> ${md(g.context)}`, `font-size:${S.body}pt;`));
      parts.push(sectionedBullets(g, L, S));
      if (g.tech) {
        subgroupHasTech = true;
        parts.push(techLine(g.tech, L, S));
      }
    }
  }
  parts.push(sectionedBullets(x, L, S));

  // Entry-level tech is the fallback; per-mission tech lines replace it.
  if (x.tech && !subgroupHasTech) parts.push(techLine(x.tech, L, S));
  return parts.join("");
}

function shortExperience(x, L, S, lang) {
  // Role and employer share one line — the PDF's two-column head has no DOCX
  // equivalent, and a table would fight Word's borders for no gain.
  const meta = [
    x.dates && esc(datesWithDuration(x.dates, x.period, lang, { present: L.present })),
    x.client && esc(x.client),
  ]
    .filter(Boolean)
    .join(" · ");

  const head =
    span(
      `${esc(x.role)} — ${esc(String(x.company).toUpperCase())}`,
      "font-weight:bold;color:#000000;"
    ) + (meta ? `<br>` + span(meta, `font-size:${S.meta}pt;color:#555555;`) : "");
  const parts = [p(head, `font-size:${S.h3}pt;`)];

  // The short CV drops `context:`, so a mission known by its product name would
  // lose it. `project:` restores it as a sub-label.
  if (x.project)
    parts.push(p(`<b>${esc(L.project)} ${esc(x.project)}</b>`, `font-size:${S.h4}pt;`));

  const bl = flatBullets(x);
  if (bl.length) parts.push(bullets(bl, S));

  // Mission-style sub-groups: label + own bullets + own tech line. When
  // present, per-mission tech replaces the entry-level merged line.
  let subgroupHasTech = false;
  if (x.subgroups) {
    for (const g of x.subgroups) {
      if (!g.tech) continue;
      subgroupHasTech = true;
      if (g.label) parts.push(p(`<b>${esc(g.label)}</b>`, `font-size:${S.h4}pt;`));
      const gb = [...(g.responsibilities || []), ...(g.achievements || [])];
      if (gb.length) parts.push(bullets(gb, S));
      parts.push(techLine(g.tech, L, S));
    }
  }
  if (x.tech && !subgroupHasTech) parts.push(techLine(x.tech, L, S));
  return parts.join("");
}

function longProject(pr, L, S) {
  const parts = [`<h3 style="font-size:${S.h3}pt;color:#0d1117;">${esc(pr.name)}</h3>`];
  const meta = [
    pr.role && `<b>${esc(L.role)}:</b> ${esc(pr.role)}`,
    pr.type && `<b>${esc(L.type)}:</b> ${esc(pr.type)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const url = pr.repo || pr.link;
  const rows = [
    meta,
    url && `${esc(pr.repo ? L.repository : L.link)}: <a href="${url}">${esc(url)}</a>`,
  ].filter(Boolean);
  if (rows.length) parts.push(p(rows.join("<br>"), `font-size:${S.meta}pt;color:${MUTED};`));
  if (pr.context)
    parts.push(p(`<b>${esc(L.context)}:</b> ${md(pr.context)}`, `font-size:${S.body}pt;`));
  parts.push(sectionedBullets(pr, L, S));
  if (pr.tech) parts.push(techLine(pr.tech, L, S));
  return parts.join("");
}

function shortProject(pr, L, S) {
  const head = span(esc(pr.name), "font-weight:bold;color:#000000;");
  const parts = [p(head, `font-size:${S.h3}pt;`)];
  if (pr.tech) parts.push(techLine(pr.tech, L, S));
  return parts.join("");
}

// --- document ----------------------------------------------------------------

function renderDocx(model, lang, version) {
  const L = LABELS[lang] || LABELS.en;
  const S = SIZES[version] || SIZES.long;
  const isShort = version === "short";
  const m = model.meta;
  const s = [];

  const name = isShort ? String(m.name).toUpperCase() : m.name;
  s.push(`<h1 style="font-size:${S.name}pt;color:#0d1117;">${esc(name)}</h1>`);
  if (m.title)
    s.push(
      p(
        span(esc(m.title), `color:${isShort ? "#333333" : ACCENT};font-weight:bold;`),
        `font-size:${S.title}pt;`
      )
    );
  s.push(contactBlock(m.contact, L, S, { fullUrls: !isShort }));

  if (model.about && model.about.length) {
    s.push(sectionLabel(L.about, S, version));
    s.push(
      isShort
        ? p(model.about.map((a) => md(a.text)).join(" "), `font-size:${S.body}pt;`)
        : model.about.map((a) => p(md(a.text), `font-size:${S.body}pt;`)).join("")
    );
  }

  if (!isShort && model.aiCapabilities && model.aiCapabilities.length) {
    s.push(sectionLabel(L.ai, S, version));
    s.push(bullets(model.aiCapabilities, S));
  }

  if (model.skills && model.skills.length) {
    s.push(sectionLabel(L.skills, S, version));
    // One bold-labelled line per group, <br>-joined in the short version so the
    // block stays as tight as its PDF counterpart.
    const rows = model.skills.map((sk) => `<b>${esc(sk.category)}:</b> ${esc(sk.items)}`);
    s.push(
      isShort
        ? p(rows.join("<br>"), `font-size:${S.body}pt;line-height:1.2;`)
        : rows.map((r) => p(r, `font-size:${S.body}pt;`)).join("")
    );
  }

  if (model.experiences && model.experiences.length) {
    s.push(sectionLabel(L.experience, S, version));
    s.push(
      model.experiences
        .map((x) => (isShort ? shortExperience(x, L, S, lang) : longExperience(x, L, S, lang)))
        .join("")
    );
  }

  if (model.projects && model.projects.length) {
    s.push(sectionLabel(L.projects, S, version));
    s.push(
      model.projects.map((pr) => (isShort ? shortProject(pr, L, S) : longProject(pr, L, S))).join("")
    );
  }

  if (model.education && model.education.length) {
    s.push(sectionLabel(L.education, S, version));
    const rows = model.education.map(
      (e) => `<b>${esc(e.degree)}</b> — ${esc(e.school)}${e.year ? ` — ${esc(e.year)}` : ""}`
    );
    s.push(
      isShort
        ? p(rows.join("<br>"), `font-size:${S.body}pt;line-height:1.2;`)
        : rows.map((r) => p(r, `font-size:${S.body}pt;`)).join("")
    );
  }

  if (model.languages && model.languages.length) {
    s.push(sectionLabel(L.languages, S, version));
    const rows = model.languages.map(
      (l) => `<b>${esc(l.name)}</b>${l.level ? ` — ${esc(l.level)}` : ""}`
    );
    s.push(
      isShort
        ? p(rows.join(" · "), `font-size:${S.body}pt;`)
        : rows.map((r) => p(r, `font-size:${S.body}pt;`)).join("")
    );
  }

  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(
    m.name
  )}</title></head><body>${s.join("")}</body></html>`;
}

module.exports = { renderDocx };
