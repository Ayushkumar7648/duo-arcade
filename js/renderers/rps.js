import { escapeHtml } from '../ui.js';

const SHAPES = {
  rock: '<circle cx="20" cy="20" r="11"/>',
  paper: '<rect x="9" y="6" width="22" height="28" rx="4"/>',
  scissors: '<path d="M10 9l20 22M30 9L10 31"/><circle cx="11" cy="31" r="3"/><circle cx="29" cy="31" r="3"/>',
};

function throwIcon(choice, extra = '') {
  return `<svg class="throw-icon ${extra}" viewBox="0 0 40 40" fill="none" stroke="currentColor"
    stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    ${SHAPES[choice] || ''}</svg>`;
}

function throwCard(seat, label, choice, visible, outcome) {
  const isWinner = outcome && outcome.winner === seat;
  const classes = ['rps-throw-card', seat === 0 ? 'p1' : 'p2',
    isWinner ? 'is-winner' : '', !visible ? 'is-hidden' : ''].filter(Boolean).join(' ');
  const inner = visible && choice
    ? `${throwIcon(choice)}<span class="throw-name">${choice}</span>`
    : `<span class="throw-unknown">?</span><span class="throw-name">locked in</span>`;
  return `<div class="${classes}">
    <div class="throw-player">${escapeHtml(label)}</div>
    <div class="throw-visual">${inner}</div>
    ${isWinner ? '<div class="throw-crown">WINNER</div>' : ''}
  </div>`;
}

export function render(state, ctx) {
  const labels = ctx.labels || ['Player 1', 'Player 2'];
  const visible = ctx.visibleChoices || [false, false];
  const outcome = state.outcome;

  if (state.phase === 'reveal') {
    const text = outcome.winner === null
      ? "It's a draw!"
      : `${labels[outcome.winner]} wins!`;
    return `<div class="rps-stage reveal-stage">
      <div class="rps-versus">
        ${throwCard(0, labels[0], outcome.choices[0], true, outcome)}
        <span class="rps-vs">VS</span>
        ${throwCard(1, labels[1], outcome.choices[1], true, outcome)}
      </div>
      <p class="rps-outcome">${escapeHtml(text)}</p>
    </div>`;
  }

  let players = '';
  for (let seat = 0; seat < 2; seat++) {
    const chosen = state.choices[seat] !== null;
    const show = chosen && visible[seat];
    const active = ctx.picker === seat;
    players += `<div class="rps-player ${seat === 0 ? 'p1' : 'p2'} ${active ? 'is-active' : ''}">
      <div class="rps-avatar">${escapeHtml(labels[seat]).slice(0, 1).toUpperCase()}</div>
      <div class="rps-player-meta">
        <span class="rps-player-name">${escapeHtml(labels[seat])}</span>
        <span class="rps-player-status">${chosen ? (show ? 'Locked in' : 'Ready') : (active ? 'Choosing…' : 'Waiting…')}</span>
      </div>
      <div class="rps-mini-throw">${show ? throwIcon(state.choices[seat]) : '<span class="throw-unknown">?</span>'}</div>
    </div>`;
  }

  const buttons = ['rock', 'paper', 'scissors'].map((choice) => `
    <button type="button" class="rps-choice" data-move='{"choice":"${choice}"}' ${ctx.canMove ? '' : 'disabled'}>
      ${throwIcon(choice)}<span>${choice}</span>
    </button>`).join('');

  const prompt = ctx.canMove
    ? `${escapeHtml(labels[ctx.picker] || '')}, pick your throw`
    : 'Both throws are locked in…';

  return `<div class="rps-stage">
    <div class="rps-players">${players}<span class="rps-vs">VS</span></div>
    <p class="rps-prompt">${prompt}</p>
    <div class="rps-choices">${buttons}</div>
  </div>`;
}
