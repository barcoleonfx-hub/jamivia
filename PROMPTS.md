# Jamivia image prompt pack

For AI image tools such as Midjourney, ChatGPT images, Gemini or Flux.

## The one rule: never let the AI write the label
AI tools garble small text. That's what caused the nonsense on the first jar mock-ups.

1. **Use the official render as the image reference**, so the jar shape and label stay accurate:
   - `img/jamivia-jar.png` (transparent cut-out)
   - `img/jamivia-stone.jpg`
   - `img/jamivia-forest.jpg`
2. **Or don't show the label at all.** Generate the scene with a blank white tub of the same shape, then place the real render in an editor (Photoshop, Canva, Photopea).
3. **Proofread every final image** before it goes live: 348 g, JAMIVIA, no health-claim wording.

## Gemini jar packshot: updated label (Nov 2026)
Gemini can write label text, but only if you give it the exact words and a reference image. Attach both:
1. Your existing Gemini jar image (so it keeps the same jar, lighting and style).
2. `brand/logo/png/jamivia-stacked-forest.png` (the final logo).

### Prompt A: edit your existing image (best results)
> Edit this product photo. Keep the jar, lid, camera angle, lighting, shadows and background exactly the same. Only replace the front label artwork.
> Use the attached logo exactly as provided (the J with a leaf above the word JAMIVIA), in deep forest green #1E392C, centred near the top of the label. Do not redraw or restyle the logo.
> Below the logo, centred, in small wide-spaced uppercase sans-serif (like Jost or Futura), matte grey-green:
> line 1: THE FOUNDATION FORMULA
> a short thin horizontal rule
> line 2: L-GLUTAMINE & PHGG FIBRE COMPLEX
> line 3: WITH AMINO ACIDS & ZINC
> Then a row of four small thin-line icons, each with a two-line caption, separated by thin vertical lines:
> a circle — MADE IN / BRITAIN · a leaf — HIGH IN / FIBRE · a water drop — NO ADDED / SUGAR · a hexagon — ZINC / 160% NRV
> Then a slim forest-green band with cream text: FOOD SUPPLEMENT | UNFLAVOURED POWDER
> Then: 30 SERVINGS | NET WT. 348 g
> Matte white label, matte print, no metallic, no foil, no gloss. Lots of white space, premium and minimal.
> Any text on the sides of the jar should be tiny and out of focus. Spell every word exactly as written. Add no other words.

### Prompt B: new image from scratch
> Premium studio packshot of a matte white HDPE supplement jar with a matte white screw lid, front-on, slightly above eye level, on a plain seamless light grey background, soft diffused studio light, gentle contact shadow, photorealistic, 85mm lens.
> [then the label description from Prompt A, from "Use the attached logo…" onwards]

### For the website hero
- Generate it on a **plain, light, seamless background** (not a scene). The website shows the jar cut out over the dark green, so send me the image and I'll remove the background and fit it.
- Square or landscape, at least 2000 px.

### Check before using
JAMIVIA · THE FOUNDATION FORMULA · L-GLUTAMINE & PHGG FIBRE COMPLEX · WITH AMINO ACIDS & ZINC · 348 g · 30 servings · 160% NRV. Nothing that says gut, restore, probiotic, microbiome or digestive. If one word is wrong, ask Gemini to "fix only the word X to Y and change nothing else".
Net weight, servings and the formula may change once G&G confirm the final spec. If they do, rerun Prompt A with the new numbers.

## House style (add to every prompt)
> Premium editorial product photography, soft natural window light, warm neutral stone and travertine surfaces,
> deep forest green (#1E392C) and muted gold accents, calm, minimal, uncluttered, shallow depth of field,
> 85mm lens, Kinfolk / Aesop aesthetic, photorealistic, no text, no logos

Negatives: `no text, no lettering, no logos, no hands with extra fingers, no pills or capsules, no medical imagery, no cartoon`

## Shot list

### 1. Hero packshot: stone (the AI version of the official render)
Use `img/jamivia-stone.jpg` as the reference.
> A white matte cylindrical supplement tub with a white screw lid on a travertine plinth, olive branch casting dappled
> late-afternoon shadows across a warm stone wall, arched doorway softly blurred in background, [house style]

### 2. The powder: macro
> Extreme close-up of a level scoop of fine off-white powder in a natural bamboo measuring scoop, resting on pale stone,
> individual grains visible, soft side light, [house style]

### 3. Dissolving almost clear (the most persuasive shot)
Also make this as a 6–10 second video in Runway, Kling or Veo.
> A clear glass tumbler of still water on a stone counter, fine white powder drifting down and dissolving into almost
> perfectly clear water, a few soft swirls, morning light through the glass, [house style]

### 4. Morning ritual
Leave space on the right to place the real jar render.
> A calm kitchen counter at sunrise, a glass of water, a bamboo scoop, a linen cloth and a small olive sprig,
> empty space on the right for a product, [house style]

### 5. In hand (for scale)
Place the real jar render into the hand afterwards.
> A person's hand with natural skin and neutral nails holding a white matte supplement tub about 11 cm wide,
> label facing away, soft neutral background, [house style]

### 6. The six ingredients flat lay
Overlay the ingredient names afterwards, in the website fonts.
> Top-down flat lay on pale travertine: six small ceramic dishes each holding a different fine white or off-white
> powder, arranged in a neat row, one sprig of guar (cluster bean) plant beside them, [house style]

### 7. Forest-green hero background (for the website)
> Dark forest green studio backdrop with soft gold light glow and floating fine dust particles catching the light,
> cinematic, microscopic feel, empty centre, [house style]

### 8. Lifestyle (social media)
> A person in a linen shirt at a sunlit window, stirring a glass of water with a spoon, calm unhurried mood,
> face partly out of frame, [house style]

## Don'ts (UK advertising rules)
- No images of stomachs, intestines, doctors, hospitals, or "before and after" shots. These imply medicinal claims.
- Don't show people who look unwell, and don't show relief from symptoms.
