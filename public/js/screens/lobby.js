import { getGame } from '../../shared/games/index.js';
import { escapeHtml } from '../ui.js';

export function mount(root, ctx) {
  let signature = '';

  function render(state) {
    const online = state.online;
    if (!online) return;
    const game = getGame(online.gameId);
    const code = online.code;
    const link = `${location.origin}${location.pathname}?room=${encodeURIComponent(code)}`;
    const seats = [0, 1].map((i) => {
      const seat = online.seats[i];
      if (!seat) return `<div class="lobby-seat empty"><span class="seat-avatar">?</span><span class="seat-name">Waiting for player…</span><span class="seat-tag">Open slot</span></div>`;
      return `<div class="lobby-seat ${seat.connected ? 'online' : 'offline'} ${seat.isYou ? 'you' : ''}">
        <span class="seat-avatar">${escapeHtml(seat.nick).slice(0, 1).toUpperCase()}</span>
        <span class="seat-name">${escapeHtml(seat.nick)}${seat.isYou ? ' <em>(you)</em>' : ''}</span>
        <span class="seat-tag">${seat.isHost ? 'Host' : 'Guest'} · ${seat.connected ? 'Connected' : 'Away'}</span>
      </div>`;
    }).join('');

    root.innerHTML = `
      <section class="lobby screen-enter">
        <button type="button" class="back-link" data-action="leave">&larr; Leave room</button>
        <div class="lobby-head">
          <span class="eyebrow">${escapeHtml(game?.meta.name || 'Game')} · Waiting room</span>
          <h2>Share the code,<br><span>start the match.</span></h2>
          <p>The game begins the moment your opponent joins.</p>
        </div>
        <div class="room-code-card">
          <span class="room-code-label">Room code</span>
          <div class="room-code">${escapeHtml(code)}</div>
          <div class="room-actions">
            <button type="button" class="btn btn-ghost" data-action="copy-code">Copy code</button>
            <button type="button" class="btn btn-primary" data-action="copy-link">Copy invite link</button>
          </div>
        </div>
        <div class="lobby-seats">${seats}</div>
        <div class="lobby-status">
          <span class="pulse"></span>
          <span>${state.connection === 'connected' ? 'Connected · waiting for opponent' : 'Reconnecting to server…'}</span>
        </div>
      </section>`;

    root.querySelector('[data-action="leave"]').addEventListener('click', () => ctx.actions.leaveRoom());
    root.querySelector('[data-action="copy-code"]').addEventListener('click', async () => {
      const ok = await ctx.copy(code);
      ctx.toast(ok ? 'Room code copied!' : 'Copy failed — select the code manually.');
      ctx.sfx('click');
    });
    root.querySelector('[data-action="copy-link"]').addEventListener('click', async () => {
      const ok = await ctx.copy(link);
      ctx.toast(ok ? 'Invite link copied!' : 'Copy failed — share the room code instead.');
      ctx.sfx('click');
    });
  }

  return {
    update(state) {
      const online = state.online;
      if (!online) return;
      const next = JSON.stringify([online.code, online.gameId, online.seats, state.connection]);
      if (next === signature) return;
      signature = next;
      render(state);
    },
  };
}
