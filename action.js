const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const rand = (low, high) => low + Math.random() * (high - low);

export function createActionGame(api) {
  const { game, stage } = api;
  const size = game.mode === "snake" ? 640 : 960;
  const width = size, height = game.mode === "snake" ? 640 : 540;
  const canvas = document.createElement("canvas");
  const scale = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", `${game.title} gameplay. ${game.instruction}`);
  stage.append(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const keys = new Set();
  let pointerHeld = false, pointerX = width / 2;
  let playing = false, paused = false, ended = false, raf = 0, previous = 0, hudClock = 0;
  let score = 0, lives = 3, elapsed = 0, level = 1;
  let player = { x: 180, y: 430, vx: 0, vy: 0, angle: -Math.PI / 2 };
  let objects = [], particles = [], trail = [], spawn = 0, target = { x: 650, y: 250 };
  let direction = { x: 1, y: 0 }, nextDirection = direction, snake = [], snakeClock = 0, apple = { x: 12, y: 8 };
  let flapStarted = false;
  const tones = {
    coil: ["#071d1c", "#0e4536", "#78e7a0", "#ffdc7d"],
    platform: ["#18203e", "#4a3669", "#ffcd75", "#7cebd5"],
    targets: ["#0d3044", "#5b9a89", "#ffca70", "#f6fbff"],
    rhythm: ["#130d30", "#382868", "#dba8ff", "#6ef2dc"],
    runner: ["#422338", "#b45f54", "#ffe7a3", "#75e5cc"],
    flap: ["#0d4676", "#5799bf", "#fff0bf", "#ffcf73"],
    snake: ["#15351e", "#357548", "#bdffa0", "#ffcf68"]
  }[game.mode];

  function paintBackground() {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, tones[0]); gradient.addColorStop(1, tones[1]);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = .15;
    for (let i = 0; i < 20; i++) {
      const x = (i * 147 + 33 - elapsed * (game.mode === "runner" || game.mode === "rhythm" ? 40 : 0)) % (width + 200);
      ctx.fillStyle = i % 2 ? tones[2] : tones[3];
      ctx.beginPath(); ctx.arc(x, 75 + (i * 91) % (height - 120), 10 + (i % 4) * 13, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function circle(x, y, radius, color, glow = 0) {
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = glow;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
  }
  function roundRect(x, y, w, h, r, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  }
  function text(value, x, y, size = 22, color = "#fff", align = "center") {
    ctx.fillStyle = color; ctx.font = `700 ${size}px system-ui`; ctx.textAlign = align; ctx.fillText(value, x, y);
  }
  function burst(x, y, color) {
    for (let i = 0; i < 11; i++) particles.push({ x, y, vx: rand(-160, 160), vy: rand(-180, 90), life: .48, color });
  }
  function updateParticles(dt) {
    particles = particles.filter((p) => (p.life -= dt) > 0);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; }
  }
  function drawParticles() {
    for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life / .48); circle(p.x, p.y, 4, p.color); }
    ctx.globalAlpha = 1;
  }
  function scoreHud() {
    if (game.mode === "snake" || game.mode === "coil") api.setHud([["Seeds", score], ["Goal", game.mode === "coil" ? 12 : 15]]);
    else if (game.mode === "platform") api.setHud([["World", `${level}/5`], ["Lights", `${score}/3`], ["Lives", lives]]);
    else if (game.mode === "targets") api.setHud([["Score", `${score}/15`], ["Time", Math.max(0, Math.ceil(60 - elapsed))], ["Lives", lives]]);
    else if (game.mode === "flap") api.setHud([["Gates", `${score}/10`], ["Best", bestScore()]]);
    else if (game.mode === "rhythm") api.setHud([["Beats", `${score}/30`], ["Level", Math.min(10, Math.floor(score / 3) + 1)]]);
    else api.setHud([["Distance", `${Math.floor(score)}m`], ["Goal", "1000m"], ["Lives", lives]]);
  }
  function bestScore() { try { return Number(localStorage.getItem(`uniblex:${game.id}:best`) || 0); } catch { return 0; } }
  function saveBest() { try { if (score > bestScore()) localStorage.setItem(`uniblex:${game.id}:best`, String(score)); } catch { /* optional */ } }
  function end(won, message) { if (ended) return; ended = true; playing = false; saveBest(); api.finish(won, message); }
  function hit() { lives--; api.tone(160, .15, "triangle"); burst(player.x, player.y, "#ff727a"); if (lives <= 0) end(false, `You reached ${Math.floor(score)}. Give it another try.`); }

  function init() {
    score = 0; lives = 3; elapsed = 0; level = 1; spawn = 0; objects = []; particles = []; trail = [];
    player = { x: game.mode === "coil" ? 130 : game.mode === "flap" ? 230 : 180, y: game.mode === "coil" ? 270 : game.mode === "flap" ? 260 : 430, vx: 0, vy: 0, angle: 0 };
    target = { x: rand(90, width - 90), y: rand(90, height - 90) };
    flapStarted = false;
    snake = [{ x: 7, y: 9 }, { x: 6, y: 9 }, { x: 5, y: 9 }];
    direction = { x: 1, y: 0 }; nextDirection = direction; snakeClock = 0; apple = { x: 12, y: 8 };
    scoreHud(); draw();
  }
  function keydown(event) {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) event.preventDefault();
    keys.add(event.key.toLowerCase());
    if (game.mode === "snake" && playing) {
      const turns = { arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 }, arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 } };
      const turn = turns[event.key.toLowerCase()];
      if (turn && turn.x !== -direction.x && turn.y !== -direction.y) nextDirection = turn;
    }
    if (!event.repeat && playing && ["flap", "rhythm", "runner", "platform"].includes(game.mode) && [" ", "arrowup", "w"].includes(event.key.toLowerCase())) jump();
  }
  function pointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width * width;
    if (playing && ["flap", "rhythm", "runner", "platform"].includes(game.mode)) jump();
    if (playing && game.mode === "targets") shoot((event.clientX - rect.left) / rect.width * width, (event.clientY - rect.top) / rect.height * height);
  }
  function jump() {
    if (game.mode === "flap") { flapStarted = true; player.vy = -300; api.tone(620); return; }
    if (player.vy === 0 && (game.mode === "platform" ? player.y <= 456 : player.y >= 428)) { player.vy = game.mode === "platform" ? -440 : -470; api.tone(580); }
  }
  function shoot(x, y) {
    const bird = [...objects].reverse().find((o) => Math.hypot(o.x - x, o.y - y) < o.r + 14);
    if (!bird) return;
    objects.splice(objects.indexOf(bird), 1);
    burst(bird.x, bird.y, bird.safe ? "#9ce9ff" : "#ffcf72");
    if (bird.safe) hit(); else { score++; api.tone(750); if (score >= 15) end(true, "The wetland is thriving. All targets found!"); }
  }

  function updateCoil(dt) {
    const turn = (keys.has("arrowleft") || keys.has("a") ? -1 : 0) + (keys.has("arrowright") || keys.has("d") ? 1 : 0);
    player.angle += turn * dt * 2.6;
    player.x += Math.cos(player.angle) * dt * 166; player.y += Math.sin(player.angle) * dt * 166;
    if (player.x < 16 || player.x > width - 16 || player.y < 16 || player.y > height - 16) { end(false, `Your trail collected ${score} seeds.`); return; }
    trail.unshift({ x: player.x, y: player.y });
    trail = trail.slice(0, 45 + score * 8);
    if (trail.some((p, i) => i > 35 && Math.hypot(p.x - player.x, p.y - player.y) < 11)) { end(false, `Your trail collected ${score} seeds.`); return; }
    if (Math.hypot(player.x - target.x, player.y - target.y) < 26) {
      burst(target.x, target.y, tones[3]); score++; api.tone(680 + score * 20);
      target = { x: rand(65, width - 65), y: rand(65, height - 65) };
      if (score >= 12) end(true, "You brought twelve seeds home!");
    }
  }
  function drawCoil() {
    ctx.strokeStyle = "#9de8be44"; ctx.lineWidth = 3;
    for (let x = 48; x < width; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 48; y < height; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    circle(target.x, target.y, 14, tones[3], 24);
    trail.forEach((p, i) => { if (i % 3 === 0) circle(p.x, p.y, Math.max(3, 11 - i / 22), i % 6 ? "#78e7a0" : "#d2ffad"); });
    circle(player.x, player.y, 13, "#ecffca", 18);
    text("✦", target.x, target.y + 7, 24, "#795c35");
  }
  function updatePlatform(dt) {
    const motion = (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0);
    player.x = clamp(player.x + motion * 250 * dt, 18, 940);
    const oldY = player.y;
    player.vy += 1050 * dt; player.y += player.vy * dt;
    const platforms = [{ x: 0, y: 474, w: 960 }, { x: 185, y: 410, w: 155 }, { x: 440, y: 365, w: 165 }, { x: 700, y: 410, w: 135 }];
    for (const p of platforms) if (player.vy >= 0 && oldY <= p.y - 18 && player.y >= p.y - 18 && player.x >= p.x - 12 && player.x <= p.x + p.w + 12) { player.y = p.y - 18; player.vy = 0; }
    if (player.y > 570) { hit(); player.x = 70; player.y = 430; player.vy = 0; }
    const gems = [{ x: 255, y: 370 }, { x: 520, y: 326 }, { x: 770, y: 370 }];
    for (let i = 0; i < gems.length; i++) if (!objects.includes(i) && Math.hypot(player.x - gems[i].x, player.y - gems[i].y) < 30) { objects.push(i); score++; burst(gems[i].x, gems[i].y, tones[2]); api.tone(720); }
    if (score === 3 && player.x > 900 && player.y > 420) { if (level >= 5) end(true, "You restored all five lanterns!"); else { level++; score = 0; objects = []; player.x = 70; player.y = 430; api.tone(900, .22); } }
  }
  function drawPlatform() {
    ctx.fillStyle = "#0a1028"; ctx.fillRect(0, 474, width, 66);
    for (const p of [{ x: 0, y: 474, w: 960 }, { x: 185, y: 410, w: 155 }, { x: 440, y: 365, w: 165 }, { x: 700, y: 410, w: 135 }]) {
      roundRect(p.x, p.y, p.w, 18, 6, "#537a83"); roundRect(p.x, p.y, p.w, 5, 3, "#93d7c9");
    }
    [{ x: 255, y: 370 }, { x: 520, y: 326 }, { x: 770, y: 370 }].forEach((gem, i) => { if (!objects.includes(i)) { circle(gem.x, gem.y, 11, tones[2], 20); text("✦", gem.x, gem.y + 6, 18, "#493856"); } });
    roundRect(900, 420, 35, 54, 16, score === 3 ? "#ffd68d" : "#52617a");
    circle(player.x, player.y - 3, 17, tones[2], 12); roundRect(player.x - 11, player.y + 9, 22, 23, 6, "#fff0ce");
    text(`WORLD ${level}`, 480, 70, 28, "#fff4db");
  }
  function updateTargets(dt) {
    spawn -= dt;
    if (spawn <= 0) { spawn = .7; const safe = Math.random() < .24; objects.push({ x: Math.random() < .5 ? -50 : 1010, y: rand(95, 420), vx: rand(100, 190) * (Math.random() < .5 ? 1 : -1), r: safe ? 22 : 26, safe, wing: 0 }); }
    for (const o of objects) { o.x += o.vx * dt; o.wing += dt * 12; }
    objects = objects.filter((o) => o.x > -80 && o.x < 1040);
    if (elapsed >= 60) end(score >= 15, `You spotted ${score} target birds.`);
  }
  function drawTargets() {
    ctx.fillStyle = "#245b61"; ctx.fillRect(0, 445, 960, 95);
    for (let i = 0; i < 35; i++) { ctx.strokeStyle = i % 3 ? "#83b88c" : "#f1d38a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(i * 31, 525); ctx.lineTo(i * 31 + Math.sin(elapsed * 2 + i) * 8, 435 - i % 4 * 13); ctx.stroke(); }
    for (const o of objects) { circle(o.x, o.y, o.r, o.safe ? "#9be9ff" : "#ffcc7d", 9); ctx.fillStyle = o.safe ? "#58aac3" : "#d77f5c"; ctx.beginPath(); ctx.ellipse(o.x - o.vx / Math.abs(o.vx) * 17, o.y + Math.sin(o.wing) * 6, 20, 8, -.3, 0, TAU); ctx.fill(); circle(o.x + Math.sign(o.vx) * 10, o.y - 6, 3, "#162c3d"); }
    text("PROTECTED BIRDS ARE BLUE", 480, 55, 18, "#d8f6ff");
  }
  function updateRhythm(dt) {
    player.vy += 1200 * dt; player.y = Math.min(430, player.y + player.vy * dt); if (player.y >= 430) player.vy = 0;
    spawn -= dt;
    if (spawn <= 0) { spawn = .83 - Math.min(.2, score * .005); objects.push({ x: 1000, w: 28, h: 52 + score % 3 * 9, counted: false }); }
    for (const o of objects) {
      o.x -= (365 + score * 2.5) * dt;
      if (!o.counted && o.x + o.w < player.x - 18) { o.counted = true; score++; api.tone(370 + score * 12, .035); if (score >= 30) end(true, "Thirty beats cleared. The path is yours!"); }
      if (o.x < player.x + 22 && o.x + o.w > player.x - 22 && player.y + 22 > 430 - o.h && player.y < 430) { end(false, `You cleared ${score} beats. Try the rhythm again.`); return; }
    }
    objects = objects.filter((o) => o.x > -60);
  }
  function drawRhythm() {
    ctx.fillStyle = "#231a47"; ctx.fillRect(0, 450, 960, 90);
    for (let i = 0; i < 24; i++) { const x = (i * 48 - elapsed * 365) % 1100; roundRect(x, 450, 22, 6, 2, "#9d81ff"); }
    circle(player.x, player.y, 25, tones[2], 18);
    for (const o of objects) { roundRect(o.x, 430 - o.h, o.w, o.h, 5, "#77e7d7"); circle(o.x + o.w / 2, 430 - o.h, 7, "#fff", 10); }
    text("TAP TO THE BEAT", 480, 72, 26, "#e9dcff");
  }
  function updateRunner(dt) {
    const speed = 310 + Math.min(155, score * .18);
    score += speed * dt / 13;
    player.vy += 1200 * dt; player.y = Math.min(430, player.y + player.vy * dt); if (player.y >= 430) player.vy = 0;
    spawn -= dt;
    if (spawn <= 0) { spawn = rand(.95, 1.5); objects.push({ x: 1020, y: 420, kind: Math.random() < .38 ? "coin" : "barrier", hit: false }); }
    for (const o of objects) {
      o.x -= speed * dt;
      if (!o.hit && Math.abs(o.x - player.x) < 28) {
        if (o.kind === "coin" && Math.abs(o.y - player.y) < 45) { o.hit = true; score += 35; burst(o.x, o.y, tones[2]); api.tone(800); }
        else if (o.kind === "barrier" && player.y > 380) { o.hit = true; hit(); }
      }
    }
    objects = objects.filter((o) => o.x > -50 && !o.hit);
    if (score >= 1000) end(true, "You delivered the route across the canyon!");
  }
  function drawRunner() {
    ctx.fillStyle = "#482e42"; ctx.fillRect(0, 454, 960, 86);
    ctx.fillStyle = "#deb07b"; ctx.fillRect(0, 445, 960, 10);
    for (let i = 0; i < 16; i++) { const x = ((i * 86 - elapsed * 310) % 1050 + 1050) % 1050; roundRect(x, 476, 42, 4, 2, "#ffe0a355"); }
    for (const o of objects) { if (o.kind === "coin") { circle(o.x, o.y - 43, 17, tones[2], 12); text("✦", o.x, o.y - 36, 20, "#956137"); } else roundRect(o.x - 19, 395, 38, 50, 5, "#ff856d"); }
    roundRect(player.x - 21, player.y - 28, 42, 53, 12, "#f1e6d2"); circle(player.x, player.y - 33, 15, tones[2]);
    text("COURIER ROUTE", 480, 72, 24, "#ffe9c7");
  }
  function updateFlap(dt) {
    if (!flapStarted) { player.y = 260 + Math.sin(elapsed * 3) * 5; return; }
    player.vy += 580 * dt; player.y += player.vy * dt;
    if (player.y < 18 || player.y > 520) { end(false, `You crossed ${score} sky gates.`); return; }
    spawn -= dt;
    if (spawn <= 0) { spawn = 1.8; objects.push({ x: 1000, gap: rand(170, 375), passed: false }); }
    for (const o of objects) {
      o.x -= 220 * dt;
      if (!o.passed && o.x + 58 < player.x - 19) { o.passed = true; score++; api.tone(730); if (score >= 10) end(true, "You flew through all ten gates!"); }
      if (o.x < player.x + 19 && o.x + 58 > player.x - 19 && (player.y < o.gap - 88 || player.y > o.gap + 88)) { end(false, `You crossed ${score} sky gates.`); return; }
    }
    objects = objects.filter((o) => o.x > -70);
  }
  function drawFlap() {
    for (const o of objects) { roundRect(o.x, 0, 58, o.gap - 88, 8, "#d8f6e0"); roundRect(o.x, o.gap + 88, 58, height - o.gap - 88, 8, "#d8f6e0"); roundRect(o.x - 6, o.gap - 105, 70, 17, 8, "#7dd6c3"); roundRect(o.x - 6, o.gap + 88, 70, 17, 8, "#7dd6c3"); }
    ctx.fillStyle = tones[2]; ctx.beginPath(); ctx.moveTo(player.x + 26, player.y); ctx.lineTo(player.x - 19, player.y - 20); ctx.lineTo(player.x - 12, player.y + 21); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffc972"; ctx.beginPath(); ctx.moveTo(player.x - 6, player.y + 4); ctx.lineTo(player.x - 40, player.y + 25); ctx.lineTo(player.x - 4, player.y + 14); ctx.fill();
    text(flapStarted ? "THE OPEN SKY" : "TAP TO FLY", 480, 69, 24, "#e9f8ff");
  }
  function updateSnake(dt) {
    snakeClock += dt;
    if (snakeClock < .13) return;
    snakeClock = 0;
    direction = nextDirection;
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
    const eating = head.x === apple.x && head.y === apple.y;
    if (head.x < 0 || head.y < 0 || head.x >= 18 || head.y >= 18 || snake.slice(0, eating ? undefined : -1).some((p) => p.x === head.x && p.y === head.y)) { end(false, `You gathered ${score} orchard fruits.`); return; }
    snake.unshift(head);
    if (eating) {
      score++; api.tone(690); burst(head.x * 32 + 32, head.y * 32 + 32, tones[3]);
      const free = []; for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) if (!snake.some((p) => p.x === x && p.y === y)) free.push({ x, y });
      if (score >= 15 || !free.length) { end(true, "Fifteen fruits collected. The orchard is yours!"); return; }
      apple = free[Math.floor(Math.random() * free.length)];
    } else snake.pop();
  }
  function drawSnake() {
    const tile = 32, offset = 32;
    roundRect(offset - 7, offset - 7, 590, 590, 17, "#0b2418");
    for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) roundRect(offset + x * tile + 2, offset + y * tile + 2, 28, 28, 6, (x + y) % 2 ? "#1c4930" : "#24553a");
    circle(offset + apple.x * tile + 16, offset + apple.y * tile + 16, 12, tones[3], 10);
    snake.forEach((p, i) => roundRect(offset + p.x * tile + 3, offset + p.y * tile + 3, 26, 26, i ? 7 : 10, i ? tones[2] : "#f5ffe1"));
  }
  function update(dt) {
    elapsed += dt;
    if (game.mode === "coil") updateCoil(dt);
    else if (game.mode === "platform") updatePlatform(dt);
    else if (game.mode === "targets") updateTargets(dt);
    else if (game.mode === "rhythm") updateRhythm(dt);
    else if (game.mode === "runner") updateRunner(dt);
    else if (game.mode === "flap") updateFlap(dt);
    else updateSnake(dt);
    updateParticles(dt);
    hudClock += dt; if (hudClock > .12) { scoreHud(); hudClock = 0; }
  }
  function draw() {
    paintBackground();
    if (game.mode === "coil") drawCoil();
    else if (game.mode === "platform") drawPlatform();
    else if (game.mode === "targets") drawTargets();
    else if (game.mode === "rhythm") drawRhythm();
    else if (game.mode === "runner") drawRunner();
    else if (game.mode === "flap") drawFlap();
    else drawSnake();
    drawParticles();
  }
  function frame(time) {
    const dt = Math.min(.035, previous ? (time - previous) / 1000 : 0); previous = time;
    if (playing && !paused && !ended) update(dt);
    draw(); raf = requestAnimationFrame(frame);
  }
  api.listen(window, "keydown", keydown);
  api.listen(window, "keyup", (e) => keys.delete(e.key.toLowerCase()));
  api.listen(canvas, "pointerdown", (event) => { pointerHeld = true; pointer(event); });
  api.listen(canvas, "pointermove", (event) => { if (!pointerHeld) return; pointerX = (event.clientX - canvas.getBoundingClientRect().left) / canvas.getBoundingClientRect().width * width; if (game.mode === "coil") player.angle = Math.atan2((event.clientY - canvas.getBoundingClientRect().top) / canvas.getBoundingClientRect().height * height - player.y, pointerX - player.x); });
  api.listen(canvas, "pointerup", () => { pointerHeld = false; });
  if (game.mode === "coil" || game.mode === "platform") api.controls([{ label: "◀", name: "Move or turn left", down: () => keys.add("arrowleft"), up: () => keys.delete("arrowleft") }, { label: game.mode === "platform" ? "↑" : "▶", name: game.mode === "platform" ? "Jump" : "Turn right", down: () => game.mode === "platform" ? jump() : keys.add("arrowright"), up: () => keys.delete("arrowright") }, ...(game.mode === "platform" ? [{ label: "▶", name: "Move right", down: () => keys.add("arrowright"), up: () => keys.delete("arrowright") }] : [])]);
  if (["flap", "rhythm", "runner"].includes(game.mode)) api.controls([{ label: "↑", name: game.mode === "flap" ? "Flap" : "Jump", down: jump }]);
  if (game.mode === "snake") {
    const move = (x, y) => { if (x !== -direction.x && y !== -direction.y) nextDirection = { x, y }; };
    api.controls([{ label: "←", down: () => move(-1, 0) }, { label: "↑", down: () => move(0, -1) }, { label: "↓", down: () => move(0, 1) }, { label: "→", down: () => move(1, 0) }]);
    let startX = 0, startY = 0;
    api.listen(canvas, "touchstart", (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
    api.listen(canvas, "touchend", (e) => { const dx = e.changedTouches[0].clientX - startX, dy = e.changedTouches[0].clientY - startY; if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return; if (Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx), 0); else move(0, Math.sign(dy)); }, { passive: true });
  }
  init(); raf = requestAnimationFrame(frame);
  return { start() { playing = true; paused = false; ended = false; previous = 0; }, pause() { paused = true; }, resume() { paused = false; previous = 0; }, destroy() { cancelAnimationFrame(raf); } };
}
