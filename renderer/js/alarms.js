'use strict';
/* Lahatra Windows — alarmes : son, notifications, rappels, report, alarme du matin */
L.actions = L.actions || {};

L.fired = L.LS.get('lahatra.fired', {});
L.snoozes = L.LS.get('lahatra.snoozes', {});
L.alarmQueue = [];

// ---------- Son (Web Audio, aucune ressource externe) ----------
L.audio = null;
L.beepTimer = null;
L.beepStopTimer = null;
L.startBeep = () => {
  if (!L.settings.sound || L.beepTimer) return;
  try {
    L.audio = L.audio || new (window.AudioContext || window.webkitAudioContext)();
    if (L.audio.state === 'suspended') L.audio.resume();
    const play = () => {
      const t0 = L.audio.currentTime;
      [[880, 0], [1175, 0.2], [880, 0.4], [1175, 0.6]].forEach(([f, o]) => {
        const osc = L.audio.createOscillator();
        const g = L.audio.createGain();
        osc.type = 'sine'; osc.frequency.value = f;
        g.gain.setValueAtTime(0, t0 + o);
        g.gain.linearRampToValueAtTime(0.25, t0 + o + 0.02);
        g.gain.linearRampToValueAtTime(0, t0 + o + 0.17);
        osc.connect(g); g.connect(L.audio.destination);
        osc.start(t0 + o); osc.stop(t0 + o + 0.2);
      });
    };
    play();
    L.beepTimer = setInterval(play, 1600);
    L.beepStopTimer = setTimeout(L.stopBeep, 120000);   // 2 minutes max
  } catch (e) { /* audio indisponible */ }
};
L.stopBeep = () => {
  clearInterval(L.beepTimer); clearTimeout(L.beepStopTimer);
  L.beepTimer = null; L.beepStopTimer = null;
};

L.notify = (title, body) => {
  try {
    const n = new Notification(title, { body, silent: true });
    n.onclick = () => window.lahatra.showWindow();
  } catch (e) { /* notifications indisponibles */ }
};

// ---------- File d'alarmes ----------
L.pushAlarm = (item) => {
  L.alarmQueue.push(item);
  window.lahatra.alertWindow();
  L.startBeep();
  L.renderAlarm();
};

L.fireAlarm = (task, snoozed) => {
  L.notify((snoozed ? '⏰ Rappel : ' : '⏰ ') + task.title, task.note || ('Prévu à ' + (task.time || '')));
  L.pushAlarm({ type: 'task', task, snoozed });
};

L.fireMorning = () => {
  const today = L.fmt(L.today());
  const list = L.sortDay(L.tasks.filter((t) => !t.done && t.date === today));
  const title = list.length ? `Bonjour ☀️ — ${list.length} tâche${list.length > 1 ? 's' : ''} aujourd'hui` : 'Bonjour ☀️';
  L.notify(title, list.length ? list.slice(0, 5).map((t) => (t.time ? t.time + ' ' : '• ') + t.title).join('\n') : 'Rien de prévu aujourd’hui. Belle journée !');
  L.pushAlarm({ type: 'morning', tasks: list });
};

L.testAlarm = () => {
  const n = new Date();
  L.notify('⏰ Test d’alarme Lahatra', 'Les notifications fonctionnent.');
  L.pushAlarm({
    type: 'task',
    task: { id: 'test', title: 'Test d’alarme Lahatra', date: L.fmt(n), time: L.pad(n.getHours()) + ':' + L.pad(n.getMinutes()), note: 'Si vous entendez ce son, les alarmes fonctionnent.', done: false, priority: 'MOYENNE' }
  });
};

L.pruneAlarms = () => {
  const before = L.alarmQueue.length;
  L.alarmQueue = L.alarmQueue.filter((a) => {
    if (a.type !== 'task' || a.task.id === 'test') return true;
    const t = L.tasks.find((x) => x.id === a.task.id);
    return !!t && !t.done;
  });
  if (L.alarmQueue.length !== before) L.renderAlarm();
};

