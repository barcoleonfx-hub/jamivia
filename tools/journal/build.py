"""Builds the Jamivia journal articles into /journal. Run: python3 tools/journal/build.py
Copy rules: educational only. No claim that Jamivia (or any ingredient in it) does anything to the body,
apart from the authorised zinc wording. No disease treatment language."""
import pathlib, html
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "journal"

ARTICLES = [
 dict(slug="gut-lining", tag="The gut", mins=4, title="The gut lining, explained in five minutes",
  dek="A single layer of cells, folded into millions of tiny fingers, sits between everything you eat and the rest of your body.",
  img="journal-villi", alt="A macro landscape of intestinal villi lit from behind in warm gold light",
  body="""
<p class="lede">Most of us picture the gut as a tube. Up close, its inner surface looks more like a landscape: a soft, folded floor covered in millions of tiny projections called villi, each one lined with cells that are themselves covered in even smaller folds.</p>
<h2>One cell thick</h2>
<p>The lining of the small intestine is a single layer of cells, the epithelium. It has two jobs that pull in opposite directions. It has to let nutrients through, and it has to keep almost everything else out.</p>
<p>The cells manage this together. Where neighbouring cells meet, protein structures called tight junctions seal the gaps between them, deciding what can pass along the edges of the cells rather than through them.</p>
<blockquote>Folded into villi and microvilli, the small intestine's inner surface is estimated at around 30 square metres, roughly the floor of a small flat.</blockquote>
<h2>Built to be replaced</h2>
<p>This is one of the fastest-renewing tissues in the body. New cells are made at the base of each villus and travel up towards its tip over a few days, where they are shed and replaced. The whole surface is rebuilt continuously, every week of your life.</p>
<h2>The layer on top</h2>
<p>Above the cells sits a layer of mucus. In the large intestine it has two parts: a dense inner layer that is largely kept clear of bacteria, and a looser outer layer where many of the gut's microbes live. Below the lining, the gut holds a large share of the body's immune tissue.</p>
<h2>Why we think about it</h2>
<p>We named the first pillar on our label <em>Barrier</em> because the lining is where digestion begins, not because a supplement changes it. Everything on the Jamivia label is a nutrient you would also find in food; the full list, with every dose, is on our home page.</p>
"""),
 dict(slug="what-is-phgg", tag="Ingredients", mins=3, title="What is PHGG, and why does it dissolve almost clear?",
  dek="Our largest ingredient starts life as a bean grown in India and Pakistan. Here is what happens to it on the way to your glass.",
  img="jamivia-open-wide", alt="An open tub of Jamivia powder beside its lid and a level bamboo scoop",
  body="""
<p class="lede">Partially hydrolysed guar gum, PHGG for short, makes up 5 g of every 11.6 g scoop of Jamivia. It is a soluble fibre, and it is the reason the powder is almost invisible in water.</p>
<h2>From a bean</h2>
<p>Guar gum comes from the seeds of the cluster bean, <em>Cyamopsis tetragonoloba</em>, a drought-hardy crop grown mainly in India and Pakistan. Inside the seed is a long chain of sugars called a galactomannan.</p>
<p>In its natural form those chains are very long, which is why ordinary guar gum is used to thicken sauces and ice cream: a spoonful turns a glass of water to gel.</p>
<blockquote>Gently shortening the chains turns a thickener into a fibre you can stir into water and barely notice.</blockquote>
<h2>Shortened, not changed</h2>
<p>To make PHGG, the gum is treated with an enzyme that cuts those long chains into shorter pieces. It is still the same fibre, but it no longer thickens. It dissolves almost clear, has very little taste and stays thin in the glass.</p>
<p>The PHGG in Jamivia is 85% fibre, so a scoop provides about 4.2 g of it.</p>
<h2>In context</h2>
<p>UK guidance is that adults aim for 30 g of fibre a day, from foods such as wholegrains, beans, fruit and vegetables. Most adults eat less than that. A scoop of Jamivia is not a replacement for a varied diet; it is one small, measured part of a day.</p>
"""),
 dict(slug="no-probiotics", tag="Philosophy", mins=3, title="Why there are no probiotics in Jamivia",
  dek="Probiotics add bacteria. Antimicrobials remove them. We decided to make something that does neither.",
  img="jamivia-stone", alt="A white Jamivia tub on a stone plinth in soft daylight",
  body="""
<p class="lede">The gut-health shelf is crowded. Most products set out to change something: to add bacteria, to remove them, or to push the body through a reset. When Dr Mohammed Jameel designed Jamivia, he wanted to start somewhere quieter.</p>
<h2>Six nutrients, nothing else</h2>
<p>Jamivia is six ingredients: L-glutamine, partially hydrolysed guar gum, glycine, taurine, L-carnosine and zinc. There are no live cultures, no antimicrobial herbs, no stimulants, no sweeteners, no flavourings and no fillers. The manufacturing specification lists the excipients as none.</p>
<blockquote>We would rather you knew exactly what is in the tub than wonder what a "proprietary blend" is hiding.</blockquote>
<h2>Every dose on the label</h2>
<p>Many supplements group their ingredients into a blend and print one total weight, so you cannot tell how much of each you are getting. Every amount in Jamivia is printed separately, from 4.99 g of glutamine down to 59 mg of carnosine.</p>
<h2>Made to be taken every day</h2>
<p>Jamivia isn't a protocol or a 14-day plan. It is one scoop a day in water, starting with half a scoop for the first week. Zinc contributes to the normal function of the immune system, and each scoop gives 16 mg, 160% of the nutrient reference value.</p>
<h2>Made where we can see it</h2>
<p>Every tub is blended, packed and sealed in England, and every batch carries a number that traces it back through manufacture. Probiotics and other products have their place. Jamivia was simply built to be the plain, transparent foundation underneath whatever else you choose.</p>
"""),
]

