# UNIBLEX Originals

Twelve original, standalone HTML5 arcade games built for UNIBLEX. Play locally with `npm install` and `npm run serve`, then open `http://127.0.0.1:4173`. The gallery and each game are static and run without a build step.

`catalog.mjs` defines the public URLs and catalog metadata for UNIBLEX. The website embeds `play.html?g=<slug>&embed=1`; the standalone page also works directly. Artwork in `covers/` is captured from these games. No external game code or assets are included.

After public hosting is live, `publish-catalog.mjs` checks all game pages and assets, then inserts only missing games into Supabase. `--apply` requires the production service role key in the process environment. The default mode uses the public anon key and makes no changes.

Development checks: `npm run check`, `npm run qa`, `npm run qa:gallery` and `npm run qa:embed`.
