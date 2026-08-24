/**
 * DOCX tests: the OOXML repair pass, and a schema check of whatever DOCX files
 * currently sit in ../assets. Run from cv-source/: `npm run test:docx`.
 *
 * These guard the failure that shipped once already — a package Google Docs
 * opens happily and Word refuses outright.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const { repairDocumentXml, repairDocx, findViolations } = require("./lib/docx-repair");

const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.resolve(ROOT, "..", "assets");
let failures = 0;

function test(name, fn) {
  try {
    const r = fn();
    if (r && typeof r.then === "function") return r.then(
      () => console.log(`  ok    ${name}`),
      (err) => { failures++; console.error(`  FAIL  ${name}\n        ${err.message}`); }
    );
    console.log(`  ok    ${name}`);
  } catch (err) {
    failures++;
    console.error(`  FAIL  ${name}\n        ${err.message}`);
  }
}

const wrap = (body) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="x"><w:body>${body}</w:body></w:document>`;

// --- The three known html-to-docx violations --------------------------------

test("pgMar keeps numeric attributes and drops undefined ones", () => {
  const fixed = repairDocumentXml(
    wrap('<w:sectPr><w:pgMar w:top="907" w:header="undefined" w:gutter="undefined"/></w:sectPr><w:p/>')
  );
  assert.ok(!/undefined/.test(fixed), "an undefined attribute survived");
  assert.ok(/w:top="907"/.test(fixed), "a real margin was dropped");
});

test("sectPr moves from the first body child to the last", () => {
  const fixed = repairDocumentXml(wrap("<w:sectPr><w:pgSz w:w=\"11906\"/></w:sectPr><w:p><w:r/></w:p>"));
  const body = fixed.slice(fixed.indexOf("<w:body>") + 8, fixed.indexOf("</w:body>"));
  assert.ok(body.startsWith("<w:p>"), `body still starts with sectPr: ${body.slice(0, 40)}`);
  assert.ok(body.endsWith("</w:sectPr>"), `body does not end with sectPr: ${body.slice(-40)}`);
});

test("rPr children are sorted into schema order", () => {
  const fixed = repairDocumentXml(
    wrap('<w:p><w:r><w:rPr><w:color w:val="ffffff"/><w:shd w:fill="000000"/><w:b/><w:sz w:val="20"/></w:rPr></w:r></w:p>')
  );
  const inner = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(fixed)[1];
  const names = [...inner.matchAll(/<w:([a-zA-Z]+)/g)].map((m) => m[1]);
  assert.deepStrictEqual(names, ["b", "color", "sz", "shd"]);
});

test("nested children survive reordering intact", () => {
  const fixed = repairDocumentXml(
    wrap('<w:p><w:pPr><w:spacing w:lineRule="auto"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr></w:p>')
  );
  assert.ok(/<w:numPr><w:ilvl w:val="0"\/><w:numId w:val="1"\/><\/w:numPr>/.test(fixed), "numPr was mangled");
  const inner = /<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(fixed)[1];
  assert.ok(inner.indexOf("<w:numPr>") < inner.indexOf("<w:spacing"), "numPr must precede spacing");
});

test("already-valid XML is left alone", () => {
  const good = wrap('<w:p><w:r><w:rPr><w:b/><w:color w:val="000000"/></w:rPr></w:r></w:p><w:sectPr/>');
  assert.strictEqual(repairDocumentXml(good), good);
});

test("findViolations reports each failure mode, and none after repair", () => {
  const broken = wrap(
    '<w:sectPr><w:pgMar w:header="undefined"/></w:sectPr>' +
      '<w:p><w:r><w:rPr><w:sz w:val="20"/><w:b/></w:rPr></w:r></w:p>'
  );
  assert.strictEqual(findViolations(broken).length, 3, "expected all three violations");
  assert.deepStrictEqual(findViolations(repairDocumentXml(broken)), []);
});

// --- The real generated files ----------------------------------------------

async function checkBuiltAssets() {
  if (!fs.existsSync(ASSETS)) return;
  const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith(".docx"));
  if (!files.length) {
    console.log("  skip  no built .docx in ../assets (run npm run convert:docx)");
    return;
  }
  for (const f of files) {
    const zip = await JSZip.loadAsync(fs.readFileSync(path.join(ASSETS, f)));
    const entry = zip.file("word/document.xml");
    await test(`${f} is schema-clean`, async () => {
      assert.ok(entry, "word/document.xml missing");
      const problems = findViolations(await entry.async("string"));
      assert.deepStrictEqual(problems, [], problems.join(" | "));
    });
  }
}

// repairDocx round-trips a real package, so exercise it end to end too.
async function checkRoundTrip() {
  const zip = new JSZip();
  zip.file("word/document.xml", wrap('<w:sectPr><w:pgMar w:header="undefined"/></w:sectPr><w:p/>'));
  zip.file("[Content_Types].xml", "<Types/>");
  const repaired = await repairDocx(await zip.generateAsync({ type: "nodebuffer" }));
  const out = await JSZip.loadAsync(repaired);
  await test("repairDocx rewrites document.xml and keeps the other parts", async () => {
    assert.ok(out.file("[Content_Types].xml"), "other parts were dropped");
    assert.deepStrictEqual(findViolations(await out.file("word/document.xml").async("string")), []);
  });
}

(async () => {
  await checkRoundTrip();
  await checkBuiltAssets();
  if (failures) {
    console.error(`\n${failures} test(s) failed`);
    process.exit(1);
  }
  console.log("\nAll docx tests passed");
})();
