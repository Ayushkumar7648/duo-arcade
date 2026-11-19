// Battleship: each player secretly places a fleet on an 8x8 grid, then players
// alternate firing at the opponent's waters. Sink the whole fleet to win.
//
// Fleet positions are hidden from the opposing player via sanitize(), so online
// snapshots never leak where the ships are.

export const meta = {
  id: 'battleship',
  name: 'Battleship',
  tagline: 'Place your fleet, then hunt your rival’s.',
  rules: 'Place each ship on your grid, then take turns firing at enemy waters. A hit is red, a miss is grey. Sink the whole enemy fleet to win.',
  accent: '#22d3ee',
  accentSoft: 'rgba(34,211,238,.18)',
  glyph: 'BS',
  playAgainLabel: 'Play Again',
  instantRematch: false,
};

export const SIZE = 8;
export const FLEET = [4, 3, 3, 2, 2];
const CELLS = SIZE * SIZE;

function toIndex(r, c) {
  return r * SIZE + c;
}

function shipCells(r, c, size, horizontal) {
  const cells = [];
  for (let i = 0; i < size; i++) {
    const rr = horizontal ? r : r + i;
    const cc = horizontal ? c + i : c;
    if (rr < 0 || rr >= SIZE || cc < 0 || cc >= SIZE) return null;
    cells.push(toIndex(rr, cc));
  }
  return cells;
}

export function createState() {
  return {
    phase: 'placing', // 'placing' | 'firing'
    fleets: [[], []],
    shots: [Array(CELLS).fill(null), Array(CELLS).fill(null)],
    placed: [0, 0],
    sunk: [0, 0],
    orientation: 'h',
    turn: 0,
    lastMove: null,
    winner: null,
  };
}

function recomputeSunk(state) {
  const sunk = [0, 0];
  for (let p = 0; p < 2; p++) {
    sunk[p] = state.fleets[p].filter((ship) => ship.cells.every((i) => state.shots[p][i] === 'hit')).length;
  }
  return sunk;
}

export function applyMove(state, move, player) {
  if (state.winner !== null) return null;
  if (state.turn !== player) return null;

  if (state.phase === 'placing') {
    if (move?.toggle) {
      return { ...state, orientation: state.orientation === 'h' ? 'v' : 'h' };
    }

    const size = FLEET[state.placed[player]];
    if (size === undefined) return null;
    const r = Number(move?.r);
    const c = Number(move?.c);
    if (!Number.isInteger(r) || !Number.isInteger(c)) return null;

    const cells = shipCells(r, c, size, state.orientation === 'h');
    if (!cells) return null;
    const occupied = new Set(state.fleets[player].flatMap((ship) => ship.cells));
    if (cells.some((i) => occupied.has(i))) return null;

    const fleets = [state.fleets[0].map((s) => ({ cells: [...s.cells] })), state.fleets[1].map((s) => ({ cells: [...s.cells] }))];
    fleets[player].push({ cells });
    const placed = [...state.placed];
    placed[player]++;

    const next = { ...state, fleets, placed, orientation: 'h', lastMove: { r, c, phase: 'place', by: player } };

    if (placed[player] < FLEET.length) return next;
    if (player === 0) return { ...next, turn: 1 };
    return { ...next, phase: 'firing', turn: 0 };
  }

  if (state.phase === 'firing') {
    const r = Number(move?.r);
    const c = Number(move?.c);
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r >= SIZE || c < 0 || c >= SIZE) return null;

    const target = 1 - player;
    const index = toIndex(r, c);
    if (state.shots[target][index] !== null) return null;

    const hit = state.fleets[target].some((ship) => ship.cells.includes(index));
    const shots = [state.shots[0].slice(), state.shots[1].slice()];
    shots[target][index] = hit ? 'hit' : 'miss';

    const withShots = { ...state, shots, lastMove: { r, c, phase: 'fire', by: player } };
    const sunk = recomputeSunk(withShots);
    const wiped = sunk[target] === state.fleets[target].length && state.fleets[target].length > 0;

    return {
      ...withShots,
      sunk,
      winner: wiped ? player : null,
      turn: wiped ? null : target,
    };
  }

  return null;
}

export function getResult(state) {
  if (state.winner !== null) {
    return { over: true, winner: state.winner, draw: false, counts: state.sunk };
  }
  return { over: false, winner: null, draw: false, counts: state.sunk };
}

// Hide the opponent's fleet. The viewer's own fleet and every shot (incoming
// and outgoing) stay visible; the full board is revealed once the game ends.
export function sanitize(state, viewerSeat) {
  if (state.winner !== null) return state;
  const mask = (p) => (viewerSeat === p ? state.fleets[p] : null);
  return { ...state, fleets: [mask(0), mask(1)] };
}
