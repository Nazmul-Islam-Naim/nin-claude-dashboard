const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('node:child_process');
const net = require('node:net');
const http = require('node:http');
const path = require('node:path');

let child, win;

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

const waitReady = async (port) => {
  for (let i = 0; i < 50; i++) {
    const ok = await new Promise((r) => http.get({ host: '127.0.0.1', port, path: '/' }, (res) => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false)));
    if (ok) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Dashboard server did not start.');
};

async function start() {
  const port = await freePort();
  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', HOST: '127.0.0.1', PORT: String(port), WEB_DIST: path.join(__dirname, 'app', 'web') };
  child = spawn(process.execPath, [path.join(__dirname, 'app', 'server.mjs')], { env, windowsHide: true, stdio: 'ignore' });
  await waitReady(port);
  win = new BrowserWindow({ width: 1280, height: 860, icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true });
  win.on('closed', () => { win = undefined; });
  // Links to other sites open in the real browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.loadURL(`http://127.0.0.1:${port}`);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(start).catch((e) => { console.error(e); app.quit(); });
  app.on('before-quit', () => { if (child) child.kill(); });
  app.on('window-all-closed', () => app.quit());
}
