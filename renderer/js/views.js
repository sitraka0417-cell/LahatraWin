'use strict';
/* Lahatra Windows — vues : agenda, tâches, statistiques, réglages, éditeur, PIN */
L.actions = L.actions || {};
const E = L.esc;
const NAV = [['agenda', 'calendar', 'Agenda'], ['tasks', 'tasks', 'Tâches'], ['stats', 'chart', 'Statistiques'], ['settings', 'settings', 'Réglages']];

L.avatarHtml = (u, cls) => {
  const ini = (u.name || u.email || '?').trim().charAt(0).toUpperCase() || '?';
  return `<span class="avatar ${cls || ''}">${E(ini)}${u.photo ? `<img src="${E(u.photo)}" alt="" referrerpolicy="no-referrer">` : ''}</span>`;
};

// remplace le HTML en conservant les positions de défilement
L.setHtml = (el, html) => {
  const top = el.scrollTop;
  const left = L.$('.agenda-left', el);
  const lt = left ? left.scrollTop : 0;
  el.innerHTML = html;
  el.scrollTop = top;
  const l2 = L.$('.agenda-left', el);
  if (l2) l2.scrollTop = lt;
};

// ---------- Sidebar ----------
L.renderSidebar = () => {
  const u = L.user;
  if (!u) return;
  const online = navigator.onLine && !L.syncPending;
  L.$('#sidebar').innerHTML =
    `<div class="brand"><img src="icon.png" alt=""><span class="lbl">Lahatra</span></div>` +
    NAV.map(([id, ic, lb]) => `<button class="nav ${L.view === id ? 'active' : ''}" data-action="nav" data-v="${id}" title="${lb}">${L.icon(ic)}<span class="lbl">${lb}</span></button>`).join('') +
    `<div class="side-sp"></div>
     <div class="sync ${navigator.onLine ? '' : 'off'}" title="${navigator.onLine ? (L.syncPending ? 'Synchronisation en cours…' : 'Synchronisé avec Google') : 'Hors ligne : les modifications seront envoyées au retour du réseau'}"><i></i><span class="lbl">${!navigator.onLine ? 'Hors ligne' : (L.syncPending ? 'Synchronisation…' : 'Synchronisé')}</span></div>
     <button class="userchip" data-action="nav" data-v="settings" title="${E(u.email)}">${L.avatarHtml(u)}<span class="who"><b>${E(u.name || 'Compte Google')}</b><small>${E(u.email)}</small></span></button>`;
  void online;
};

// ---------- Cartes tâches ----------
L.cardHtml = (t, now) => {
  const st = L.status(t, now);
  const pills = [];
  if (st === 'late') pills.push(`<span class="pill late">${L.icon('alert')}En retard</span>`);
  if (t.done) pills.push(`<span class="pill ok">${L.icon('check')}Terminée</span>`);
  if (t.time) pills.push(`<span class="pill pri">${L.icon('clock')}${E(t.time)}</span>`);
  if (t.category) pills.push(`<span class="pill">${E(t.category)}</span>`);
  if (t.repeat !== 'AUCUNE') pills.push(`<span class="pill">${L.icon('repeat')}${E(L.REP_LABEL[t.repeat])}</span>`);
  if (t.alarm) pills.push(`<span class="pill acc">${L.icon('bell')}Alarme</span>`);
  return `<article class="task ${st} p-${t.priority}" data-action="edit" data-id="${E(t.id)}" tabindex="0">
    <span class="bar"></span>
    <button class="check ${t.done ? 'on' : ''}" data-action="toggle" data-id="${E(t.id)}" aria-label="${t.done ? 'Marquer comme non terminée' : 'Marquer comme terminée'}" title="${t.done ? 'Rouvrir' : 'Terminer'}">${L.icon('check')}</button>
    <div class="t-main"><div class="t-title">${E(t.title)}</div>${pills.length ? `<div class="pills">${pills.join('')}</div>` : ''}${t.note ? `<div class="t-note">${E(t.note)}</div>` : ''}</div>
  </article>`;
};
L.emptyHtml = (icon, title, sub) => `<div class="empty"><div class="ring">${L.icon(icon)}</div><b>${E(title)}</b><span>${E(sub)}</span></div>`;

