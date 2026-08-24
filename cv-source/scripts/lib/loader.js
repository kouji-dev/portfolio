/**
 * cv.yaml loader: parse -> inherit -> validate -> resolve(lang, version).
 *
 * The YAML holds every human string as a localized leaf `{ en, fr }` and every
 * selectable list item as `{ in: [short, long], ... }`. An item may also carry
 * `visible: false` to keep its content in the source while excluding it from
 * every output. `resolve` walks the tree once, collapsing each leaf to the
 * chosen language and dropping hidden/excluded items, returning a plain
 * view-model the templates consume.
 *
 * A variant file can inherit from another via three top-level keys:
 *   extends: main.yaml        # path relative to the variant file
 *   output: { tag: np }       # names this variant's files (…-cv-np-en-short.pdf)
 *   overrides:                # surgical patches applied after the merge
 *     - path: experiences[company=Preesm Group].visible
 *       value: false
 * The variant's other top-level content is deep-merged over the base: mappings
 * merge key by key, while arrays and scalars replace the base value wholesale.
 * Override paths address mappings with dots, and array items with `[n]` or a
 * `[field=value]` selector that must match exactly one item.
 *
 * `output` is deliberately NOT inherited — a variant that picked up its base's
 * filenames would silently overwrite the base's own build. Only the file named
 * on the command line contributes one, and `--tag=` still wins over it.
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const LANGS = ["en", "fr"];
const VERSIONS = ["short", "long"];

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// Mappings merge key by key; arrays and scalars in the child win wholesale.
function merge(base, child) {
  if (isPlainObject(base) && isPlainObject(child)) {
    const out = { ...base };
    for (const [k, v] of Object.entries(child)) {
      out[k] = k in base ? merge(base[k], v) : v;
    }
    return out;
  }
  return child;
}

// "experiences[company=Preesm Group].visible" ->
//   [{ key: "experiences" }, { field: "company", value: "Preesm Group" }, { key: "visible" }]
function parseOverridePath(str) {
  const s = String(str);
  const segs = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === ".") {
      i++;
      continue;
    }
    if (s[i] === "[") {
      const end = s.indexOf("]", i);
      if (end === -1) throw new Error(`Unterminated "[" in override path "${s}"`);
      const inner = s.slice(i + 1, end);
      const eq = inner.indexOf("=");
      if (eq === -1) {
        if (!/^\d+$/.test(inner.trim())) {
          throw new Error(`Bad selector "[${inner}]" in override path "${s}" (use [n] or [field=value])`);
        }
        segs.push({ index: Number(inner.trim()) });
      } else {
        segs.push({ field: inner.slice(0, eq).trim(), value: inner.slice(eq + 1).trim() });
      }
      i = end + 1;
    } else {
      let j = i;
      while (j < s.length && s[j] !== "." && s[j] !== "[") j++;
      segs.push({ key: s.slice(i, j) });
      i = j;
    }
  }
  if (!segs.length) throw new Error(`Empty override path "${s}"`);
  return segs;
}

// Index of the array item a `[n]` / `[field=value]` segment addresses.
function segmentIndex(node, seg, pathStr) {
  if (!Array.isArray(node)) {
    throw new Error(`Override path "${pathStr}" uses an array selector on a non-array`);
  }
  if (seg.index !== undefined) {
    if (seg.index >= node.length) {
      throw new Error(`Override path "${pathStr}": index [${seg.index}] is out of range`);
    }
    return seg.index;
  }
  const matches = node
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => isPlainObject(item) && String(item[seg.field]) === seg.value);
  if (matches.length !== 1) {
    throw new Error(
      `Override path "${pathStr}": [${seg.field}=${seg.value}] matches ${matches.length} items (need exactly 1)`
    );
  }
  return matches[0].i;
}

function stepInto(node, seg, pathStr) {
  if (seg.key !== undefined) {
    if (!isPlainObject(node)) {
      throw new Error(`Override path "${pathStr}" uses key "${seg.key}" on a non-mapping`);
    }
    return node[seg.key];
  }
  return node[segmentIndex(node, seg, pathStr)];
}

function applyOverride(doc, ov, i, file) {
  if (!isPlainObject(ov) || typeof ov.path !== "string" || !("value" in ov)) {
    throw new Error(`overrides[${i}] must be { path, value } (in ${file})`);
  }
  const segs = parseOverridePath(ov.path);
  let node = doc;
  for (let s = 0; s < segs.length - 1; s++) {
    node = stepInto(node, segs[s], ov.path);
    if (node === undefined || node === null) {
      throw new Error(`Override path "${ov.path}" resolves to nothing (in ${file})`);
    }
  }
  const last = segs[segs.length - 1];
  if (last.key !== undefined) {
    if (!isPlainObject(node)) {
      throw new Error(`Override path "${ov.path}" sets key "${last.key}" on a non-mapping (in ${file})`);
    }
    node[last.key] = ov.value;
  } else {
    node[segmentIndex(node, last, ov.path)] = ov.value;
  }
}

function loadYamlFile(filePath, seen) {
  const abs = path.resolve(filePath);
  if (seen.has(abs)) {
    throw new Error(`Circular "extends" chain: ${[...seen, abs].join(" -> ")}`);
  }
  seen.add(abs);

  const doc = yaml.load(fs.readFileSync(abs, "utf8")) || {};
  // `output` is dropped here along with the inheritance keys; loadYaml re-attaches
  // the entry file's own, so it never travels down an `extends` chain.
  const { extends: parent, overrides, output, ...rest } = doc;

  let out = rest;
  if (parent !== undefined) {
    if (typeof parent !== "string") throw new Error(`"extends" must be a file path (in ${abs})`);
    const parentPath = path.resolve(path.dirname(abs), parent);
    if (!fs.existsSync(parentPath)) {
      throw new Error(`"extends" target not found: ${parent} (from ${abs})`);
    }
    out = merge(loadYamlFile(parentPath, seen), rest);
  }

  if (overrides !== undefined) {
    if (!Array.isArray(overrides)) throw new Error(`"overrides" must be a list (in ${abs})`);
    // Clone so patches never mutate arrays still shared with the base document.
    out = structuredClone(out);
    overrides.forEach((ov, i) => applyOverride(out, ov, i, abs));
  }
  return out;
}

function loadYaml(filePath) {
  const abs = path.resolve(filePath);
  const out = loadYamlFile(abs, new Set());
  const { output } = yaml.load(fs.readFileSync(abs, "utf8")) || {};
  if (output !== undefined) {
    if (!isPlainObject(output)) throw new Error(`"output" must be a mapping (in ${abs})`);
    if (output.tag !== undefined && (typeof output.tag !== "string" || !output.tag.trim())) {
      throw new Error(`"output.tag" must be a non-empty string (in ${abs})`);
    }
    out.output = output;
  }
  return out;
}

// A localized leaf is a plain object whose keys are only "en" / "fr".
function isLocalizedLeaf(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return false;
  const keys = Object.keys(node);
  return keys.length > 0 && keys.every((k) => k === "en" || k === "fr");
}

// An item is kept for a version if it is not hidden (`visible: false`) and
// either has no `in` tag or the tag lists the version.
function includeItem(item, version) {
  if (item && typeof item === "object") {
    if (item.visible === false) return false;
    if (Array.isArray(item.in)) return item.in.includes(version);
  }
  return true;
}

/**
 * Deep-clone + localize + version-filter. Strips `in`/`visible` metadata so
 * templates stay dumb. Returns a plain object mirroring the YAML shape.
 */
