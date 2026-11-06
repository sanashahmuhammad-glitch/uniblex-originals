export const games = [
  { id: "verdant-coil", title: "Verdant Coil", genre: "Arcade snake", line: "Steer a growing ribbon through a living garden.", instruction: "Turn with ← → or A/D. Collect seeds, avoid your own trail.", aspect: "16/9", hue: 150, mode: "coil" },
  { id: "parcel-patch", title: "Parcel Patch", genre: "Block puzzle", line: "Fit garden parcels and clear full rows or columns.", instruction: "Tap a piece, then a valid spot on the board. Fill rows and columns.", aspect: "9/16", hue: 36, mode: "blocks" },
  { id: "citadel-tactics", title: "Citadel Tactics", genre: "Strategy", line: "A compact board duel with original units and rules.", instruction: "Tap one of your blue units, then a marked square. Capture the rival beacon.", aspect: "1/1", hue: 214, mode: "tactics" },
  { id: "lantern-leap", title: "Lantern Leap", genre: "Platform adventure", line: "Cross floating ruins and recover the lanterns.", instruction: "Move with ← → or A/D, jump with Space or ↑. Collect light and reach the gate.", aspect: "16/9", hue: 25, mode: "platform" },
  { id: "wetland-watch", title: "Wetland Watch", genre: "Aim arcade", line: "Track colorful birds across a bright marsh.", instruction: "Tap moving target birds. Leave the blue protected birds unharmed.", aspect: "16/9", hue: 182, mode: "targets" },
  { id: "pulse-path", title: "Pulse Path", genre: "Rhythm reflex", line: "One jump at the right beat keeps the journey alive.", instruction: "Tap, click, or press Space to jump over the beat markers.", aspect: "16/9", hue: 282, mode: "rhythm" },
  { id: "canyon-courier", title: "Canyon Courier", genre: "Endless runner", line: "Dash across a canyon route and leap the barriers.", instruction: "Tap, click, or press Space to jump. Survive and collect coins.", aspect: "16/9", hue: 18, mode: "runner" },
  { id: "cloud-glider", title: "Cloud Glider", genre: "Tap to fly", line: "Thread a paper glider through drifting sky gates.", instruction: "Tap, click, or press Space to flap through the gates.", aspect: "16/9", hue: 205, mode: "flap" },
  { id: "orchard-snake", title: "Orchard Snake", genre: "Grid arcade", line: "Find fruit, grow longer, and plan every turn.", instruction: "Turn with arrow keys or swipe. Collect fruit without hitting walls or yourself.", aspect: "1/1", hue: 120, mode: "snake" },
  { id: "merge-market", title: "Merge Market", genre: "Number puzzle", line: "Slide matching tiles toward a bigger total.", instruction: "Use arrow keys or swipe to merge equal tiles. Reach 2048.", aspect: "9/16", hue: 42, mode: "merge" },
  { id: "memory-meadow", title: "Memory Meadow", genre: "Memory match", line: "Uncover matching pairs before the clock runs out.", instruction: "Tap two cards to reveal them. Match every pair before time runs out.", aspect: "9/16", hue: 320, mode: "memory" },
  { id: "slide-station", title: "Slide Station", genre: "Sliding puzzle", line: "Put the station map back in the right order.", instruction: "Tap a tile beside the empty space. Order all tiles from 1 to 15.", aspect: "1/1", hue: 194, mode: "slide" }
];

export const gameById = (id) => games.find((game) => game.id === id);