// ---------- Agenda ----------
L.renderAgenda = () => {
  const now = L.now;
  const today = L.today();
  const sel = L.selected;
  const u = L.user || {};
  const byDate = L.groupBy(L.tasks, 'date');
  const todays = byDate[L.fmt(today)] || [];
  const lateCount = L.tasks.filter((t) => L.status(t, now) === 'late').length;
  const done = todays.filter((t) => t.done).length;
  const hr = new Date(now).getHours();
  const greet = hr < 12 ? 'Bonjour' : hr < 18 ? 'Bon après-midi' : 'Bonsoir';
  const frac = todays.length ? Math.round((done / todays.length) * 100) : 0;

  const hero = `<div class="hero"><div class="hero-top"><div><small>${greet}${u.first ? ', ' + E(u.first) : ''}</small><h2>${E(L.fullDate(today))}</h2></div>${L.user ? `<button data-action="nav" data-v="settings" title="Réglages">${L.avatarHtml(L.user)}</button>` : ''}</div>
    <div style="font-weight:700">${todays.length ? `${done} sur ${todays.length} terminée${done > 1 ? 's' : ''} aujourd’hui` : 'Aucune tâche aujourd’hui'}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${frac}%"></div></div>
    ${lateCount ? `<span class="pill">${L.icon('alert')}${lateCount} en retard</span>` : ''}</div>`;

  const expanded = L.settings.calExpanded;
  let days = [];
  if (expanded) {
    const first = new Date(sel.getFullYear(), sel.getMonth(), 1);
    const last = new Date(sel.getFullYear(), sel.getMonth() + 1, 0);
    const end = L.addDays(L.startOfWeek(last), 6);
    for (let d = L.startOfWeek(first); d <= end; d = L.addDays(d, 1)) days.push(d);
  } else {
    const s = L.startOfWeek(sel);
    days = [0, 1, 2, 3, 4, 5, 6].map((i) => L.addDays(s, i));
  }
  const cells = days.map((d) => {
    const k = L.fmt(d);
    const list = byDate[k] || [];
    const dot = !list.length ? '' : list.some((t) => L.status(t, now) === 'late') ? 'l' : list.every((t) => t.done) ? 'd' : 'a';
    const cls = ['day', L.sameDay(d, today) ? 'today' : '', k === L.fmt(sel) ? 'sel' : '', expanded && d.getMonth() !== sel.getMonth() ? 'out' : ''].join(' ');
    return `<button class="${cls}" data-action="cal-pick" data-date="${k}" title="${E(L.fullDate(d))}"><span class="n">${d.getDate()}</span><span class="dt ${dot}"></span></button>`;
  }).join('');
  const cal = `<div class="card cal"><div class="cal-head"><h3>${E(L.monthYear(sel))}</h3>
      ${!L.sameDay(sel, today) ? '<button class="btn ghost sm" data-action="cal-today">Aujourd’hui</button>' : ''}
      <button class="icon-btn" data-action="cal-prev" title="Précédent">${L.icon('left')}</button>
      <button class="icon-btn" data-action="cal-next" title="Suivant">${L.icon('right')}</button>
      <button class="icon-btn" data-action="cal-toggle" title="${expanded ? 'Vue semaine' : 'Vue mois'}">${L.icon(expanded ? 'up' : 'down')}</button></div>
    <div class="cal-grid">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => `<div class="cal-dow">${x}</div>`).join('')}${cells}</div></div>`;

  const dayTasks = L.sortDay(byDate[L.fmt(sel)] || []);
  const overdue = L.sameDay(sel, today)
    ? L.tasks.filter((t) => !t.done && L.parse(t.date) < today && L.status(t, now) === 'late')
      .sort((a, b) => a.date.localeCompare(b.date) || String(a.time || '').localeCompare(String(b.time || '')))
    : [];
  let list = '';
  if (overdue.length) {
    list += `<div class="sec-head late"><h2>En retard</h2><span class="muted">${overdue.length}</span></div>` + overdue.map((t) => L.cardHtml(t, now)).join('');
  }
  list += `<div class="sec-head"><h2>${E(L.relative(sel, today))}</h2><span class="muted">${dayTasks.length} tâche${dayTasks.length > 1 ? 's' : ''}</span></div>`;
  list += dayTasks.length ? dayTasks.map((t) => L.cardHtml(t, now)).join('') : L.emptyHtml('calendar', 'Journée libre', 'Aucune tâche ce jour-là. Cliquez sur « Nouvelle tâche » pour en ajouter.');

  L.setHtml(L.$('#view-agenda'), `<div class="agenda"><div class="agenda-left">${hero}${cal}</div><div class="agenda-right">${list}</div></div>`);
};

L.actions['cal-pick'] = (el) => { L.selected = L.parse(el.dataset.date); L.renderAgenda(); };
L.actions['cal-today'] = () => { L.selected = L.today(); L.renderAgenda(); };
L.actions['cal-prev'] = () => { L.selected = L.settings.calExpanded ? L.addMonths(L.selected, -1) : L.addDays(L.selected, -7); L.renderAgenda(); };
L.actions['cal-next'] = () => { L.selected = L.settings.calExpanded ? L.addMonths(L.selected, 1) : L.addDays(L.selected, 7); L.renderAgenda(); };
L.actions['cal-toggle'] = () => { L.settings.calExpanded = !L.settings.calExpanded; L.saveSettings(); L.renderAgenda(); };

