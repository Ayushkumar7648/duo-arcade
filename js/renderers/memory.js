import { CARDS, ROWS, COLS } from '../../shared/games/memory.js';

const FACES = [
  { glyph: '◆', color: '#f472b6' },
  { glyph: '●', color: '#38bdf8' },
  { glyph: '▲', color: '#4ade80' },
  { glyph: '★', color: '#ffd166' },
  { glyph: '■', color: '#a78bfa' },
  { glyph: '♥', color: '#ff6b6b' },
  { glyph: '♣', color: '#22d3ee' },
  { glyph: '♦', color: '#fb923c' },
];

export function render(state, ctx) {
  const flipped = new Set(state.flipped || []);
  const miss = new Set(state.lastPair || []);
  const match = new Set(state.lastMatch || []);

  let cards = '';
  for (let i = 0; i < CARDS; i++) {
    const isMatched = state.matched[i];
    const isOpen = isMatched || flipped.has(i) || miss.has(i);
    const symbol = state.deck[i];
    const face = isOpen && symbol !== null ? FACES[symbol % FACES.length] : null;
    const owner = state.owners[i];

    const classes = ['mem-card',
      owner === 0 ? 'p1' : owner === 1 ? 'p2' : '',
      isMatched ? 'is-matched' : '',
      flipped.has(i) ? 'is-open' : '',
      miss.has(i) ? 'is-miss' : '',
      match.has(i) ? 'is-pop' : '',
      state.lastMove === i ? 'is-last' : ''].filter(Boolean).join(' ');

    const inner = face
      ? `<span class="mem-face" style="--face:${face.color}">${face.glyph}</span>`
      : '<span class="mem-back"></span>';

    const disabled = !ctx.canMove || isMatched || flipped.has(i);
    cards += `<button type="button" class="${classes}" data-move='{"card":${i}}'
      aria-label="Card ${i + 1}${isOpen && symbol !== null ? '' : ', face down'}"
      ${disabled ? 'disabled' : ''}>${inner}</button>`;
  }

  return `<div class="mem-board" role="grid" aria-label="Memory board"
    style="grid-template-columns:repeat(${COLS},1fr);grid-template-rows:repeat(${ROWS},1fr)">${cards}</div>`;
}
