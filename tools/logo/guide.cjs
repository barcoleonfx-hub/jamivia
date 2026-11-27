const compose = require("./compose.cjs"); const { chromium } = require("playwright"); const fs = require("fs");
const g = JSON.parse(fs.readFileSync("geometry.json")); const OUT = process.argv[2];
const b64 = (p) => fs.readFileSync(p).toString("base64");
const F = (fam, w, file) => `@font-face{font-family:${fam};font-weight:${w};src:url(data:font/woff2;base64,${b64(file)}) format("woff2")}`;
const cap = g.wordB.height;
const st = compose(g, "stacked"), hz = compose(g, "horizontal"), mo = compose(g, "monogram"), wm = compose(g, "wordmark");
// clear-space diagram: stacked with a dashed box at 1 cap-height around it
const cs = (() => { const [x, y, w, h] = st.viewBox, p = cap; return `<svg viewBox="${x - p * 1.3} ${y - p * 1.3} ${w + p * 2.6} ${h + p * 2.6}" style="width:100%;height:100%">
  <rect x="${x - p}" y="${y - p}" width="${w + 2 * p}" height="${h + 2 * p}" fill="none" stroke="#9A7843" stroke-width="${cap * 0.03}" stroke-dasharray="${cap * 0.12} ${cap * 0.1}"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(154,120,67,.08)"/>
  <g fill="#1E392C">${st.inner}</g>
  <text x="${x - p / 2}" y="${y + h / 2}" font-family="Jost" font-size="${cap * 0.42}" fill="#9A7843" text-anchor="middle" dominant-baseline="middle">A</text>
  <text x="${x + w / 2}" y="${y - p / 2}" font-family="Jost" font-size="${cap * 0.42}" fill="#9A7843" text-anchor="middle" dominant-baseline="middle">A</text></svg>`; })();
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
${F("Jost", 300, "node_modules/@fontsource/jost/files/jost-latin-300-normal.woff2")}${F("Jost", 400, "node_modules/@fontsource/jost/files/jost-latin-400-normal.woff2")}
${F("Corm", 500, "node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2")}
@page{size:297mm 210mm;margin:0}*{box-sizing:border-box}html,body{margin:0}
body{width:297mm;height:210mm;background:#F4F2EC;color:#17241D;font:300 8.5pt/1.5 Jost;padding:12mm;display:grid;grid-template-columns:1.25fr 1fr;grid-template-rows:auto minmax(0,1fr) auto;gap:6mm;overflow:hidden}
header{grid-column:1/-1;display:flex;justify-content:space-between;align-items:end;border-bottom:.3mm solid rgba(23,36,29,.15);padding-bottom:4mm}
h1{font:500 22pt/1 Corm;margin:0;letter-spacing:.01em}.k{font-size:7pt;letter-spacing:.22em;text-transform:uppercase;color:#9A7843}
.panel{border-radius:3mm;display:grid;place-items:center;position:relative;min-height:0;overflow:hidden}.panel svg{max-height:72%;max-width:80%}.panel .k{position:absolute;left:4mm;top:3.5mm}
.hero{background:#EBE8DF}.hero svg{width:66%;height:auto}
.right{display:grid;grid-template-rows:minmax(0,1fr) minmax(0,1fr);gap:6mm;min-height:0}.row2{display:grid;grid-template-columns:1fr 1fr;gap:6mm;min-height:0}
.forest{background:#1E392C}.forest .k{color:#CDB07A}.forest svg{width:78%}.stone{background:#EBE8DF}.mono svg{height:58%;width:auto}
footer{grid-column:1/-1;display:grid;grid-template-columns:1.2fr 1fr 1fr 1.25fr;gap:7mm;border-top:.3mm solid rgba(23,36,29,.15);padding-top:4mm}
footer h2{font:500 12pt/1.1 Corm;margin:0 0 1.5mm}footer p{margin:0 0 1mm}
.sw{display:flex;gap:2.5mm}.sw div{flex:1}.sw i{display:block;height:9mm;border-radius:1.5mm;border:.2mm solid rgba(0,0,0,.08);margin-bottom:1mm}.sw b{font-weight:400;display:block}
.cs{height:30mm}
</style></head><body>
<header><div><div class="k">Brand identity · Logo guide</div><h1>Jamivia</h1></div><div class="k">Version 1.0 · November 2026</div></header>
<div class="panel hero"><span class="k">Primary · stacked</span>${compose.svg(st, "#1E392C")}</div>
<div class="right">
  <div class="panel forest"><span class="k">Horizontal · reversed</span>${compose.svg(hz, "#FFFFFF")}</div>
  <div class="row2"><div class="panel stone mono"><span class="k">Monogram</span>${compose.svg(mo, "#1E392C")}</div><div class="panel forest mono"><span class="k">Monogram · reversed</span>${compose.svg(mo, "#EEEBE1")}</div></div>
</div>
<footer>
  <div><h2>Colour</h2><div class="sw">
    <div><i style="background:#1E392C"></i><b>Forest</b>#1E392C<br>RGB 30 57 44</div>
    <div><i style="background:#F4F2EC"></i><b>Stone</b>#F4F2EC<br>RGB 244 242 236</div>
    <div><i style="background:#CDB07A"></i><b>Sand</b>#CDB07A<br>Digital accent only</div></div>
    <p style="margin-top:2mm">Print: one flat colour, matte, no metallic or foil. Match Forest to a Pantone / CMYK value on the printer's proof.</p></div>
  <div><h2>Clear space</h2><div class="cs">${cs}</div><p>Keep a margin of <b>A</b>, the height of the letters, on every side.</p></div>
  <div><h2>Minimum size</h2><p>Stacked logo: 22 mm wide.<br>Horizontal logo: 30 mm wide.<br>Monogram: 7 mm tall.<br>On screen: 120 px / 24 px.</p>
    <h2 style="margin-top:3mm">Don't</h2><p>Stretch, rotate, recolour beyond the palette, add effects or shadows, or reset the wordmark in a font.</p></div>
  <div><h2>Typography</h2><p><span style="font:500 11pt Corm">Cormorant Garamond</span> · wordmark (outlined) and headings</p><p><span style="font-weight:400">Jost</span> · body text, labels, small print</p><p>Both under the SIL Open Font Licence, free for commercial use.</p>
    <h2 style="margin-top:3mm">Files</h2><p><b style="font-weight:400">SVG / PDF</b> vector, for print and the label.<br><b style="font-weight:400">PNG</b> transparent, for web and documents.<br>Forest, black and white versions of each.</p></div>
</footer></body></html>`;
(async () => { const br = await chromium.launch(); const pg = await br.newPage(); await pg.setContent(html); await pg.evaluate(() => document.fonts.ready);
  await pg.pdf({ path: OUT + "/jamivia-logo-guide.pdf", width: "297mm", height: "210mm", printBackground: true });
  await pg.setViewportSize({ width: 1123, height: 794 }); await pg.screenshot({ path: "guide.png" }); await br.close(); })();