// ---------- Tâches ----------
L.renderTasks = () => {
  const f = L.filter;
  L.$('#ico-search').innerHTML = L.icon('search');
  L.$('#status-chips').innerHTML = [['all', 'Toutes'], ['todo', 'À faire'], ['late', 'En retard'], ['done', 'Terminées']]
    .map(([v, l]) => `<button class="chip ${f.status === v ? 'on' : ''}" data-action="f-status" data-v="${v}">${l}</button>`).join('');
  const cats = Array.from(new Set(L.tasks.map((t) => t.category).filter(Boolean))).sort();
  L.$('#cat-chips').innerHTML = cats.length
    ? `<button class="chip ${f.cat === null ? 'on' : ''}" data-action="f-cat" data-v="">Toutes catégories</button>` + cats.map((c) => `<button class="chip ${f.cat === c ? 'on' : ''}" data-action="f-cat" data-v="${E(c)}">${E(c)}</button>`).join('')
    : '';
  L.renderTasksList();
};
L.renderTasksList = () => {
  const f = L.filter, now = L.now, today = L.today();
  const q = f.q.trim().toLowerCase();
  const arr = L.tasks.filter((t) => {
    if (q && !(t.title.toLowerCase().includes(q) || t.note.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))) return false;
    const st = L.status(t, now);
    if (f.status === 'todo' && st !== 'todo') return false;
    if (f.status === 'late' && st !== 'late') return false;
    if (f.status === 'done' && st !== 'done') return false;
    if (f.cat !== null && t.category !== f.cat) return false;
    return true;
  });
  const host = L.$('#tasks-list');
  if (!arr.length) { host.innerHTML = L.emptyHtml('tasks', 'Aucune tâche', L.tasks.length ? 'Aucun résultat pour ces filtres.' : 'Créez votre première tâche avec « Nouvelle tâche ».'); return; }
  const g = L.groupBy(arr, 'date');
  const keys = Object.keys(g).sort();
  if (f.status === 'done') keys.reverse();
  const top = host.parentElement.scrollTop;
  host.innerHTML = keys.map((k) => `<div class="group"><div class="sec-head"><h2>${E(L.relative(L.parse(k), today))}</h2><span class="muted">${g[k].length}</span></div>${L.sortDay(g[k]).map((t) => L.cardHtml(t, now)).join('')}</div>`).join('');
  host.parentElement.scrollTop = top;
};
L.actions['f-status'] = (el) => { L.filter.status = el.dataset.v; L.renderTasks(); };
L.actions['f-cat'] = (el) => { L.filter.cat = el.dataset.v === '' ? null : el.dataset.v; L.renderTasks(); };

