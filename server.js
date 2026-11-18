/**
 * Zero-dependency game server.
 *
 * It does two jobs:
 *   1. Serves the static frontend from public/.
 *   2. Runs a tiny RFC-6455 WebSocket server (Socket.io-style event messages)
 *      that owns the authoritative state of every online room.
 *
 * Rules/state transitions come from public/shared/games so the browser and the
 * server can never disagree about what a legal move is.
 */
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gameList, getGame, freshState, resultOf } from './public/shared/games/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 3000;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_MESSAGE = 64 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const rooms = new Map();
let nextClientId = 1;

/* ------------------------------------------------------------------ *
 * Static file server
 * ------------------------------------------------------------------ */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, games: gameList.map((g) => g.id) }));
    return;
  }

  let requested = decodeURIComponent(url.pathname);
  if (requested === '/') requested = '/index.html';
  const filePath = path.resolve(PUBLIC_DIR, `.${requested}`);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep) && filePath !== PUBLIC_DIR) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Client-side routes (none today) fall back to the shell.
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (fallbackErr, shell) => {
        if (fallbackErr) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(shell);
      });
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

/* ------------------------------------------------------------------ *
 * Minimal WebSocket plumbing
 * ------------------------------------------------------------------ */
function encodeFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2); header[0] = 0x81; header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4); header[0] = 0x81; header[1] = 126; header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10); header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function send(client, payload) {
  if (client.destroyed) return;
  try {
    client.socket.write(encodeFrame(JSON.stringify(payload)));
  } catch { /* socket vanished; close handler will clean up */ }
}

function sendClose(client) {
  if (client.destroyed) return;
  try { client.socket.end(Buffer.from([0x88, 0x00])); } catch { /* ignore */ }
}

function readFrames(client) {
  const buf = client.buffer;
  let offset = 0;

  while (buf.length - offset >= 2) {
    const b0 = buf[offset];
    const b1 = buf[offset + 1];
    const fin = (b0 & 0x80) !== 0;
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f;
    let headerLen = 2;

    if (len === 126) {
      if (buf.length - offset < 4) break;
      len = buf.readUInt16BE(offset + 2); headerLen = 4;
    } else if (len === 127) {
      if (buf.length - offset < 10) break;
      len = Number(buf.readBigUInt64BE(offset + 2)); headerLen = 10;
    }
    if (len > MAX_MESSAGE) { client.destroyed = true; sendClose(client); return; }

    const maskStart = offset + headerLen;
    if (masked && buf.length - maskStart < 4) break;
    const mask = masked ? buf.subarray(maskStart, maskStart + 4) : null;
    const dataStart = maskStart + (mask ? 4 : 0);
    if (buf.length - dataStart < len) break;

    const payload = Buffer.from(buf.subarray(dataStart, dataStart + len));
    if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    offset = dataStart + len;

    if (opcode === 0x8) { client.destroyed = true; sendClose(client); return; }
    if (opcode === 0x9) {
      try { client.socket.write(Buffer.concat([Buffer.from([0x8a, 0x00])])); } catch { /* ignore */ }
      continue;
    }
    if (opcode === 0xa) continue;

    if (opcode === 0x1 || opcode === 0x2 || opcode === 0x0) {
      client.fragments.push(payload);
      if (fin) {
        const text = Buffer.concat(client.fragments).toString('utf8');
        client.fragments = [];
        if (text.length <= MAX_MESSAGE) handleMessage(client, text);
      }
    }
  }
  client.buffer = buf.subarray(offset);
}

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (req.url !== '/ws' || req.headers['sec-websocket-version'] !== '13' || !key) {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n'); socket.destroy(); return;
  }
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  socket.setNoDelay(true);

  const client = {
    id: nextClientId++,
    socket,
    buffer: Buffer.alloc(0),
    fragments: [],
    destroyed: false,
    nick: 'Player',
    roomCode: null,
    seat: null,
  };
  socket.on('data', (chunk) => {
    client.buffer = Buffer.concat([client.buffer, chunk]);
    readFrames(client);
  });
  socket.on('error', () => { client.destroyed = true; });
  socket.on('end', () => onDisconnect(client));
  socket.on('close', () => onDisconnect(client));
});

