import { store, toggleMute } from './store.js';
import { Net } from './net.js';
import { playSound } from './audio.js';
import { openModal, closeModal, toast, copyText, escapeHtml, gameIcon } from './ui.js';
import { getGame, resultOf, gameList } from '../shared/games/index.js';
import * as hub from './screens/hub.js';
import * as mode from './screens/mode.js';
import * as lobby from './screens/lobby.js';
import * as gameScreen from './screens/game.js';

const screenRoot = document.getElementById('screen');
const modalRoot = document.getElementById('modal-root');
const toastRoot = document.getElementById('toast-root');
const muteBtn = document.getElementById('mute-btn');

const net = new Net();
const params = new URLSearchParams(location.search);
const inviteCode = (params.get('room') || '').toUpperCase().slice(0, 6);
let lastResultKey = '';

function currentGameId() {
  const s = store.get();
  return s.offline?.gameId || s.online?.gameId || s.selectedGameId || 'tictactoe';
}

function freshOffline(gameId, nicks) {
  const game = getGame(gameId);
  return {
    gameId,
    nicks,
    state: game.createState(),
    status: 'playing',
    scores: [0, 0, 0],
    round: 1,
    result: null,
    scored: false,
    picker: gameId === 'rps' ? 0 : null,
  };
}

function scoreResult(offline, result) {
  const scores = [...offline.scores];
  if (result.draw) scores[2]++;
  else if (result.winner !== null) scores[result.winner]++;
  return scores;
}

function boxCount(state) {
  return state.boxes?.filter((owner) => owner !== null).length || 0;
}

const actions = {
  pickGame(gameId) {
    playSound('click');
    store.set({ screen: 'mode', selectedGameId: gameId, modal: null, error: null });
  },

  goHub() {
    net.close();
    if (location.search) history.replaceState({}, '', location.pathname);
    store.set({
      screen: 'hub', selectedGameId: null, mode: null, offline: null, online: null,
      connection: 'idle', modal: null, error: null,
    });
  },

  startOffline(nicks) {
    const gameId = store.get().selectedGameId;
    playSound('connect');
    store.set({
      screen: 'game', mode: 'offline', offline: freshOffline(gameId, nicks), online: null, modal: null,
    });
  },

  createOnline(nick) {
    const gameId = store.get().selectedGameId;
    net.roomCode = null;
    net.nick = nick;
    net.connect();
    net.send({ type: 'create', gameId, nick });
  },

  joinOnline(code, nick) {
    if (!code) { toast('Enter the room code first.'); return; }
    net.roomCode = code.toUpperCase();
    net.nick = nick;
    net.connect();
    net.send({ type: 'join', code: net.roomCode, nick });
  },

  sendMove(move) {
    const state = store.get();
    if (state.mode === 'online') { net.send({ type: 'move', move }); playSound('move'); return; }

    const offline = state.offline;
    if (!offline || offline.status !== 'playing') return;
    const game = getGame(offline.gameId);
    const seat = offline.gameId === 'rps' ? offline.picker : offline.state.turn;
    if (seat === null || seat === undefined) return;
    const next = game.applyMove(offline.state, move, seat);
    if (!next) return;

    const result = resultOf(offline.gameId, next);
    const patch = { ...offline, state: next, picker: null };

    if (offline.gameId === 'rps') {
      patch.picker = next.phase === 'choosing' ? 1 - seat : null;
    }
    if (result.over && !offline.scored) {
      patch.scores = scoreResult(offline, result);
      patch.status = 'ended';
      patch.result = { winner: result.winner, draw: result.draw };
      patch.scored = true;
      playSound(result.draw ? 'draw' : 'win');
    } else if (!result.over) {
      if (offline.gameId === 'dotsboxes' && boxCount(next) > boxCount(offline.state)) playSound('capture');
      else playSound('move');
    }
    store.set({ offline: patch });
  },

  playAgain() {
    const offline = store.get().offline;
    if (!offline) return;
    const game = getGame(offline.gameId);
    const state = game.meta.instantRematch ? game.nextRound(offline.state) : game.createState();
    playSound('click');
    store.set({
      offline: {
        ...offline, state, status: 'playing', result: null, scored: false,
        picker: offline.gameId === 'rps' ? 0 : null,
        round: offline.round + 1,
      },
    });
  },

  newMatch() {
    const offline = store.get().offline;
    if (!offline) return;
    playSound('click');
    store.set({ offline: freshOffline(offline.gameId, offline.nicks) });
  },

  switchOffline(gameId) {
    const offline = store.get().offline;
    if (!offline) return;
    playSound('connect');
    store.set({ offline: freshOffline(gameId, offline.nicks) });
  },

  voteRematch() { net.send({ type: 'rematch' }); playSound('vote'); },
  cancelRematch() { net.send({ type: 'cancel-rematch' }); playSound('click'); },
  voteSwitch(gameId) { net.send({ type: 'switch', gameId }); playSound('vote'); },
  cancelSwitch() { net.send({ type: 'cancel-switch' }); playSound('click'); },

  leaveRoom() {
    net.send({ type: 'leave' });
    net.close();
    actions.goHub();
  },
};

function openRules() {
  const game = getGame(currentGameId());
  openModal({
    title: game.meta.name,
    body: `<p class="modal-lead">${escapeHtml(game.meta.rules)}</p>
      <div class="rules-legend"><span class="legend-chip p1">Player 1</span><span class="legend-chip p2">Player 2</span></div>`,
    actions: [{ label: 'Got it', kind: 'primary', onClick: closeModal }],
  });
}

