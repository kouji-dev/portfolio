/**
 * Post-process the package html-to-docx emits so Word will actually open it.
 *
 * Word validates document.xml against the WordprocessingML schema and refuses
 * the whole file on any violation; Google Docs, LibreOffice and the macOS
 * previewer are lenient and show the same bytes happily. html-to-docx emits
 * three violations:
 *
 *   1. `<w:sectPr>` is written as the FIRST child of `<w:body>`. CT_Body is a
 *      sequence of block-level elements followed by an optional sectPr, so it
 *      must come last.
 *   2. `<w:rPr>` children come out in the order the CSS was read, but CT_RPr is
 *      a strict sequence (rStyle, rFonts, b, i, … color, sz, … shd, …).
 *   3. Any option the caller leaves out of `margins` reaches the XML as the
 *      literal string "undefined", where Word wants an integer. The generator
 *      now passes a complete margins object, so this is a backstop.
 *
 * Everything here is pure XML surgery — no content changes.
 */

const JSZip = require("jszip");

// CT_RPr / EG_RPrBase, in schema order.
const RPR_ORDER = [
  "w:rStyle", "w:rFonts", "w:b", "w:bCs", "w:i", "w:iCs", "w:caps", "w:smallCaps",
  "w:strike", "w:dstrike", "w:outline", "w:shadow", "w:emboss", "w:imprint",
  "w:noProof", "w:snapToGrid", "w:vanish", "w:webHidden", "w:color", "w:spacing",
  "w:w", "w:kern", "w:position", "w:sz", "w:szCs", "w:highlight", "w:u", "w:effect",
  "w:bdr", "w:shd", "w:fitText", "w:vertAlign", "w:rtl", "w:cs", "w:em", "w:lang",
  "w:eastAsianLayout", "w:specVanish", "w:oMath",
];

// CT_PPr, in schema order.
const PPR_ORDER = [
  "w:pStyle", "w:keepNext", "w:keepLines", "w:pageBreakBefore", "w:framePr",
  "w:widowControl", "w:numPr", "w:suppressLineNumbers", "w:pBdr", "w:shd", "w:tabs",
  "w:suppressAutoHyphens", "w:kinsoku", "w:wordWrap", "w:overflowPunct",
  "w:topLinePunct", "w:autoSpaceDE", "w:autoSpaceDN", "w:bidi", "w:adjustRightInd",
  "w:snapToGrid", "w:spacing", "w:ind", "w:contextualSpacing", "w:mirrorIndents",
  "w:suppressOverlap", "w:jc", "w:textDirection", "w:textAlignment",
  "w:textboxTightWrap", "w:outlineLvl", "w:divId", "w:cnfStyle", "w:rPr", "w:sectPr",
  "w:pPrChange",
];

// Split a container's inner XML into its top-level child elements, keeping each
// child's own nested content intact (w:numPr wraps w:ilvl/w:numId, w:pPr wraps
// a whole w:rPr).
function splitChildren(inner) {
  const children = [];
  let i = 0;
  while (i < inner.length) {
    const lt = inner.indexOf("<", i);
    if (lt === -1) break;
    const nameMatch = /^<([A-Za-z0-9:_-]+)/.exec(inner.slice(lt));
    if (!nameMatch) break;
    const name = nameMatch[1];
    const gt = inner.indexOf(">", lt);
    if (gt === -1) break;

    let end;
    if (inner[gt - 1] === "/") {
      end = gt + 1; // self-closing
    } else {
      // Walk to the matching close tag, tolerating same-named nesting.
      let depth = 1;
      let cur = gt + 1;
      while (depth > 0) {
        const nextOpen = inner.indexOf(`<${name}`, cur);
        const nextClose = inner.indexOf(`</${name}>`, cur);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
          const after = inner[nextOpen + name.length + 1];
          if (after === " " || after === ">" || after === "/") depth++;
          cur = nextOpen + name.length + 1;
        } else {
          depth--;
          cur = nextClose + name.length + 3;
        }
      }
      end = cur;
    }
    children.push({ name, xml: inner.slice(lt, end) });
    i = end;
  }
  return children;
}