// ---------- Statistiques ----------
L.streak = (tasks, today) => {
  const by = L.groupBy(tasks, 'date');
  let d = today;
  const td = by[L.fmt(d)];
  if (!td || td.some((t) => !t.done)) d = L.addDays(d, -1);
  let n = 0;
  for (;;) {
    const l = by[L.fmt(d)];
    if (!l || !l.length || l.some((t) => !t.done)) break;
    n++; d = L.addDays(d, -1);
  }
  return n;
};
L.progHtml = (label, done, total, color) => {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<div class="prog"><div class="row"><span>${E(label)}</span><span class="muted">${done}/${total}</span></div><div class="bar-track"><div class="bar-fill" style="width:${pct}%;${color ? `--c:${color}` : ''}"></div></div></div>`;
};
L.renderStats = () => {
  const now = L.now, today = L.today(), tasks = L.tasks;
  const total = tasks.length, done = tasks.filter((t) => t.done).length;
  const late = tasks.filter((t) => L.status(t, now) === 'late').length;
  const todo = total - done - late;
  const rate = total ? done / total : 0;
  const C = 2 * Math.PI * 52;
  const week = [6, 5, 4, 3, 2, 1, 0].map((i) => {
    const d = L.addDays(today, -i);
    const l = tasks.filter((t) => t.date === L.fmt(d));
    return { d, t: l.length, dn: l.filter((x) => x.done).length, today: i === 0 };
  });
  const mx = Math.max(1, ...week.map((w) => w.t));
  const streak = L.streak(tasks, today);
  const prios = ['HAUTE', 'MOYENNE', 'BASSE'].map((p) => {
    const l = tasks.filter((t) => t.priority === p);
    return L.progHtml(L.PRIO_LABEL[p], l.filter((t) => t.done).length, l.length, p === 'HAUTE' ? 'var(--high)' : p === 'MOYENNE' ? 'var(--mid)' : 'var(--low)');
  }).join('');
  const catMap = L.groupBy(tasks, 'category');
  const cats = Object.keys(catMap).map((k) => ({ k: k || 'Sans catégorie', l: catMap[k] })).sort((a, b) => b.l.length - a.l.length)
    .map((c) => L.progHtml(c.k, c.l.filter((t) => t.done).length, c.l.length)).join('');

  L.setHtml(L.$('#view-stats'), `<div class="page-head"><h1>Statistiques</h1></div>
    <div class="stats-grid">
      <div class="card span2"><div class="ring-wrap">
        <div style="position:relative;width:8rem;height:8rem"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface3)" stroke-width="12"/><circle cx="60" cy="60" r="52" fill="none" stroke="var(--primary)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(rate * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/></svg>
        <div class="pct" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${Math.round(rate * 100)}%</div></div>
        <div><h2>Taux de réalisation</h2><p class="muted" style="margin:.2rem 0 .8rem">${done} tâche${done > 1 ? 's' : ''} sur ${total}</p>
        <span class="pill acc">${streak ? `${streak} jour${streak > 1 ? 's' : ''} parfait${streak > 1 ? 's' : ''} d’affilée` : 'Pas de série en cours'}</span></div></div></div>
      <div class="kpis span2">
        <div class="card kpi"><b style="color:var(--primary)">${total}</b><span>Total</span></div>
        <div class="card kpi"><b style="color:var(--ok)">${done}</b><span>Terminées</span></div>
        <div class="card kpi"><b style="color:var(--mid)">${todo}</b><span>À faire</span></div>
        <div class="card kpi"><b style="color:var(--high)">${late}</b><span>En retard</span></div></div>
      <div class="card span2"><h2>7 derniers jours</h2><div class="bars">${week.map((w) => `<div class="bcol"><small>${w.dn}/${w.t}</small><div class="stack"><div class="tot" style="height:${(w.t / mx) * 100}%"></div><div class="dn" style="height:${(w.dn / mx) * 100}%"></div></div><small class="${w.today ? 'today' : ''}">${E(L.dayShort(w.d))}</small></div>`).join('')}</div></div>
      <div class="card"><h2>Par priorité</h2>${prios}</div>
      ${total ? `<div class="card"><h2>Par catégorie</h2>${cats}</div>` : ''}
    </div>`);
};

// ---------- Réglages ----------
L.chipRow = (action, items, current) => `<div class="chips">${items.map(([v, l]) => `<button class="chip ${String(current) === String(v) ? 'on' : ''}" data-action="${action}" data-v="${v}">${l}</button>`).join('')}</div>`;
L.switchHtml = (attr, on, disabled) => `<label class="switch"><input type="checkbox" ${attr} ${on ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span></span></label>`;
L.renderSettings = () => {
  const s = L.settings, u = L.user || {}, sys = L.sys || {};
  const pin = L.hasPin();
  const row = (t, sub, ctl) => `<div class="srow"><div><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</div><div class="ctl">${ctl}</div></div>`;
  L.setHtml(L.$('#view-settings'), `<div class="page-head"><h1>Réglages</h1></div><div class="set-wrap">
    <div class="card set-card"><h2>${L.icon('user')}Compte</h2>
      <div class="status">${L.avatarHtml(u, 'lg')}<div><b>${E(u.name || 'Compte Google')}</b><br><small class="muted">${E(u.email || '')}</small></div></div>
      <p class="muted" style="margin:.2rem 0 1rem;font-size:.85rem">Synchronisation Google active — mêmes tâches que sur votre téléphone.</p>
      <button class="btn warn-ghost" data-action="signout">${L.icon('logout')}Se déconnecter</button></div>

    <div class="card set-card"><h2>${L.icon('share')}Partager Lahatra</h2>
      ${row('Page de téléchargement', `<span style="overflow-wrap:anywhere">${E(L.LINKS.page)}</span>`, `<button class="btn sm" data-action="share-copy" data-k="page">Copier le lien</button><button class="btn ghost sm" data-action="share-wa">WhatsApp</button><button class="btn ghost sm" data-action="share-mail">E-mail</button><button class="btn ghost sm" data-action="share-open" data-k="page">Ouvrir</button>`)}
      ${row('Lien direct de l’installateur (.exe)', `<span style="overflow-wrap:anywhere">${E(L.LINKS.exe)}</span>`, `<button class="btn ghost sm" data-action="share-copy" data-k="exe">Copier le lien</button>`)}
      <p class="muted" style="font-size:.8rem;margin:.6rem 0 0">Envoyez le lien à vos proches : ils téléchargent, installent et se connectent avec leur propre compte Google.</p></div>

    <div class="card set-card"><h2>${L.icon('bell')}Alarmes</h2>
      ${row('Alarme du matin', 'Sonne chaque jour et affiche vos tâches du jour', L.switchHtml('data-toggle="morningOn"', s.morningOn))}
      ${row('Heure de l’alarme du matin', '', `<input class="input" type="time" data-input="morningTime" value="${E(s.morningTime)}" ${s.morningOn ? '' : 'disabled'}>`)}
      ${row('Report (snooze)', '', L.chipRow('set-snooze', [[5, '5 min'], [10, '10 min'], [15, '15 min']], s.snooze))}
      ${row('Son', 'Sonnerie lors d’une alarme', L.switchHtml('data-toggle="sound"', s.sound))}
      ${row('Tester', 'Vérifier son et notifications', '<button class="btn ghost sm" data-action="test-alarm">Tester l’alarme</button>')}
      <p class="muted" style="font-size:.8rem;margin:.6rem 0 0">Les alarmes sonnent même fenêtre fermée tant que Lahatra reste dans la zone de notification (près de l’horloge).</p></div>

    <div class="card set-card"><h2>${L.icon('shield')}Sécurité</h2>
      ${row('Code PIN', 'Protège l’accès à Lahatra', L.switchHtml('data-toggle="pin"', pin))}
      ${pin ? row('Modifier le code', '', '<button class="btn ghost sm" data-action="pin-change">Modifier</button>') : ''}
      ${pin ? row('Verrouillage automatique', 'Après inactivité ou quand la fenêtre est masquée', `<select class="select" data-input="lockMode" style="width:auto">${[['off', 'Jamais'], ['0', 'Dès que la fenêtre est masquée'], ['1', 'Après 1 min'], ['5', 'Après 5 min'], ['15', 'Après 15 min'], ['30', 'Après 30 min']].map(([v, l]) => `<option value="${v}" ${String(s.lockMode) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`) : ''}
      ${pin ? row('Verrouiller maintenant', '', `<button class="btn ghost sm" data-action="lock-now">${L.icon('lock')}Verrouiller</button>`) : ''}
      <p class="muted" style="font-size:.8rem;margin:.6rem 0 0">Le verrouillage s’active aussi quand vous verrouillez Windows (Win + L).</p></div>

    <div class="card set-card"><h2>${L.icon('palette')}Apparence</h2>
      ${row('Thème', '', L.chipRow('set-theme', [['system', 'Système'], ['light', 'Clair'], ['dark', 'Sombre']], s.theme))}
      ${row('Taille de l’interface', 'Ctrl + / Ctrl − / Ctrl 0', `<button class="icon-btn" data-action="zoom-out" title="Réduire">−</button><b>${Math.round(s.zoom * 100)}%</b><button class="icon-btn" data-action="zoom-in" title="Agrandir">+</button><button class="btn ghost sm" data-action="zoom-reset">100%</button>`)}</div>

    <div class="card set-card"><h2>${L.icon('monitor')}Windows</h2>
      ${row('Démarrer avec Windows', 'Lahatra démarre réduit, pour vos alarmes', L.switchHtml('data-sys="autoStart"', !!sys.autoStart))}
      ${row('Fermer = réduire dans la zone de notification', 'Recommandé pour que les alarmes continuent', L.switchHtml('data-sys="closeToTray"', sys.closeToTray !== false))}
      ${row('Quitter complètement', '', '<button class="btn ghost sm" data-action="quit">Quitter Lahatra</button>')}
      <p class="muted" style="font-size:.8rem;margin:.6rem 0 0">Version ${E(L.version || '')}</p></div>

    <div class="card set-card"><h2>${L.icon('keyboard')}Raccourcis</h2>
      ${row('Nouvelle tâche', '', '<span class="kbd">Ctrl</span> <span class="kbd">N</span>')}
      ${row('Rechercher', '', '<span class="kbd">Ctrl</span> <span class="kbd">F</span>')}
      ${row('Changer de vue', '', '<span class="kbd">Ctrl</span> <span class="kbd">1</span>…<span class="kbd">4</span>')}
      ${row('Fermer une fenêtre', '', '<span class="kbd">Échap</span>')}
      ${row('Enregistrer une tâche', '', '<span class="kbd">Ctrl</span> <span class="kbd">Entrée</span>')}</div>
  </div>`);
};

L.actions['set-theme'] = (el) => { L.settings.theme = el.dataset.v; L.saveSettings(); L.applyTheme(); L.renderSettings(); };
L.actions['set-snooze'] = (el) => { L.settings.snooze = Number(el.dataset.v); L.saveSettings(); L.renderSettings(); };
L.actions['test-alarm'] = () => L.testAlarm();
L.actions['lock-now'] = () => L.showLock();
L.actions['zoom-in'] = () => L.zoomBy(0.1);
L.actions['zoom-out'] = () => L.zoomBy(-0.1);
L.actions['zoom-reset'] = () => L.zoomBy(0, true);
L.zoomBy = (d, reset) => {
  const z = reset ? 1 : Math.min(1.6, Math.max(0.8, Math.round((L.settings.zoom + d) * 10) / 10));
  L.settings.zoom = z; L.saveSettings(); window.lahatra.setZoom(z);
  if (L.view === 'settings') L.renderSettings();
};
L.actions.quit = () => window.lahatra.quit();
L.actions.signout = async () => {
  if (!(await L.confirm('Se déconnecter ?', 'Vos tâches restent sauvegardées dans votre compte Google. Les alarmes de cet appareil seront désactivées.', 'Se déconnecter', true))) return;
  try { await window.FB.signOut(L.auth); } catch (e) { L.toast(L.errMsg(e), true); }
};

// ---------- Navigation ----------
L.go = (v) => {
  if (!NAV.some((n) => n[0] === v)) return;
  L.view = v;
  L.$$('.view').forEach((el) => el.classList.toggle('active', el.id === 'view-' + v));
  L.$('#fab').classList.toggle('hidden', !(v === 'agenda' || v === 'tasks'));
  L.render();
  const el = L.$('#view-' + v);
  if (el) el.scrollTop = 0;
};
L.actions.nav = (el) => L.go(el.dataset.v);
L.render = () => {
  if (!L.user) return;
  L.renderSidebar();
  L.$('#fab').innerHTML = `${L.icon('plus')}<span class="lbl">Nouvelle tâche</span>`;
  ({ agenda: L.renderAgenda, tasks: L.renderTasks, stats: L.renderStats, settings: L.renderSettings }[L.view])();
};
// rafraîchissement sans détruire les champs de saisie des réglages
L.refresh = () => { if (L.view === 'settings') L.renderSidebar(); else L.render(); };

// ---------- Modales ----------
L.closeModals = () => { L.$$('.modal-back').forEach((m) => m.remove()); if (L.padTarget && !L.locked) L.padTarget = null; };
L.actions['modal-close'] = (el) => {
  const m = el.closest('.modal-back');
  if (m) m.remove();
  if (!L.locked) L.padTarget = null;
};
L.confirm = (title, text, okLabel, danger) => new Promise((resolve) => {
  const root = L.$('#modal-root');
  const m = document.createElement('div');
  m.className = 'modal-back';
  m.innerHTML = `<div class="modal sm" role="dialog" aria-modal="true"><div class="modal-head"><h3>${E(title)}</h3></div>
    <div class="modal-body"><p class="muted" style="margin:0">${E(text)}</p></div>
    <div class="modal-foot"><button class="btn ghost" data-r="0">Annuler</button><button class="btn ${danger ? 'danger' : ''}" data-r="1">${E(okLabel || 'OK')}</button></div></div>`;
  m.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (b) { m.remove(); resolve(b.dataset.r === '1'); } else if (e.target === m) { m.remove(); resolve(false); } });
  m._cancel = () => { m.remove(); resolve(false); };
  root.appendChild(m);
  L.$('[data-r="1"]', m).focus();
});

// ---------- Éditeur de tâche ----------
L.openEditor = (task, defDate) => {
  const t = task || { id: '', title: '', date: L.fmt(defDate || L.selected), time: null, priority: 'MOYENNE', note: '', done: false, alarm: false, category: '', repeat: 'AUCUNE', createdAt: 0, completedAt: null };
  const st = { priority: t.priority, repeat: t.repeat };
  const chip = (group, v, label, on, dot) => `<button type="button" class="chip ${on ? 'on' : ''}" data-chip="${group}" data-v="${v}">${dot ? `<span class="pdot" style="background:${dot}"></span>` : ''}${label}</button>`;
  const m = document.createElement('div');
  m.className = 'modal-back';
  m.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${task ? 'Modifier la tâche' : 'Nouvelle tâche'}">
    <div class="modal-head"><h2>${task ? 'Modifier la tâche' : 'Nouvelle tâche'}</h2><button class="icon-btn" data-action="modal-close" aria-label="Fermer">${L.icon('x')}</button></div>
    <div class="modal-body">
      <div class="field"><label class="lbl" for="ed-title">Tâche à faire</label><input class="input" id="ed-title" maxlength="200" value="${E(t.title)}" placeholder="Que devez-vous faire ?" autocomplete="off"></div>
      <div class="row2">
        <div class="field"><label class="lbl" for="ed-date">Date</label><input class="input" style="width:100%" id="ed-date" type="date" value="${E(t.date)}"></div>
        <div class="field"><label class="lbl" for="ed-time">Heure (facultatif)</label><div class="time-row"><input class="input" style="flex:1" id="ed-time" type="time" value="${E(t.time || '')}"><button type="button" class="icon-btn" id="ed-clear" title="Retirer l’heure">${L.icon('x')}</button></div></div>
      </div>
      <div class="field"><span class="lbl-s">Priorité</span><div class="chips" id="ed-prio">${['HAUTE', 'MOYENNE', 'BASSE'].map((p) => chip('priority', p, L.PRIO_LABEL[p], st.priority === p, p === 'HAUTE' ? 'var(--high)' : p === 'MOYENNE' ? 'var(--mid)' : 'var(--low)')).join('')}</div></div>
      <div class="field"><span class="lbl-s">Catégorie</span><div class="chips" id="ed-cats">${L.CATEGORIES.map((c) => chip('cat', E(c), E(c), t.category === c)).join('')}</div>
        <input class="input" id="ed-cat" style="margin-top:.5rem" maxlength="40" placeholder="Ou saisissez une catégorie…" value="${E(t.category)}"></div>
      <div class="field"><span class="lbl-s">Répétition</span><div class="chips" id="ed-rep">${['AUCUNE', 'QUOTIDIEN', 'HEBDO', 'MENSUEL'].map((r) => chip('repeat', r, L.REP_LABEL[r], st.repeat === r)).join('')}</div></div>
      <div class="alarm-row"><div><b>${L.icon('bell')} Alarme</b><br><small class="muted" id="ed-alarm-hint">${t.time ? 'Sonne à l’heure choisie' : 'Choisissez une heure pour activer l’alarme'}</small></div>${L.switchHtml('id="ed-alarm"', t.alarm && !!t.time, !t.time)}</div>
      <div class="field"><label class="lbl" for="ed-note">Note (facultatif)</label><textarea class="input" id="ed-note" maxlength="2000" rows="3">${E(t.note)}</textarea></div>
    </div>
    <div class="modal-foot">${task ? `<button class="btn warn-ghost" id="ed-del">${L.icon('trash')}Supprimer</button>` : ''}<span class="spacer"></span>
      <button class="btn ghost" data-action="modal-close">Annuler</button><button class="btn" id="ed-save">Enregistrer</button></div></div>`;
  L.$('#modal-root').appendChild(m);

  const $ = (s) => L.$(s, m);
  const timeEl = $('#ed-time'), alarmEl = $('#ed-alarm'), catEl = $('#ed-cat');
  const syncAlarm = () => {
    const has = !!timeEl.value;
    alarmEl.disabled = !has;
    if (!has) alarmEl.checked = false;
    $('#ed-alarm-hint').textContent = has ? 'Sonne à l’heure choisie' : 'Choisissez une heure pour activer l’alarme';
  };
  timeEl.addEventListener('input', syncAlarm);
  timeEl.addEventListener('change', syncAlarm);
  $('#ed-clear').addEventListener('click', () => { timeEl.value = ''; syncAlarm(); });
  m.addEventListener('click', (e) => {
    const c = e.target.closest('[data-chip]');
    if (!c) return;
    const g = c.dataset.chip, v = c.dataset.v;
    if (g === 'cat') {
      const unesc = c.textContent;
      catEl.value = catEl.value === unesc ? '' : unesc;
      L.$$('#ed-cats .chip', m).forEach((x) => x.classList.toggle('on', x.textContent === catEl.value));
    } else {
      st[g] = v;
      L.$$(`[data-chip="${g}"]`, m).forEach((x) => x.classList.toggle('on', x.dataset.v === v));
    }
  });
  catEl.addEventListener('input', () => L.$$('#ed-cats .chip', m).forEach((x) => x.classList.toggle('on', x.textContent === catEl.value.trim())));

  const save = () => {
    const title = $('#ed-title').value.trim();
    const date = $('#ed-date').value;
    if (!title) { const el = $('#ed-title'); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); el.focus(); return; }
    if (!date) { const el = $('#ed-date'); el.classList.add('shake'); el.focus(); return; }
    const time = timeEl.value || null;
    const nt = Object.assign({}, t, {
      title, date, time, priority: st.priority, repeat: st.repeat, category: catEl.value.trim(),
      note: $('#ed-note').value.trim(), alarm: !!(time && alarmEl.checked)
    });
    if (!nt.createdAt) nt.createdAt = Date.now();
    if (nt.alarm && L.dueMs(nt) <= Date.now()) { L.fired[`${nt.id}|${nt.date}|${nt.time}`] = Date.now(); L.LS.set('lahatra.fired', L.fired); }
    L.saveTask(nt);
    L.selected = L.parse(date);
    m.remove();
    L.toast(task ? 'Tâche modifiée ✓' : 'Tâche ajoutée ✓');
    if (L.view !== 'agenda' && L.view !== 'tasks') L.go('agenda');
  };
  $('#ed-save').addEventListener('click', save);
  m._save = save;
  const del = $('#ed-del');
  if (del) del.addEventListener('click', async () => {
    if (await L.confirm('Supprimer la tâche ?', `« ${t.title} » sera définitivement supprimée.`, 'Supprimer', true)) {
      L.deleteTask(t.id); m.remove(); L.toast('Tâche supprimée');
    }
  });
  m.addEventListener('mousedown', (e) => { m._downOnBack = e.target === m; });
  m.addEventListener('click', (e) => { if (e.target === m && m._downOnBack) m.remove(); });
  $('#ed-title').focus();
};
L.actions.new = () => L.openEditor(null, L.selected);
L.actions.edit = (el) => { const t = L.tasks.find((x) => x.id === el.dataset.id); if (t) L.openEditor(t); };
L.actions.toggle = (el) => L.toggleDone(el.dataset.id);

// ---------- Clavier numérique (PIN) ----------
L.padTarget = null;
L.buildPad = (host, o) => {
  let val = '';
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];
  host.innerHTML = `<div class="dots"></div><div class="pad-msg"></div><div class="pad">${keys.map((k) => k === '' ? '<button class="blank" tabindex="-1" aria-hidden="true"></button>' : k === 'back' ? `<button class="fn" data-k="back" aria-label="Effacer">${L.icon('back')}</button>` : `<button data-k="${k}">${k}</button>`).join('')}</div>`;
  const dotsEl = L.$('.dots', host), msg = L.$('.pad-msg', host);
  const api = {
    get value() { return val; },
    draw() { const n = o.dots(val); dotsEl.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < val.length ? 'f' : ''}"></i>`).join(''); },
    error(m) { msg.textContent = m || ''; dotsEl.classList.toggle('bad', !!m); },
    reset() { val = ''; api.draw(); },
    press(k) {
      api.error('');
      if (k === 'back') val = val.slice(0, -1);
      else if (val.length < o.max(val)) val += k;
      api.draw();
      o.onChange(val, api);
    },
    onEnter: o.onEnter || null
  };
  L.$('.pad', host).addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) api.press(b.dataset.k); });
  api.draw();
  return api;
};

