import { getGame } from '../../shared/games/index.js';
import {
  renderTicTacToe, renderConnectFour, renderRps, renderDotsBoxes,
  renderMemory, renderUltimateTtt, renderBattleship,
} from '../renderers/index.js';
import { escapeHtml } from '../ui.js';

const RENDERERS = {
  tictactoe: renderTicTacToe,
  connectfour: renderConnectFour,
  rps: renderRps,
  dotsboxes: renderDotsBoxes,
  memory: renderMemory,
  ultimatettt: renderUltimateTtt,
  battleship: renderBattleship,
};

/** Normalize offline state and online snapshots into one view model. */
function derive(state) {
  const offlineMode = state.mode === 'offline' && state.offline;
  const source = offlineMode || state.online;
  if (!source) return null;

  const gameId = source.gameId;
  const game = getGame(gameId);
  const meta = game.meta;
  const gs = source.state;
  const result = source.result;
  const isRps = gameId === 'rps';
  const mode = offlineMode ? 'offline' : 'online';

  const model = {
    mode, gameId, game, meta, gs, result,
    status: source.status,
    scores: source.scores,
    round: source.round || 1,
    labels: offlineMode ? source.nicks : [0, 1].map((i) => source.seats[i]?.nick || (i === 0 ? 'Player 1' : 'Player 2')),
    you: offlineMode ? null : source.you,
    opponentConnected: offlineMode ? true : source.opponentConnected,
    rematchVotes: offlineMode ? null : source.rematchVotes,
    switchVote: offlineMode ? null : source.switchVote,
    code: offlineMode ? null : source.code,
    connection: offlineMode ? 'offline' : state.connection,
    picker: null,
    visibleChoices: [false, false],
    viewer: offlineMode ? (gs.turn ?? 0) : source.you,
    canMove: false,
  };

  if (offlineMode) {
    model.picker = isRps ? source.picker : null;
    model.visibleChoices = isRps ? [source.picker === 0, source.picker === 1] : [false, false];
    model.canMove = source.status === 'playing';
  } else {
    model.picker = isRps ? source.you : null;
    model.visibleChoices = [source.you === 0, source.you === 1];
    model.canMove = source.status === 'playing' && source.opponentConnected
      && (isRps ? gs.choices?.[source.you] === null : gs.turn === source.you);
  }
  return model;
}

function turnText(m) {
  if (m.status === 'ended') return 'Round complete';
  if (m.gameId === 'rps') {
    if (m.mode === 'offline') return `${m.labels[m.picker]}, pick your throw`;
    return m.gs.choices?.[m.you] ? 'Throw locked in · waiting' : 'Pick your throw';
  }
  if (m.gameId === 'battleship') {
    const placing = m.gs.phase === 'placing';
    if (m.mode === 'offline') {
      return placing ? `${m.labels[m.gs.turn]} · place your fleet` : `${m.labels[m.gs.turn]} · take a shot`;
    }
    if (placing) return m.gs.turn === m.you ? 'Place your fleet' : 'Opponent is placing…';
    return m.gs.turn === m.you ? 'Your turn to fire' : 'Waiting for opponent…';
  }
  if (m.mode === 'offline') return `${m.labels[m.gs.turn]}'s Turn`;
  if (m.gs.turn === m.you) return "Your Turn";
  return `${m.labels[1 - m.you]}'s Turn`;
}

function scoreboard(m) {
  const [p1, p2, draws] = m.scores;
  return `<div class="score-card p1"><span>${escapeHtml(m.labels[0])}</span><strong>${p1}</strong><small>wins</small></div>
    <div class="score-card draws"><span>Draws</span><strong>${draws}</strong><small>ties</small></div>
    <div class="score-card p2"><span>${escapeHtml(m.labels[1])}</span><strong>${p2}</strong><small>wins</small></div>`;
}

function resultPanel(m) {
  if (!m.result || m.status !== 'ended') return '';
  const title = m.result.draw ? "It's a draw!" : `${escapeHtml(m.labels[m.result.winner])} wins!`;
  const voted = m.rematchVotes?.[m.you];
  const replayLabel = m.gameId === 'rps' ? 'Next Round' : 'Play Again';
  const replay = m.mode === 'offline'
    ? `<button type="button" class="btn btn-primary" data-action="replay">${replayLabel}</button>`
    : voted
      ? `<button type="button" class="btn btn-primary" disabled>Waiting for opponent…</button>
         <button type="button" class="btn btn-ghost" data-action="cancel-replay">Cancel</button>`
      : `<button type="button" class="btn btn-primary" data-action="replay">${replayLabel}</button>`;

  return `<div class="result-overlay">
    <div class="result-card">
      <span class="result-kicker">Round ${m.round}</span>
      <h3 class="${m.result.draw ? 'draw' : (m.mode === 'offline' || m.result.winner === m.you) ? 'win' : 'loss'}">${title}</h3>
      <p>${m.result.draw ? 'Nobody takes this one.' : 'Nice work — ready for another?'}</p>
      <div class="result-actions">${replay}<button type="button" class="btn btn-ghost" data-action="switch">Switch Game</button></div>
    </div>
  </div>`;
}

