import { getGame } from '../../shared/games/index.js';
import { gameIcon, escapeHtml } from '../ui.js';

export function mount(root, ctx) {
  const initialCode = ctx.inviteCode || '';
  const local = {
    view: initialCode ? 'online' : 'choose',
    tab: initialCode ? 'join' : 'create',
    p1: 'Player 1',
    p2: 'Player 2',
    nick: 'Player 1',
    code: initialCode,
    busy: false,
    error: '',
    lastGameId: null,
    lastError: null,
  };

  function readInputs() {
    const q = (sel) => root.querySelector(sel);
    if (q('#nick-p1')) local.p1 = q('#nick-p1').value;
    if (q('#nick-p2')) local.p2 = q('#nick-p2').value;
    if (q('#nick-online')) local.nick = q('#nick-online').value;
    if (q('#room-code')) local.code = q('#room-code').value;
  }

  function render() {
    const game = getGame(ctx.currentGameId());
    if (!game) return;
    const meta = game.meta;

    let content = '';
    if (local.view === 'choose') {
      content = `
        <div class="mode-grid">
          <button type="button" class="mode-card" data-view="offline">
            <span class="mode-icon">↔</span>
            <span class="mode-title">Play Offline</span>
            <span class="mode-desc">Same device · pass it back and forth. No login, no network needed.</span>
            <span class="mode-cta">Start instantly <i>&rarr;</i></span>
          </button>
          <button type="button" class="mode-card accent" data-view="online">
            <span class="mode-icon">◎</span>
            <span class="mode-title">Play Online</span>
            <span class="mode-desc">Different devices · create a room, share a code, stay connected.</span>
            <span class="mode-cta">Create or join <i>&rarr;</i></span>
          </button>
        </div>`;
    } else if (local.view === 'offline') {
      content = `
        <div class="setup-panel">
          <label class="field"><span>Nickname · Player 1</span>
            <input id="nick-p1" maxlength="16" value="${escapeHtml(local.p1)}" placeholder="Player 1" autocomplete="off"></label>
          <label class="field"><span>Nickname · Player 2</span>
            <input id="nick-p2" maxlength="16" value="${escapeHtml(local.p2)}" placeholder="Player 2" autocomplete="off"></label>
          <button type="button" class="btn btn-primary btn-wide" data-action="start-offline">Let's play <i>&rarr;</i></button>
          <p class="hint">Nicknames are optional. You can change them later from the match screen.</p>
        </div>`;
    } else {
      content = `
        <div class="setup-panel">
          <div class="tabs" role="tablist">
            <button type="button" class="tab ${local.tab === 'create' ? 'active' : ''}" data-tab="create">Create Room</button>
            <button type="button" class="tab ${local.tab === 'join' ? 'active' : ''}" data-tab="join">Join Room</button>
          </div>
          <label class="field"><span>Your nickname</span>
            <input id="nick-online" maxlength="16" value="${escapeHtml(local.nick)}" placeholder="Your name" autocomplete="off"></label>
          ${local.tab === 'join' ? `
            <label class="field"><span>Room code</span>
              <input id="room-code" class="code-input" maxlength="6" value="${escapeHtml(local.code.toUpperCase())}" placeholder="AB12C" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>` : ''}
          ${local.error ? `<p class="form-error">${escapeHtml(local.error)}</p>` : ''}
          <button type="button" class="btn btn-primary btn-wide" data-action="go-online" ${local.busy ? 'disabled' : ''}>
            ${local.busy ? 'Connecting…' : (local.tab === 'create' ? 'Create room' : 'Join room')}
          </button>
          <p class="hint">${local.tab === 'create'
            ? 'You will get a 5-character code and a one-click invite link.'
            : 'Ask the host for their room code or invite link.'}</p>
        </div>`;
    }

    root.innerHTML = `
      <section class="mode-screen screen-enter">
        <button type="button" class="back-link" data-action="back">&larr; All games</button>
        <div class="selected-game" style="--accent:${meta.accent};--accent-soft:${meta.accentSoft}">
          <span class="selected-game-icon">${gameIcon(meta.id)}</span>
          <div><span class="eyebrow">Selected game</span><h2>${escapeHtml(meta.name)}</h2></div>
        </div>
        ${content}
      </section>`;

    bind();
  }

  function bind() {
    root.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
      local.view = b.dataset.view; render(); ctx.sfx('click');
    }));
    root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      readInputs(); local.tab = b.dataset.tab; local.error = ''; render(); ctx.sfx('click');
    }));
    root.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      if (local.view !== 'choose') { readInputs(); local.view = 'choose'; local.error = ''; render(); }
      else ctx.actions.goHub();
    });
    root.querySelector('[data-action="start-offline"]')?.addEventListener('click', () => {
      readInputs();
      ctx.actions.startOffline(metaNames());
    });
    root.querySelector('[data-action="go-online"]')?.addEventListener('click', () => {
      readInputs();
      const nick = local.nick.trim() || 'Player';
      local.busy = true; local.error = ''; render();
      if (local.tab === 'create') ctx.actions.createOnline(nick);
      else ctx.actions.joinOnline(local.code.trim(), nick);
    });
  }

  function metaNames() { return [local.p1.trim() || 'Player 1', local.p2.trim() || 'Player 2']; }

  render();

  return {
    update(state) {
      if (state.selectedGameId !== local.lastGameId) {
        local.lastGameId = state.selectedGameId;
        local.view = local.code ? 'online' : 'choose';
        local.error = '';
        local.busy = false;
        render();
      }
      if (state.connection === 'disconnected' && !local.busy && state.mode === 'online') {
        local.busy = false;
        local.error = 'Could not reach the server. Check your connection and try again.';
        render();
      }
      if (state.error && state.error !== local.lastError) {
        local.lastError = state.error;
        local.busy = false;
        local.error = state.error;
        render();
      }
    },
  };
}
