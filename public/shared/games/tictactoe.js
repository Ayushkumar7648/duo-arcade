// Pure, DOM-free game logic. Shared by the browser (offline mode) and the
// Node server (online mode) so both sides always agree on rules and outcomes.

export const meta = {
  id: 'tictactoe',
  name: 'Tic-Tac-Toe',
  tagline: 'Three in a row wins the round.',
  rules: 'Take turns placing your mark. First player to line up three marks wins; a full board is a draw.',
  accent: '#ff6b6b',
  accentSoft: 'rgba(255,107,107,.18)',
  glyph: 'XO',
  playAgainLabel: 'Play Again',
  instantRematch: false,
};

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function createState() {
  return { cells: Array(9).fill(null), turn: 0, winLine: null, lastMove: null };
}

function findLine(cells) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (cells[a] !== null && cells[a] === cells[b] && cells[a] === cells[c]) return line;
  }
  return null;
}

// Returns a new state for a legal move, or null when the move is rejected.
export function applyMove(state, move, player) {
  if (state.turn !== player) return null;
  const cell = Number(move?.cell);
  if (!Number.isInteger(cell) || cell < 0 || cell > 8 || state.cells[cell] !== null) return null;

  const cells = [...state.cells];
  cells[cell] = player;
  const winLine = findLine(cells);
  const full = cells.every((v) => v !== null);
  return {
    cells,
    turn: winLine || full ? null : 1 - player,
    winLine,
    lastMove: cell,
  };
}

export function getResult(state) {
  if (state.winLine) return { over: true, winner: state.cells[state.winLine[0]], draw: false };
  if (state.cells.every((v) => v !== null)) return { over: true, winner: null, draw: true };
  return { over: false, winner: null, draw: false };
}