function connectionBadge(m) {
  if (m.mode === 'offline') return '<span class="conn-badge offline"><i></i>Offline</span>';
  if (!m.opponentConnected) return '<span class="conn-badge danger"><i></i>Opponent away</span>';
  if (m.connection === 'connected' || m.connection === 'idle') return '<span class="conn-badge live"><i></i>Live</span>';
  return '<span class="conn-badge warn"><i></i>Reconnecting…</span>';
}

export function mount(root, ctx) {
  let shellKey = '';

  function buildShell(m) {
    root.innerHTML = `
      <section class="game-screen screen-enter" style="--accent:${m.meta.accent};--accent-soft:${m.meta.accentSoft}">
        <div class="game-topbar">
          <button type="button" class="icon-btn" data-action="home" aria-label="Back to home">&larr;</button>
          <div class="game-heading"><h2>${escapeHtml(m.meta.name)}</h2><small>${m.mode === 'offline' ? 'Pass & play' : `Room ${escapeHtml(m.code || '')}`}</small></div>
          <div class="topbar-right"><span class="connection-slot"></span>
            <button type="button" class="icon-btn" data-action="rules" aria-label="How to play">?</button>
          </div>
        </div>
        <div class="match-strip">
          <div class="turn-slot"></div>
          <div class="scoreboard"></div>
        </div>
        <div class="pending-slot"></div>
        <div class="board-wrap">
          <div class="board-host"></div>
          <div class="result-host"></div>
        </div>
        <div class="game-footer">
          <button type="button" class="btn btn-ghost" data-action="switch">Switch Game</button>
          <button type="button" class="btn btn-ghost" data-action="reset">${m.mode === 'offline' ? 'New Match' : 'Leave Room'}</button>
          <button type="button" class="btn btn-quiet" data-action="home">Home</button>
        </div>
      </section>`;

    const boardHost = root.querySelector('.board-host');
    const handleBoard = (event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-move]') : null;
      if (!target || !boardHost.contains(target)) return;
      const current = derive(ctx.getState());
      if (!current?.canMove) return;
      let move;
      try { move = JSON.parse(target.dataset.move); } catch { return; }
      ctx.actions.sendMove(move);
    };
    boardHost.addEventListener('click', handleBoard);
    boardHost.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target instanceof Element ? event.target.closest('[data-move]') : null;
      if (target) { event.preventDefault(); handleBoard(event); }
    });
  }

  // One delegated listener for the whole screen, installed only once.
  root.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-action]') : null;
    if (!button) return;
    const m = derive(ctx.getState());
    const offline = m?.mode === 'offline';
    const map = {
      home: ctx.actions.goHub,
      rules: () => ctx.openRules(),
      switch: () => ctx.actions.openSwitch(),
      reset: offline ? ctx.actions.newMatch : ctx.actions.leaveRoom,
      replay: () => (offline ? ctx.actions.playAgain() : ctx.actions.voteRematch()),
      'cancel-replay': ctx.actions.cancelRematch,
      'cancel-switch': ctx.actions.cancelSwitch,
    };
    map[button.dataset.action]?.();
  });

  return {
    update(state) {
      const m = derive(state);
      if (!m) return;
      const key = `${m.mode}:${m.gameId}`;
      if (key !== shellKey) { shellKey = key; buildShell(m); }

      root.querySelector('.connection-slot').innerHTML = connectionBadge(m);
      root.querySelector('.turn-slot').innerHTML = `<div class="turn-indicator ${m.canMove ? 'active' : ''}">
        <span class="turn-dot"></span><span>${escapeHtml(turnText(m))}</span><small>Round ${m.round}</small>
      </div>`;
      root.querySelector('.scoreboard').innerHTML = scoreboard(m);
      root.querySelector('.board-host').innerHTML = RENDERERS[m.gameId](m.gs, {
        canMove: m.canMove,
        labels: m.labels,
        picker: m.picker,
        visibleChoices: m.visibleChoices,
        viewer: m.viewer,
      });
      root.querySelector('.result-host').innerHTML = resultPanel(m);

      const pending = m.switchVote && m.switchVote !== m.gameId
        ? `<div class="pending-switch">Switching to <strong>${escapeHtml(getGame(m.switchVote)?.meta.name || m.switchVote)}</strong>…
            <button type="button" data-action="cancel-switch">Cancel</button></div>` : '';
      root.querySelector('.pending-slot').innerHTML = pending;
    },
  };
}
