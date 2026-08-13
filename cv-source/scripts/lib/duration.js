/**
 * Experience durations, computed from `period: { start, end }` ("YYYY-MM") so
 * they never drift: an ongoing mission (no `end`) is measured against the build
 * date, and a finished one always renders the same span.
 *
 * Counting is inclusive of both boundary months — the LinkedIn convention a
 * recruiter compares against: Oct 2022 – Sep 2023 reads as 1 year, not 11 months.
 */

const MONTH_RE = /^(\d{4})-(\d{2})$/;

function parseMonth(value, field) {
  const m = MONTH_RE.exec(String(value || "").trim());
  if (!m) throw new Error(`period.${field} must be "YYYY-MM", got ${JSON.stringify(value)}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) throw new Error(`period.${field} has an invalid month: ${value}`);
  return year * 12 + (month - 1);
}

// Inclusive month count between two "YYYY-MM" bounds; `end` omitted means "now".
function monthsBetween(period, now = new Date()) {
  const start = parseMonth(period.start, "start");
  const end = period.end
    ? parseMonth(period.end, "end")
    : now.getFullYear() * 12 + now.getMonth();
  return Math.max(1, end - start + 1);
}

const UNITS = {
  en: { year: ["year", "years"], month: ["month", "months"] },
  fr: { year: ["an", "ans"], month: ["mois", "mois"] },
};

function plural(n, forms) {
  return `${n} ${n > 1 ? forms[1] : forms[0]}`;
}

// 40 -> "3 years 4 months" / "3 ans 4 mois"; 12 -> "1 year" / "1 an".
function formatDuration(months, lang) {
  const u = UNITS[lang] || UNITS.en;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (years) parts.push(plural(years, u.year));
  if (rest || !years) parts.push(plural(rest || months, u.month));
  return parts.join(" ");
}

/**
 * Renders the date line from `dates` + `period`:
 *   finished -> "June 2019 – September 2022 (3 years 4 months)"
 *   ongoing  -> "September 2023 – Present (3 years)"
 *
 * The "ongoing" marker comes from `period.end` being absent, so a mission can
 * never read as finished while its duration keeps growing.
 */
function datesWithDuration(dates, period, lang, opts = {}) {
  if (!dates) return dates;
  if (!period || !period.start) return dates;
  const present = !period.end && opts.present ? ` – ${opts.present}` : "";
  return `${dates}${present} (${formatDuration(monthsBetween(period, opts.now), lang)})`;
}

module.exports = { monthsBetween, formatDuration, datesWithDuration };
