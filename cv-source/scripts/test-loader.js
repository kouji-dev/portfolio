/**
 * Loader tests: YAML inheritance (`extends` + `overrides`) and resolve().
 * Run from cv-source/: `npm test` (no browser needed — loader only).
 */

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { loadYaml, validate, resolve } = require("./lib/loader");

const ROOT = path.resolve(__dirname, "..");
let failures = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ok    ${name}`);
  } catch (err) {
    failures++;
    console.error(`  FAIL  ${name}\n        ${err.message}`);
  }
}

// --- Real files -------------------------------------------------------------

test("main.yaml includes the Preesm Group experience", () => {
  const data = loadYaml(path.join(ROOT, "main.yaml"));
  validate(data);
  const model = resolve(data, "en", "long");
  assert.ok(
    model.experiences.some((e) => e.company === "Preesm Group"),
    "Preesm Group missing from main.yaml long resolve"
  );
});

test("np.yaml inherits main.yaml but hides Preesm Group", () => {
  const data = loadYaml(path.join(ROOT, "np.yaml"));
  validate(data);
  assert.strictEqual(data.meta.name, "NAJIH Driss", "meta not inherited from base");
  for (const version of ["short", "long"]) {
    const model = resolve(data, "en", version);
    assert.ok(
      !model.experiences.some((e) => e.company === "Preesm Group"),
      `Preesm Group still present in ${version} resolve`
    );
    assert.ok(model.experiences.length > 0, "all experiences vanished");
  }
});

test("np.yaml names its own output, and main.yaml claims no tag", () => {
  assert.strictEqual(loadYaml(path.join(ROOT, "np.yaml")).output.tag, "np");
  assert.strictEqual(loadYaml(path.join(ROOT, "main.yaml")).output, undefined);
});

// --- Synthetic fixtures -----------------------------------------------------

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cv-loader-"));
const write = (name, content) => {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, content);
  return p;
};

write(
  "base.yaml",
  [
    "meta:",
    "  name: Base",
    "  title: { en: Base Title, fr: Titre Base }",
    "items:",
    "  - id: a",
    "    keep: true",
    "  - id: b",
    "    keep: true",
  ].join("\n")
);

test("variant deep-merges mappings and patches array items by selector and index", () => {
  const variant = write(
    "variant.yaml",
    [
      "extends: base.yaml",
      "meta:",
      "  title: { en: Variant Title, fr: Titre Variante }",
      "overrides:",
      "  - path: items[id=b].keep",
      "    value: false",
      "  - path: items[0].id",
      "    value: a2",
    ].join("\n")
  );
  const data = loadYaml(variant);
  assert.strictEqual(data.meta.name, "Base");
  assert.strictEqual(data.meta.title.en, "Variant Title");
  assert.strictEqual(data.items[1].keep, false);
  assert.strictEqual(data.items[0].id, "a2");
});

test("overrides never mutate the base file's data", () => {
  const base = loadYaml(path.join(tmp, "base.yaml"));
  assert.strictEqual(base.items[1].keep, true);
  assert.strictEqual(base.items[0].id, "a");
});

test("a selector matching no item throws", () => {
  const bad = write(
    "bad-selector.yaml",
    ["extends: base.yaml", "overrides:", "  - path: items[id=zzz].keep", "    value: false"].join("\n")
  );
  assert.throws(() => loadYaml(bad), /matches 0 items/);
});

test("a missing extends target throws", () => {
  const bad = write("bad-extends.yaml", "extends: nope.yaml");
  assert.throws(() => loadYaml(bad), /not found/);
});

test("a circular extends chain throws", () => {
  write("loop-a.yaml", "extends: loop-b.yaml");
  const loop = write("loop-b.yaml", "extends: loop-a.yaml");
  assert.throws(() => loadYaml(loop), /Circular/);
});

// `output` must stay file-local: an inherited tag would make the variant
// overwrite the very files its base just wrote.
test("output is not inherited from the base", () => {
  write("tagged-base.yaml", ["meta:", "  name: Base", "output:", "  tag: base"].join("\n"));
  const child = write("untagged-child.yaml", "extends: tagged-base.yaml");
  assert.strictEqual(loadYaml(child).output, undefined);
  assert.strictEqual(loadYaml(path.join(tmp, "tagged-base.yaml")).output.tag, "base");
});

test("an empty output.tag throws", () => {
  const bad = write("bad-tag.yaml", ["meta:", "  name: X", "output:", '  tag: ""'].join("\n"));
  assert.throws(() => loadYaml(bad), /output\.tag/);
});

fs.rmSync(tmp, { recursive: true, force: true });

if (failures) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
}
console.log("\nAll loader tests passed");