L.modalShell = (title, sub, nextLabel) => {
  const m = document.createElement('div');
  m.className = 'modal-back';
  m.innerHTML = `<div class="modal sm" role="dialog" aria-modal="true"><div class="modal-head"><h3 id="pin-title">${E(title)}</h3><button class="icon-btn" data-action="modal-close" aria-label="Fermer">${L.icon('x')}</button></div>
    <div class="modal-body" style="align-items:center;text-align:center"><p class="muted" id="pin-sub" style="margin:0">${E(sub)}</p><div id="pin-pad"></div></div>
    <div class="modal-foot">${nextLabel ? `<button class="btn ghost" data-action="modal-close">Annuler</button><button class="btn" id="pin-next" disabled>${nextLabel}</button>` : '<button class="btn ghost" data-action="modal-close">Annuler</button>'}</div></div>`;
  L.$('#modal-root').appendChild(m);
  return m;
};

L.pinSetup = () => {
  let first = null;
  const m = L.modalShell('Choisissez un code PIN', '4 à 6 chiffres', 'Continuer');
  const next = L.$('#pin-next', m);
  const go = async () => {
    const v = pad.value;
    if (next.disabled) return;
    if (first === null) {
      first = v; pad.reset(); next.disabled = true; next.textContent = 'Valider';
      L.$('#pin-title', m).textContent = 'Confirmez le code PIN'; L.$('#pin-sub', m).textContent = 'Saisissez-le une seconde fois';
    } else if (v === first) {
      await L.setPin(v);
      m.remove(); L.padTarget = null;
      L.toast('Code PIN activé ✓');
      if (L.view === 'settings') L.renderSettings();
    } else {
      pad.reset(); pad.error('Les codes ne correspondent pas'); first = null; next.disabled = true; next.textContent = 'Continuer';
      L.$('#pin-title', m).textContent = 'Choisissez un code PIN'; L.$('#pin-sub', m).textContent = '4 à 6 chiffres';
    }
  };
  const pad = L.buildPad(L.$('#pin-pad', m), {
    dots: (v) => first === null ? Math.max(4, v.length) : first.length,
    max: () => first === null ? 6 : first.length,
    onChange: (v) => { next.disabled = first === null ? v.length < 4 : v.length !== first.length; },
    onEnter: go
  });
  next.addEventListener('click', go);
  L.padTarget = pad;
};

