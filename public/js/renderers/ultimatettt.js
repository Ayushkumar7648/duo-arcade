function mark(player) {
  return player === 0 ? '<span class="mark mark-x"></span>' : '<span class="mark mark-o"></span>';
}

export function render(state, ctx) {
  const winSubs = new Set(state.winLine || []);
  let boards = '';

  for (let b = 0; b < 9; b++) {
    const cells = state.boards[b];
    const sub = state.subs[b];
    const forced = state.forced === b && sub === null;
    let inner = '';

    for (let c = 0; c < 9; c++) {
      const owner = cells[c];
      const isLast = state.lastMove?.board === b && state.lastMove?.cell === c;
      const blocked = sub !== null || owner !== null
        || (state.forced !== null && state.forced !== b);
      const classes = ['utt-cell', owner === 0 ? 'p1' : owner === 1 ? 'p2' : '',
        isLast ? 'last' : ''].filter(Boolean).join(' ');
      inner += `<button type="button" class="${classes}" data-move='{"board":${b},"cell":${c}}'
        aria-label="Board ${b + 1}, cell ${c + 1}${owner === null ? ', empty' : `, player ${owner + 1}`}"
        ${ctx.canMove && !blocked ? '' : 'disabled'}>${owner !== null ? mark(owner) : ''}</button>`;
    }

    const overlay = sub === 0 || sub === 1
      ? `<span class="utt-subwin ${sub === 0 ? 'p1' : 'p2'}">${sub === 0 ? 'X' : 'O'}</span>`
      : sub === -1 ? '<span class="utt-subwin draw">–</span>' : '';

    const classes = ['utt-board', forced ? 'is-forced' : '',
      winSubs.has(b) ? 'is-win' : '', sub !== null ? 'is-decided' : ''].filter(Boolean).join(' ');

    boards += `<div class="${classes}">${inner}${overlay}</div>`;
  }

  return `<div class="utt-grid" role="group" aria-label="Ultimate Tic-Tac-Toe board">${boards}</div>`;
}
