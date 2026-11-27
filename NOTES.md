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

## Conversion checklist (what makes people buy)
Priority order. **Owner** says who has to provide it.

1. **Real product imagery.** Owner: client.
   - One studio shoot, or a 3D render built from the final label.
   - Packshot, scoop of powder, powder dissolving in a glass, the jar in a hand, a morning-ritual scene, a flat lay of the six raw ingredients.
   - A 10-second looping video of the powder being stirred in.
2. **Product page built to sell.** Owner: us.
   - Image gallery, price and subscription choice above the fold.
   - A sticky "add to bag" bar on phones.
   - Dose table, taste, how to use, comparison table, FAQ, reviews, guarantee.
3. **Risk reversal.** Owner: client decides, we build.
   - Money-back guarantee, e.g. "finish the tub or your money back".
   - A 7-sachet trial pack for sensitive buyers.
4. **Social proof.** Owner: client.
   - A pre-launch tester programme of 30–50 tubs, to collect honest reviews.
   - Reviews must not describe health effects; they count as claims in GB.
5. **Founder credibility.** Owner: client.
   - Professional portrait plus a 60–90 second founder video.
6. **Offer structure.** Owner: client decides.
   - Subscription discount, a 3-tub bundle, first-order incentive, free scoop or shaker.
7. **Trust details.** Owner: client provides, we build.
   - Batch certificates, UK company details, delivery and returns pages, contact page.
   - Secure checkout with Apple Pay and Google Pay.
8. **Capture and follow-up.** Owner: us.
   - Waitlist or email sign-up.
   - Abandoned-basket emails.
   - Onboarding emails: day 1, day 7 "move to a full scoop", day 21 reorder.
9. **Tracking and legal.** Owner: us.
   - Analytics plus Meta and TikTok pixels.
   - Cookie consent, privacy policy, terms and conditions, returns policy.

## Founder story (added to the site): needs client approval
- Name confirmed: **Dr Mohammed Jameel**. "Dentist" or "Practising UK dentist" is shown next to the title everywhere it appears, to meet the GDC's rule that the "Dr" courtesy title must make clear he is a dentist.
- The condition is described as "a long-term digestive condition", diagnosed at 27. Ulcerative colitis is deliberately **not named** on the shop site.
  Naming it next to a product page invites the reading that the product treats it, which is a medicinal claim.
  The TikTok and story content can name it, as long as it never links the product to the condition.
- The quote "I wanted the product I couldn't find when I needed it. Simple enough to trust, honest enough to check." is written for him and needs his sign-off.
- "Nothing artificial" wording on the site: "No artificial sweeteners, flavourings or colours … Excipients: none".
  Avoid "100% natural": the amino acids are typically manufactured.
- Portrait: `img/founder.webp`, cropped to 4:5 from the supplied photo.

## Capture system (waitlist, abandoned basket, welcome series)
**Built**
- On the site:
  - Waitlist section: first name, email, unticked consent box (UK GDPR / PECR).
  - Slide-in invite: appears once at 45% scroll, or after "Add to bag" if the visitor isn't signed up. A dismissal is remembered.
  - Basket count is remembered on the visitor's device.
- 10 email templates in `/emails`, with a gallery at `/emails/index.html`. Built by `tools/emails/build.py`. Klaviyo tags are used for first name and unsubscribe.
  - **Waitlist:** welcome (immediately), philosophy (day 3), formula (day 7), launch day (campaign).
  - **Abandoned basket:** 1 h, 24 h, 72 h.
  - **Post-purchase:** day 1 how to start, day 7 move to a full scoop, day 21 reorder (one-time buyers only).

**Now handled by our own backend (replaces Klaviyo)**
- Same approach as Preston Hill: Node + SQLite on Render with a persistent disk (`render.yaml`).
- Sign-ups, trade enquiries, analytics, orders and every email sequence run on our server. No third-party email platform is needed.
- Email sending: set `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS`, for example a Google Workspace or Microsoft 365 mailbox, or Postmark/Resend for better delivery.
  Until then, emails are saved to the disk.
- Stripe: create the two prices (subscription and one-time) and set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_SUB`, `STRIPE_PRICE_ONE`.
  Add a webhook to `https://<site>/api/stripe/webhook` for `checkout.session.completed`, and set `STRIPE_WEBHOOK_SECRET`.
  Until then, the shop stays in waitlist mode.
- Analytics are first-party and anonymous: a random per-tab session id, no cookies, no IP stored.
  Mention this in the privacy policy. The UK's 2025 Data (Use and Access) Act allows analytics storage like this without a consent banner, provided users are told and can object.
  A solicitor should confirm this wording before launch.

