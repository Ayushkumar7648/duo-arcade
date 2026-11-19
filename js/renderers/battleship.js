import { SIZE, FLEET } from '../../shared/games/battleship.js';
import { escapeHtml } from '../ui.js';

function ownerClass(owner) {
  return owner === 0 ? 'p1' : owner === 1 ? 'p2' : '';
}

function grid({ fleet, shots, interactive, canMove, lastMove, showLast, label }) {
  const shipCells = new Set();
  (fleet || []).forEach((ship) => ship.cells.forEach((i) => shipCells.add(i)));

  let cells = '';
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const index = r * SIZE + c;
      const shot = shots[index];
      const hasShip = shipCells.has(index);
      const isLast = showLast && lastMove?.r === r && lastMove?.c === c;
      const classes = ['bs-cell',
        hasShip ? 'ship' : '',
        shot === 'hit' ? 'hit' : shot === 'miss' ? 'miss' : '',
        isLast ? 'last' : ''].filter(Boolean).join(' ');

      if (interactive) {
        const disabled = !canMove || shot !== null;
        cells += `<button type="button" class="${classes}" data-move='{"r":${r},"c":${c}}'
          aria-label="Row ${r + 1}, column ${c + 1}" ${disabled ? 'disabled' : ''}></button>`;
      } else {
        cells += `<span class="${classes}"></span>`;
      }
    }
  }
  return `<div class="bs-grid" role="grid" aria-label="${escapeHtml(label)}"
    style="grid-template-columns:repeat(${SIZE},1fr)">${cells}</div>`;
}

function fleetLegend(placedCount, sunkCount, mode) {
  let chips = '';
  for (let i = 0; i < FLEET.length; i++) {
    const size = FLEET[i];
    let status = '';
    if (mode === 'place') status = i < placedCount ? 'done' : i === placedCount ? 'next' : '';
    else status = i < sunkCount ? 'sunk' : '';
    let dots = '';
    for (let d = 0; d < size; d++) dots += '<i></i>';
    chips += `<span class="bs-ship ${status}">${dots}</span>`;
  }
  return `<div class="bs-legend">${chips}</div>`;
}

export function render(state, ctx) {
  const viewer = Number.isInteger(ctx.viewer) ? ctx.viewer : 0;
  const enemy = 1 - viewer;
  const labels = ctx.labels || ['Player 1', 'Player 2'];

  if (state.phase === 'placing') {
    const placed = state.placed[viewer];
    const size = FLEET[placed];
    const horizontal = state.orientation === 'h';
    const ownFleet = state.fleets[viewer];
    const lastIsOwn = state.lastMove?.by === viewer;

    const hint = size === undefined
      ? 'Fleet ready.'
      : `Place your size-${size} ship — click a square to anchor its top-left end.`;

    return `<div class="bs-stage placing">
      <div class="bs-panel">
        <div class="bs-panel-head">
          <span class="bs-panel-title ${ownerClass(viewer)}">${escapeHtml(labels[viewer])} · your waters</span>
          <small>${escapeHtml(hint)}</small>
        </div>
        ${grid({ fleet: ownFleet, shots: state.shots[viewer], interactive: true, canMove: ctx.canMove, lastMove: state.lastMove, showLast: lastIsOwn, label: 'Your fleet placement' })}
      </div>
      <div class="bs-controls">
        <button type="button" class="bs-orient ${horizontal ? 'h' : 'v'}" data-move='{"toggle":true}'
          ${ctx.canMove && size !== undefined ? '' : 'disabled'}>
          <span class="bs-orient-icon"></span>
          ${horizontal ? 'Horizontal' : 'Vertical'}
        </button>
        ${fleetLegend(placed, 0, 'place')}
      </div>
    </div>`;
  }

  const enemySunk = state.sunk[enemy];
  const ownSunk = state.sunk[viewer];
  const lastIsFire = state.lastMove?.phase === 'fire';

  return `<div class="bs-stage firing">
    <div class="bs-panel enemy">
      <div class="bs-panel-head">
        <span class="bs-panel-title ${ownerClass(enemy)}">${escapeHtml(labels[enemy])} · enemy waters</span>
        <small>${enemySunk}/${FLEET.length} sunk</small>
      </div>
      ${grid({ fleet: null, shots: state.shots[enemy], interactive: true, canMove: ctx.canMove, lastMove: state.lastMove, showLast: lastIsFire && state.lastMove.by === viewer, label: 'Enemy waters' })}
    </div>
    <div class="bs-panel own">
      <div class="bs-panel-head">
        <span class="bs-panel-title ${ownerClass(viewer)}">Your fleet</span>
        <small>${ownSunk}/${FLEET.length} lost</small>
      </div>
      ${grid({ fleet: state.fleets[viewer], shots: state.shots[viewer], interactive: false, canMove: false, lastMove: state.lastMove, showLast: lastIsFire && state.lastMove.by === enemy, label: 'Your fleet' })}
      ${fleetLegend(0, ownSunk, 'fire')}
    </div>
  </div>`;
}
