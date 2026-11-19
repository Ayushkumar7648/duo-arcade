# Duo Arcade

Seven two-player mini-games — Tic-Tac-Toe, Connect Four, Rock-Paper-Scissors, Dots & Boxes, Memory Match, Ultimate Tic-Tac-Toe and Battleship — with **offline pass-and-play** and **real-time online rooms**.

## Run

No dependencies and no build step. Node.js 18+ is the only requirement.

```bash
npm start        # or: node server.js
```

Open <http://localhost:3000>. Set `PORT=4000` to use a different port.

To play online, open the app in two browsers (or two devices on the same network, using your machine's LAN IP), create a room in one, and share the code or invite link with the other.

The static build is also published on GitHub Pages. Pages cannot run the Node WebSocket server, so offline mode works there out of the box; for online mode, host `server.js` on a WebSocket-capable service and open the site with `?ws=wss://your-host/ws`. The setting is remembered locally and copied into invite links.

## Project structure

```
duo-arcade/
├── server.js                       # Static host + native WebSocket server + authoritative rooms
├── package.json                    # ESM project, zero dependencies
├── README.md
└── public/
    ├── index.html                  # App shell
    ├── css/styles.css              # Responsive theme, board styles, animations
    ├── shared/games/               # PURE game rules — imported by browser AND server
    │   ├── index.js                # Registry: gameList, getGame, freshState, resultOf
    │   ├── tictactoe.js
    │   ├── connectfour.js
    │   ├── rps.js                  # Includes sanitize() for hidden simultaneous throws
    │   ├── dotsboxes.js
    │   ├── memory.js               # sanitize() hides face-down card symbols
    │   ├── ultimatettt.js
    │   └── battleship.js           # sanitize() hides the opponent's fleet
    └── js/
        ├── app.js                  # Composition root: actions, network events, global overlays
        ├── store.js                # Tiny observable app state (screens/UI only)
        ├── net.js                  # Transport-only WebSocket client with auto-reconnect
        ├── audio.js                # Web Audio API sound effects + mute persistence
        ├── ui.js                   # Escaping, toasts, modals, copy helper, SVG icons
        ├── screens/
        │   ├── hub.js              # Game grid
        │   ├── mode.js             # Offline / online choice + nickname + create/join
        │   ├── lobby.js            # Room code, invite link, waiting lobby
        │   └── game.js             # Shared match screen for both modes
        └── renderers/
            ├── index.js
            ├── tictactoe.js        # Board HTML only; no listeners
            ├── connectfour.js
            ├── rps.js
            ├── dotsboxes.js
            ├── memory.js
            ├── ultimatettt.js
            └── battleship.js
```

## State architecture

The key rule is that **game rules never live inside a screen or in the network layer**.

1. **Pure game modules** (`public/shared/games/*`) export `meta`, `createState()`, `applyMove(state, move, player)`, `getResult(state)`, and optionally `sanitize(state, viewerSeat)` / `nextRound(state)`. They have no DOM or network references. Both the browser and the server import these exact files, so offline and online matches cannot drift.
2. **Offline matches** run entirely in `app.js`. A move is applied locally with `applyMove`, the result is derived with `getResult`, and the scoreboard is updated once per round using a `scored` guard. No server involved.
3. **Online matches** are authoritative on the server. `server.js` stores each room's game state, validates whose turn it is, applies `applyMove`, updates scores, and broadcasts a per-viewer snapshot. RPS snapshots are sanitized so a throw stays hidden until both players lock in.
4. **The view layer** is thin. `store.js` holds UI state; each screen's `update(state)` patches the DOM. Renderers only return HTML — all moves are delegated through `data-move` attributes on the match screen, so the same board code serves offline and online modes.

### Room protocol (JSON over `ws://host/ws`)

Client → server: `create`, `join`, `resume`, `move`, `rematch`, `cancel-rematch`, `switch`, `cancel-switch`, `leave`, `ping`.
Server → client: `room` (full snapshot), `error`, `opponent-left`, `left`, `pong`.

The server reconnects players by room code + nickname, rejects moves from the wrong seat, requires both players to vote for a rematch or a game switch, and keeps scores/round counters for consecutive rounds.

## Game notes

- Nicknames are optional and can be set before starting an offline match.
- Capturing a box in Dots & Boxes grants another turn; the game ends when all boxes are claimed (ties count as draws).
- RPS is simultaneous: on one device, pass the phone after locking in your throw; online, throws stay secret until both are submitted. Each throw is its own scored round.
- Memory Match hides every face-down card in the online snapshot, so the deal cannot be read from the wire.
- Ultimate Tic-Tac-Toe plays inside nine nested boards: your move dictates which board your opponent must play next, and winning three boards in a line takes the game.
- Battleship has a placement phase (each player anchors their fleet, with an orientation toggle) followed by alternating shots. The opponent's fleet is stripped from each online snapshot until the game ends.
- "Switch Game" resets scores for the new game but keeps online players in the same room.
- Sound effects are generated with the Web Audio API; the toggle in the header persists in `localStorage`.
