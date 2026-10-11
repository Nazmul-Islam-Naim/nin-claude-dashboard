const vscode = require('vscode');
const { spawn } = require('node:child_process');
const net = require('node:net');
const http = require('node:http');
const path = require('node:path');

let child, starting, panel, out;

const freePort = (want) => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once('error', reject);
  s.listen(want, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});

const waitReady = async (port) => {
  for (let i = 0; i < 50; i++) {
    const ok = await new Promise((r) => http.get({ host: '127.0.0.1', port, path: '/' }, (res) => { res.resume(); r(res.statusCode === 200); }).on('error', () => r(false)));
    if (ok) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Dashboard server did not start. See the "Claude Dashboard" output.');
};

// Starts the bundled server once and returns its URL.
function start(context) {
  if (starting) return starting;
  starting = (async () => {
    const cfg = vscode.workspace.getConfiguration('claudeDashboard');
    const port = await freePort(cfg.get('port') || 0);
    const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', HOST: '127.0.0.1', PORT: String(port), WEB_DIST: path.join(context.extensionPath, 'dist', 'web') };
    if (cfg.get('keyPath')) env.GOOGLE_APPLICATION_CREDENTIALS = cfg.get('keyPath');
    if (cfg.get('editorCommand')) env.EDITOR_COMMAND = cfg.get('editorCommand');
    child = spawn(process.execPath, [path.join(context.extensionPath, 'dist', 'server.mjs')], { env, windowsHide: true });
    const c = child;
    c.stdout.on('data', (d) => out.append(String(d)));
    c.stderr.on('data', (d) => out.append(String(d)));
    c.on('exit', () => { if (child === c) { child = undefined; starting = undefined; } });
    await waitReady(port);
    return `http://127.0.0.1:${port}`;
  })();
  starting.catch(() => { stop(); });
  return starting;
}

function stop() {
  starting = undefined;
  if (child) child.kill();
  child = undefined;
}

async function run(context, fn) {
  try { await fn(await start(context)); } catch (e) { vscode.window.showErrorMessage(`Claude Dashboard: ${e.message}`); }
}

// One non-blocking offer to add a Google key; "Continue without Sheets" silences it for good.
function askForKey(context) {
  if (vscode.workspace.getConfiguration('claudeDashboard').get('keyPath') || context.globalState.get('skipKey')) return;
  vscode.window.showInformationMessage('Claude Dashboard works without Google Sheets: requirement status then comes from docs/specs/MAP.md. Add a Google key to read Sheets too.', 'Select key file', 'Continue without Sheets', 'How to get a key').then((pick) => {
    if (pick === 'Select key file') vscode.commands.executeCommand('claudeDashboard.selectKey');
    else if (pick === 'Continue without Sheets') context.globalState.update('skipKey', true);
    else if (pick === 'How to get a key') vscode.commands.executeCommand('claudeDashboard.getStarted');
  });
}

function activate(context) {
  out = vscode.window.createOutputChannel('Claude Dashboard');
  const bar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  bar.text = '$(dashboard) Claude Dashboard';
  bar.command = 'claudeDashboard.open';
  bar.show();

  context.subscriptions.push(
    out, bar, { dispose: stop },
    vscode.commands.registerCommand('claudeDashboard.selectKey', async () => {
      const [file] = (await vscode.window.showOpenDialog({ canSelectMany: false, filters: { 'Google key (.json)': ['json'] }, title: 'Select your Google service account key' })) || [];
      if (file) await vscode.workspace.getConfiguration('claudeDashboard').update('keyPath', file.fsPath, vscode.ConfigurationTarget.Global);
    }),
    vscode.commands.registerCommand('claudeDashboard.getStarted', () => vscode.commands.executeCommand('workbench.action.openWalkthrough', `${context.extension.id}#start`, false)),
    vscode.commands.registerCommand('claudeDashboard.open', () => run(context, async (url) => {
      askForKey(context);
      if (panel) return panel.reveal();
      panel = vscode.window.createWebviewPanel('claudeDashboard', 'Claude Dashboard', vscode.ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: true });
      panel.onDidDispose(() => { panel = undefined; });
      const src = String(await vscode.env.asExternalUri(vscode.Uri.parse(url)));
      panel.webview.html = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${src} http://127.0.0.1:* http://localhost:*; style-src 'unsafe-inline';"><style>html,body,iframe{margin:0;padding:0;width:100%;height:100%;border:0}</style></head><body><iframe src="${src}"></iframe></body></html>`;
    })),
    vscode.commands.registerCommand('claudeDashboard.openInBrowser', () => run(context, (url) => vscode.env.openExternal(vscode.Uri.parse(url)))),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('claudeDashboard')) return;
      stop();
      if (!panel) return;
      panel.dispose();
      vscode.commands.executeCommand('claudeDashboard.open'); // restart with the new settings
    }),
  );
}

module.exports = { activate, deactivate: stop };