L.pinVerify = (onOk) => {
  const m = L.modalShell('Code PIN actuel', 'Saisissez votre code pour continuer', null);
  const pad = L.buildPad(L.$('#pin-pad', m), {
    dots: () => L.pinLength(), max: () => L.pinLength(),
    onChange: async (v) => {
      if (v.length !== L.pinLength()) return;
      if (await L.checkPin(v)) { m.remove(); L.padTarget = null; onOk(); }
      else { pad.reset(); pad.error('Code incorrect'); }
    }
  });
  L.padTarget = pad;
};
L.actions['pin-change'] = () => L.pinVerify(() => L.pinSetup());

// ---------- Verrouillage ----------
L.locked = false;
L.showLock = () => {
  if (!L.hasPin() || L.locked) return;
  L.locked = true;
  L.closeModals();
  const host = L.$('#lock');
  host.classList.remove('hidden');
  host.innerHTML = `<div class="lock-in"><div class="ring">${L.icon('lock')}</div><h1 style="font-size:1.7rem">Lahatra verrouillé</h1><p class="muted">Entrez votre code PIN</p><div id="lock-pad"></div></div>`;
  let fails = 0, blocked = 0;
  const pad = L.buildPad(L.$('#lock-pad'), {
    dots: () => L.pinLength(), max: () => L.pinLength(),
    onChange: async (v) => {
      if (v.length !== L.pinLength()) return;
      if (Date.now() < blocked) { pad.reset(); pad.error('Trop d’essais. Patientez un instant.'); return; }
      if (await L.checkPin(v)) { L.unlock(); return; }
      fails++; pad.reset();
      if (fails >= 5) { blocked = Date.now() + 30000; fails = 0; pad.error('Trop d’essais. Réessayez dans 30 s.'); }
      else pad.error('Code incorrect');
    }
  });
  L.padTarget = pad;
  if (L.alarmQueue.length) L.renderAlarm();
};
L.unlock = () => {
  L.locked = false;
  L.padTarget = null;
  const host = L.$('#lock');
  host.classList.add('hidden'); host.innerHTML = '';
  L.lastActivity = Date.now();
  if (L.alarmQueue.length) L.renderAlarm();
  L.render();
};

