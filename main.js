'use strict';
const {
  app, BrowserWindow, Tray, Menu, ipcMain, shell, screen, nativeImage, powerMonitor, session, protocol, net
} = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

const PORT = 8766;                                  // retour de la connexion Google (127.0.0.1)
const RACINE = path.join(__dirname, 'renderer');
const APP_ID = 'com.amaf.imamo.lahatra.windows';

app.setAppUserModelId(APP_ID);
// Dossier de données fixe : les mises à jour de l'installateur ne touchent jamais aux données
app.setPath('userData', path.join(app.getPath('appData'), 'Lahatra'));
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

let win = null;
let tray = null;
let sys = { closeToTray: true, autoStart: false };
let balloonShown = false;
let annulerConnexion = null;
app.isQuitting = false;

const iconPath = path.join(__dirname, 'assets', 'icon.png');

function userFile(name) { return path.join(app.getPath('userData'), name); }
function readJson(file, def) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return def; } }
function writeJson(file, obj) { try { fs.writeFileSync(file, JSON.stringify(obj, null, 2)); } catch (e) { /* ignoré */ } }

function loadConfig() {
  const base = readJson(path.join(__dirname, 'config.json'), {});
  const over = readJson(userFile('config.json'), {});          // %APPDATA%\Lahatra\config.json (prioritaire)
  return Object.assign({}, base, over, {
    firebase: Object.assign({}, base.firebase, over.firebase),
    google: Object.assign({}, base.google, over.google)
  });
}

function applyLoginItem() {
  if (!app.isPackaged) return;
  try { app.setLoginItemSettings({ openAtLogin: !!sys.autoStart, args: ['--hidden'] }); } catch (e) { /* ignoré */ }
}

function showWin() {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function alertWin() {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.setAlwaysOnTop(true);
  win.focus();
  setTimeout(() => { if (win && !win.isDestroyed()) win.setAlwaysOnTop(false); }, 1500);
  win.flashFrame(true);
}

function saveBounds() {
  if (!win || win.isDestroyed()) return;
  const old = readJson(userFile('window.json'), {});
  const st = Object.assign({}, old, { maximized: win.isMaximized() });
  if (!win.isMaximized() && !win.isMinimized() && !win.isFullScreen()) Object.assign(st, win.getBounds());
  writeJson(userFile('window.json'), st);
}

function createWindow(showInitially) {
  const wa = screen.getPrimaryDisplay().workAreaSize;
  const st = readJson(userFile('window.json'), {});
  const width = Math.max(640, Math.min(st.width || 1280, wa.width));
  const height = Math.max(520, Math.min(st.height || 820, wa.height));
  let pos = {};
  if (typeof st.x === 'number' && typeof st.y === 'number') {
    const visible = screen.getAllDisplays().some((d) =>
      st.x >= d.bounds.x && st.x < d.bounds.x + d.bounds.width - 80 &&
      st.y >= d.bounds.y && st.y < d.bounds.y + d.bounds.height - 80);
    if (visible) pos = { x: st.x, y: st.y };
  }

  win = new BrowserWindow(Object.assign({
    width, height, minWidth: 640, minHeight: 520,
    show: false, backgroundColor: '#F6F3EE', title: 'Lahatra', icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
      backgroundThrottling: false,            // les alarmes doivent continuer fenêtre masquée
      autoplayPolicy: 'no-user-gesture-required',
      spellcheck: false
    }
  }, pos));

  win.once('ready-to-show', () => {
    if (st.maximized) win.maximize();
    if (showInitially) win.show();
  });
  win.loadURL('app://lahatra/index.html');

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('app://')) e.preventDefault(); });
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'i') win.webContents.toggleDevTools();
  });

  let t = null;
  const debounced = () => { clearTimeout(t); t = setTimeout(saveBounds, 500); };
  win.on('resize', debounced);
  win.on('move', debounced);

  win.on('close', (e) => {
    if (!app.isQuitting && sys.closeToTray) {
      e.preventDefault();
      saveBounds();
      win.hide();
      if (!balloonShown && tray && tray.displayBalloon) {
        balloonShown = true;
        try { tray.displayBalloon({ title: 'Lahatra', content: 'Lahatra continue en arrière-plan pour vos alarmes. Clic droit sur l’icône près de l’horloge pour quitter.' }); } catch (err) { /* ignoré */ }
      }
    } else {
      saveBounds();
    }
  });
  win.on('closed', () => { win = null; });
}

