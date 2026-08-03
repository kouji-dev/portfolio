/**
 * Long CV template: detailed, multi-page. Reproduces the previous markdown-based
 * layout (H1 + subtitle + contact, uppercase H2 sections, skills table,
 * experience blocks with optional sub-groups, tech line in italics).
 */

const { escapeHtml, inlineMd } = require("../format");
const { longCss } = require("./styles");
const LABELS = require("./labels");

const esc = escapeHtml;

// ATS-safe contact block: text labels only, no icons.
function contactBlock(c, L) {
  const line1 = [
    c.location && esc(c.location),
    c.email && `<a href="mailto:${c.email}">${esc(c.email)}</a>`,
    c.phone && esc(c.phone),
  ]
    .filter(Boolean)
    .join(" · ");

  // One row per link so each URL stays readable and clickable on its own line.
  const linkRows = [
    c.linkedin && `${L.linkedin}: <a href="${c.linkedin}">${esc(c.linkedin)}</a>`,
    c.github && `${L.github}: <a href="${c.github}">${esc(c.github)}</a>`,
    c.portfolio && `${L.portfolio}: <a href="${c.portfolio}">${esc(c.portfolio)}</a>`,
    c.booking && `${L.booking}: <a href="${c.booking}">${esc(c.booking)}</a>`,
  ].filter(Boolean);

  return `<div class="contact">${[line1, ...linkRows].filter(Boolean).join("<br>")}</div>`;
}

function bullets(items) {
  if (!items || !items.length) return "";
  return `<ul>${items.map((r) => `<li>${inlineMd(r.text)}</li>`).join("")}</ul>`;
}

// Responsibilities / Achievements / Challenges lists. Headings appear only when
// the split exists (an achievements or challenges list is present) — legacy
// responsibilities-only entries render as a plain unlabelled bullet list.
function sectionedBullets(x, L) {
  const hasSplit = (x.achievements && x.achievements.length) || (x.challenges && x.challenges.length);
  const parts = [];
  if (x.responsibilities && x.responsibilities.length) {
    if (hasSplit) parts.push(`<p class="list-label"><strong>${L.responsibilities}:</strong></p>`);
    parts.push(bullets(x.responsibilities));
  }
  if (x.achievements && x.achievements.length) {
    parts.push(`<p class="list-label"><strong>${L.achievements}:</strong></p>`);
    parts.push(bullets(x.achievements));
  }
  if (x.challenges && x.challenges.length) {
    parts.push(`<p class="list-label"><strong>${L.challenges}:</strong></p>`);
    parts.push(bullets(x.challenges));
  }
  return parts.join("");
}

function experienceEntry(x, L) {
  const parts = [`<h3>${esc(x.company)} — ${esc(x.role)}</h3>`];
  if (x.dates) parts.push(`<p class="dates">${esc(x.dates)}</p>`);
  if (x.client) parts.push(`<p class="client">${L.client}: ${esc(x.client)}</p>`);
  if (x.context)
    parts.push(`<p class="context"><strong>${L.context}:</strong> ${inlineMd(x.context)}</p>`);

  let subgroupHasTech = false;
  if (x.subgroups && x.subgroups.length) {
    for (const g of x.subgroups) {
      if (g.label) parts.push(`<h4>${esc(g.label)}</h4>`);
      if (g.context)
        parts.push(`<p class="context"><strong>${L.context}:</strong> ${inlineMd(g.context)}</p>`);
      parts.push(sectionedBullets(g, L));
      if (g.tech) {
        subgroupHasTech = true;
        parts.push(`<p class="tech"><strong>${L.tech}:</strong> <em>${esc(g.tech)}</em></p>`);
      }
    }
  }
  parts.push(sectionedBullets(x, L));

  // Entry-level tech is the fallback; per-mission tech lines replace it.
  if (x.tech && !subgroupHasTech)
    parts.push(`<p class="tech"><strong>${L.tech}:</strong> <em>${esc(x.tech)}</em></p>`);

  return `<div class="entry">${parts.join("")}</div>`;
}

function projectEntry(p, L) {
  const parts = [`<h3>${esc(p.name)}</h3>`];
  const meta = [
    p.role && `<strong>${L.role}:</strong> ${esc(p.role)}`,
    p.type && `<strong>${L.type}:</strong> ${esc(p.type)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  if (meta) parts.push(`<p class="dates">${meta}</p>`);

  const url = p.repo || p.link;
  if (url) {
    const label = p.repo ? L.repository : L.link;
    parts.push(`<p class="client">${label}: <a href="${url}">${esc(url)}</a></p>`);
  }
  if (p.context)
    parts.push(`<p class="context"><strong>${L.context}:</strong> ${inlineMd(p.context)}</p>`);
  parts.push(sectionedBullets(p, L));
  if (p.tech)
    parts.push(`<p class="tech"><strong>${L.tech}:</strong> <em>${esc(p.tech)}</em></p>`);

  return `<div class="entry">${parts.join("")}</div>`;
}

// ATS-safe skills: one bold-labelled line per group, no table markup.
function skillsList(skills) {
  if (!skills || !skills.length) return "";
  return skills
    .map((s) => `<p class="skill-row"><strong>${esc(s.category)}:</strong> ${esc(s.items)}</p>`)
    .join("");
}

function renderLong(model, lang) {
  const L = LABELS[lang] || LABELS.en;
  const m = model.meta;
  const s = [];

  s.push(`<h1>${esc(m.name)}</h1>`);
  if (m.title) s.push(`<p class="subtitle"><strong>${esc(m.title)}</strong></p>`);
  s.push(contactBlock(m.contact, L));
  s.push("<hr>");

  if (model.about && model.about.length) {
    s.push(`<h2>${L.about}</h2>`);
    s.push(model.about.map((p) => `<p>${inlineMd(p.text)}</p>`).join(""));
  }

  if (model.aiCapabilities && model.aiCapabilities.length) {
    s.push(`<h2>${L.ai}</h2>`);
    s.push(bullets(model.aiCapabilities));
  }

  if (model.skills && model.skills.length) {
    s.push(`<h2>${L.skills}</h2>`);
    s.push(skillsList(model.skills));
  }

  if (model.experiences && model.experiences.length) {
    s.push(`<h2>${L.experience}</h2>`);
    s.push(model.experiences.map((x) => experienceEntry(x, L)).join(""));
  }

  if (model.projects && model.projects.length) {
    s.push(`<h2>${L.projects}</h2>`);
    s.push(model.projects.map((p) => projectEntry(p, L)).join(""));
  }

  if (model.education && model.education.length) {
    s.push(`<h2>${L.education}</h2>`);
    s.push(
      model.education
        .map(
          (e) =>
            `<p><strong>${esc(e.degree)}</strong><br>${esc(e.school)}${e.year ? ` — ${esc(e.year)}` : ""}</p>`
        )
        .join("")
    );
  }

  if (model.languages && model.languages.length) {
    s.push(`<h2>${L.languages}</h2>`);
    s.push(
      `<ul>${model.languages
        .map((l) => `<li>${esc(l.name)}${l.level ? ` — ${esc(l.level)}` : ""}</li>`)
        .join("")}</ul>`
    );
  }

  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(
    m.name
  )}</title><style>${longCss}</style></head><body>${s.join("")}</body></html>`;
}

module.exports = { renderLong };
