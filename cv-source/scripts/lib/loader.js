/**
 * cv.yaml loader: parse -> validate -> resolve(lang, version).
 *
 * The YAML holds every human string as a localized leaf `{ en, fr }` and every
 * selectable list item as `{ in: [short, long], ... }`. An item may also carry
 * `visible: false` to keep its content in the source while excluding it from
 * every output. `resolve` walks the tree once, collapsing each leaf to the
 * chosen language and dropping hidden/excluded items, returning a plain
 * view-model the templates consume.
 */

const fs = require("fs");
const yaml = require("js-yaml");

const LANGS = ["en", "fr"];
const VERSIONS = ["short", "long"];

function loadYaml(filePath) {
  return yaml.load(fs.readFileSync(filePath, "utf8"));
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
