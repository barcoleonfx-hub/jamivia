const geo = require("./geo.cjs"), compose = require("./compose.cjs"); const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path");
const P = {"track":0.29,"leafLen":0.58,"leafW":0.22,"angle":-40,"dy":0.47,"dx":0.13,"gap":0.13,"vein":0.02,"bend":0.06};
const OUT = process.argv[2];
const COLOURS = { forest: "#1E392C", black: "#000000", white: "#FFFFFF" };
(async () => {
  const g = await geo(P);
  fs.writeFileSync(path.join(__dirname, "geometry.json"), JSON.stringify({ params: P, ...g }));
  for (const d of ["svg", "pdf", "png", "social"]) fs.mkdirSync(path.join(OUT, d), { recursive: true });
  const br = await chromium.launch(); const pg = await br.newPage();
  const cap = g.wordB.height;
  for (const kind of ["stacked", "horizontal", "wordmark", "monogram"]) {
    const c = compose(g, kind, { pad: kind === "monogram" ? cap * 0.25 : cap * 0.5 });
    for (const [cname, hex] of Object.entries(COLOURS)) {
      const name = `jamivia-${kind}-${cname}`;
      const svg = compose.svg(c, hex);
      fs.writeFileSync(path.join(OUT, "svg", name + ".svg"), `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Jamivia ${kind} logo, ${cname} (${hex}). Text converted to outlines. -->\n` + svg + "\n");
      // PDF: vector, sized for print (stacked 120mm wide, horizontal 160mm, wordmark 160mm, monogram 60mm tall)
      const [, , vw, vh] = c.viewBox;
      const mmW = kind === "monogram" ? 60 * vw / vh : { stacked: 120, horizontal: 160, wordmark: 160 }[kind];
      const mmH = mmW * vh / vw;
      await pg.setContent(`<html><head><style>@page{size:${mmW}mm ${mmH}mm;margin:0}html,body{margin:0;padding:0}svg{display:block;width:${mmW}mm;height:${mmH}mm}</style></head><body>${svg}</body></html>`);
      await pg.pdf({ path: path.join(OUT, "pdf", name + ".pdf"), width: `${mmW}mm`, height: `${mmH}mm`, printBackground: true, pageRanges: "1" });
      // PNG: transparent, 3000px on the long side
      const long = 3000, pw = vw >= vh ? long : Math.round(long * vw / vh), ph = vw >= vh ? Math.round(long * vh / vw) : long;
      await pg.setViewportSize({ width: pw, height: ph });
      await pg.setContent(`<html><body style="margin:0;background:transparent">${compose.svg(c, hex).replace("<svg ", `<svg width="${pw}" height="${ph}" style="display:block" `)}</body></html>`);
      await pg.screenshot({ path: path.join(OUT, "png", name + ".png"), omitBackground: true, clip: { x: 0, y: 0, width: pw, height: ph } });
    }
  }
  // social avatars: monogram centred on a square, two colourways
  const m = compose(g, "monogram");
  for (const [name, fg, bg] of [["forest", "#EEEBE1", "#1E392C"], ["stone", "#1E392C", "#F4F2EC"]]) {
    const [x, y, w, h] = m.viewBox, S = h / 0.56, cx = x + w / 2, cy = y + h / 2;
    const sq = { viewBox: [cx - S / 2, cy - S / 2, S, S], inner: m.inner };
    await pg.setViewportSize({ width: 1080, height: 1080 });
    await pg.setContent(`<body style="margin:0">${compose.svg(sq, fg, bg, 1080)}</body>`);
    await pg.screenshot({ path: path.join(OUT, "social", `jamivia-avatar-${name}.png`), clip: { x: 0, y: 0, width: 1080, height: 1080 } });
  }
  await br.close();
})();
