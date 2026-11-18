// Rock-Paper-Scissors is simultaneous: both players lock in a choice before
// anything is revealed. Each round is a complete "match" for scoreboard purposes.

export const meta = {
  id: 'rps',
  name: 'Rock · Paper · Scissors',
  tagline: 'Read your rival. Lock in your throw.',
  rules: 'Both players pick secretly, then revealing happens at the same time. Rock beats scissors, scissors beats paper, paper beats rock.',
  accent: '#a78bfa',
  accentSoft: 'rgba(167,139,250,.18)',
  glyph: 'RPS',
  playAgainLabel: 'Next Round',
  instantRematch: true,
};

export const CHOICES = ['rock', 'paper', 'scissors'];
const BEATS = { rock: 'scissors', scissors: 'paper', paper: 'rock' };

export function createState() {
  return { phase: 'choosing', choices: [null, null], outcome: null, round: 1 };
}

export function applyMove(state, move, player) {
  if (state.phase !== 'choosing' || state.choices[player] !== null) return null;
  const choice = move?.choice;
  if (!CHOICES.includes(choice)) return null;

  const choices = [...state.choices];
  choices[player] = choice;
  if (choices.some((v) => v === null)) {
    return { ...state, choices };
  }

  let winner = null;
  if (BEATS[choices[0]] === choices[1]) winner = 0;
  else if (BEATS[choices[1]] === choices[0]) winner = 1;

  return { ...state, choices, phase: 'reveal', outcome: { choices: [...choices], winner } };
}

export function getResult(state) {
  if (state.phase !== 'reveal') return { over: false, winner: null, draw: false };
  return { over: true, winner: state.outcome.winner, draw: state.outcome.winner === null };
}

// Start a fresh round while keeping the round counter visible in the UI.
export function nextRound(state) {
  return { phase: 'choosing', choices: [null, null], outcome: null, round: (state.round || 1) + 1 };
}

// Online privacy: a player may see their own locked-in choice but never the
// opponent's until the reveal phase.
export function sanitize(state, viewerSeat) {
  if (state.phase !== 'choosing') return state;
  const choices = state.choices.map((value, seat) => (seat === viewerSeat ? value : null));
  return { ...state, choices };
}