function createTray() {
  const img = nativeImage.createFromPath(iconPath).resize({ width: 20, height: 20 });
  tray = new Tray(img);
  tray.setToolTip('Lahatra');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Ouvrir Lahatra', click: showWin },
    { label: 'Nouvelle tâche', click: () => { showWin(); if (win) win.webContents.send('new-task'); } },
    { type: 'separator' },
    { label: 'Quitter', click: () => { app.isQuitting = true; app.quit(); } }
  ]));
  tray.on('click', showWin);
}

// ───────── Connexion Google (navigateur système + retour sur 127.0.0.1) ─────────
function b64url(buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }

function pageRetour(titre, texte) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Lahatra</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F6F3EE;color:#17211F;font-family:"Segoe UI",system-ui,sans-serif}
.c{background:#fff;border:1px solid #E3DED4;border-radius:24px;padding:40px 48px;max-width:420px;text-align:center;box-shadow:0 12px 40px rgba(15,61,62,.15)}
h1{margin:0 0 8px;font-family:Georgia,serif;font-size:24px;color:#0F3D3E}p{margin:0;color:#5C6663;line-height:1.5}</style></head>
<body><div class="c"><h1>${titre}</h1><p>${texte}</p></div></body></html>`;
}

function attendreRetour(urlOuverture, state, champ) {
  if (annulerConnexion) annulerConnexion();
  const base = `http://127.0.0.1:${PORT}/callback`;
  return new Promise((resolve, reject) => {
    let timer = null;
    let fini = false;
    const serveur = http.createServer();
    const fin = (fn, v) => {
      if (fini) return;
      fini = true; clearTimeout(timer); annulerConnexion = null;
      try { serveur.close(); } catch (e) { /* ignoré */ }
      fn(v);
    };
    serveur.on('request', (req, res) => {
      const u = new URL(req.url, base);
      if (u.pathname !== '/callback') { res.writeHead(404); res.end(); return; }
      const err = u.searchParams.get('error');
      const valeur = u.searchParams.get(champ);
      const ok = !err && valeur && u.searchParams.get('state') === state;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(ok
        ? pageRetour('Connexion réussie ✓', 'Vous pouvez fermer cet onglet et revenir à Lahatra.')
        : pageRetour('Connexion impossible', 'Retournez dans Lahatra et réessayez.'));
      if (err) fin(reject, new Error(err));
      else if (!ok) fin(reject, new Error('STATE'));
      else fin(resolve, valeur);
    });
    serveur.on('error', (e) => fin(reject, e));
    timer = setTimeout(() => fin(reject, new Error('TIMEOUT')), 180000);
    annulerConnexion = () => fin(reject, new Error('CANCEL'));
    serveur.listen(PORT, '127.0.0.1', () => { shell.openExternal(urlOuverture); });
  });
}

async function connexionGoogle() {
  const cfg = loadConfig();
  const state = b64url(crypto.randomBytes(16));

  // Méthode 1 (sans code secret) : petite page hébergée (GitHub Pages) qui utilise Firebase Auth
  if (cfg.authPage) {
    const page = cfg.authPage;
    const url = `${page}${page.includes('?') ? '&' : '?'}port=${PORT}&state=${state}`;
    return { idToken: await attendreRetour(url, state, 'id_token') };
  }

  // Méthode 2 : OAuth direct avec un client « Application de bureau » (code secret requis)
  const { clientId, clientSecret } = cfg.google || {};
  if (!clientId || String(clientId).startsWith('REMPLACER')) throw new Error('CONFIG_GOOGLE');
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const redirect = `http://127.0.0.1:${PORT}/callback`;
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: clientId, redirect_uri: redirect, response_type: 'code', scope: 'openid email profile',
    code_challenge: challenge, code_challenge_method: 'S256', state, prompt: 'select_account'
  }).toString();
  const code = await attendreRetour(url, state, 'code');
  const body = new URLSearchParams({ code, client_id: clientId, redirect_uri: redirect, grant_type: 'authorization_code', code_verifier: verifier });
  if (clientSecret && !String(clientSecret).startsWith('REMPLACER')) body.set('client_secret', clientSecret);
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body
  });
  const j = await r.json();
  if (!j.id_token) throw new Error(j.error_description || j.error || 'TOKEN');
  return { idToken: j.id_token, accessToken: j.access_token || null };
}

