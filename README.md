# UNIBLEX Originals

Twelve original, standalone HTML5 arcade games built for UNIBLEX. Play locally with `npm install` and `npm run serve`, then open `http://127.0.0.1:4173`. The gallery and each game are static and run without a build step.

`catalog.mjs` defines the public URLs and catalog metadata for UNIBLEX. The website embeds `play.html?g=<slug>&embed=1`; the standalone page also works directly. Artwork in `covers/` is captured from these games. No external game code or assets are included.

After public hosting is live, `publish-catalog.mjs` checks all game pages and assets, then inserts only missing games into Supabase. `--apply` requires the production service role key in the process environment. The default mode uses the public anon key and makes no changes.

Development checks: `npm run check`, `npm run qa`, `npm run qa:gallery` and `npm run qa:embed`.

## Play on UNIBLEX

The [UNIBLEX browser game library](https://www.uniblex.com/games) includes a dedicated page for each original, with its description and supplied controls before the player starts.

| Game | Play page |
| --- | --- |
| Verdant Coil | [Play Verdant Coil](https://www.uniblex.com/games/verdant-coil) |
| Parcel Patch | [Play Parcel Patch](https://www.uniblex.com/games/parcel-patch) |
| Citadel Tactics | [Play Citadel Tactics](https://www.uniblex.com/games/citadel-tactics) |
| Lantern Leap | [Play Lantern Leap](https://www.uniblex.com/games/lantern-leap) |
| Wetland Watch | [Play Wetland Watch](https://www.uniblex.com/games/wetland-watch) |
| Pulse Path | [Play Pulse Path](https://www.uniblex.com/games/pulse-path) |
| Canyon Courier | [Play Canyon Courier](https://www.uniblex.com/games/canyon-courier) |
| Cloud Glider | [Play Cloud Glider](https://www.uniblex.com/games/cloud-glider) |
| Orchard Snake | [Play Orchard Snake](https://www.uniblex.com/games/orchard-snake) |
| Merge Market | [Play Merge Market](https://www.uniblex.com/games/merge-market) |
| Memory Meadow | [Play Memory Meadow](https://www.uniblex.com/games/memory-meadow) |
| Slide Station | [Play Slide Station](https://www.uniblex.com/games/slide-station) |

## Publishing and browser-game guides

- [UNIBLEX developer documentation](https://www.uniblex.com/developers/docs) explains the submission and publishing workflow.
- [Browser game controls](https://www.uniblex.com/blog/designing-game-controls-for-browser-players) covers keyboard, mouse, touch and focus boundaries.
- [Measuring the first playable frame](https://www.uniblex.com/blog/measuring-first-playable-frame-browser-game) separates page loading from the point where a game can actually be played.

