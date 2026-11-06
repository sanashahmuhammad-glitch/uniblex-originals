const shapes = [
  [[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [1, 1]]
];
const shuffle = (input) => {
  const result = [...input];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
};

export function createPuzzleGame(api) {
  const { stage, game } = api;
  const wrap = document.createElement("div");
  wrap.className = "board-wrap";
  stage.append(wrap);
  let active = false, paused = false, over = false, score = 0, moves = 0;
  let grid = [], pieces = [], selected = -1, timer = null, revealTimer = null, time = 90, level = 1, first = -1, second = -1, matched = new Set(), faces = [];
  const icons = ["✿", "◆", "☀", "☘", "✦", "♥", "◈", "★"];
  const board = document.createElement("div");
  board.className = `board cells-${game.mode === "blocks" ? 8 : 4}`;
  board.setAttribute("role", "grid");
  wrap.append(board);
  const caption = document.createElement("p");
  caption.className = "board-caption";
  wrap.append(caption);
  const tray = document.createElement("div");
  tray.className = "piece-tray";
  if (game.mode === "blocks") wrap.append(tray);

  function setHud() {
    if (game.mode === "blocks") api.setHud([["Score", score], ["Goal", 400]]);
    if (game.mode === "merge") api.setHud([["Score", score], ["Highest", Math.max(...grid)]]);
    if (game.mode === "memory") api.setHud([["Level", `${level}/3`], ["Pairs", `${matched.size}/${faces.length / 2}`], ["Time", time]]);
    if (game.mode === "slide") api.setHud([["Moves", moves], ["Tiles", "15"]]);
  }
  function complete(win, message) { if (over) return; over = true; active = false; clearTimeout(revealTimer); api.finish(win, message); }

  function blockFits(shape, x, y) {
    return shape.every(([dx, dy]) => x + dx < 8 && y + dy < 8 && !grid[(y + dy) * 8 + x + dx]);
  }
  function anyBlockFits() {
    return pieces.filter(Boolean).some((shape) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (blockFits(shape, x, y)) return true; return false; });
  }
  function dealBlocks() {
    pieces = Array.from({ length: 3 }, () => shapes[Math.floor(Math.random() * shapes.length)]);
    // Always give at least one playable piece when a deal is possible.
    if (!anyBlockFits()) {
      const single = shapes[0];
      if (grid.includes(0)) pieces[0] = single;
    }
    selected = -1;
  }
  function placeBlock(index) {
    if (!active || paused || selected < 0 || !pieces[selected]) return;
    const x = index % 8, y = Math.floor(index / 8), shape = pieces[selected];
    if (!blockFits(shape, x, y)) { api.tone(180, .07, "triangle"); return; }
    for (const [dx, dy] of shape) grid[(y + dy) * 8 + x + dx] = 1;
    score += shape.length * 10;
    const fullRows = [], fullCols = [];
    for (let row = 0; row < 8; row++) if (grid.slice(row * 8, row * 8 + 8).every(Boolean)) fullRows.push(row);
    for (let col = 0; col < 8; col++) if (Array.from({ length: 8 }, (_, row) => grid[row * 8 + col]).every(Boolean)) fullCols.push(col);
    for (const row of fullRows) for (let col = 0; col < 8; col++) grid[row * 8 + col] = 0;
    for (const col of fullCols) for (let row = 0; row < 8; row++) grid[row * 8 + col] = 0;
    score += (fullRows.length + fullCols.length) * 80;
    api.tone(fullRows.length + fullCols.length ? 820 : 540);
    pieces[selected] = null;
    if (pieces.every((piece) => !piece)) dealBlocks(); else selected = -1;
    renderBlocks(); setHud();
    if (score >= 400) complete(true, "Your garden parcels filled the whole route!");
    else if (!anyBlockFits()) complete(false, `You scored ${score}. Try a new arrangement.`);
  }
  function renderBlocks() {
    board.innerHTML = grid.map((filled, i) => `<button type="button" class="cell ${filled ? "" : "empty"}" data-index="${i}" aria-label="Row ${Math.floor(i / 8) + 1}, column ${i % 8 + 1}${filled ? ", filled" : ", empty"}">${filled ? "✦" : ""}</button>`).join("");
    tray.innerHTML = pieces.map((shape, i) => `<button type="button" class="piece-choice ${i === selected ? "selected" : ""}" data-piece="${i}" ${shape ? "" : "disabled"} aria-label="${shape ? `Piece ${i + 1}, ${shape.length} squares` : `Piece ${i + 1} used`}">${shape ? Array(shape.length).fill("■").join("") : "✓"}</button>`).join("");
    caption.textContent = selected < 0 ? "Choose a piece, then tap its top-left board square." : "Tap a board square to place the selected piece.";
  }

  function addTile() { const free = grid.map((v, i) => v ? -1 : i).filter((i) => i >= 0); if (free.length) grid[free[Math.floor(Math.random() * free.length)]] = Math.random() < .9 ? 2 : 4; }
  function moveMerge(dx, dy) {
    if (!active || paused) return;
    const before = grid.join(",");
    for (let lane = 0; lane < 4; lane++) {
      const indices = [];
      for (let step = 0; step < 4; step++) {
        const x = dx ? (dx < 0 ? step : 3 - step) : lane;
        const y = dy ? (dy < 0 ? step : 3 - step) : lane;
        indices.push(y * 4 + x);
      }
      const values = indices.map((i) => grid[i]).filter(Boolean), next = [];
      for (let i = 0; i < values.length; i++) { if (values[i] === values[i + 1]) { next.push(values[i] * 2); score += values[i] * 2; i++; } else next.push(values[i]); }
      indices.forEach((index, i) => grid[index] = next[i] || 0);
    }
    if (grid.join(",") === before) return;
    addTile(); moves++; api.tone(440 + Math.min(440, score / 10)); renderMerge(); setHud();
    if (grid.includes(2048)) complete(true, "You reached 2048. Brilliant merging!");
    else if (!grid.includes(0) && !grid.some((value, i) => i % 4 < 3 && value === grid[i + 1] || i < 12 && value === grid[i + 4])) complete(false, `You built ${Math.max(...grid)}. Try another route.`);
  }
  function renderMerge() {
    board.innerHTML = grid.map((v, i) => `<div class="cell tile-merge ${v ? "" : "empty"}" data-value="${v}" role="gridcell" aria-label="${v || "Empty"}">${v || ""}</div>`).join("");
    caption.textContent = "Use arrows or swipe to combine matching numbers.";
  }

  function nextMemoryLevel() {
    const count = level === 1 ? 6 : 8;
    faces = shuffle(icons.slice(0, count).flatMap((icon) => [icon, icon]));
    matched = new Set(); first = -1; second = -1;
    time = level === 1 ? 90 : level === 2 ? 75 : 60;
    renderMemory(); setHud();
  }
  function selectMemory(index) {
    if (!active || paused || over || matched.has(index) || index === first || second >= 0) return;
    if (first < 0) { first = index; api.tone(510); renderMemory(); return; }
    second = index; renderMemory();
    if (faces[first] === faces[second]) {
      matched.add(first); matched.add(second); score++; api.tone(760);
      first = -1; second = -1;
      if (matched.size === faces.length) { if (level === 3) complete(true, "All three meadows remembered!"); else { level++; nextMemoryLevel(); } }
      else { renderMemory(); setHud(); }
    } else {
      api.tone(230, .08, "triangle");
      revealTimer = setTimeout(() => { first = -1; second = -1; renderMemory(); }, 650);
    }
  }
  function renderMemory() {
    board.innerHTML = faces.map((face, i) => { const shown = matched.has(i) || i === first || i === second; return `<button type="button" class="cell memory-card ${shown ? "" : "face-down"}" data-index="${i}" aria-label="Card ${i + 1}${shown ? `, ${face}` : ", face down"}">${shown ? face : "✦"}</button>`; }).join("");
    caption.textContent = "Remember each symbol and find its partner.";
  }

  function neighbors(empty) { return [empty - 4, empty + 4, empty % 4 ? empty - 1 : -1, empty % 4 < 3 ? empty + 1 : -1].filter((i) => i >= 0 && i < 16); }
  function slide(index) {
    if (!active || paused || over) return;
    const empty = grid.indexOf(0);
    if (!neighbors(empty).includes(index)) { api.tone(180, .07, "triangle"); return; }
    [grid[index], grid[empty]] = [grid[empty], grid[index]]; moves++; api.tone(470); renderSlide(); setHud();
    if (grid.every((v, i) => v === (i + 1) % 16)) complete(true, `Map restored in ${moves} moves!`);
  }
  function renderSlide() {
    const empty = grid.indexOf(0);
    board.innerHTML = grid.map((v, i) => `<button type="button" class="cell slide-tile ${v ? "" : "empty"} ${neighbors(empty).includes(i) ? "legal" : ""}" data-index="${i}" aria-label="${v ? `Tile ${v}` : "Empty space"}">${v || ""}</button>`).join("");
    caption.textContent = "Slide adjacent tiles to restore the map from 1 to 15.";
  }
  function initSlide() {
    grid = Array.from({ length: 16 }, (_, i) => (i + 1) % 16);
    let previous = -1;
    for (let step = 0; step < 90; step++) {
      const empty = grid.indexOf(0), options = neighbors(empty).filter((i) => i !== previous);
      const next = options[Math.floor(Math.random() * options.length)];
      [grid[empty], grid[next]] = [grid[next], grid[empty]]; previous = empty;
    }
    if (grid.every((v, i) => v === (i + 1) % 16)) [grid[14], grid[15]] = [grid[15], grid[14]];
  }
  function onBoardClick(event) {
    const index = Number(event.target.closest("[data-index]")?.dataset.index);
    if (!Number.isInteger(index) || index < 0) return;
    if (game.mode === "blocks") placeBlock(index);
    if (game.mode === "memory") selectMemory(index);
    if (game.mode === "slide") slide(index);
  }
  api.listen(board, "click", onBoardClick);
  if (game.mode === "blocks") api.listen(tray, "click", (event) => { const item = event.target.closest("[data-piece]"); if (!active || paused || !item || !pieces[Number(item.dataset.piece)]) return; selected = Number(item.dataset.piece); api.tone(520); renderBlocks(); });
  if (game.mode === "merge") {
    api.listen(window, "keydown", (event) => {
      const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (directions[event.key]) { event.preventDefault(); moveMerge(...directions[event.key]); }
    });
    let x = 0, y = 0;
    api.listen(board, "touchstart", (event) => { x = event.touches[0].clientX; y = event.touches[0].clientY; }, { passive: true });
    api.listen(board, "touchend", (event) => { const dx = event.changedTouches[0].clientX - x, dy = event.changedTouches[0].clientY - y; if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return; Math.abs(dx) > Math.abs(dy) ? moveMerge(Math.sign(dx), 0) : moveMerge(0, Math.sign(dy)); }, { passive: true });
    api.controls([{ label: "←", click: () => moveMerge(-1, 0) }, { label: "↑", click: () => moveMerge(0, -1) }, { label: "↓", click: () => moveMerge(0, 1) }, { label: "→", click: () => moveMerge(1, 0) }]);
  }
  if (game.mode === "blocks") { grid = Array(64).fill(0); dealBlocks(); renderBlocks(); }
  if (game.mode === "merge") { grid = Array(16).fill(0); addTile(); addTile(); renderMerge(); }
  if (game.mode === "memory") nextMemoryLevel();
  if (game.mode === "slide") { initSlide(); renderSlide(); }
  setHud();
  return {
    start() { active = true; paused = false; if (game.mode === "memory" && !timer) timer = setInterval(() => { if (!active || paused || over) return; time--; setHud(); if (time <= 0) complete(false, `You matched ${matched.size / 2} pairs on level ${level}.`); }, 1000); },
    pause() { paused = true; }, resume() { paused = false; },
    destroy() { clearInterval(timer); clearTimeout(revealTimer); }
  };
}
