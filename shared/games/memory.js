// Memory Match: a 4x4 grid hides eight pairs of symbols. On your turn flip two
// cards; a match keeps them face up and grants another turn, a miss flips them
// back and passes the turn. Most pairs wins.
//
// Card faces are hidden from face-down positions via sanitize() so an online
// opponent cannot peek at the deal by reading the raw snapshot.

export const meta = {
  id: 'memory',
  name: 'Memory Match',
  tagline: 'Flip two cards, find the pairs, keep your turn.',
  rules: 'Flip two cards on your turn. Matching cards stay face up and you go again; a miss flips them back and passes the turn. Claim the most pairs to win.',
  accent: '#f472b6',
  accentSoft: 'rgba(244,114,182,.18)',
  glyph: 'MEM',
  playAgainLabel: 'Play Again',
  instantRematch: false,
};

export const ROWS = 4;
export const COLS = 4;
export const CARDS = ROWS * COLS;
const PAIRS = CARDS / 2;

function shuffledDeck() {
  const deck = [];
  for (let i = 0; i < PAIRS; i++) deck.push(i, i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function createState() {
  return {
    deck: shuffledDeck(),
    matched: Array(CARDS).fill(false),
    owners: Array(CARDS).fill(null),
    flipped: [],
    lastPair: null,
    lastMatch: null,
    turn: 0,
    lastMove: null,
    moves: 0,
  };
}

function counts(owners) {
  const tally = [0, 0];
  owners.forEach((owner) => { if (owner !== null) tally[owner]++; });
  return tally;
}

export function applyMove(state, move, player) {
  if (state.turn !== player) return null;
  const card = Number(move?.card);
  if (!Number.isInteger(card) || card < 0 || card >= CARDS) return null;
  if (state.matched[card] || state.flipped.includes(card)) return null;

  const flipped = [...state.flipped, card];
  const next = {
    ...state,
    flipped,
    lastPair: null,
    lastMatch: null,
    lastMove: card,
    moves: state.moves + 1,
  };

  if (flipped.length < 2) return next;

  const [a, b] = flipped;
  if (state.deck[a] === state.deck[b]) {
    const matched = [...state.matched];
    const owners = [...state.owners];
    matched[a] = true;
    matched[b] = true;
    owners[a] = player;
    owners[b] = player;
    const done = matched.every(Boolean);
    return { ...next, matched, owners, flipped: [], lastMatch: [a, b], turn: done ? null : player };
  }

  return { ...next, flipped: [], lastPair: [a, b], turn: 1 - player };
}

export function getResult(state) {
  if (state.matched.every(Boolean)) {
    const tally = counts(state.owners);
    const winner = tally[0] === tally[1] ? null : (tally[0] > tally[1] ? 0 : 1);
    return { over: true, winner, draw: winner === null, counts: tally };
  }
  return { over: false, winner: null, draw: false, counts: counts(state.owners) };
}

// Online privacy: only cards that are face up (matched, currently flipped, or
// the just-revealed miss) expose their symbol to a client.
export function sanitize(state, viewerSeat) {
  const visible = new Set(state.flipped);
  if (state.lastPair) state.lastPair.forEach((i) => visible.add(i));
  state.matched.forEach((isMatched, i) => { if (isMatched) visible.add(i); });
  return {
    ...state,
    deck: state.deck.map((symbol, i) => (visible.has(i) ? symbol : null)),
  };
}