// Reorder every <tag>…</tag> container's children into `order`. Unknown
// elements sort last but keep their relative order (stable sort).
function reorderContainers(xml, tag, order) {
  const rank = new Map(order.map((n, i) => [n, i]));
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
  return xml.replace(re, (whole, inner) => {
    if (!inner.trim()) return whole;
    const children = splitChildren(inner);
    if (children.length < 2) return whole;
    const sorted = children
      .map((c, i) => ({ ...c, i }))
      .sort((a, b) => {
        const ra = rank.has(a.name) ? rank.get(a.name) : order.length;
        const rb = rank.has(b.name) ? rank.get(b.name) : order.length;
        return ra - rb || a.i - b.i;
      });
    if (sorted.every((c, i) => c.i === i)) return whole; // already in order
    return `<${tag}>${sorted.map((c) => c.xml).join("")}</${tag}>`;
  });
}

// Move a body-level <w:sectPr> from the front of <w:body> to the end.
function moveSectPrToEnd(xml) {
  const bodyOpen = xml.indexOf("<w:body>");
  const bodyClose = xml.lastIndexOf("</w:body>");
  if (bodyOpen === -1 || bodyClose === -1) return xml;

  const start = bodyOpen + "<w:body>".length;
  const body = xml.slice(start, bodyClose);
  const m = /^\s*<w:sectPr[\s>][\s\S]*?<\/w:sectPr>/.exec(body);
  if (!m) return xml; // already last, or absent

  const rest = body.slice(m[0].length);
  return xml.slice(0, start) + rest + m[0].trim() + xml.slice(bodyClose);
}

// Attributes whose value came through as a JS undefined/NaN are dropped: Word
// rejects the file outright rather than ignoring the attribute.
function dropUndefinedAttributes(xml) {
  return xml.replace(/\s[A-Za-z0-9:_-]+="(?:undefined|NaN|null)"/g, "");
}

function repairDocumentXml(xml) {
  let out = dropUndefinedAttributes(xml);
  out = moveSectPrToEnd(out);
  out = reorderContainers(out, "w:rPr", RPR_ORDER);
  out = reorderContainers(out, "w:pPr", PPR_ORDER);
  return out;
}

/**
 * Rewrite word/document.xml inside a .docx buffer. Returns a new buffer;
 * everything else in the package is passed through untouched.
 */
async function repairDocx(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file("word/document.xml");
  if (!entry) throw new Error("not a .docx package: word/document.xml is missing");

  zip.file("word/document.xml", repairDocumentXml(await entry.async("string")));
  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/**
 * Structural check used by the tests: returns a list of schema violations found
 * in a document.xml string. Empty means the three known failure modes are gone.
 */
function findViolations(xml) {
  const problems = [];

  const bad = xml.match(/\s[A-Za-z0-9:_-]+="(?:undefined|NaN|null)"/g);
  if (bad) problems.push(`non-numeric attribute values: ${[...new Set(bad)].join(", ").trim()}`);

  const bodyOpen = xml.indexOf("<w:body>");
  if (bodyOpen !== -1) {
    const body = xml.slice(bodyOpen + "<w:body>".length, xml.lastIndexOf("</w:body>"));
    if (/^\s*<w:sectPr[\s>]/.test(body)) problems.push("w:sectPr is the first child of w:body");
  }

  for (const [tag, order] of [["w:rPr", RPR_ORDER], ["w:pPr", PPR_ORDER]]) {
    const rank = new Map(order.map((n, i) => [n, i]));
    const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g");
    for (const m of xml.matchAll(re)) {
      const names = splitChildren(m[1]).map((c) => c.name).filter((n) => rank.has(n));
      const ranks = names.map((n) => rank.get(n));
      if (ranks.some((r, i) => i > 0 && r < ranks[i - 1])) {
        problems.push(`${tag} children out of schema order: ${names.join(", ")}`);
      }
    }
  }
  return [...new Set(problems)];
}

module.exports = { repairDocx, repairDocumentXml, findViolations, RPR_ORDER, PPR_ORDER };