L.renderAlarm = () => {
  const root = L.$('#alarm-root');
  const a = L.alarmQueue[0];
  if (!a) { root.innerHTML = ''; L.stopBeep(); return; }
  const more = L.alarmQueue.length > 1 ? `<p class="muted" style="margin:.8rem 0 0">+ ${L.alarmQueue.length - 1} autre(s) alarme(s)</p>` : '';
  let inner;
  if (a.type === 'morning') {
    const items = a.tasks.length
      ? '<ul>' + a.tasks.slice(0, 12).map((t) => `<li><b>${L.esc(t.time || '—')}</b><span>${L.esc(t.title)}</span></li>`).join('') + '</ul>' + (a.tasks.length > 12 ? `<p class="muted">… et ${a.tasks.length - 12} autre(s)</p>` : '')
      : '<p class="muted">Aucune tâche prévue aujourd’hui. Belle journée !</p>';
    inner = `<div class="bell">${L.icon('sun')}</div><h2>Bonjour ☀️</h2><div class="when">${L.esc(L.fullDate(L.today()))}</div>${items}
      <div class="acts"><button class="btn" data-action="alarm-close">C’est parti !</button></div>${more}`;
  } else {
    const t = a.task;
    const canDone = !L.locked && t.id !== 'test';
    inner = `<div class="bell">${L.icon('bell')}</div><h2>${L.esc(t.title)}</h2>
      <div class="when">${a.snoozed ? 'Rappel · ' : ''}${L.esc(t.time || '')} · ${L.esc(L.relative(L.parse(t.date), L.today()))}</div>
      ${t.note && !L.locked ? `<p class="muted">${L.esc(t.note)}</p>` : ''}
      <div class="acts">
        ${canDone ? `<button class="btn" data-action="alarm-done">${L.icon('check')} Terminée</button>` : ''}
        <button class="btn ghost" data-action="alarm-snooze">${L.icon('clock')} Reporter ${L.settings.snooze} min</button>
        <button class="btn ghost" data-action="alarm-close">Fermer</button>
      </div>${more}`;
  }
  root.innerHTML = `<div class="alarm-back"><div class="alarm" role="alertdialog" aria-modal="true">${inner}</div></div>`;
};

L.actions['alarm-close'] = () => { L.alarmQueue.shift(); L.renderAlarm(); };
L.actions['alarm-done'] = () => {
  const a = L.alarmQueue.shift();
  if (a && a.type === 'task' && a.task.id !== 'test') { L.setDone(a.task, true); L.toast('Tâche terminée ✓'); }
  L.renderAlarm();
};
L.actions['alarm-snooze'] = () => {
  const a = L.alarmQueue.shift();
  if (a && a.type === 'task' && a.task.id !== 'test') {
    L.snoozes[a.task.id] = Date.now() + L.settings.snooze * 60000;
    L.LS.set('lahatra.snoozes', L.snoozes);
    L.toast(`Rappel dans ${L.settings.snooze} min`);
  } else if (a && a.task && a.task.id === 'test') {
    L.toast('Report simulé (test)');
  }
  L.renderAlarm();
};

// ---------- Moteur (toutes les 5 s) ----------
L.tick = () => {
  L.now = Date.now();
  if (!L.user || !L.loaded) return;
  const now = L.now;
  let changed = false;

  for (const t of L.tasks) {
    if (t.done || !t.alarm || !t.time) continue;
    const due = L.dueMs(t);
    const key = `${t.id}|${t.date}|${t.time}`;
    if (due <= now && !L.fired[key]) {
      L.fired[key] = now; changed = true;
      if (now - due < 6 * 3600 * 1000) L.fireAlarm(t, false);   // alarmes manquées < 6 h
    }
  }
  for (const id of Object.keys(L.snoozes)) {
    if (L.snoozes[id] <= now) {
      delete L.snoozes[id]; changed = true;
      const t = L.tasks.find((x) => x.id === id);
      if (t && !t.done) L.fireAlarm(t, true);
    }
  }
  for (const k of Object.keys(L.fired)) {
    if (now - L.fired[k] > 3 * 86400000) { delete L.fired[k]; changed = true; }
  }
  if (changed) { L.LS.set('lahatra.fired', L.fired); L.LS.set('lahatra.snoozes', L.snoozes); }

  if (L.settings.morningOn) {
    const [h, m] = String(L.settings.morningTime).split(':').map(Number);
    const d = new Date(now);
    const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h || 0, m || 0, 0).getTime();
    const key = L.fmt(d);
    if (now >= at && now < at + 6 * 3600 * 1000 && L.LS.get('lahatra.morning', '') !== key) {
      L.LS.set('lahatra.morning', key);
      L.fireMorning();
    }
  }
};
