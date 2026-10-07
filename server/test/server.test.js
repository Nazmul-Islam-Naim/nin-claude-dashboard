import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server.js';

test('smoke: three endpoints 200, bound to 127.0.0.1', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'srv-'));
  fs.mkdirSync(path.join(root, 'p'));
  fs.writeFileSync(path.join(root, 'p', 's.jsonl'), JSON.stringify({ cwd: '/w/demo', sessionId: 's', timestamp: new Date().toISOString() }));
  const server = createApp({ root, read: async () => ({ status: 'no-sheet', rows: [] }) }).listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  try {
    const { address, port } = server.address();
    assert.equal(address, '127.0.0.1');
    for (const p of ['/api/projects', '/api/feed', '/api/pipeline?project=nope']) {
      const res = await fetch(`http://127.0.0.1:${port}${p}`);
      assert.equal(res.status, 200, p);
    }
    const j = await (await fetch(`http://127.0.0.1:${port}/api/projects`)).json();
    assert.equal(j.projects[0].name, 'demo');
    assert.equal(j.projects[0].active, true);
  } finally {
    server.close();
  }
});
