import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

function snapshot(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(e => e.isFile()).map(e => {
      const path = join(e.parentPath, e.name);
      return [path, createHash('sha256').update(readFileSync(path)).digest('hex')];
    });
}

test('real books preserve v1 and provide portable version links, including new chapters', (t) => {
  const before = snapshot('docs/book');
  const temporary = mkdtempSync(join(tmpdir(), 'project-f-book-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const output = join(temporary, 'preview', 'book');
  const run = () => spawnSync(process.execPath, ['docs/tools/build-books.mjs', '--out', output], {
    encoding: 'utf8', env: process.env,
  });
  const result = run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(snapshot('docs/book'), before, 'v1 sources must not change');
  const chapter = readFileSync(join(output, 'v1/ch09/income.html'), 'utf8');
  assert.match(chapter, /href="\.\.\/\.\.\/v2\/ch09\/income.html"/);
  assert.match(chapter, /aria-current="page"[^>]*>v1/);
  const added = readFileSync(join(output, 'v2/ch03/contracts.html'), 'utf8');
  assert.match(added, /href="\.\.\/\.\.\/v1\/index.html"/);
  assert.match(added, /v1 첫 페이지/);
  assert.match(readFileSync(join(output, 'ch09/income.html'), 'utf8'), /href="\.\.\/v2\/ch09\/income.html"/);
  for (const version of ['v1', 'v2']) {
    assert.ok(existsSync(join(output, version, 'searchindex.js')));
  }
  assert.deepEqual(readFileSync(join(output, 'v2/proposal/original.html')),
    readFileSync('docs/book-v2/src/proposal/original.html'), 'Attached original must survive the build unchanged');
  // mdBook 0.4.40 writes README chapters as index.html: all emitted local
  // references must resolve, including inherited prose and print output.
  const broken = [];
  for (const entry of readdirSync(output, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.html') || entry.name === 'original.html') continue;
    const file = join(entry.parentPath, entry.name);
    for (const match of readFileSync(file, 'utf8').matchAll(/(?:href|src)="([^"#]+)(?:#[^"]*)?"/g)) {
      const target = match[1].split('#')[0].split('?')[0];
      if (/^(?:https?:|data:|mailto:|javascript:|\/)/.test(target)) continue;
      if (!existsSync(resolve(dirname(file), decodeURIComponent(target)))) broken.push(`${file}: ${target}`);
    }
  }
  assert.deepEqual(broken, [], 'Every local HTML link and asset must exist');
  // Overwriting a mixed site could remove or retain stale pages: refuse it.
  const second = run();
  assert.notEqual(second.status, 0);
  assert.equal(readFileSync(join(output, 'v1/ch09/income.html'), 'utf8'), chapter);
  console.log(`Verified real build: ${resolve(output)}`);
});