/* ------------------------------------------------------------------ *
 * Room helpers / authoritative state
 * ------------------------------------------------------------------ */
function cleanNick(value, fallback) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 16) || fallback;
}

function makeCode() {
  let code;
  do {
    code = Array.from({ length: 5 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function getSeat(room, index) {
  return room.seats[index] || null;
}

function bothConnected(room) {
  return room.seats[0]?.connected === true && room.seats[1]?.connected === true;
}

function snapshot(room, viewerSeat) {
  const game = getGame(room.gameId);
  const state = game?.sanitize ? game.sanitize(room.state, viewerSeat) : room.state;
  return {
    type: 'room',
    room: {
      code: room.code,
      gameId: room.gameId,
      gameList,
      status: room.status,
      round: room.round,
      scores: [...room.scores],
      result: room.result ? { ...room.result } : null,
      state,
      you: viewerSeat,
      seats: room.seats.map((seat, index) => seat ? {
        nick: seat.nick,
        connected: seat.connected,
        isHost: index === 0,
        isYou: index === viewerSeat,
      } : null),
      rematchVotes: [...room.rematchVotes],
      switchVote: room.switchVotes[viewerSeat] || null,
      opponentConnected: bothConnected(room),
    },
  };
}

function broadcast(room) {
  room.seats.forEach((seat, index) => {
    if (seat?.connected) send(seat.client, snapshot(room, index));
  });
}

function leaveRoom(client, notify = true) {
  const room = rooms.get(client.roomCode);
  if (!room) { client.roomCode = null; client.seat = null; return; }
  const index = client.seat;
  const seat = getSeat(room, index);
  if (seat && seat.client.id === client.id) {
    room.seats[index] = null;
    if (notify) {
      send(client, { type: 'left' });
      broadcast(room);
    }
  }
  client.roomCode = null;
  client.seat = null;
  if (!room.seats.some(Boolean)) rooms.delete(room.code);
}

function onDisconnect(client) {
  const room = rooms.get(client.roomCode);
  if (!room) return;
  const seat = getSeat(room, client.seat);
  if (seat && seat.connected && seat.client.id === client.id) {
    seat.connected = false;
    room.rematchVotes = [false, false];
    room.switchVotes = [null, null];
    broadcast(room);
    const otherIndex = client.seat === 0 ? 1 : 0;
    const other = getSeat(room, otherIndex);
    if (other?.connected) send(other.client, { type: 'opponent-left', nick: seat.nick });
  }
}

function attachSeat(client, room, index, nick) {
  const seat = { client, nick: cleanNick(nick, index === 0 ? 'Player 1' : 'Player 2'), connected: true };
  room.seats[index] = seat;
  client.roomCode = room.code;
  client.seat = index;
  client.nick = seat.nick;
  if (bothConnected(room) && room.status === 'waiting') room.status = 'playing';
  broadcast(room);
}

/* ------------------------------------------------------------------ *
 * Message router
 * ------------------------------------------------------------------ */
function handleMessage(client, text) {
  let msg;
  try { msg = JSON.parse(text); } catch { return; }
  if (!msg || typeof msg.type !== 'string') return;

  const room = rooms.get(client.roomCode);

  switch (msg.type) {
    case 'ping':
      send(client, { type: 'pong' });
      return;

    case 'create': {
      if (!getGame(msg.gameId)) { send(client, { type: 'error', message: 'Unknown game.' }); return; }
      if (client.roomCode) leaveRoom(client);
      const code = makeCode();
      const newRoom = {
        code,
        gameId: msg.gameId,
        status: 'waiting',
        round: 1,
        scores: [0, 0, 0],
        result: null,
        state: freshState(msg.gameId),
        seats: [null, null],
        rematchVotes: [false, false],
        switchVotes: [null, null],
      };
      rooms.set(code, newRoom);
      attachSeat(client, newRoom, 0, msg.nick);
      return;
    }

    case 'join':
    case 'resume': {
      const code = String(msg.code || '').trim().toUpperCase();
      const target = rooms.get(code);
      if (!target) {
        send(client, { type: 'error', message: 'Room not found. Double-check the code.' });
        return;
      }
      const nick = cleanNick(msg.nick, 'Player 2');
      if (client.roomCode === code && client.seat !== null) {
        // Already seated (e.g. duplicate resume): just refresh the snapshot.
        broadcast(target);
        return;
      }
      // Prefer reclaiming the same seat after a dropped connection.
      const reconnectIndex = target.seats.findIndex((s) => s && !s.connected && s.nick.toLowerCase() === nick.toLowerCase());
      if (reconnectIndex >= 0) {
        if (client.roomCode) leaveRoom(client, false);
        attachSeat(client, target, reconnectIndex, target.seats[reconnectIndex].nick);
        return;
      }
      const freeIndex = target.seats.findIndex((s) => s === null);
      if (freeIndex < 0) {
        send(client, { type: 'error', message: 'This room is already full.' });
        return;
      }
      if (client.roomCode) leaveRoom(client, false);
      attachSeat(client, target, freeIndex, nick);
      return;
    }

    case 'move': {
      if (!room || room.status !== 'playing' || !bothConnected(room)) return;
      const game = getGame(room.gameId);
      const seat = client.seat;
      if (!game || seat === null) return;
      // RPS is simultaneous; every other game is strictly turn-based.
      if (room.gameId !== 'rps' && room.state.turn !== seat) return;

      const next = game.applyMove(room.state, msg.move, seat);
      if (!next) return;
      room.state = next;

      const result = resultOf(room.gameId, room.state);
      if (result.over && !room.scored) {
        room.scored = true;
        room.status = 'ended';
        room.result = { winner: result.winner, draw: result.draw };
        if (result.draw) room.scores[2]++;
        else if (result.winner !== null) room.scores[result.winner]++;
      }
      broadcast(room);
      return;
    }

    case 'rematch': {
      if (!room || room.status !== 'ended' || client.seat === null || !bothConnected(room)) return;
      room.rematchVotes[client.seat] = true;
      if (room.rematchVotes.every(Boolean)) {
        const game = getGame(room.gameId);
        room.state = game.meta.instantRematch ? game.nextRound(room.state) : freshState(room.gameId);
        room.status = 'playing';
        room.result = null;
        room.scored = false;
        if (!game.meta.instantRematch) room.round++;
        room.rematchVotes = [false, false];
      }
      broadcast(room);
      return;
    }

    case 'cancel-rematch': {
      if (!room || client.seat === null) return;
      room.rematchVotes[client.seat] = false;
      broadcast(room);
      return;
    }

    case 'switch': {
      if (!room || client.seat === null || !getGame(msg.gameId)) return;
      room.switchVotes[client.seat] = msg.gameId;
      if (room.switchVotes[0] && room.switchVotes[0] === room.switchVotes[1]) {
        room.gameId = room.switchVotes[0];
        room.state = freshState(room.gameId);
        room.scores = [0, 0, 0];
        room.round = 1;
        room.result = null;
        room.scored = false;
        room.status = bothConnected(room) ? 'playing' : 'waiting';
        room.rematchVotes = [false, false];
        room.switchVotes = [null, null];
      }
      broadcast(room);
      return;
    }

    case 'cancel-switch': {
      if (!room || client.seat === null) return;
      room.switchVotes[client.seat] = null;
      broadcast(room);
      return;
    }

    case 'leave':
      leaveRoom(client);
      return;

    default:
      return;
  }
}

server.listen(PORT, () => {
  console.log(`Duo Arcade running at http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
});

// Clean up rooms that have been abandoned by both players.
const cleanup = setInterval(() => {
  for (const room of rooms.values()) {
    if (!room.seats.some((s) => s?.connected)) rooms.delete(room.code);
  }
}, 60_000);
cleanup.unref();
