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
  assert.match(chapter, /<option value="\.\.\/\.\.\/v2\/ch09\/income.html">V2/);
  assert.match(chapter, /<option[^>]+selected>V1/);
  assert.match(chapter, /class="right-buttons">\s*<nav class="book-version-menu"/);
  assert.doesNotMatch(chapter, /class="book-versions"/);
  const added = readFileSync(join(output, 'v2/changes.html'), 'utf8');
  assert.match(added, /<option value="\.\.\/v1\/index.html">V1 원본 \(첫 페이지\)/);
  assert.match(readFileSync(join(output, 'ch09/income.html'), 'utf8'), /value="\.\.\/v2\/ch09\/income.html"/);
  assert.match(added, /<section class="book-change"/);
  assert.match(added, /<dialog id="book-change-dialog"/);
  const sidebar = added.match(/<ol class="chapter">([\s\S]*?)<\/nav>/)[1];
  assert.doesNotMatch(sidebar, />버전 이력<|>버전별 기능 관리</);
  assert.match(sidebar, /<a[^>]+data-book-change="ch03\/lifecycle.html"[^>]*>/);
  const unchanged = readFileSync(join(output, 'v2/ch03/stats.html'), 'utf8');
  assert.doesNotMatch(unchanged, /<section class="book-change"/);
  assert.doesNotMatch(sidebar, /<a[^>]+data-book-change="ch03\/stats.html"/);
  const partial = readFileSync(join(output, 'v2/ch03/lifecycle.html'), 'utf8');
  const changedRegions = [...partial.matchAll(/<section class="book-change"[^>]*>([\s\S]*?)<\/section>/g)].map(m => m[1]).join('');
  assert.match(changedRegions, /assets\/ui\/contract.jpg/);
  assert.doesNotMatch(changedRegions, /모험가는 명성 10마다 1명씩 오고/);
  const metadata = JSON.parse(added.match(/<script type="application\/json" id="book-change-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
  assert.ok(metadata['ch03/lifecycle.html'].items.some(item => item.after.includes('E급 소수 계약')));
  assert.ok(metadata['ch03/lifecycle.html'].items.every(item => item.state.includes('미반영')));
  for (const version of ['v1', 'v2']) {
    assert.ok(existsSync(join(output, version, 'searchindex.js')));
  }
  for (const removed of ['proposal', 'ch03/contracts.html', 'ch04/commission.html', 'ch06/ownership.html']) {
    assert.equal(existsSync(join(output, 'v2', removed)), false);
  }
  for (const name of ['contract', 'guild-order', 'assignment', 'trade', 'ledger', 'policy']) {
    const asset = readFileSync(join(output, 'v2/assets/ui', name + '.jpg'));
    assert.equal(asset.subarray(0, 2).toString('hex'), 'ffd8', 'Real JPEG, not an LFS pointer');
  }
  assert.equal(createHash('sha256').update(readFileSync('docs/references/guild-economy-contracts-2026-11-16/original.html')).digest('hex'),
    '7b6a3b1a40d01e50a7b97e4e21062f92d69b30972eb87cdfbc15ec05b6474480');
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
