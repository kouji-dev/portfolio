/**
 * Short CV template: dense, ATS-safe one-pager (single column, boxed section
 * labels, monospace tech lines, tight margins). Section order follows the
 * resume-writer skill: Summary, Skills, Experience, Projects, Education,
 * Languages. Sub-groups are flattened into a single brief bullet list.
 */

const { escapeHtml, inlineMd } = require("../format");
const { shortCss } = require("./styles");
const LABELS = require("./labels");
const { datesWithDuration } = require("../duration");

const esc = escapeHtml;

// Display form for a URL: drop protocol + trailing slash.
function short_url(u) {
  return esc(String(u).replace(/^https?:\/\//, "").replace(/\/$/, ""));
}

// ATS-safe contact: two full-width text lines, labels instead of icons.
function contact(c, L) {
  const line1 = [
    c.location && esc(c.location),
    c.email && `<a href="mailto:${c.email}">${esc(c.email)}</a>`,
    c.phone && esc(c.phone),
  ]
    .filter(Boolean)
    .join(" · ");
  const line2 = [
    c.linkedin && `${L.linkedin}: <a href="${c.linkedin}">${short_url(c.linkedin)}</a>`,
    c.github && `${L.github}: <a href="${c.github}">${short_url(c.github)}</a>`,
    c.portfolio && `${L.portfolio}: <a href="${c.portfolio}">${short_url(c.portfolio)}</a>`,
  ]
    .filter(Boolean)
    .join(" · ");
  return `<div class="head-contact">${[line1, line2].filter(Boolean).join("<br>")}</div>`;
}

// Collapse team-style sub-group bullets (no own tech) + own bullets into one
// flat list. Mission-style sub-groups (with their own tech) keep their label.
// Achievements flatten alongside responsibilities; challenges are long-only.
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

function bulletList(items) {
  return `<ul>${items.map((r) => `<li>${inlineMd(r.text)}</li>`).join("")}</ul>`;
}

function experienceEntry(x, lang) {
  const L = LABELS[lang] || LABELS.en;
  const parts = [
    `<div class="entry-head"><span class="entry-role">${esc(x.role)}</span>` +
      `<span class="entry-org">${esc(x.company)}</span></div>`,
  ];
  const meta = [
    x.dates && esc(datesWithDuration(x.dates, x.period, lang, { present: L.present })),
    x.client && esc(x.client),
  ]
    .filter(Boolean)
    .join(" · ");
  if (meta) parts.push(`<div class="entry-meta">${meta}</div>`);

  // The short CV drops `context:`, so a mission known by its product name would
  // lose it. `project:` restores it as a sub-label, matching the mission-style
  // sub-groups below; the right-hand column stays the employer/client alone.
  if (x.project) parts.push(`<div class="sub-label">${L.project} ${esc(x.project)}</div>`);

  const bl = flatBullets(x);
  if (bl.length) parts.push(bulletList(bl));

  // Mission-style sub-groups: compact label + own bullets + own tech line.
  // When present, per-mission tech replaces the entry-level merged line.
  let subgroupHasTech = false;
  if (x.subgroups) {
    for (const g of x.subgroups) {
      if (!g.tech) continue;
      subgroupHasTech = true;
      if (g.label) parts.push(`<div class="sub-label">${esc(g.label)}</div>`);
      const gb = [...(g.responsibilities || []), ...(g.achievements || [])];
      if (gb.length) parts.push(bulletList(gb));
      parts.push(`<div class="tech"><b>⚙</b> ${esc(g.tech)}</div>`);
    }
  }
  if (x.tech && !subgroupHasTech) parts.push(`<div class="tech"><b>⚙</b> ${esc(x.tech)}</div>`);
  return `<div class="entry">${parts.join("")}</div>`;
}

function projectEntry(p) {
  const parts = [
    `<div class="entry-head"><span class="entry-role">${esc(p.name)}</span></div>`,
  ];
  if (p.tech) parts.push(`<div class="tech"><b>⚙</b> ${esc(p.tech)}</div>`);
  return `<div class="entry">${parts.join("")}</div>`;
}

function renderShort(model, lang) {
  const L = LABELS[lang] || LABELS.en;
  const m = model.meta;
  const s = [];

  // Header (single column: name, title, contact lines)
  s.push(
    `<div class="head"><h1>${esc(m.name)}</h1>` +
      (m.title ? `<div class="role">${esc(m.title)}</div>` : "") +
      contact(m.contact, L) +
      `</div>`
  );

  // Professional Summary
  if (model.about && model.about.length) {
    s.push(
      `<section><div class="slabel">${L.about}</div>` +
        `<div class="summary">${model.about.map((a) => inlineMd(a.text)).join(" ")}</div>` +
        `</section>`
    );
  }

  // Core Skills (single column, one line per group)
  if (model.skills && model.skills.length) {
    s.push(`<section><div class="slabel">${L.skills}</div>`);
    s.push(
      model.skills
        .map((sk) => `<div class="skill"><b>${esc(sk.category)}:</b> ${esc(sk.items)}</div>`)
        .join("")
    );
    s.push(`</section>`);
  }

  // Experience
  if (model.experiences && model.experiences.length) {
    s.push(`<section><div class="slabel">${L.experience}</div>`);
    s.push(model.experiences.map((x) => experienceEntry(x, lang)).join(""));
    s.push(`</section>`);
  }

  // Projects (compact)
  if (model.projects && model.projects.length) {
    s.push(`<section><div class="slabel">${L.projects}</div>`);
    s.push(model.projects.map(projectEntry).join(""));
    s.push(`</section>`);
  }

  // Education
  if (model.education && model.education.length) {
    s.push(
      `<section><div class="slabel">${L.education}</div>` +
        model.education
          .map(
            (e) =>
              `<div class="skill"><b>${esc(e.degree)}</b> — ${esc(e.school)}${
                e.year ? ` — ${esc(e.year)}` : ""
              }</div>`
          )
          .join("") +
        `</section>`
    );
  }

  // Languages (single inline row)
  if (model.languages && model.languages.length) {
    s.push(
      `<section><div class="slabel">${L.languages}</div><div class="lang-row">` +
        model.languages
          .map((l) => `<b>${esc(l.name)}</b>${l.level ? ` — ${esc(l.level)}` : ""}`)
          .join(" · ") +
        `</div></section>`
    );
  }

  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(
    m.name
  )}</title><style>${shortCss}</style></head><body>${s.join("")}</body></html>`;
}

module.exports = { renderShort };
