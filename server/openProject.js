import fs from 'node:fs';
import path from 'node:path';
import { spawn as realSpawn } from 'node:child_process';

const BAD_PATH = /[&|<>^%!"\r\n]/;

export async function openProject({ path: dir, command = process.env.EDITOR_COMMAND || 'code', platform = process.platform, spawner = realSpawn } = {}) {
  if (typeof command !== 'string' || !/^[A-Za-z0-9._-]+$/.test(command)) return { ok: false, error: 'অবৈধ editor কমান্ড' };
  if (typeof dir !== 'string' || !path.isAbsolute(dir) || BAD_PATH.test(dir)) return { ok: false, error: 'অবৈধ পথ' };
  try { if (!fs.statSync(dir).isDirectory()) throw 0; } catch { return { ok: false, error: 'folder পাওয়া যায়নি' }; }
  const notFound = { ok: false, error: `${command} কমান্ড পাওয়া যায়নি` };
  const opts = { detached: true, stdio: 'ignore' };
  let child;
  try {
    child = platform === 'win32'
      ? spawner('cmd.exe', ['/d', '/s', '/c', command, '"' + dir + '"'], { ...opts, windowsVerbatimArguments: true, windowsHide: true })
      : spawner(command, [dir], opts);
  } catch { return notFound; }
  const result = await new Promise((resolve) => {
    const t = setTimeout(() => resolve({ ok: true }), 3000);
    const done = (r) => { clearTimeout(t); resolve(r); };
    child.once('error', () => done(notFound));
    child.once('exit', (code) => done(code ? notFound : { ok: true }));
  });
  child.unref?.();
  return result;
}