function resolve(data, lang, version) {
  function walk(node) {
    if (Array.isArray(node)) {
      return node.filter((item) => includeItem(item, version)).map(walk);
    }
    if (isLocalizedLeaf(node)) {
      return node[lang];
    }
    if (node && typeof node === "object") {
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        if (k === "in" || k === "visible") continue;
        out[k] = walk(v);
      }
      return out;
    }
    return node;
  }
  const model = walk(data);
  model.lang = lang;
  model.version = version;
  return model;
}

/**
 * Structural validation. Throws on errors (missing required keys, a localized
 * leaf missing a language, unknown version tags). Warns (non-fatal) when an
 * item is tagged `short` but not `long` — short must be a subset of long.
 */
function validate(data) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== "object") {
    throw new Error("cv.yaml root must be a mapping");
  }
  if (!data.meta || !data.meta.name) errors.push("meta.name is required");
  if (!data.meta || !data.meta.contact || !data.meta.contact.email) {
    errors.push("meta.contact.email is required");
  }

  function walk(node, pathStr) {
    if (Array.isArray(node)) {
      node.forEach((item, i) => {
        const itemPath = `${pathStr}[${i}]`;
        if (item && typeof item === "object" && "visible" in item && typeof item.visible !== "boolean") {
          errors.push(`${itemPath}.visible must be a boolean`);
        }
        if (item && typeof item === "object" && Array.isArray(item.in)) {
          item.in.forEach((v) => {
            if (!VERSIONS.includes(v)) {
              errors.push(`${itemPath}.in has unknown version "${v}"`);
            }
          });
          if (item.in.includes("short") && !item.in.includes("long")) {
            warnings.push(
              `${itemPath} is tagged 'short' but not 'long' (short must be a subset of long)`
            );
          }
        }
        walk(item, itemPath);
      });
      return;
    }
    if (isLocalizedLeaf(node)) {
      LANGS.forEach((l) => {
        if (typeof node[l] !== "string" || node[l].trim() === "") {
          errors.push(`${pathStr} is missing a non-empty "${l}" value`);
        }
      });
      return;
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        if (k === "in") continue;
        walk(v, pathStr ? `${pathStr}.${k}` : k);
      }
    }
  }
  walk(data, "");

  warnings.forEach((w) => console.warn(`  [warn] ${w}`));
  if (errors.length) {
    throw new Error("Invalid cv.yaml:\n  - " + errors.join("\n  - "));
  }
}

module.exports = { loadYaml, validate, resolve, LANGS, VERSIONS };
