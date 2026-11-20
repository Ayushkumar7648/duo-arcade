// Reversi (Othello): 8x8 disc-flipping game. A move must bracket one or more
// opponent discs between the new disc and an existing disc of yours; every
// bracketed disc flips. Players pass when they have no legal move.

export const meta = {
  id: 'reversi',
  name: 'Reversi',
  tagline: 'Outflank your rival and flip the board.',
  rules: 'Place a disc so it traps opponent discs between your new disc and one of your existing discs — they all flip to your side. If you have no legal move you pass automatically. Most discs when neither player can move wins.',
  accent: '#fb923c',
  accentSoft: 'rgba(251,146,60,.18)',
  glyph: 'REV',
  playAgainLabel: 'Play Again',
  instantRematch: false,
};

export const SIZE = 8;
export const CELLS = SIZE * SIZE;

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

function at(r, c) {
  return r * SIZE + c;
}

function flipsInDirection(board, r, c, dr, dc, player) {
  const opponent = 1 - player;
  let rr = r + dr;
  let cc = c + dc;
  const line = [];
  while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[at(rr, cc)] === opponent) {
    line.push(at(rr, cc));
    rr += dr;
    cc += dc;
  }
  if (line.length && rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[at(rr, cc)] === player) return line;
  return null;
}

function flipsFor(board, index, player) {
  if (board[index] !== null) return null;
  const r = Math.floor(index / SIZE);
  const c = index % SIZE;
  const flips = [];
  for (const [dr, dc] of DIRS) {
    const line = flipsInDirection(board, r, c, dr, dc, player);
    if (line) flips.push(...line);
  }
  return flips.length ? flips : null;
}

export function legalMoves(boardOrState, player) {
  const board = Array.isArray(boardOrState) ? boardOrState : boardOrState.board;
  const moves = [];
  for (let i = 0; i < CELLS; i++) {
    if (flipsFor(board, i, player)) moves.push(i);
  }
  return moves;
}

export function createState() {
  const board = Array(CELLS).fill(null);
  board[at(3, 3)] = 1;
  board[at(3, 4)] = 0;
  board[at(4, 3)] = 0;
  board[at(4, 4)] = 1;
  return { board, turn: 0, lastMove: null, flipped: [], pass: null };
}

function counts(board) {
  const tally = [0, 0];
  board.forEach((owner) => { if (owner !== null) tally[owner]++; });
  return tally;
}

export function applyMove(state, move, player) {
  if (state.turn !== player) return null;
  const index = Number(move?.cell);
  if (!Number.isInteger(index) || index < 0 || index >= CELLS) return null;

  const flips = flipsFor(state.board, index, player);
  if (!flips) return null;

  const board = [...state.board];
  board[index] = player;
  flips.forEach((i) => { board[i] = player; });

  let turn = 1 - player;
  let pass = null;
  if (legalMoves(board, turn).length === 0) {
    pass = turn;
    turn = legalMoves(board, player).length === 0 ? null : player;
  }

  return { board, turn, lastMove: index, flipped: flips, pass };
}

export function getResult(state) {
  if (state.turn !== null) {
    return { over: false, winner: null, draw: false, counts: counts(state.board) };
  }
  const tally = counts(state.board);
  const winner = tally[0] === tally[1] ? null : (tally[0] > tally[1] ? 0 : 1);
  return { over: true, winner, draw: winner === null, counts: tally };
}
