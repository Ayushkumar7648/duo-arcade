// Ultimate Tic-Tac-Toe: nine nested Tic-Tac-Toe boards. The cell you play in a
// sub-board dictates which sub-board your opponent must play next. Win three
// sub-boards in a row to take the game.

export const meta = {
  id: 'ultimatettt',
  name: 'Ultimate Tic-Tac-Toe',
  tagline: 'Win the small boards to win the big one.',
  rules: 'Your move sends your opponent to the matching sub-board. Win a sub-board with three in a row. Win three sub-boards in a line to win the game. If the target board is decided, play anywhere.',
  accent: '#38bdf8',
  accentSoft: 'rgba(56,189,248,.18)',
  glyph: 'UTT',
  playAgainLabel: 'Play Again',
  instantRematch: false,
};

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function lineWinner(cells) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (cells[a] !== null && cells[a] === cells[b] && cells[a] === cells[c]) return line;
  }
  return null;
}

export function createState() {
  return {
    boards: Array.from({ length: 9 }, () => Array(9).fill(null)),
    subs: Array(9).fill(null), // null = open, 0/1 = won, -1 = drawn
    forced: null,
    turn: 0,
    lastMove: null,
    winLine: null,
  };
}

function playable(subs, board, boards) {
  return subs[board] === null && boards[board].some((cell) => cell === null);
}

export function applyMove(state, move, player) {
  if (state.turn !== player) return null;
  const board = Number(move?.board);
  const cell = Number(move?.cell);
  if (!Number.isInteger(board) || board < 0 || board > 8) return null;
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) return null;
  if (state.subs[board] !== null || state.boards[board][cell] !== null) return null;
  if (state.forced !== null && board !== state.forced) return null;

  const boards = state.boards.map((cells) => [...cells]);
  boards[board][cell] = player;

  const subs = [...state.subs];
  const subLine = lineWinner(boards[board]);
  if (subLine) subs[board] = player;
  else if (boards[board].every((v) => v !== null)) subs[board] = -1;

  let winLine = null;
  for (const line of LINES) {
    const [a, b, c] = line;
    if (subs[a] !== null && subs[a] !== -1 && subs[a] === subs[b] && subs[a] === subs[c]) {
      winLine = line;
      break;
    }
  }

  let forced = cell;
  if (!playable(subs, forced, boards)) forced = null;

  const anyMove = boards.some((cells, bi) => playable(subs, bi, boards));
  const over = winLine !== null || !anyMove;

  return {
    boards,
    subs,
    forced: over ? null : forced,
    turn: over ? null : 1 - player,
    lastMove: { board, cell },
    winLine,
  };
}

export function getResult(state) {
  if (state.winLine) {
    return { over: true, winner: state.subs[state.winLine[0]], draw: false, counts: subCounts(state.subs) };
  }
  const anyMove = state.boards.some((cells, bi) => playable(state.subs, bi, state.boards));
  if (!anyMove) return { over: true, winner: null, draw: true, counts: subCounts(state.subs) };
  return { over: false, winner: null, draw: false, counts: subCounts(state.subs) };
}

function subCounts(subs) {
  const tally = [0, 0];
  subs.forEach((owner) => { if (owner === 0 || owner === 1) tally[owner]++; });
  return tally;
}