CSS = """
:root{--stone:#E6E5DE;--paper:#F1F0EA;--ink:#17241D;--muted:#56635B;--forest:#1E392C;--deep:#11231A;--on:#EEEBE1;--on-muted:#AEB8AE;--gold:#9A7843;--gold-soft:#CDB07A;--line:rgba(23,36,29,.13);
  --display:"Cormorant Garamond",Cormorant,Garamond,"Times New Roman",serif;--body:"Jost",Futura,"Avenir Next","Segoe UI",system-ui,sans-serif;--ease:cubic-bezier(.23,1,.32,1)}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--stone);color:var(--ink);font:300 1.0625rem/1.75 var(--body);-webkit-font-smoothing:antialiased}
a{color:inherit}
.bar{position:sticky;top:0;z-index:10;background:color-mix(in srgb,var(--deep) 88%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:var(--on)}
.bar .in{max-width:1180px;margin:auto;padding:0 max(16px,4vw);height:64px;display:flex;align-items:center;justify-content:space-between;gap:1rem}
.wm{font-family:var(--display);font-weight:500;font-size:1.3rem;letter-spacing:.34em;text-decoration:none}
.back{font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;color:var(--on-muted);transition:color .25s}
.back:hover{color:var(--on)}
.hero{background:var(--deep);color:var(--on)}
.hero .in{max-width:1180px;margin:auto;padding:clamp(3rem,7vw,5.5rem) max(16px,4vw) clamp(2rem,4vw,3rem)}
.tag{font-size:.72rem;letter-spacing:.24em;text-transform:uppercase;color:var(--gold-soft)}
h1{font-family:var(--display);font-weight:300;font-size:clamp(2.6rem,6vw,5.2rem);line-height:1.02;letter-spacing:-.015em;margin:1rem 0 1.2rem;max-width:15em;text-wrap:balance}
.dek{color:var(--on-muted);font-size:1.15rem;max-width:36em;margin:0}
.meta{margin-top:1.6rem;font-size:.75rem;letter-spacing:.18em;text-transform:uppercase;color:var(--on-muted)}
.cover{background:linear-gradient(var(--deep) 50%,var(--stone) 50%)}
.cover .in{max-width:1180px;margin:auto;padding:0 max(16px,4vw)}
.cover img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:22px;animation:rise 1s var(--ease) both}
@keyframes rise{from{opacity:0;transform:translateY(14px) scale(.99)}to{opacity:1;transform:none}}
article{max-width:680px;margin:auto;padding:clamp(3rem,6vw,4.5rem) max(16px,4vw) 2rem}
article p{margin:0 0 1.35rem;color:#26352C}
article .lede{font-family:var(--display);font-size:clamp(1.45rem,2.4vw,1.8rem);line-height:1.35;color:var(--ink)}
article h2{font-family:var(--display);font-weight:400;font-size:clamp(1.8rem,3vw,2.3rem);line-height:1.1;margin:2.6rem 0 .9rem}
article blockquote{margin:2.4rem 0;padding:0 0 0 1.4rem;border-left:1px solid var(--gold);font-family:var(--display);font-style:italic;font-size:clamp(1.5rem,2.6vw,2rem);line-height:1.25;color:var(--forest)}
article em{font-style:italic}
.note{max-width:680px;margin:0 auto;padding:0 max(16px,4vw) 3rem;font-size:.82rem;color:var(--muted)}
.more{background:var(--paper);border-top:1px solid var(--line)}
.more .in{max-width:1180px;margin:auto;padding:clamp(3rem,6vw,4.5rem) max(16px,4vw)}
.more h2{font-family:var(--display);font-weight:400;font-size:clamp(2rem,4vw,3rem);margin:0 0 1.8rem}
.cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.card{display:grid;gap:.9rem;text-decoration:none}
.card .ph{border-radius:18px;overflow:hidden;aspect-ratio:3/2;background:var(--forest)}
.card img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--ease)}
.card:hover img{transform:scale(1.03)}
.card span{font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}
.card b{font-family:var(--display);font-weight:400;font-size:1.6rem;line-height:1.15}
.cta{display:inline-flex;align-items:center;gap:.7rem;margin-top:2.2rem;background:var(--forest);color:var(--on);text-decoration:none;font-size:.78rem;letter-spacing:.2em;text-transform:uppercase;padding:1rem 1.6rem;border-radius:999px;transition:transform .16s var(--ease),background .3s}
.cta:hover{background:var(--deep)}.cta:active{transform:scale(.97)}
footer{background:var(--deep);color:var(--on-muted);font-size:.8rem;line-height:1.6}
footer .in{max-width:1180px;margin:auto;padding:2rem max(16px,4vw)}
@media (max-width:640px){.cards{grid-template-columns:1fr}}
@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
"""

