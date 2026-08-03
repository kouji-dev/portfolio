/**
 * CV generator: main.yaml -> localized, versioned PDF (and optional DOCX).
 *
 * Output lands in the portfolio's published `cv/` folder (../cv) using the
 * kebab-case names index.html links to, e.g. `najih-driss-cv-en-short.pdf`.
 *
 * Usage (from cv-source/):
 *   node scripts/convert-cv.js                     # 4 PDFs (en/fr x short/long)
 *   node scripts/convert-cv.js --docx              # + DOCX for each
 *   node scripts/convert-cv.js --lang=en --version=short
 *   node scripts/convert-cv.js --source=frontend.yaml --tag=frontend   # alternate source, tagged output filenames
 *   node scripts/convert-cv.js --out=./build       # write elsewhere instead of ../cv
 *   npm run convert  /  npm run convert:docx
 *
 * Or via the PowerShell wrapper (auto-installs deps on first run):
 *   ./scripts/convert-cv.ps1
 */

const path = require("path");
const fs = require("fs");
const puppeteer = require("puppeteer");
const HTMLtoDOCX = require("html-to-docx");

const { loadYaml, validate, resolve } = require("./lib/loader");
const { renderLong } = require("./lib/templates/long");
const { renderShort } = require("./lib/templates/short");

const ROOT = path.resolve(__dirname, "..");

// Published assets folder of the portfolio site. index.html links straight into
// it, so the generator writes the deploy-ready filenames directly — no rename step.
const DEFAULT_OUT = path.resolve(ROOT, "..", "assets");

// "NAJIH Driss" -> "najih-driss"; keeps output URL-safe and stable.
function slug(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseArgs(argv) {
  const opts = {
    docx: false,
    langs: ["en", "fr"],
    versions: ["short", "long"],
    source: "main.yaml",
    tag: "",
    out: DEFAULT_OUT,
  };
  const list = (s) =>
    s
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
  for (const a of argv) {
    if (a === "--docx") opts.docx = true;
    else if (a.startsWith("--lang=")) opts.langs = list(a.slice("--lang=".length));
    else if (a.startsWith("--version=")) opts.versions = list(a.slice("--version=".length));
    else if (a.startsWith("--source=")) opts.source = a.slice("--source=".length);
    else if (a.startsWith("--tag=")) opts.tag = a.slice("--tag=".length);
    else if (a.startsWith("--out=")) {
      const v = a.slice("--out=".length);
      opts.out = path.isAbsolute(v) ? v : path.resolve(ROOT, v);
    }
  }
  return opts;
}

async function toPdf(browser, html, outputPath) {
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await page.close();
  }
}

async function toDocx(html, outputPath) {
  const buffer = await HTMLtoDOCX(html, null, {
    table: { row: { cantSplit: true } },
    footer: false,
    pageNumber: false,
    font: "Segoe UI",
    fontSize: 21, // 10.5pt -> half-points
    margins: { top: 907, right: 1020, bottom: 1020, left: 1020 },
    orientation: "portrait",
  });
  fs.writeFileSync(outputPath, buffer);
}

(async () => {
  console.log("CV generator (YAML -> PDF" + ")");

  const opts = parseArgs(process.argv.slice(2));
  const source = path.isAbsolute(opts.source) ? opts.source : path.join(ROOT, opts.source);

  if (!fs.existsSync(source)) {
    console.error(`Source not found: ${source}`);
    process.exitCode = 1;
    return;
  }

  const data = loadYaml(source);
  validate(data);

  const name = data.meta.name;

  fs.mkdirSync(opts.out, { recursive: true });
  console.log(`  out: ${opts.out}`);

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    for (const lang of opts.langs) {
      for (const version of opts.versions) {
        const model = resolve(data, lang, version);
        const html = version === "short" ? renderShort(model, lang) : renderLong(model, lang);
        // e.g. najih-driss-cv-en-short.pdf / najih-driss-cv-frontend-en-short.pdf
        const base = [slug(name), "cv", opts.tag && slug(opts.tag), lang, version]
          .filter(Boolean)
          .join("-");

        process.stdout.write(`  -> ${base}.pdf ... `);
        try {
          await toPdf(browser, html, path.join(opts.out, `${base}.pdf`));
          console.log("done");
        } catch (err) {
          console.log("FAILED");
          console.error(err);
          process.exitCode = 1;
        }

        if (opts.docx) {
          if (version === "short") {
            console.warn(
              "     [warn] short DOCX linearizes the compact layout (Word has no CSS grid/flex)"
            );
          }
          process.stdout.write(`  -> ${base}.docx ... `);
          try {
            await toDocx(html, path.join(opts.out, `${base}.docx`));
            console.log("done");
          } catch (err) {
            console.log("FAILED");
            console.error(err);
            process.exitCode = 1;
          }
        }
      }
    }
  } finally {
    await browser.close();
  }
})();
