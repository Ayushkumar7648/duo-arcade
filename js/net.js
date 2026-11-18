/**
 * Client half of the room protocol. It is a transport-only layer: it knows
 * nothing about game rules, screens, or local match state. Game logic is
 * applied by the server for online matches and by the caller for offline ones.
 */
export class Net {
  constructor() {
    this.ws = null;
    this.handlers = new Map();
    this.pending = [];
    this.reconnectTimer = null;
    this.roomCode = null;
    this.nick = null;
    this.attempts = 0;
    this.status = 'idle';
    this.closedByUser = false;
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type)?.delete(fn);
  }

  emit(type, payload) {
    this.handlers.get(type)?.forEach((fn) => fn(payload));
  }

  setStatus(status) {
    if (this.status === status) return;
    this.status = status;
    this.emit('status', status);
  }

  // Same-origin by default (node server). Static hosts such as GitHub Pages
  // can point at a separately hosted server with ?ws=wss://host/ws.
  endpoint() {
    const params = new URLSearchParams(location.search);
    let configured = window.DUO_WS_URL || params.get('ws');
    try {
      if (!configured) configured = localStorage.getItem('duo-arcade-ws');
      else localStorage.setItem('duo-arcade-ws', configured);
    } catch { /* storage disabled */ }
    if (configured) return configured;
    const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${scheme}//${location.host}/ws`;
  }

  connect() {
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;
    this.closedByUser = false;
    this.setStatus(this.attempts ? 'reconnecting' : 'connecting');
    const ws = new WebSocket(this.endpoint());
    this.ws = ws;

    ws.onopen = () => {
      this.attempts = 0;
      this.setStatus('connected');
      this.emit('open');
      const queued = this.pending.splice(0);
      queued.forEach((msg) => ws.send(JSON.stringify(msg)));
      if (this.roomCode) this.send({ type: 'resume', code: this.roomCode, nick: this.nick });
    };

    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      this.emit(msg.type, msg);
      this.emit('message', msg);
    };

    ws.onclose = () => {
      this.ws = null;
      this.setStatus('disconnected');
      this.emit('close');
      if (!this.closedByUser) this.scheduleReconnect();
    };

    ws.onerror = () => { /* onclose always follows and handles retry */ };
  }

  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    const delay = Math.min(1000 * 2 ** this.attempts, 8000);
    this.attempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.pending.push(msg);
      this.connect();
    }
  }

  close() {
    this.closedByUser = true;
    clearTimeout(this.reconnectTimer);
    this.pending = [];
    this.roomCode = null;
    this.nick = null;
    this.attempts = 0;
    this.ws?.close();
    this.ws = null;
    this.setStatus('idle');
  }
}
