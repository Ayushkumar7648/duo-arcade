import { store } from './store.js';

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);
}

export function classNames(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function toast(message) {
  const id = Date.now() + Math.random();
  store.set({ toast: { id, message } });
  setTimeout(() => {
    if (store.get().toast?.id === id) store.set({ toast: null });
  }, 2400);
}

export function openModal(config) {
  store.set({ modal: { dismissible: true, actions: [], ...config } });
}

export function closeModal() {
  store.set({ modal: null });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch { return false; }
  }
}

// Simple line-art icons keep the bundle dependency-free.
export function gameIcon(id) {
  const common = 'viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
  const icons = {
    tictactoe: `<svg ${common}><rect x="6" y="6" width="36" height="36" rx="5"/><path d="M18 6v36M30 6v36M6 18h36M6 30h36"/><path d="M11 11l5 5m0-5l-5 5" stroke-width="3"/><circle cx="36" cy="36" r="3" stroke-width="3"/></svg>`,
    connectfour: `<svg ${common}><rect x="8" y="6" width="32" height="36" rx="5"/><path d="M18 6v36M28 6v36"/><circle cx="13" cy="34" r="3"/><circle cx="23" cy="34" r="3"/><circle cx="33" cy="24" r="3"/><circle cx="13" cy="24" r="3"/></svg>`,
    rps: `<svg ${common}><path d="M14 34l-6-10 5-3 6 9V10a3 3 0 016 0v14l4-6 4 3-7 13z"/><path d="M10 40h28"/></svg>`,
    dotsboxes: `<svg ${common}><path d="M12 12h24v24H12z"/><path d="M12 12l-4-4M36 12l4-4M12 36l-4 4M36 36l4 4"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="36" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="12" cy="36" r="2" fill="currentColor" stroke="none"/><circle cx="36" cy="36" r="2" fill="currentColor" stroke="none"/><path d="M24 12v12M12 24h12" stroke-width="3"/></svg>`,
    memory: `<svg ${common}><rect x="7" y="16" width="22" height="27" rx="4"/><rect x="19" y="5" width="22" height="27" rx="4"/><path d="M30 12l5 6-5 6-5-6z"/></svg>`,
    ultimatettt: `<svg ${common}><rect x="5" y="5" width="38" height="38" rx="4"/><path d="M17.7 5v38M30.3 5v38M5 17.7h38M5 30.3h38"/><path d="M9 9l4 4m0-4l-4 4" stroke-width="3"/><circle cx="36" cy="36" r="3" stroke-width="3"/></svg>`,
    battleship: `<svg ${common}><path d="M9 29h30l-5 9H14z"/><path d="M17 29V18h10l5 11"/><path d="M21 22h5"/><path d="M6 43c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/></svg>`,
  };
  return icons[id] || '';
}