function messageErreur(code) {
  if (code === 'CONFIG_GOOGLE') return 'Configuration Google incomplète (voir le README).';
  if (code === 'TIMEOUT') return 'Connexion expirée. Réessayez.';
  if (code === 'CANCEL' || code === 'access_denied') return 'Connexion annulée.';
  if (code === 'EADDRINUSE') return `Le port ${PORT} est occupé. Fermez l’autre programme et réessayez.`;
  if (code === 'STATE') return 'Réponse de connexion invalide. Réessayez.';
  if (code === 'redirect_uri_mismatch') return 'URI de redirection non autorisée dans Google Cloud (voir le README).';
  return `Échec de la connexion Google (${code}).`;
}

// ───────── Démarrage ─────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', showWin);

  app.whenReady().then(() => {
    sys = Object.assign(sys, readJson(userFile('system.json'), {}));

    protocol.handle('app', (req) => {
      const url = new URL(req.url);
      let p = decodeURIComponent(url.pathname);
      if (p === '/' || p === '') p = '/index.html';
      const complet = path.normalize(path.join(RACINE, p));
      if (!complet.startsWith(RACINE)) return new Response('Interdit', { status: 403 });
      return net.fetch(pathToFileURL(complet).toString());
    });

    session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(permission === 'notifications'));

    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Édition', submenu: [
        { role: 'undo', label: 'Annuler' }, { role: 'redo', label: 'Rétablir' }, { type: 'separator' },
        { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' } ] },
      { label: 'Affichage', submenu: [ { role: 'togglefullscreen', label: 'Plein écran' } ] }
    ]));

    const hidden = process.argv.includes('--hidden') || (app.isPackaged && app.getLoginItemSettings().wasOpenedAtLogin);
    createTray();
    createWindow(!hidden);
    applyLoginItem();

    powerMonitor.on('lock-screen', () => { if (win && !win.isDestroyed()) win.webContents.send('session-lock'); });
    powerMonitor.on('resume', () => { if (win && !win.isDestroyed()) win.webContents.send('resume'); });
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(true); });
  });

  app.on('before-quit', () => { app.isQuitting = true; });
  app.on('window-all-closed', () => { if (!sys.closeToTray) app.quit(); });

  ipcMain.handle('config:get', () => loadConfig());
  ipcMain.handle('google:signin', async () => {
    try {
      const r = await connexionGoogle();
      showWin();
      return Object.assign({ ok: true }, r);
    } catch (e) {
      showWin();
      const code = e && e.code === 'EADDRINUSE' ? 'EADDRINUSE' : String((e && e.message) || e);
      return { ok: false, erreur: messageErreur(code) };
    }
  });
  ipcMain.handle('google:cancel', () => { if (annulerConnexion) annulerConnexion(); });
  ipcMain.handle('win:show', () => showWin());
  ipcMain.handle('win:alert', () => alertWin());
  ipcMain.handle('sys:get', () => sys);
  ipcMain.handle('sys:set', (e, o) => {
    sys = Object.assign(sys, { closeToTray: o.closeToTray !== false, autoStart: !!o.autoStart });
    writeJson(userFile('system.json'), sys);
    applyLoginItem();
    return sys;
  });
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:quit', () => { app.isQuitting = true; app.quit(); });
  ipcMain.handle('shell:open', (e, url) => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); });
}
