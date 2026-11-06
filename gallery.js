import { games } from "./games.js";

const gallery = document.getElementById("gallery");
gallery.innerHTML = games.map((game, index) => `
  <a class="game-card" href="play.html?g=${game.id}" style="--h:${game.hue};--delay:${index * 30}ms">
    <div class="card-art" aria-hidden="true"><img src="covers/${game.id}.jpg" alt="" loading="lazy"><span class="card-monogram">${String(index + 1).padStart(2, "0")}</span><span class="card-play">▶</span></div>
    <div class="card-copy"><span>${game.genre}</span><h2>${game.title}</h2><p>${game.line}</p></div>
  </a>`).join("");
