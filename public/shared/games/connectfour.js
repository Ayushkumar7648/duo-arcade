// Connect Four: 6 rows x 7 columns, gravity drops a disc to the lowest free row.

export const meta = {
  id: 'connectfour',
  name: 'Connect Four',
  tagline: 'Drop four discs in a row to win.',
  rules: 'Choose a column to drop your disc. Connect four horizontally, vertically or diagonally to win.',
  accent: '#ffd166',
  accentSoft: 'rgba(255,209,102,.18)',
  glyph: 'C4',
  playAgainLabel: 'Play Again',
  instantRematch: false,
};

export const ROWS = 6;
export const COLS = 7;
const TOTAL = ROWS * COLS;
const at = (r, c) => r * COLS + c;

export function createState() {
  return { board: Array(TOTAL).fill(null), turn: 0, winLine: null, lastMove: null };
}

function findWinLine(board, index) {
  const r = Math.floor(index / COLS);
  const c = index % COLS;
  const player = board[index];
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

  for (const [dr, dc] of directions) {
    const line = [index];
    for (const sign of [1, -1]) {
      let rr = r + dr * sign;
      let cc = c + dc * sign;
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[at(rr, cc)] === player) {
        line.push(at(rr, cc));
        rr += dr * sign;
        cc += dc * sign;
      }
    }
    if (line.length >= 4) return line;
  }
  return null;
}

export function applyMove(state, move, player) {
  if (state.turn !== player) return null;
  const col = Number(move?.col);
  if (!Number.isInteger(col) || col < 0 || col >= COLS) return null;

  let row = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (state.board[at(r, col)] === null) { row = r; break; }
  }
  if (row < 0) return null;

  const index = at(row, col);
  const board = [...state.board];
  board[index] = player;
  const winLine = findWinLine(board, index);
  const full = board.every((v) => v !== null);
  return { board, turn: winLine || full ? null : 1 - player, winLine, lastMove: index };
}

export function getResult(state) {
  if (state.winLine) return { over: true, winner: state.board[state.winLine[0]], draw: false };
  if (state.board.every((v) => v !== null)) return { over: true, winner: null, draw: true };
  return { over: false, winner: null, draw: false };
}
