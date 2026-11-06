const SIZE = 6;
const index = (x, y) => y * SIZE + x;
const at = (i) => ({ x: i % SIZE, y: Math.floor(i / SIZE) });
const inside = (x, y) => x >= 0 && x < SIZE && y >= 0 && y < SIZE;
const initial = () => {
  const board = Array(36).fill(null);
  for (const side of ["blue", "red"]) {
    const back = side === "blue" ? 5 : 0, front = side === "blue" ? 4 : 1;
    board[index(0, back)] = { side, type: "guard" };
    board[index(2, back)] = { side, type: "beacon" };
    board[index(5, back)] = { side, type: "guard" };
    board[index(1, front)] = { side, type: "scout" };
    board[index(4, front)] = { side, type: "scout" };
  }
  return board;
};

export function createTacticsGame(api) {
  const wrap = document.createElement("div");
  wrap.className = "board-wrap";
  const layout = document.createElement("div"); layout.className = "board-and-side";
  const boardEl = document.createElement("div"); boardEl.className = "board cells-6"; boardEl.setAttribute("role", "grid");
  const side = document.createElement("div"); side.className = "board-side";
  side.innerHTML = '<p class="side-label">A SMALL GAME OF POSITION</p><h3>Capture the rival beacon</h3><p>Your blue guards move up to two squares in straight lines. Scouts move one diagonal square forward. The beacon moves one square in any direction. Take the red beacon to win.</p>';
  layout.append(boardEl, side); wrap.append(layout);
  const caption = document.createElement("p"); caption.className = "board-caption"; wrap.append(caption); api.stage.append(wrap);
  let board = initial(), selected = -1, active = false, paused = false, over = false, moveNumber = 1, playerCaptures = 0, aiCaptures = 0, aiTimer = null, aiQueued = false;

  function legalMoves(from) {
    const piece = board[from]; if (!piece) return [];
    const { x, y } = at(from), moves = [];
    const add = (nx, ny) => { if (inside(nx, ny) && board[index(nx, ny)]?.side !== piece.side) { moves.push(index(nx, ny)); return !board[index(nx, ny)]; } return false; };
    if (piece.type === "beacon") for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) add(x + dx, y + dy);
    if (piece.type === "scout") { const step = piece.side === "blue" ? -1 : 1; add(x - 1, y + step); add(x + 1, y + step); }
    if (piece.type === "guard") for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let step = 1; step <= 2; step++) if (!add(x + dx * step, y + dy * step)) break;
    return moves;
  }
  function allMoves(side) { const out = []; board.forEach((piece, from) => { if (piece?.side === side) for (const to of legalMoves(from)) out.push({ from, to }); }); return out; }
  function hud() { api.setHud([["Turn", moveNumber], ["You", playerCaptures], ["Rival", aiCaptures]]); }
  function render() {
    const legal = selected >= 0 ? new Set(legalMoves(selected)) : new Set();
    boardEl.innerHTML = board.map((piece, i) => {
      const { x, y } = at(i), mark = piece?.type === "beacon" ? "✦" : piece?.type === "guard" ? "♜" : piece?.type === "scout" ? "◆" : "";
      const shade = (x + y) % 2 ? "#213851" : "#34516b";
      return `<button type="button" class="cell ${selected === i ? "selected" : ""} ${legal.has(i) ? "legal" : ""}" data-index="${i}" style="background:${shade};color:${piece?.side === "blue" ? "#83e2ff" : piece?.side === "red" ? "#ffb995" : "#fff"}" aria-label="${piece ? `${piece.side} ${piece.type}` : "Empty square"}, row ${y + 1}, column ${x + 1}">${mark}</button>`;
    }).join("");
    caption.textContent = over ? "Round complete." : paused ? "Paused." : active ? selected >= 0 ? "Choose one of the outlined squares." : "Your turn: choose a blue unit." : "Choose a blue unit to begin.";
    hud();
  }
  function finish(won) { if (over) return; over = true; active = false; clearTimeout(aiTimer); render(); api.finish(won, won ? "The rival beacon is yours. Citadel secured!" : "Your beacon was captured. Try a new strategy."); }
  function applyMove(from, to) {
    const piece = board[from], captured = board[to];
    if (!piece) return;
    if (captured) { piece.side === "blue" ? playerCaptures++ : aiCaptures++; api.tone(770); }
    board[to] = piece; board[from] = null;
    if (piece.type === "scout" && (at(to).y === 0 || at(to).y === 5)) piece.type = "guard";
    if (captured?.type === "beacon") finish(piece.side === "blue");
    else api.tone(470, .06);
  }
  function aiMove() {
    if (!active || paused || over) return;
    aiQueued = false;
    const options = allMoves("red");
    if (!options.length) { finish(true); return; }
    const beaconAt = board.findIndex((piece) => piece?.side === "blue" && piece.type === "beacon");
    options.sort((a, b) => rank(b) - rank(a));
    function rank(move) {
      const capture = board[move.to];
      const dest = at(move.to), target = at(beaconAt);
      return (capture?.type === "beacon" ? 1000 : capture?.type === "guard" ? 28 : capture ? 16 : 0) - Math.abs(dest.x - target.x) * 1.4 - Math.abs(dest.y - target.y) + Math.random() * 3;
    }
    const best = options[0]; applyMove(best.from, best.to);
    moveNumber++; selected = -1; render();
    if (!over && !allMoves("blue").length) finish(false);
    if (!over && moveNumber > 60) { over = true; active = false; api.finish(playerCaptures >= aiCaptures, "The duel reached sixty turns. Try a new opening."); }
  }
  api.listen(boardEl, "click", (event) => {
    if (!active || paused || over || aiQueued) return;
    const tile = event.target.closest("[data-index]"); if (!tile) return;
    const to = Number(tile.dataset.index), piece = board[to];
    if (piece?.side === "blue") { selected = to; render(); return; }
    if (selected < 0 || !legalMoves(selected).includes(to)) return;
    applyMove(selected, to); selected = -1; render();
    if (!over) { aiQueued = true; aiTimer = setTimeout(() => { aiTimer = null; aiMove(); }, 420); }
  });
  render();
  return { start() { active = true; paused = false; render(); }, pause() { paused = true; clearTimeout(aiTimer); aiTimer = null; render(); }, resume() { paused = false; if (aiQueued && !aiTimer) aiTimer = setTimeout(() => { aiTimer = null; aiMove(); }, 420); render(); }, destroy() { clearTimeout(aiTimer); } };
}
