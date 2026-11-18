// A deliberately tiny observable store. Screens subscribe to it and patch only
// the parts of the DOM that changed, which keeps board animations intact.
export function createStore(initial) {
  let state = { ...initial };
  const subscribers = new Set();

  return {
    get: () => state,
    set(patch) {
      const next = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...next };
      subscribers.forEach((fn) => fn(state));
      return state;
    },
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
  };
}

const savedMute = (() => {
  try { return localStorage.getItem('duo-arcade-muted') === '1'; } catch { return false; }
})();

export const store = createStore({
  screen: 'hub',          // 'hub' | 'mode' | 'lobby' | 'game'
  selectedGameId: null,
  mode: null,             // 'offline' | 'online'
  offline: null,
  online: null,
  connection: 'idle',     // 'idle' | 'connecting' | 'connected' | 'disconnected'
  modal: null,
  toast: null,
  muted: savedMute,
});

export function toggleMute() {
  const muted = !store.get().muted;
  try { localStorage.setItem('duo-arcade-muted', muted ? '1' : '0'); } catch { /* storage disabled */ }
  store.set({ muted });
  return muted;
}
