// Board renderers return HTML only. All clicks are delegated by the game
// screen through `data-move`, so renderers never attach their own listeners.

export function render(state, ctx) {
  const winners = new Set(state.winLine || []);
  let cells = '';
  for (let i = 0; i < 9; i++) {
    const owner = state.cells[i];
    const classes = ['ttt-cell', owner === 0 ? 'p1' : owner === 1 ? 'p2' : '',
      winners.has(i) ? 'win' : '', state.lastMove === i ? 'last' : ''].filter(Boolean).join(' ');
    const mark = owner === 0 ? '<span class="mark mark-x"></span>'
      : owner === 1 ? '<span class="mark mark-o"></span>'
        : '<span class="cell-dot"></span>';
    cells += `<button type="button" class="${classes}" data-move='{"cell":${i}}'
      aria-label="Cell ${i + 1}${owner === null ? ', empty' : `, player ${owner + 1}`}"
      ${ctx.canMove && owner === null ? '' : 'disabled'}>${mark}</button>`;
  }
  return `<div class="ttt-board" role="grid" aria-label="Tic-Tac-Toe board">${cells}</div>`;
}
