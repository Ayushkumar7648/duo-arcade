import { ROWS, COLS } from '../../shared/games/connectfour.js';

export function render(state, ctx) {
  let columns = '';
  for (let c = 0; c < COLS; c++) {
    let slots = '';
    for (let r = 0; r < ROWS; r++) {
      const index = r * COLS + c;
      const owner = state.board[index];
      const classes = ['cf-slot', owner === 0 ? 'p1' : owner === 1 ? 'p2' : '',
        state.winLine?.includes(index) ? 'win' : '', state.lastMove === index ? 'last' : '']
        .filter(Boolean).join(' ');
      slots += `<span class="${classes}"><i></i></span>`;
    }
    const full = state.board[c] !== null;
    columns += `<button type="button" class="cf-col" data-move='{"col":${c}}'
      aria-label="Drop a disc in column ${c + 1}" ${ctx.canMove && !full ? '' : 'disabled'}>
      <span class="cf-col-hint"></span>${slots}</button>`;
  }
  return `<div class="cf-board" role="group" aria-label="Connect Four board">
    <div class="cf-columns">${columns}</div>
  </div>`;
}
