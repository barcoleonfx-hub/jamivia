// Lays out the lockups from the outlined geometry. Returns { viewBox, inner, w, h } in logo units.
const r = (n) => +n.toFixed(2);
function place(d, b, scale, cx, bottomY) {
  const tx = cx - (b.x + b.width / 2) * scale, ty = bottomY - (b.y + b.height) * scale;
  return `<path transform="matrix(${r(scale)} 0 0 ${r(scale)} ${r(tx)} ${r(ty)})" d="${d}"/>`;
}
module.exports = function compose(g, kind, o = {}) {
  const wb = g.wordB, cap = wb.height; // all caps, so the word box is cap height (+ any J descender)
  const pad = o.pad ?? 0;
  if (kind === "stacked") {
    const Hm = (o.monoH ?? 2.4) * cap, s = Hm / g.monoB.height, gap = (o.gap ?? 0.72) * cap;
    const cx = wb.x + wb.width / 2, monoBottom = wb.y - gap;
    const top = monoBottom - Hm, left = Math.min(wb.x, cx - g.monoB.width * s / 2);
    const W = Math.max(wb.width, g.monoB.width * s);
    return { viewBox: [left - pad, top - pad, W + 2 * pad, wb.y + wb.height - top + 2 * pad], inner: place(g.mono, g.monoB, s, cx, monoBottom) + `<path d="${g.word}"/>` };
  }
  if (kind === "horizontal") {
    const Hm = (o.monoH ?? 1.9) * cap, s = Hm / g.monoB.height, gap = (o.gap ?? 0.55) * cap;
    const mw = g.monoB.width * s, cx = wb.x - gap - mw / 2, bottom = wb.y + wb.height + (Hm - cap) / 2;
    const left = wb.x - gap - mw, top = bottom - Hm;
    return { viewBox: [left - pad, top - pad, wb.x + wb.width - left + 2 * pad, Hm + 2 * pad], inner: place(g.mono, g.monoB, s, cx, bottom) + `<path d="${g.word}"/>` };
  }
  if (kind === "wordmark") return { viewBox: [wb.x - pad, wb.y - pad, wb.width + 2 * pad, wb.height + 2 * pad], inner: `<path d="${g.word}"/>` };
  if (kind === "monogram") { const b = g.monoB; return { viewBox: [b.x - pad, b.y - pad, b.width + 2 * pad, b.height + 2 * pad], inner: `<path d="${g.mono}"/>` }; }
};
module.exports.svg = (c, fill, bg, width) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${c.viewBox.map(r).join(" ")}"${width ? ` width="${width}"` : ""}>${bg ? `<rect x="${r(c.viewBox[0])}" y="${r(c.viewBox[1])}" width="${r(c.viewBox[2])}" height="${r(c.viewBox[3])}" fill="${bg}"/>` : ""}<g fill="${fill}">${c.inner}</g></svg>`;
