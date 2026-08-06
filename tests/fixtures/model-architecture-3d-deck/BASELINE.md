# Model Architecture 3D Deck source baseline

This fixture freezes the original Layer renderer source boundary, its complete CSS, and the independent preview HTML before Rank composition work changes model internals.

The Rank implementation may add wrapper DOM, ownership data attributes, Rank shells, and external SVG overlays. It may not change the frozen `nodeHtml()` through `staticHtml()` source boundary or the original pattern CSS/HTML without a reviewed baseline change.

`source-integrity.test.mjs` is validation-only. It has no update flag and never writes this fixture.

Visual screenshots and computed-style manifests still require the canonical 1440 × 900 browser harness. They are deliberately not fabricated from the new renderer or from a self-comparison.
