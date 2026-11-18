import { GRID } from '../../shared/games/dotsboxes.js';

const POS = [40, 113.33, 186.67, 260];

function ownerClass(owner) {
  return owner === 0 ? 'p1' : owner === 1 ? 'p2' : '';
}

export function render(state, ctx) {
  let boxes = '';
  let edges = '';
  let dots = '';

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const owner = state.boxes[r * GRID + c];
      const cls = ['db-box', ownerClass(owner)].filter(Boolean).join(' ');
      boxes += `<rect class="${cls}" x="${POS[c] + 8}" y="${POS[r] + 8}"
        width="${POS[1] - POS[0] - 16}" height="${POS[1] - POS[0] - 16}" rx="8"/>
        ${owner !== null ? `<text class="db-box-label ${ownerClass(owner)}" x="${POS[c] + (POS[1] - POS[0]) / 2}"
        y="${POS[r] + (POS[1] - POS[0]) / 2 + 7}">${owner + 1}</text>` : ''}`;
    }
  }

  for (let r = 0; r <= GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const owner = state.h[r * GRID + c];
      const recent = state.lastMove?.o === 'h' && state.lastMove.r === r && state.lastMove.c === c;
      edges += `<line class="db-edge ${ownerClass(owner)} ${recent ? 'recent' : ''}" x1="${POS[c]}" y1="${POS[r]}"
        x2="${POS[c + 1]}" y2="${POS[r]}" data-move='{"o":"h","r":${r},"c":${c}}'
        role="button" aria-label="Horizontal edge row ${r}, column ${c}"/>`;
    }
  }

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c <= GRID; c++) {
      const owner = state.v[r * (GRID + 1) + c];
      const recent = state.lastMove?.o === 'v' && state.lastMove.r === r && state.lastMove.c === c;
      edges += `<line class="db-edge ${ownerClass(owner)} ${recent ? 'recent' : ''}" x1="${POS[c]}" y1="${POS[r]}"
        x2="${POS[c]}" y2="${POS[r + 1]}" data-move='{"o":"v","r":${r},"c":${c}}'
        role="button" aria-label="Vertical edge row ${r}, column ${c}"/>`;
    }
  }

  for (let r = 0; r <= GRID; r++) {
    for (let c = 0; c <= GRID; c++) {
      dots += `<circle class="db-dot" cx="${POS[c]}" cy="${POS[r]}" r="4.6"/>`;
    }
  }

  return `<div class="db-board ${ctx.canMove ? '' : 'is-locked'}">
    <svg viewBox="0 0 300 300" role="group" aria-label="Dots and Boxes board">
      <g class="db-boxes">${boxes}</g>
      <g class="db-edges">${edges}</g>
      <g class="db-dots">${dots}</g>
    </svg>
  </div>`;
}
