# Observatory geometry

These neutral SVG masks come from the existing **MASH - DESIGN SYSTEM** Penpot file (`a5ac146a-5787-80fa-8008-b8564221ee1e`), exported on 2026-10-11.

- `observatory-*`: Formation's `Mash / Background / Technical Grid / Geometry Layer`, shared by operational pages.
- `home-observatory-*`: Home's `Background / Light · Twin Magic Circles · White`.
- `tilted-star-orbits-*`: `02 · Geometry & Decorations` / `Background / Light · Tilted Star Orbits · White` (`6d66b4f0-782b-80f3-8008-bad208f7df64`). Relative shape opacity is normalized to the strongest line/node; white star interiors stay transparent.

Lines and nodes are separate masks so `ObservatoryBackground` can apply `color.geometry.background` and `color.geometry.node` independently. Canvas backgrounds, hidden atmosphere layers and content veils are omitted. Mask paint is white with normalized paint alpha; shape opacity and vector geometry are retained. CSS owns the base surface, grid, ambient light, content fade and page density. Light/dark and blue/violet/gold use the same geometry.

`VITE_FEATURE_TILTED_STAR_ORBITS_BACKGROUND` is an internal build toggle for operational pages, enabled by default. Home always uses its twin circles. Set it to `false` and restart/rebuild to restore operational pages' Observatory background. No user setting or persisted preference is added.
