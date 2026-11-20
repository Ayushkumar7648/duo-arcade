import { SIZE, CELLS, legalMoves } from '../../shared/games/reversi.js';
import { escapeHtml } from '../ui.js';

export function render(state, ctx) {
  const hints = new Set(ctx.canMove && state.turn !== null ? legalMoves(state, state.turn) : []);
  const flipped = new Set(state.flipped || []);
  const labels = ctx.labels || ['Player 1', 'Player 2'];

  let cells = '';
  for (let i = 0; i < CELLS; i++) {
    const owner = state.board[i];
    const isHint = hints.has(i);
    const classes = ['rev-cell',
      owner === 0 ? 'p1' : owner === 1 ? 'p2' : '',
      state.lastMove === i ? 'last' : '',
      flipped.has(i) ? 'flipped' : ''].filter(Boolean).join(' ');

    const inner = owner !== null
      ? `<span class="rev-disc ${owner === 0 ? 'p1' : 'p2'}"></span>`
      : isHint ? '<span class="rev-hint"></span>' : '';

    cells += `<button type="button" class="${classes}" data-move='{"cell":${i}}'
      aria-label="Cell row ${Math.floor(i / SIZE) + 1}, column ${i % SIZE + 1}${owner !== null ? `, player ${owner + 1}` : ''}"
      ${ctx.canMove && isHint ? '' : 'disabled'}>${inner}</button>`;
  }

  const passNote = state.pass !== null
    ? `<p class="rev-note">${escapeHtml(labels[state.pass] || 'Opponent')} had no legal move — the turn passed.</p>`
    : '';

  return `<div class="rev-stage">
    ${passNote}
    <div class="rev-board" role="grid" aria-label="Reversi board"
      style="grid-template-columns:repeat(${SIZE},1fr)">${cells}</div>
  </div>`;
}
