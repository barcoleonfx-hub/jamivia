# Logo build
Rebuilds every file in `brand/logo` from Cormorant Garamond (SIL OFL) using opentype.js and paper.js in headless Chromium.
```
npm i @fontsource/cormorant-garamond@5.1.0 @fontsource/jost@5.1.0 opentype.js@1.3.4 paper@0.12.18
node export.cjs ../../brand/logo && node guide.cjs ../../brand/logo
```
The shape settings (letter spacing, leaf length, width, angle, position, gap and vein) are the `P` object in `export.cjs`.
