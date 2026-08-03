/**
 * Stylesheets for the two CV layouts.
 *   longCss  - detailed multi-page layout (ports the previous convert-cv.js CSS)
 *   shortCss - dense, ATS-safe one-page layout (single column, boxed labels, mono tech)
 */

const longCss = /* css */ `
  @page { size: A4; margin: 16mm 18mm 18mm 18mm; }
  * { box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji", sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
    color: #1f2328;
    background: #fff;
    margin: 0;
  }

  h1 {
    font-size: 26pt;
    margin: 0 0 2pt 0;
    color: #0d1117;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .subtitle {
    font-size: 12pt;
    margin: 0 0 6pt 0;
    color: #57606a;
  }
  .subtitle strong { font-weight: 600; color: #0969da; }

  .contact { font-size: 9.5pt; color: #57606a; line-height: 1.7; margin: 0 0 4pt 0; }

  h2 {
    font-size: 12.5pt;
    margin: 16pt 0 6pt 0;
    color: #0969da;
    border-bottom: 1pt solid #d0d7de;
    padding-bottom: 3pt;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    page-break-after: avoid;
  }

  h3 {
    font-size: 11.5pt;
    margin: 12pt 0 2pt 0;
    color: #0d1117;
    font-weight: 700;
    page-break-after: avoid;
  }

  h4 {
    font-size: 10.5pt;
    margin: 7pt 0 2pt 0;
    color: #0d1117;
    font-weight: 600;
    page-break-after: avoid;
  }

  p { margin: 3pt 0; }
  .list-label { margin: 5pt 0 0 0; font-size: 10pt; }
  .dates { color: #57606a; font-size: 10pt; margin: 0 0 2pt 0; }
  .client { color: #57606a; font-style: italic; margin: 0 0 3pt 0; }
  .tech { margin: 4pt 0 0 0; font-size: 10pt; }
  .tech em { color: #57606a; }
  .entry { page-break-inside: avoid; }

  hr { border: none; border-top: 1pt solid #eaeef2; margin: 8pt 0; }

  ul { margin: 3pt 0 8pt 0; padding-left: 16pt; }
  li { margin: 1.5pt 0; }

  strong { color: #0d1117; font-weight: 600; }
  em { font-style: italic; color: #57606a; }

  a { color: #0969da; text-decoration: none; }

  .skill-row { margin: 2pt 0; font-size: 9.5pt; }

  code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    background: #f6f8fa;
    padding: 1pt 4pt;
    border-radius: 3pt;
    font-size: 9.5pt;
  }

  h2, h3, h4 { page-break-after: avoid; }
`;

const shortCss = /* css */ `
  @page { size: A4; margin: 7mm 9mm; }
  * { box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji", sans-serif;
    font-size: 8.1pt;
    line-height: 1.18;
    color: #1a1a1a;
    background: #fff;
    margin: 0;
  }

  /* Header (single column) */
  .head { margin-bottom: 3pt; }
  .head h1 {
    font-size: 19pt; line-height: 1.0; margin: 0;
    font-weight: 800; letter-spacing: -0.01em; text-transform: uppercase; color: #000;
  }
  .head .role { margin: 2pt 0 0 0; font-size: 9.5pt; font-weight: 600; color: #333; }
  .head-contact { font-size: 7.6pt; color: #333; line-height: 1.4; margin-top: 1.5pt; }
  .head-contact a { color: #333; text-decoration: none; }

  /* Professional summary */
  .summary { font-size: 7.9pt; line-height: 1.25; }

  /* Section label: white text on solid black box */
  .slabel {
    display: inline-block; background: #000; color: #fff;
    font-size: 8pt; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
    padding: 1.5pt 6pt; margin: 2pt 0 1.5pt 0;
  }
  section { page-break-inside: avoid; }

  /* Experience / project entries */
  .entry { margin-bottom: 2pt; page-break-inside: avoid; }
  .entry-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8pt; }
  .entry-role { font-weight: 700; color: #000; }
  .entry-org { font-weight: 700; text-transform: uppercase; font-size: 7.6pt; color: #000; white-space: nowrap; }
  .entry-meta { color: #555; font-size: 7.4pt; margin: 0 0 1pt 0; }
  .sub-label { font-weight: 700; font-size: 7.6pt; color: #000; margin: 1.5pt 0 0 0; }
  .entry ul { margin: 0.5pt 0 0 0; padding-left: 12pt; }
  .entry li { margin: 0.3pt 0; }
  .tech { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
          font-size: 6.9pt; color: #444; margin-top: 1.5pt; }
  .tech b { font-family: inherit; }

  /* Skills (single column, one line per group) */
  .skill { font-size: 7.7pt; margin: 0.3pt 0; }
  .skill b { color: #000; }

  .lang-row { font-size: 7.7pt; margin: 0.3pt 0; }
  .lang-row b { color: #000; }

  strong, b { color: #000; }
  a { color: #1a1a1a; }
`;

module.exports = { longCss, shortCss };
