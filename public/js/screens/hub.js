import { gameList } from '../../shared/games/index.js';
import { gameIcon, escapeHtml } from '../ui.js';

export function mount(root, ctx) {
  const cards = gameList.map((game, index) => `
    <button type="button" class="game-card" data-game="${game.id}" style="--accent:${game.accent};--accent-soft:${game.accentSoft};--delay:${index * 70}ms">
      <span class="game-card-icon">${gameIcon(game.id)}</span>
      <span class="game-card-body">
        <span class="game-card-name">${escapeHtml(game.name)}</span>
        <span class="game-card-tagline">${escapeHtml(game.tagline)}</span>
      </span>
      <span class="game-card-arrow" aria-hidden="true">&rarr;</span>
    </button>`).join('');

  root.innerHTML = `
    <section class="hub screen-enter">
      <div class="hub-hero">
        <span class="eyebrow">Local &amp; real-time multiplayer</span>
        <h1>Duo <span>Arcade</span></h1>
        <p>Four classics built for two. Share a device, or share a link and play across the room, across town, anywhere.</p>
      </div>
      <div class="hub-grid">${cards}</div>
      <div class="hub-note">
        <span class="pill"><i class="dot dot-green"></i>No sign-up</span>
        <span class="pill"><i class="dot dot-violet"></i>Instant rooms</span>
        <span class="pill"><i class="dot dot-amber"></i>Sound on/off</span>
      </div>
    </section>`;

  root.querySelectorAll('[data-game]').forEach((button) => {
    button.addEventListener('click', () => ctx.actions.pickGame(button.dataset.game));
  });

  return { update() {} };
}