def page(a, others):
    cards = "".join(f'''<a class="card" href="{o["slug"]}.html"><div class="ph"><img src="../img/{o["img"]}-1200.webp" alt="" loading="lazy" width="1200" height="800"></div><span>{o["tag"]} · {o["mins"]} min read</span><b>{html.escape(o["title"])}</b></a>''' for o in others)
    big = "2400" if a["img"] != "jamivia-open-wide" else "1600"
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{html.escape(a["title"])} · Jamivia Journal</title>
<meta name="description" content="{html.escape(a["dek"])}">
<meta property="og:title" content="{html.escape(a["title"])}"><meta property="og:image" content="../img/{a["img"]}-1200.webp">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@300;400;500&display=swap">
<style>{CSS}</style></head><body>
<header class="bar"><div class="in"><a class="wm" href="../index.html">JAMIVIA</a><a class="back" href="../index.html#journal">← The journal</a></div></header>
<section class="hero"><div class="in"><span class="tag">{a["tag"]}</span><h1>{html.escape(a["title"])}</h1><p class="dek">{html.escape(a["dek"])}</p><p class="meta">{a["mins"]} min read · Jamivia Journal</p></div></section>
<div class="cover"><div class="in"><img src="../img/{a["img"]}-{big}.webp" srcset="../img/{a["img"]}-1200.webp 1200w, ../img/{a["img"]}-{big}.webp {big}w" sizes="(max-width: 1180px) 100vw, 1180px" alt="{html.escape(a["alt"])}" width="{big}" height="{int(int(big)*9/16)}"></div></div>
<article>{a["body"]}<a class="cta" href="../index.html#inside">See the six ingredients →</a></article>
<p class="note">This article is for general information. It is not medical advice. Food supplements should not be used as a substitute for a varied and balanced diet and a healthy lifestyle.</p>
<section class="more"><div class="in"><h2>Keep reading</h2><div class="cards">{cards}</div></div></section>
<footer><div class="in">© 2026 Jamivia · Daily Gut Formula · Made in Britain</div></footer>
</body></html>'''

def main():
    OUT.mkdir(exist_ok=True)
    for a in ARTICLES:
        (OUT / f'{a["slug"]}.html').write_text(page(a, [o for o in ARTICLES if o is not a]), encoding="utf-8")
    print("built", len(ARTICLES), "articles")
main()
