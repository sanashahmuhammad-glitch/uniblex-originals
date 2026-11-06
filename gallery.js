import { games } from "./games.js";

const gallery = document.getElementById("gallery");
gallery.innerHTML = games.map((game, index) => `
  <a class="game-card" href="play.html?g=${game.id}" style="--h:${game.hue};--delay:${index * 30}ms">
    <div class="card-art" aria-hidden="true"><img src="covers/${game.id}.jpg" alt="" loading="lazy"><video src="previews/${game.id}.webm" muted loop playsinline preload="none"></video><span class="card-monogram">${String(index + 1).padStart(2, "0")}</span><span class="card-play">▶</span></div>
    <div class="card-copy"><span>${game.genre}</span><h2>${game.title}</h2><p>${game.line}</p></div>
  </a>`).join("");

for (const card of gallery.querySelectorAll(".game-card")) {
  const video = card.querySelector("video");
  video.addEventListener("playing", () => card.classList.add("is-previewing"));
  video.addEventListener("pause", () => card.classList.remove("is-previewing"));
  video.addEventListener("error", () => card.classList.remove("is-previewing"));
  const play = () => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  };
  const stop = () => { video.pause(); video.currentTime = 0; };
  card.addEventListener("mouseenter", play);
  card.addEventListener("mouseleave", stop);
  card.addEventListener("focus", play);
  card.addEventListener("blur", stop);
}
