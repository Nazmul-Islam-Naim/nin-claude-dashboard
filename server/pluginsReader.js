import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const claudeHome = () => process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return undefined; } };
const enabledOf = (file) => { const e = readJson(file)?.enabledPlugins; return e && typeof e === 'object' && !Array.isArray(e) ? e : {}; };
const split = (id) => { const i = id.lastIndexOf('@'); return i < 0 ? { name: id, marketplace: '' } : { name: id.slice(0, i), marketplace: id.slice(i + 1) }; };

function describe(home, id, entry) {
  const meta = readJson(path.join(entry.installPath, '.claude-plugin', 'plugin.json'));
  if (meta?.description) return meta.description;
  const { name, marketplace } = split(id);
  const mp = readJson(path.join(home, 'plugins', 'marketplaces', marketplace, '.claude-plugin', 'marketplace.json'));
  return mp?.plugins?.find((p) => p.name === name)?.description || '';
}

// Installed plugins for a project with their effective enabled state: user < project < project local.
export function listPlugins(projectPath, { home = claudeHome() } = {}) {
  const layers = [['user', path.join(home, 'settings.json')], ['project', path.join(projectPath, '.claude', 'settings.json')], ['local', path.join(projectPath, '.claude', 'settings.local.json')]];
  const state = {};
  for (const [source, file] of layers) for (const [id, v] of Object.entries(enabledOf(file))) if (typeof v === 'boolean') state[id] = { enabled: v, source };
  const installed = readJson(path.join(home, 'plugins', 'installed_plugins.json'))?.plugins || {};
  const out = [];
  for (const [id, entries] of Object.entries(installed)) {
    const entry = (Array.isArray(entries) ? entries : []).find((e) => e && e.installPath && fs.existsSync(e.installPath) && (!e.projectPath || e.projectPath === projectPath));
    if (!entry) continue;
    out.push({ id, ...split(id), version: entry.version || '', description: describe(home, id, entry), enabled: state[id]?.enabled ?? false, source: state[id]?.source ?? 'default', installed: true });
  }
  for (const [id, s] of Object.entries(state)) if (!out.some((p) => p.id === id)) out.push({ id, ...split(id), version: '', description: '', enabled: s.enabled, source: s.source, installed: false });
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

// Writes only enabledPlugins[id] in <project>/.claude/settings.local.json; never overwrites a file it cannot parse.
export function setPlugin(projectPath, id, enabled, { home = claudeHome() } = {}) {
  if (typeof id !== 'string' || typeof enabled !== 'boolean') return { status: 400, body: { ok: false, error: 'id and enabled required' } };
  if (!listPlugins(projectPath, { home }).some((p) => p.id === id)) return { status: 400, body: { ok: false, error: 'Unknown plugin' } };
  const dir = path.join(projectPath, '.claude'), file = path.join(dir, 'settings.local.json');
  let data = {};
  if (fs.existsSync(file)) {
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return { status: 422, body: { ok: false, error: 'settings.local.json is not valid JSON' } }; }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { status: 422, body: { ok: false, error: 'settings.local.json is not valid JSON' } };
  }
  if (!data.enabledPlugins || typeof data.enabledPlugins !== 'object' || Array.isArray(data.enabledPlugins)) data.enabledPlugins = {};
  data.enabledPlugins[id] = enabled;
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, file);
  return { status: 200, body: { ok: true, ...(notIgnored(projectPath) && { warning: 'settings.local.json is not gitignored' }) } };
}

// Best effort: true only when the project is a git repo whose .gitignore files do not mention the file.
function notIgnored(projectPath) {
  try {
    if (!fs.existsSync(path.join(projectPath, '.git'))) return false;
    const ignores = [path.join(projectPath, '.gitignore'), path.join(projectPath, '.claude', '.gitignore')].map((f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }).join('\n');
    return !/settings\.local\.json|\.claude\/?\s*$/m.test(ignores);
  } catch { return false; }
}