// ---------- Connexion ----------
L.renderLogin = (state) => {
  const busy = state && state.busy;
  L.$('#login').innerHTML = `<div class="login-inner">
    <div class="login-brand"><h1>Lahatra</h1><p>Vos journées, en ordre.</p>
      <div class="mini-stack">
        <div class="mini"><span class="dot" style="background:#E5484D">${L.icon('check')}</span><div><b>Réunion d’équipe</b><small>09:30</small></div></div>
        <div class="mini"><span class="dot" style="background:#E8A33D;opacity:.85"></span><div><b>Appeler la banque</b><small>14:00</small></div></div>
        <div class="mini"><span class="dot" style="background:#2F9E8F;opacity:.85"></span><div><b>Séance de sport</b><small>18:30</small></div></div>
      </div></div>
    <div class="login-card"><h2>Bienvenue</h2>
      <p class="muted">Connectez-vous pour synchroniser vos tâches avec votre téléphone.</p>
      <button class="gbtn" data-action="signin" ${busy ? 'disabled' : ''}>${busy ? '<span class="spinner"></span> Connexion en cours…' : L.googleSvg + ' Continuer avec Google'}</button>
      ${busy ? '<p class="muted" style="font-size:.82rem;margin:1rem 0 0">Terminez la connexion dans votre navigateur, puis revenez ici.</p><button class="btn ghost sm" style="margin-top:.6rem" data-action="signin-cancel">Annuler</button>' : ''}
      ${state && state.error ? `<div class="err">${E(state.error)}</div>` : ''}
      <p class="muted" style="font-size:.75rem;margin:1.2rem 0 0">Vos données sont liées uniquement à votre compte Google.</p></div></div>`;
};
L.actions.signin = async () => {
  L.renderLogin({ busy: true });
  try {
    const r = await window.lahatra.googleSignIn();
    if (!r.ok) { L.renderLogin(r.erreur === 'Connexion annulée.' ? null : { error: r.erreur }); return; }
    const F = window.FB;
    await F.signInWithCredential(L.auth, F.GoogleAuthProvider.credential(r.idToken, r.accessToken || undefined));
  } catch (e) {
    L.renderLogin({ error: 'Échec de la connexion (' + (e.code || L.errMsg(e)) + ').' });
  }
};
L.actions['signin-cancel'] = () => { window.lahatra.googleCancel(); };

// ---------- Partage ----------
L.LINKS = {
  page: 'https://sitraka0417-cell.github.io/LahatraWin/telecharger.html',
  exe: 'https://github.com/sitraka0417-cell/LahatraWin/releases/latest/download/Lahatra-Setup.exe'
};
L.shareText = () => 'Lahatra : gestion de tâches synchronisée avec Google. Télécharger pour Windows : ' + L.LINKS.page;
L.actions['share-copy'] = async (el) => {
  try { await window.lahatra.copyText(L.LINKS[el.dataset.k] || L.LINKS.page); L.toast('Lien copié ✓'); }
  catch (e) { L.toast('Copie impossible', true); }
};
L.actions['share-wa'] = () => window.lahatra.openExternal('https://wa.me/?text=' + encodeURIComponent(L.shareText()));
L.actions['share-mail'] = () => window.lahatra.openExternal('mailto:?subject=' + encodeURIComponent('Lahatra pour Windows') + '&body=' + encodeURIComponent(L.shareText()));
L.actions['share-open'] = (el) => window.lahatra.openExternal(L.LINKS[el.dataset.k] || L.LINKS.page);