**Decisions needed**
- The launch offer in waitlist email 4.
- The guarantee in basket email 3. Both are marked [in brackets].

## Made in Britain
- On the site: a Union flag and "Made in Britain" in the top bar, the moving banner, the shop chips and the footer.
  There is also a dedicated section: "Made here, not shipped in", with a rotating seal and four facts.
- The wording is deliberately accurate:
  - "blended, packed and sealed in England by a specialist UK supplement manufacturer".
  - A footnote says the ingredients are sourced worldwide. Claiming British ingredients would be misleading.
- The manufacturer (G&G) is never named. Their spec says the label must not state their name or address.
- **Confirm with G&G:** that blending, filling and sealing all happen at the East Grinstead site. If any step is subcontracted, adjust the wording.

## Back office: customers and stock (added Nov 2026)
- **Customers tab**: one list built from the waitlist, orders and trade enquiries, with segments, search, tags, notes, the email history, marketing opt-out, CSV export, and "Delete personal data" for privacy requests. Delete is blocked while the person has an order waiting to ship; orders are anonymised, not removed, so the accounts still add up.
- **Stock tab**: record each delivery from G&G as a batch (code, tubs, made/best-before, certificate of analysis), with status In testing → Released (or Recalled). Adjustments for damaged stock, samples and counts. Low-stock level and days of cover. Warning when a batch is within 90 days of best-before.
- **Dispatch** pre-selects the released, in-date batch with the earliest best-before and takes the tubs off it, so every order records which batch it shipped from (needed for a recall).
- **Website batch lookup** calls `/api/batch`; released batches with a certificate link to `/coa/<code>`. Certificates are stored on the Render disk at `/var/data/uploads` (or `UPLOADS_DIR`).

## Stripe
- Render env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_SUB (£37.40 monthly recurring), STRIPE_PRICE_ONE (£44 one-off). Test mode first (sk_test_), then swap all four for live values.
- Webhook: https://jamivia.onrender.com/api/stripe/webhook, events checkout.session.completed, checkout.session.async_payment_succeeded, invoice.paid, customer.subscription.deleted.
- Renewals (invoice.paid, billing_reason subscription_cycle) create a new order to dispatch, using the first order's address. Cancellations mark the customer's subscription ended. Refunds are done in Stripe, then "Mark refunded" in Orders.
- To do: turn on Stripe's customer portal so subscribers can cancel themselves, and put its link in the welcome email.

## Client packaging brief (27 Nov 2026), status
- Design direction from the earlier mock-up is approved. Matte finish, no metallics, minimal, typography-led. Logo follows the mock-up; we owe the final vector files.
- Jar: G&G 1000ml white HDPE. Need G&G's label dieline (height × wrap length, overlap, bleed).
- **Formula change:** the client lists **N-Acetyl Glucosamine 1,000mg**, which is not in JMV02. The final G&G spec (Word) will confirm zinc and carnosine amounts. The website still shows JMV02 (6 ingredients, 11.6 g scoop): update it once the spec lands. Check NAG's source (often shellfish, so a crustacean allergen) and its novel-food status with G&G.
- Usage: half a scoop daily, building to one scoop, mixed with water. Water volume to be confirmed by G&G. The website's directions need to match.
- Requested benefit areas (gut integrity, barrier, microbiome, digestive health) are **not authorised claims** in GB. Only zinc claims and a "high in fibre" nutrition claim are usable. A compliant claims sheet is still to be done. Get regulatory sign-off before print.
- Still to come from the client: postal address, customer service email, net weight, serving weight, feature confirmations, GS1 barcode. Instagram: @jamivia.uk.

## Website copy brought in line with the label (27 Nov 2026)
- Product is now **JAMIVIA · The Foundation Formula** (no more "Restore", which implied repair). The legal name "L-Glutamine & PHGG Fibre Complex with Amino Acids & Zinc" is in the shop section.
- Zinc claim switched to protein synthesis + cell division (site, journal, emails).
- Directions: start with half a scoop daily, increasing to one full scoop as tolerated (site, emails; the day-7 email no longer pushes a full scoop).
- "The Jamivia Approach" text is in the philosophy section; "Nothing excessive. Everything intentional." added.
- The nav and seal monogram use the final logo shape.
- **Not changed yet:** the formula (N-Acetyl Glucosamine) and the hero/shop jar image, which still shows the old label. The client makes jar images in Gemini; the updated prompt is in PROMPTS.md. Cut the new image out to a transparent background and replace img/jamivia-jar.webp (1424×1133).
