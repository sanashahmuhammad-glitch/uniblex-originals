import { games } from "./games.js";

export const pagesBase = "https://sanashahmuhammad-glitch.github.io/uniblex-originals";

const categories = {
  coil: "Casual", blocks: "Puzzle", tactics: "Strategy", platform: "Adventure",
  targets: "Action", rhythm: "Casual", runner: "Action", flap: "Casual",
  snake: "Casual", merge: "Puzzle", memory: "Puzzle", slide: "Puzzle"
};

const controls = {
  coil: ["Use Left/Right or A/D to steer.", "Collect seeds and avoid the trail."],
  blocks: ["Select a parcel, then an open board cell.", "Complete rows or columns to clear them."],
  tactics: ["Choose a blue unit, then a marked square.", "Capture the rival beacon to win."],
  platform: ["Move with Left/Right or A/D.", "Jump with Space or Up."],
  targets: ["Click target birds to score.", "Leave protected blue birds alone."],
  rhythm: ["Press Space at the right time to jump.", "Clear beat markers to progress."],
  runner: ["Press Space to jump barriers.", "Collect coins and reach the distance goal."],
  flap: ["Press Space to flap.", "Pass safely through the sky gates."],
  snake: ["Turn with arrow keys.", "Eat fruit without hitting a wall or your tail."],
  merge: ["Use arrow keys to slide tiles.", "Combine equal values to reach 2048."],
  memory: ["Select two cards to reveal them.", "Find every pair before time runs out."],
  slide: ["Move a tile beside the empty space.", "Arrange tiles from 1 to 15."]
};

export const catalog = games.map((game, index) => ({
  title: game.title,
  slug: game.id,
  category_name: categories[game.mode],
  genre: game.genre,
  description: `${game.line} ${game.instruction}`,
  cover_url: `${pagesBase}/covers/${game.id}.jpg`,
  thumbnail_url: `${pagesBase}/covers/${game.id}.jpg`,
  preview_video_url: `${pagesBase}/previews/${game.id}.webm`,
  iframe_url: `${pagesBase}/play.html?g=${game.id}&embed=1`,
  tags: ["UNIBLEX Originals", "HTML5", game.genre],
  sort_order: 50 + index,
  aspect_ratio: game.aspect,
  desktop_controls: controls[game.mode],
  mobile_controls: [game.instruction],
  build_metadata: {
    source: "uniblex_originals",
    engine: "HTML5 Canvas",
    developer_name: "UNIBLEX",
    orientation: game.aspect === "9/16" ? "portrait" : game.aspect === "1/1" ? "square" : "landscape",
    difficulty: ["tactics", "rhythm", "runner"].includes(game.mode) ? "Medium" : "Easy",
    sessionLength: "3–5 min"
  }
}));

if (new Set(catalog.map((game) => game.slug)).size !== catalog.length) throw new Error("Duplicate game slug");
