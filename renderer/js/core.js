'use strict';
/* Lahatra Windows — noyau : utilitaires, dates, modèle, réglages, Firestore */
const L = window.L = {};

L.$ = (s, r) => (r || document).querySelector(s);
L.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
L.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Icônes (SVG inline) ----------
const ICONS = {
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  tasks: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  repeat: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  left: '<path d="M15 18l-6-6 6-6"/>', right: '<path d="M9 18l6-6-6-6"/>',
  up: '<path d="M18 15l-6-6-6 6"/>', down: '<path d="M6 9l6 6 6-6"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
  sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
  back: '<path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><path d="M18 9l-6 6M12 9l6 6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  palette: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.75 1.5-1.5 0-.4-.15-.7-.4-1-.2-.3-.35-.6-.35-1 0-.85.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-4.4-4.5-8-10-8z"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>',
  keyboard: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>'
};
L.icon = (n, cls) => `<svg class="i ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
L.googleSvg = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>';

// ---------- Dates ----------
L.pad = (n) => String(n).padStart(2, '0');
L.fmt = (d) => `${d.getFullYear()}-${L.pad(d.getMonth() + 1)}-${L.pad(d.getDate())}`;
L.parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
L.today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
L.addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
L.addMonths = (d, n) => {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last));
};
L.startOfWeek = (d) => L.addDays(d, -((d.getDay() + 6) % 7));    // lundi
L.sameDay = (a, b) => L.fmt(a) === L.fmt(b);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
L.fullDate = (d) => cap(new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d));
L.monthYear = (d) => cap(new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(d));
L.shortDate = (d) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(d);
L.dayShort = (d) => new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(d).replace('.', '');
L.relative = (d, today) => {
  const k = L.fmt(d);
  if (k === L.fmt(today)) return "Aujourd'hui";
  if (k === L.fmt(L.addDays(today, 1))) return 'Demain';
  if (k === L.fmt(L.addDays(today, -1))) return 'Hier';
  return L.fullDate(d);
};
L.dueMs = (t) => {
  const [y, m, d] = t.date.split('-').map(Number);
  if (t.time) { const [h, mi] = t.time.split(':').map(Number); return new Date(y, m - 1, d, h, mi, 0).getTime(); }
  return new Date(y, m - 1, d, 23, 59, 59).getTime();
};
L.status = (t, now) => t.done ? 'done' : (L.dueMs(t) < (now || Date.now()) ? 'late' : 'todo');

L.nextDate = (t, today) => {
  const base = L.parse(t.date);
  const step = (d) => t.repeat === 'QUOTIDIEN' ? L.addDays(d, 1) : t.repeat === 'HEBDO' ? L.addDays(d, 7) : t.repeat === 'MENSUEL' ? L.addMonths(d, 1) : d;
  if (t.repeat === 'AUCUNE') return base;
  let n = step(base);
  const td = today || L.today();
  while (n <= td) n = step(n);
  return n;
};

// ---------- Modèle (identique à l'app Android) ----------
const PRIOS = ['HAUTE', 'MOYENNE', 'BASSE'];
const REPS = ['AUCUNE', 'QUOTIDIEN', 'HEBDO', 'MENSUEL'];
L.PRIO_LABEL = { HAUTE: 'Haute', MOYENNE: 'Moyenne', BASSE: 'Basse' };
L.REP_LABEL = { AUCUNE: 'Jamais', QUOTIDIEN: 'Chaque jour', HEBDO: 'Chaque semaine', MENSUEL: 'Chaque mois' };
L.CATEGORIES = ['Personnel', 'Travail', 'Études', 'Famille', 'Santé', 'Finances', 'Autre'];

L.parseTask = (id, data) => {
  if (!data || typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return null;
  return {
    id,
    title: String(data.title || ''),
    date: data.date,
    time: typeof data.time === 'string' && /^\d{2}:\d{2}/.test(data.time) ? data.time.slice(0, 5) : null,
    priority: PRIOS.includes(data.priority) ? data.priority : 'MOYENNE',
    note: String(data.note || ''),
    done: data.done === true,
    alarm: data.alarm === true,
    category: String(data.category || ''),
    repeat: REPS.includes(data.repeat) ? data.repeat : 'AUCUNE',
    createdAt: Number(data.createdAt) || 0,
    completedAt: data.completedAt != null ? Number(data.completedAt) : null
  };
};
L.toDoc = (t) => ({
  title: t.title, date: t.date, time: t.time || null, priority: t.priority, note: t.note || '',
  done: !!t.done, alarm: !!t.alarm, category: t.category || '', repeat: t.repeat || 'AUCUNE',
  createdAt: t.createdAt || Date.now(), completedAt: t.completedAt == null ? null : t.completedAt
});
L.sortDay = (arr) => arr.slice().sort((a, b) =>
  (a.done - b.done) || String(a.time || '99:99').localeCompare(String(b.time || '99:99')) ||
  (PRIOS.indexOf(a.priority) - PRIOS.indexOf(b.priority)) || (a.createdAt - b.createdAt));
L.groupBy = (arr, key) => arr.reduce((m, x) => { (m[x[key]] = m[x[key]] || []).push(x); return m; }, {});

// ---------- Réglages locaux ----------
const DEFAULTS = { theme: 'system', morningOn: false, morningTime: '07:00', snooze: 10, sound: true, lockMode: '5', zoom: 1, calExpanded: true };
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignoré */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignoré */ } }
};
L.LS = LS;
L.settings = Object.assign({}, DEFAULTS, LS.get('lahatra.settings', {}));
L.saveSettings = () => { LS.set('lahatra.settings', L.settings); };
L.applyTheme = () => {
  const t = L.settings.theme;
  const dark = t === 'dark' || (t === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
};

// ---------- PIN (PBKDF2, jamais en clair) ----------
const enc = new TextEncoder();
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
L.pinHash = async (pin, saltB64) => {
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(saltB64), iterations: 100000, hash: 'SHA-256' }, key, 256);
  return b64(new Uint8Array(bits));
};
L.hasPin = () => !!LS.get('lahatra.pin', null);
L.pinLength = () => (LS.get('lahatra.pin', { len: 4 }).len) || 4;
L.setPin = async (pin) => {
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  LS.set('lahatra.pin', { salt, hash: await L.pinHash(pin, salt), len: pin.length });
};
L.clearPin = () => LS.del('lahatra.pin');
L.checkPin = async (pin) => {
  const p = LS.get('lahatra.pin', null);
  if (!p) return false;
  return (await L.pinHash(pin, p.salt)) === p.hash;
};

// ---------- État ----------
L.user = null;
L.tasks = [];
L.loaded = false;
L.now = Date.now();
L.view = 'agenda';
L.selected = L.today();
L.filter = { q: '', status: 'all', cat: null };
L.syncPending = false;

// ---------- Toast ----------
L.toast = (msg, isErr) => {
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  L.$('#toasts').appendChild(el);
  setTimeout(() => el.remove(), isErr ? 5000 : 2600);
};

// ---------- Firebase / Firestore ----------
L.init = async () => {
  L.cfg = await window.lahatra.getConfig();
  const fb = L.cfg.firebase || {};
  if (!window.FB || !fb.apiKey || String(fb.apiKey).startsWith('REMPLACER')) return false;
  const F = window.FB;
  L.app = F.initializeApp(fb);
  L.auth = F.initializeAuth(L.app, { persistence: [F.indexedDBLocalPersistence, F.browserLocalPersistence] });
  L.fs = F.initializeFirestore(L.app, { localCache: F.persistentLocalCache({}), experimentalAutoDetectLongPolling: true });
  return true;
};
L.errMsg = (e) => String((e && e.message) || e || 'Erreur inconnue').replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

L.listen = (uid) => {
  const F = window.FB;
  L.stopListen();
  L.loaded = false;
  L.unsub = F.onSnapshot(F.collection(L.fs, 'users', uid, 'tasks'), { includeMetadataChanges: true }, (snap) => {
    L.tasks = snap.docs.map((d) => L.parseTask(d.id, d.data())).filter(Boolean);
    L.syncPending = snap.metadata.hasPendingWrites;
    L.loaded = true;
    if (L.onData) L.onData();
  }, (err) => {
    L.toast('Synchronisation impossible : ' + L.errMsg(err), true);
  });
};
L.stopListen = () => { if (L.unsub) { L.unsub(); L.unsub = null; } };

L.saveTask = (t) => {
  const F = window.FB;
  if (!L.user) return Promise.resolve();
  const ref = t.id ? F.doc(L.fs, 'users', L.user.uid, 'tasks', t.id) : F.doc(F.collection(L.fs, 'users', L.user.uid, 'tasks'));
  return F.setDoc(ref, L.toDoc(t)).catch((e) => L.toast('Enregistrement impossible : ' + L.errMsg(e), true));
};
L.deleteTask = (id) => {
  const F = window.FB;
  return F.deleteDoc(F.doc(L.fs, 'users', L.user.uid, 'tasks', id)).catch((e) => L.toast('Suppression impossible : ' + L.errMsg(e), true));
};
L.setDone = (t, done) => {
  const F = window.FB;
  const now = Date.now();
  const p = F.updateDoc(F.doc(L.fs, 'users', L.user.uid, 'tasks', t.id), { done, completedAt: done ? now : null })
    .catch((e) => L.toast('Mise à jour impossible : ' + L.errMsg(e), true));
  if (done && t.repeat !== 'AUCUNE') {
    L.saveTask(Object.assign({}, t, { id: '', date: L.fmt(L.nextDate(t)), done: false, completedAt: null, createdAt: now }));
  }
  return p;
};
L.toggleDone = (id) => { const t = L.tasks.find((x) => x.id === id); if (t) return L.setDone(t, !t.done); };
