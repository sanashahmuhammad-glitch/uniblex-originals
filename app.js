import { gameById } from "./games.js";
import { createActionGame } from "./action.js";
import { createPuzzleGame } from "./puzzles.js";
import { createTacticsGame } from "./tactics.js";

const game = gameById(new URLSearchParams(location.search).get("g"));
const embedded = new URLSearchParams(location.search).get("embed") === "1";
if (embedded) document.body.classList.add("embed");
const app = document.getElementById("app");
if (!game) {
  app.innerHTML = '<div class="play-shell"><p>Game not found. <a href="index.html">Browse the arcade</a></p></div>';
} else {
  document.title = `${game.title} — UNIBLEX Originals`;
  const shape = game.aspect === "9/16" ? "portrait" : game.aspect === "1/1" ? "square" : "landscape";
  app.innerHTML = `
    <div class="play-shell ${shape}" style="--game-hue:${game.hue}">
      <div class="play-top"><span class="brand">✦ UNIBLEX ORIGINALS</span><strong class="play-title">${game.title}</strong><div class="top-actions"><button class="small-button" id="sound" type="button" aria-label="Toggle sound">Sound on</button><button class="small-button" id="restart" type="button">Restart</button></div></div>
      <section class="game-frame" aria-label="${game.title} game">
        <div class="game-hud"><div class="hud-stats" id="hud"><span class="hud-item">Ready to play</span></div><div class="game-actions"><button class="icon-button" id="pause" type="button" hidden>Pause</button></div></div>
        <div class="game-stage" id="stage"></div>
        <div class="game-footer"><span>${game.instruction}</span><div class="touch-controls" id="touch-controls"></div></div>
      </section>
      <p class="help-line">Original UNIBLEX game · Keyboard, mouse and touch supported · <a href="index.html">More games</a></p>
    </div>`;

  const stage = document.getElementById("stage");
  const hud = document.getElementById("hud");
  const touchControls = document.getElementById("touch-controls");
  const pauseButton = document.getElementById("pause");
  const soundButton = document.getElementById("sound");
  let current = null;
  let cleanup = [];
  let overlay = null;
  let soundOn = true;
  let audio = null;

  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanup.push(() => target.removeEventListener(type, handler, options));
  }
  function setHud(items) {
    hud.replaceChildren(...items.map(([label, value]) => {
      const span = document.createElement("span");
      span.className = "hud-item";
      span.textContent = `${label} `;
      const strong = document.createElement("strong");
      strong.textContent = String(value);
      span.append(strong);
      return span;
    }));
  }
  function tone(frequency = 520, duration = 0.07, type = "sine") {
    if (!soundOn) return;
    try {
      audio ||= new AudioContext();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.055, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      osc.connect(gain).connect(audio.destination);
      osc.start(); osc.stop(audio.currentTime + duration);
    } catch { /* Sound is optional. */ }
  }
  function hideOverlay() { overlay?.remove(); overlay = null; }
  function showOverlay(kicker, title, body, buttonText, action) {
    hideOverlay();
    overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.innerHTML = `<div class="overlay-inner"><span class="overlay-kicker"></span><h2></h2><p></p><button type="button" class="primary-button"></button></div>`;
    overlay.querySelector(".overlay-kicker").textContent = kicker;
    overlay.querySelector("h2").textContent = title;
    overlay.querySelector("p").textContent = body;
    const button = overlay.querySelector("button");
    button.textContent = buttonText;
    button.addEventListener("click", action, { once: true });
    stage.append(overlay);
  }
  function controls(buttons) {
    touchControls.replaceChildren();
    for (const item of buttons) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.setAttribute("aria-label", item.name || item.label);
      if (item.down) listen(button, "pointerdown", (event) => { event.preventDefault(); item.down(); });
      if (item.up) {
        listen(button, "pointerup", item.up);
        listen(button, "pointercancel", item.up);
        listen(button, "pointerleave", item.up);
      }
      if (item.click) listen(button, "click", item.click);
      touchControls.append(button);
    }
  }
  function finish(won, message) {
    current?.pause?.();
    tone(won ? 760 : 180, 0.19, won ? "sine" : "triangle");
    showOverlay(won ? "ROUND COMPLETE" : "TRY AGAIN", won ? "Well played!" : "Another round?", message, "Play again", resetAndStart);
  }
  const api = { game, stage, listen, setHud, tone, controls, finish, showOverlay, hideOverlay, get soundOn() { return soundOn; } };
  function reset() {
    current?.destroy?.();
    cleanup.forEach((fn) => fn());
    cleanup = [];
    hideOverlay();
    stage.replaceChildren();
    touchControls.replaceChildren();
    pauseButton.hidden = true;
    if (game.mode === "tactics") current = createTacticsGame(api);
    else if (["blocks", "merge", "memory", "slide"].includes(game.mode)) current = createPuzzleGame(api);
    else current = createActionGame(api);
    showOverlay("UNIBLEX ORIGINALS", game.title, game.instruction, "Play game", () => {
      hideOverlay();
      current.start?.();
      if (current.pause) pauseButton.hidden = false;
    });
  }
  function resetAndStart() {
    reset();
    hideOverlay();
    current.start?.();
    if (current.pause) pauseButton.hidden = false;
  }
  document.getElementById("restart").addEventListener("click", reset);
  soundButton.addEventListener("click", () => { soundOn = !soundOn; soundButton.textContent = soundOn ? "Sound on" : "Sound off"; soundButton.setAttribute("aria-pressed", String(soundOn)); });
  pauseButton.addEventListener("click", () => {
    if (!current?.pause) return;
    if (pauseButton.textContent === "Pause") {
      current.pause(); pauseButton.textContent = "Resume";
      showOverlay("PAUSED", game.title, "Take your time. Your round is waiting.", "Resume", () => { hideOverlay(); current.resume?.(); pauseButton.textContent = "Pause"; });
    } else { hideOverlay(); current.resume?.(); pauseButton.textContent = "Pause"; }
  });
  reset();
}
