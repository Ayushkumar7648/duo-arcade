// Dots & Boxes on a 3x3 box grid (4x4 dots). Claim an edge to capture boxes;
// capturing a box earns another turn. Most boxes wins.

export const meta = {
  id: 'dotsboxes',
  name: 'Dots & Boxes',
  tagline: 'Claim edges. Capture boxes. Outsmart your rival.',
  rules: 'Draw a line between two dots. Complete the fourth side of a box to claim it and take another turn. Most boxes at the end wins.',
  accent: '#4ade80',
  accentSoft: 'rgba(74,222,128,.18)',
  glyph: 'D&B',
  playAgainLabel: 'Play Again',
  instantRematch: false,
};

export const GRID = 3;
const hIndex = (r, c) => r * GRID + c;
const vIndex = (r, c) => r * (GRID + 1) + c;
const bIndex = (r, c) => r * GRID + c;

export function createState() {
  return {
    h: Array((GRID + 1) * GRID).fill(null),
    v: Array(GRID * (GRID + 1)).fill(null),
    boxes: Array(GRID * GRID).fill(null),
    turn: 0,
    lastMove: null,
  };
}

function boxIsComplete(h, v, r, c) {
  return h[hIndex(r, c)] !== null && h[hIndex(r + 1, c)] !== null
    && v[vIndex(r, c)] !== null && v[vIndex(r, c + 1)] !== null;
}

export function applyMove(state, move, player) {
  if (state.turn !== player) return null;
  const { o, r, c } = move || {};
  if (!Number.isInteger(r) || !Number.isInteger(c)) return null;

  const h = [...state.h];
  const v = [...state.v];
  const boxes = [...state.boxes];
  let candidates = [];

  if (o === 'h') {
    if (r < 0 || r > GRID || c < 0 || c >= GRID) return null;
    const idx = hIndex(r, c);
    if (h[idx] !== null) return null;
    h[idx] = player;
    if (r > 0) candidates.push([r - 1, c]);
    if (r < GRID) candidates.push([r, c]);
  } else if (o === 'v') {
    if (r < 0 || r >= GRID || c < 0 || c > GRID) return null;
    const idx = vIndex(r, c);
    if (v[idx] !== null) return null;
    v[idx] = player;
    if (c > 0) candidates.push([r, c - 1]);
    if (c < GRID) candidates.push([r, c]);
  } else {
    return null;
  }

  let captured = 0;
  for (const [br, bc] of candidates) {
    const bi = bIndex(br, bc);
    if (boxes[bi] === null && boxIsComplete(h, v, br, bc)) {
      boxes[bi] = player;
      captured++;
    }
  }

  return {
    h, v, boxes,
    turn: captured > 0 ? player : 1 - player,
    lastMove: { o, r, c },
  };
}

export function getResult(state) {
  if (!state.boxes.every((owner) => owner !== null)) {
    const counts = [0, 0];
    state.boxes.forEach((owner) => { if (owner !== null) counts[owner]++; });
    return { over: false, winner: null, draw: false, counts };
  }
  const counts = [0, 0];
  state.boxes.forEach((owner) => { counts[owner]++; });
  const winner = counts[0] === counts[1] ? null : (counts[0] > counts[1] ? 0 : 1);
  return { over: true, winner, draw: winner === null, counts };
}
