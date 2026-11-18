// Single import surface for both the browser and the server.
import * as tictactoe from './tictactoe.js';
import * as connectfour from './connectfour.js';
import * as rps from './rps.js';
import * as dotsboxes from './dotsboxes.js';

export const games = { tictactoe, connectfour, rps, dotsboxes };
export const gameList = [tictactoe, connectfour, rps, dotsboxes].map((g) => g.meta);

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
