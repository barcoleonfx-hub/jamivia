// Builds the Jamivia monogram and wordmark as outlined vector paths (opentype.js + paper.js in headless Chromium).
const { chromium } = require("playwright");
const fs = require("fs");
module.exports = async function geo(P = {}) {
  const br = await chromium.launch(); const pg = await br.newPage();
  await pg.setContent("<canvas id=c width=10 height=10></canvas>");
  await pg.addScriptTag({ path: require.resolve("opentype.js/dist/opentype.min.js") });
  await pg.addScriptTag({ path: require.resolve("paper/dist/paper-core.min.js") });
  const f = (w) => fs.readFileSync(`node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-${w}-normal.woff`).toString("base64");
  const out = await pg.evaluate(({ fonts, P }) => {
    const ab = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
    const F = { word: opentype.parse(ab(fonts[P.wordWeight || 500])), mono: opentype.parse(ab(fonts[P.monoWeight || 500])) };
    paper.setup(document.getElementById("c"));
    const toPaper = (d) => new paper.CompoundPath(d);
    // ---- wordmark ----
    const size = 100, word = "JAMIVIA", track = P.track ?? 0.36, adj = P.adj || {};
    let x = 0; const parts = [];
    for (let i = 0; i < word.length; i++) {
      const g = F.word.charToGlyph(word[i]);
      parts.push(F.word.getPath(word[i], x, 0, size).toPathData(4));
      if (i < word.length - 1) {
        const pair = word[i] + word[i + 1];
        x += g.advanceWidth * size / F.word.unitsPerEm + F.word.getKerningValue(g, F.word.charToGlyph(word[i + 1])) * size / F.word.unitsPerEm + track * size + (adj[pair] || 0) * size;
      }
    }
    const wm = toPaper(parts.join(" "));
    // ---- monogram: J + leaf ----
    const J = toPaper(F.mono.getPath("J", 0, 0, P.jSize || 100).toPathData(4));
    const jb = J.bounds;
    const L = (P.leafLen ?? 0.62) * jb.height, w = (P.leafW ?? 0.15) * L;
    const leaf = new paper.Path({ closed: true, segments: [
      new paper.Segment(new paper.Point(0, 0), new paper.Point(L * 0.30, w * 0.80), new paper.Point(L * 0.28, -w * 1.15)),
      new paper.Segment(new paper.Point(L, -L * (P.bend ?? 0.06)), new paper.Point(-L * 0.42, -w * 0.70), new paper.Point(-L * 0.40, w * 0.62)),
    ] });
    // midrib: a tapered lens slightly above the leaf's centre line
    const t = (P.vein ?? 0.016) * L;
    const a = new paper.Point(L * 0.10, -w * 0.02), b = new paper.Point(L * 0.86, -L * (P.bend ?? 0.06) * 0.9 - w * 0.03);
    const vein = new paper.Path({ closed: true, segments: [
      new paper.Segment(a, null, new paper.Point(L * 0.3, -w * 0.32 - t)),
      new paper.Segment(b, new paper.Point(-L * 0.3, -w * 0.08 - t), new paper.Point(-L * 0.3, -w * 0.08 + t)),
    ] });
    vein.segments[0].handleIn = new paper.Point(L * 0.3, -w * 0.32 + t);
    const g = new paper.Group([leaf, vein]);
    g.rotate(P.angle ?? -40, new paper.Point(0, 0));
    // place: base left of the stem, crossing it in the upper-middle
    const stemX = jb.left + jb.width * (P.stemFrac ?? 0.62);
    g.position = new paper.Point(stemX + (P.dx ?? 0.18) * jb.width * 2, jb.top + jb.height * (P.dy ?? 0.42));
    const gap = leaf.clone(); gap.scale(1 + (P.gap ?? 0.09), leaf.bounds.center);
    const leafCut = leaf.subtract(vein);
    const mono = J.subtract(gap).unite(leafCut);
    const pathData = (p) => p.pathData;
    const bx = (r) => ({ x: r.x, y: r.y, width: r.width, height: r.height });
    return { word: pathData(wm), wordB: bx(wm.bounds), mono: pathData(mono), monoB: bx(mono.bounds), jB: bx(jb) };
  }, { fonts: { 400: f(400), 500: f(500) }, P });
  await br.close();
  return out;
};