function openSwitch() {
  const current = currentGameId();
  const online = store.get().mode === 'online';
  const options = gameList.map((g) => `
    <button type="button" class="switch-option ${g.id === current ? 'current' : ''}" data-switch-id="${g.id}"
      style="--accent:${g.accent};--accent-soft:${g.accentSoft}">
      <span class="switch-icon">${gameIcon(g.id)}</span>
      <span><strong>${escapeHtml(g.name)}</strong><small>${g.id === current ? 'Current game' : escapeHtml(g.tagline)}</small></span>
    </button>`).join('');

  openModal({
    title: 'Switch Game',
    body: `<p class="modal-lead">${online
      ? 'Pick a new game. Both players must choose the same one — you will jump together without leaving the room.'
      : 'Pick another game. Scores reset for the new match.'}</p>
      <div class="switch-grid">${options}</div>`,
    actions: [{ label: 'Cancel', kind: 'ghost', onClick: closeModal }],
    onMount(root) {
      root.querySelectorAll('[data-switch-id]').forEach((button) => {
        button.addEventListener('click', () => {
          const id = button.dataset.switchId;
          closeModal();
          if (online) actions.voteSwitch(id);
          else actions.switchOffline(id);
        });
      });
    },
  });
}

const ctx = {
  actions,
  sfx: playSound,
  toast,
  copy: copyText,
  openRules,
  getState: store.get,
  currentGameId,
  inviteCode,
};

const controllers = {
  hub: hub.mount,
  mode: mode.mount,
  lobby: lobby.mount,
  game: gameScreen.mount,
};

let activeScreen = null;
let controller = null;

function syncScreen(state) {
  if (state.screen !== activeScreen) {
    controller?.destroy?.();
    activeScreen = state.screen;
    controller = controllers[state.screen](screenRoot, ctx);
  }
  controller.update(state);
}

let lastModal = null;
function renderChrome(state) {
  muteBtn.innerHTML = state.muted
    ? '<span class="mute-off">Sound off</span>'
    : '<span class="mute-on">Sound on</span>';
  muteBtn.classList.toggle('is-muted', state.muted);
  muteBtn.setAttribute('aria-label', state.muted ? 'Unmute sound effects' : 'Mute sound effects');

  toastRoot.innerHTML = state.toast
    ? `<div class="toast" role="status">${escapeHtml(state.toast.message)}</div>` : '';

  if (state.modal !== lastModal) {
    lastModal = state.modal;
    if (!state.modal) { modalRoot.innerHTML = ''; return; }
    const modal = state.modal;
    const buttons = (modal.actions || []).map((action, index) => `
      <button type="button" class="btn ${action.kind === 'primary' ? 'btn-primary' : action.kind === 'danger' ? 'btn-danger' : 'btn-ghost'}"
        data-modal-action="${index}">${escapeHtml(action.label)}</button>`).join('');
    modalRoot.innerHTML = `
      <div class="modal-backdrop" data-backdrop>
        <div class="modal-card ${modal.wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(modal.title)}">
          <button type="button" class="modal-close" data-modal-close aria-label="Close">&times;</button>
          <span class="eyebrow">${escapeHtml(modal.eyebrow || 'Duo Arcade')}</span>
          <h3>${escapeHtml(modal.title)}</h3>
          <div class="modal-body">${modal.body || ''}</div>
          ${buttons ? `<div class="modal-actions">${buttons}</div>` : ''}
        </div>
      </div>`;
    modalRoot.querySelectorAll('[data-modal-action]').forEach((button) => {
      button.addEventListener('click', () => modal.actions[Number(button.dataset.modalAction)].onClick?.());
    });
    if (modal.dismissible !== false) {
      modalRoot.querySelector('[data-modal-close]').addEventListener('click', closeModal);
      modalRoot.querySelector('[data-backdrop]').addEventListener('click', (event) => {
        if (event.target.classList.contains('modal-backdrop')) closeModal();
      });
    } else {
      modalRoot.querySelector('[data-modal-close]').remove();
    }
    modal.onMount?.(modalRoot);
  }
}

/* ---------------------------- Network events ---------------------------- */
net.on('status', (status) => store.set({ connection: status }));

net.on('room', (msg) => {
  const snap = msg.room;
  if (!net.roomCode) net.roomCode = snap.code;
  store.set({ error: null, online: snap, screen: snap.status === 'waiting' ? 'lobby' : 'game' });

  const key = `${snap.code}:${snap.round}:${snap.scores.join('-')}:${snap.status}`;
  if (snap.status === 'ended' && key !== lastResultKey) {
    lastResultKey = key;
    playSound(snap.result?.draw ? 'draw' : snap.result?.winner === snap.you ? 'win' : 'lose');
  }
});

net.on('error', (msg) => {
  toast(msg.message || 'Something went wrong.');
  store.set({ connection: 'error', error: msg.message || 'Connection failed.' });
});

net.on('opponent-left', (msg) => {
  playSound('disconnect');
  openModal({
    title: 'Opponent disconnected',
    dismissible: false,
    body: `<p class="modal-lead">${escapeHtml(msg.nick || 'Your opponent')} lost the connection. Your room is still open — they can rejoin with the same code and nickname.</p>`,
    actions: [
      { label: 'Leave room', kind: 'danger', onClick: () => { closeModal(); actions.leaveRoom(); } },
      { label: 'Keep waiting', kind: 'ghost', onClick: closeModal },
    ],
  });
});

net.on('left', () => actions.goHub());

muteBtn.addEventListener('click', () => {
  const muted = toggleMute();
  if (!muted) playSound('click');
});

store.subscribe((state) => { syncScreen(state); renderChrome(state); });
syncScreen(store.get());
renderChrome(store.get());
