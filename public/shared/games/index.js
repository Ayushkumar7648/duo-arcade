// Single import surface for both the browser and the server.
import * as tictactoe from './tictactoe.js';
import * as connectfour from './connectfour.js';
import * as rps from './rps.js';
import * as dotsboxes from './dotsboxes.js';
import * as memory from './memory.js';
import * as ultimatettt from './ultimatettt.js';
import * as battleship from './battleship.js';
import * as reversi from './reversi.js';

const modules = [tictactoe, connectfour, rps, dotsboxes, memory, ultimatettt, battleship, reversi];

export const games = Object.fromEntries(modules.map((g) => [g.meta.id, g]));
export const gameList = modules.map((g) => g.meta);

export function getGame(id) {
  return games[id] || null;
}

export function freshState(gameId) {
  const game = getGame(gameId);
  return game ? game.createState() : null;
}

export function resultOf(gameId, state) {
  const game = getGame(gameId);
  return game ? game.getResult(state) : { over: false, winner: null, draw: false };
}
