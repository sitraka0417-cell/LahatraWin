'use strict';
/* Lahatra Windows — démarrage, événements globaux, verrouillage automatique */
(async function boot() {
  const hideBoot = () => L.$('#boot').classList.add('hidden');

  L.applyTheme();
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', L.applyTheme);
  window.lahatra.setZoom(L.settings.zoom);
  try { L.sys = await window.lahatra.getSystem(); } catch (e) { L.sys = { closeToTray: true, autoStart: false }; }
  try { L.version = await window.lahatra.version(); } catch (e) { L.version = ''; }
  L.lastActivity = Date.now();

  // ----- clics : actions déclaratives -----
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const h = L.actions[el.dataset.action];
    if (h) h(el, e);
  });

  // photo de profil introuvable -> on garde la lettre
  document.addEventListener('error', (e) => {
    if (e.target && e.target.tagName === 'IMG' && e.target.closest('.avatar')) e.target.remove();
  }, true);

  // ----- recherche -----
  L.$('#search').addEventListener('input', (e) => { L.filter.q = e.target.value; L.renderTasksList(); });

  // ----- réglages (interrupteurs, champs) -----
  const markMorningIfPast = () => {
    const [h, m] = String(L.settings.morningTime).split(':').map(Number);
    const d = new Date();
    if (d.getTime() >= new Date(d.getFullYear(), d.getMonth(), d.getDate(), h || 0, m || 0).getTime()) L.LS.set('lahatra.morning', L.fmt(d));
  };
  document.addEventListener('change', async (e) => {
    const t = e.target;
    if (!t || !t.matches) return;
    if (t.matches('[data-toggle]')) {
      const k = t.dataset.toggle;
      if (k === 'pin') {
        if (t.checked) { t.checked = false; L.pinSetup(); }
        else { t.checked = true; L.pinVerify(() => { L.clearPin(); L.toast('Code PIN désactivé'); L.renderSettings(); }); }
        return;
      }
      L.settings[k] = t.checked;
      if (k === 'morningOn' && t.checked) markMorningIfPast();
      L.saveSettings();
      if (k === 'morningOn') L.renderSettings();
      return;
    }
    if (t.matches('[data-input]')) {
      const k = t.dataset.input;
      if (!t.value) return;
      L.settings[k] = t.value;
      if (k === 'morningTime') markMorningIfPast();
      L.saveSettings();
      return;
    }
    if (t.matches('[data-sys]')) {
      L.sys[t.dataset.sys] = t.checked;
      try { L.sys = await window.lahatra.setSystem(L.sys); } catch (err) { L.toast(L.errMsg(err), true); }
    }
  });

  // ----- clavier -----
  document.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;

    if (L.padTarget) {
      if (/^\d$/.test(e.key) && !e.ctrlKey && !e.altKey) { L.padTarget.press(e.key); e.preventDefault(); return; }
      if (e.key === 'Backspace') { L.padTarget.press('back'); e.preventDefault(); return; }
      if (e.key === 'Enter' && L.padTarget.onEnter && tag !== 'BUTTON') { L.padTarget.onEnter(); e.preventDefault(); return; }
    }

    if (e.key === 'Escape') {
      if (L.alarmQueue.length) { L.actions['alarm-close'](); return; }
      const mods = L.$$('.modal-back');
      const top = mods[mods.length - 1];
      if (top && !L.locked) { if (top._cancel) top._cancel(); else top.remove(); if (!L.$$('.modal-back').length) L.padTarget = null; }
      return;
    }

    if (e.key === 'Enter' && e.ctrlKey) {
      const mods = L.$$('.modal-back');
      const top = mods[mods.length - 1];
      if (top && top._save) { top._save(); e.preventDefault(); }
      return;
    }

    if ((e.key === 'Enter' || e.key === ' ') && tag === 'ARTICLE' && e.target.classList.contains('task')) {
      e.preventDefault(); e.target.click(); return;
    }

    if (!L.user || L.locked) return;
    if (e.ctrlKey && !e.altKey && !e.shiftKey) {
      const k = e.key;
      if (k === 'n' || k === 'N') { e.preventDefault(); if (!L.$$('.modal-back').length) L.actions.new(); }
      else if (k === 'f' || k === 'F') { e.preventDefault(); L.go('tasks'); L.$('#search').focus(); L.$('#search').select(); }
      else if (/^[1-4]$/.test(k)) { e.preventDefault(); L.go(['agenda', 'tasks', 'stats', 'settings'][Number(k) - 1]); }
      else if (k === '+' || k === '=') { e.preventDefault(); L.zoomBy(0.1); }
      else if (k === '-' || k === '_') { e.preventDefault(); L.zoomBy(-0.1); }
      else if (k === '0') { e.preventDefault(); L.zoomBy(0, true); }
    }
  });
  // zoom avec Ctrl + molette
  document.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    L.zoomBy(e.deltaY < 0 ? 0.1 : -0.1);
  }, { passive: false });

  // ----- activité / verrouillage automatique -----
  ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'].forEach((ev) =>
    document.addEventListener(ev, () => { L.lastActivity = Date.now(); }, { passive: true, capture: true }));
  setInterval(() => {
    if (!L.user || L.locked || !L.hasPin()) return;
    const mode = String(L.settings.lockMode);
    const mins = Number(mode);
    if (mode !== 'off' && mins > 0 && Date.now() - L.lastActivity > mins * 60000) L.showLock();
  }, 10000);
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    const el = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = 0;
    if (!L.user || L.locked || !L.hasPin()) return;
    const mode = String(L.settings.lockMode);
    const mins = Number(mode);
    if (mode === '0' || (mode !== 'off' && mins > 0 && el >= mins * 60000)) L.showLock();
    L.tick();
  });
  window.lahatra.on('session-lock', () => { if (L.user) L.showLock(); });
  window.lahatra.on('resume', () => L.tick());
  window.lahatra.on('new-task', () => { if (L.user && !L.locked) L.actions.new(); });
  window.addEventListener('online', () => L.refresh());
  window.addEventListener('offline', () => L.refresh());

  // ----- moteur d'alarmes + rafraîchissement du statut « en retard » -----
  setInterval(() => L.tick(), 5000);
  setInterval(() => { L.now = Date.now(); if (L.user && !L.locked) L.refresh(); }, 30000);

  // ----- Firebase -----
  L.onData = () => { L.pruneAlarms(); L.now = Date.now(); L.refresh(); L.tick(); };

  let ok = false;
  try { ok = await L.init(); } catch (e) { console.error(e); }
  if (!ok) {
    hideBoot();
    L.$('#login').classList.remove('hidden');
    L.renderLogin({ error: 'Configuration Firebase manquante (config.json). Consultez le README.' });
    return;
  }

  let startupChecked = false;
  window.FB.onAuthStateChanged(L.auth, (u) => {
    if (u) {
      L.user = { uid: u.uid, name: u.displayName || '', email: u.email || '', photo: u.photoURL || null, first: (u.displayName || '').trim().split(' ')[0] || '' };
      L.listen(u.uid);
      hideBoot();
      L.$('#login').classList.add('hidden');
      L.$('#shell').classList.remove('hidden');
      L.go(L.view);
      if (!startupChecked) { startupChecked = true; if (L.hasPin()) L.showLock(); }
    } else {
      L.user = null; L.tasks = []; L.loaded = false; L.stopListen();
      L.closeModals(); L.alarmQueue = []; L.renderAlarm();
      if (L.locked) L.unlock();
      startupChecked = true;
      hideBoot();
      L.$('#shell').classList.add('hidden');
      L.$('#login').classList.remove('hidden');
      L.renderLogin();
    }
  }, (err) => {
    hideBoot();
    L.$('#login').classList.remove('hidden');
    L.renderLogin({ error: 'Erreur d’authentification : ' + L.errMsg(err) });
  });
})();
