# Jamivia: decisions and open items

Running log of what's decided, what's assumed, and what still needs fixing.
This file moves into the new Jamivia repository when it exists.

## Decided
- **Source of truth for the formula:** G&G spec JMV02, "JMV PHGG & Glutamine 348g", Issue 1 A(JV), 04/11/2026.
  The website and label follow it exactly, not the earlier copy drafts.
- **Copy:** must be safe under GB food-supplement rules (GB Nutrition & Health Claims register) and match the spec.
- **Repository:** new, separate repo, with no connection to Preston Hill Estates.
- **Priority:** make the site look as good as possible first; fix the finer details later.
- **Platform direction:** our own system (see "Platform" below). Shopify is the fallback.

## Formula per serving (calculated from the spec)
The serving size is an assumption: 348 g ÷ 30 servings = 11.6 g. Confirm it with G&G and weigh real scoops.

| Ingredient | Per g (spec) | Per 11.6 g serving |
|---|---|---|
| L-Glutamine | 430.51 mg | 4.99 g |
| PHGG (85% fibre) | 430.51 mg | 4.99 g (≈4.2 g fibre) |
| Glycine | 86.10 mg | 999 mg |
| Taurine | 43.05 mg | 499 mg |
| L-Carnosine | 5.08 mg | 59 mg |
| Zinc (from zinc acetate) | 1.38 mg (4.75 mg compound) | 16.0 mg zinc = 160% NRV (55 mg acetate) |

Excipients: none. Shelf life: retest after 2 years.
Packing: 1000 ml white HDPE tub, 100 mm white smooth lid, tamper-evident heat seal, 3 g silica sachet, 20 ml spoon.

## Conflicts with earlier copy (fixed on the website)
- Glutamine is **5 g**, not 1 g.
- Acacia fibre, sodium butyrate, humic extract, coconut milk powder and vanilla are **not** in the formula.
- Zinc and L-carnosine go in **separately** (zinc acetate + L-carnosine), not as zinc L-carnosine (polaprezinc). Don't use polaprezinc research or the name "Zinc L-Carnosine".
- There are **six** ingredients, not five.
- The mock-ups say 9 g scoop / 270 g net. The spec says 348 g. The jar artwork needs updating.
- "Dietary Supplement" (US wording) → "Food supplement" (UK).
- The mock-ups' gluten / dairy / soy free and non-GMO badges are unverified. Ask G&G for the allergen breakdown before using them.
  Vegan status is also unknown.

## Claims: what the site does
- Uses only authorised claims, for zinc: "contributes to the normal function of the immune system" and "has a role in the process of cell division".
  16 mg is enough to qualify for both.
- Everything else is factual description: what the ingredient is, the amount, the taste. It doesn't say what it does to the body.
- Removed: gut lining integrity, microbiome balance, post-antibiotic recovery, reflux/LPR, IBS, "clinically backed", "Indications", "Intended use", "heals".
- **Needs regulatory consultant sign-off before launch:**
  - Product name "RESTORE" (a brand name that could read as a health claim).
  - Pillar names Barrier / Balance / Replenish.
  - "Foundation before intervention" and "stability, not stimulation" positioning lines.
  - "Daily Gut Formula".
  - The "half a scoop for the first week" advice.
  - Journal articles (educational content must stay clearly separate from product claims).
- Founder story: the ulcerative colitis story must never be tied to the product. As a dentist, the founder is bound by GDC advertising standards.
- Mandatory label statements are in the site footer. Mirror them on the pack.

## Placeholders in the preview (to replace)
- Prices: £44 one-off, £37.40 subscription (−15%). **Not decided.**
- "Free UK delivery on subscriptions", "Dispatched within 1 working day", "Pause or cancel any time": policies not decided.
- Batch lookup: not live yet. It needs real certificates of analysis (heavy metals, microbiology, label claim) per batch from G&G or a third-party lab.
- Practitioner sign-up and the bag: front end only, nothing is stored.
- Journal posts: titles only.
- Founder story page: not written.
- Jar is drawn in SVG as a stand-in. Replace with real photography or a 3D render once the artwork is final.

## Chosen pack design (white tub, J-leaf monogram): label issues to fix
The direction is good, and the white tub and lid match the spec. The website now shows this design, with corrected text. On the render:
- **Net wt. says 378 g. The spec says 348 g.** One of them must change. The ℮ mark also needs the filled weight to be accurate.
- **"Gut & Mucosal Support"**, "A foundational blend for the gut barrier & microbiome*", and the icons "Barrier support*", "Digestive comfort*", "Immune balance*", "Mucosal health*" are unauthorised health claims in GB.
  The asterisks are the US FDA-disclaimer convention and give no protection in the UK.
- A legal alternative for the immune icon: "Immune support†", with the footnote "†Zinc contributes to the normal function of the immune system" (an authorised claim; 16 mg qualifies).
  There is no authorised gut, mucosal or digestive claim for these ingredients.
- The website currently uses: "Daily Gut Formula" · "A foundational daily blend of six nutrients" · icons Six nutrients / Plant fibre / No probiotics / Zinc 160% NRV.
  The consultant still needs to sign off "Daily Gut Formula".
- "Unflavoured powder" and "Food supplement" are fine.
- The wordmark is spelled JAMIVIA (no accent), which settles the earlier question. The J-leaf monogram is now in the site navigation.

## Brand decisions still open
- ~~Wordmark spelling~~: JAMIVIA, settled by the chosen pack design.
- Primary social handle (shortlist: @jamivia.health, @jamivialabs, @jamivia.co).
- Domain.

## Platform: our own system (recommended)
Not complicated for one product. Proposed stack:
- **Website:** Next.js (full design control), hosted on Vercel or Render.
- **Payments and subscriptions:** Stripe Checkout + Stripe Billing.
  Covers cards, Apple/Google Pay, recurring orders, the customer self-serve portal (pause/cancel/update card) and UK VAT via Stripe Tax.
  Card data never touches our servers.
- **Orders database:** Postgres (Supabase or Neon), filled automatically from Stripe webhooks.
- **Admin dashboard (ours):** today's orders, print labels, mark dispatched, refunds, stock count, subscriber list, batch numbers per order.
- **Dispatch:** Royal Mail Click & Drop API for labels and tracking numbers.
  Tracking emails sent automatically (Resend or Postmark).
  Later, swap in a fulfilment warehouse without changing the site.
- **Email marketing:** Klaviyo or similar, later.
- **Running costs:** Stripe fees (~1.5% + 20p per UK card) plus a few pounds a month of hosting, versus Shopify's monthly plan plus subscription-app fees.
- **Trade-off:** we maintain it ourselves.
- Open question: who physically packs and posts the orders (the founder, G&G, or a fulfilment house)?

## Pre-launch checks (from earlier notes)
Formulation scientist review; regulatory claim review; stability and shelf-life testing; moisture sensitivity; flavour; heavy metal testing.
