// Build complete, portable books without changing either source tree.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--out') {
  console.error('Usage: node docs/tools/build-books.mjs --out <new-or-empty-directory>');
  process.exit(1);
}
const output = resolve(args[1]);
if (existsSync(output) && readdirSync(output).length) {
  console.error('Output must be a new or empty directory; existing files are never replaced.');
  process.exit(1);
}

const style = `<style id="book-version-style">
.book-versions { margin: 0 0 1.5rem; padding: 1rem; border: 1px solid var(--table-border-color); border-radius: 8px; background: var(--quote-bg); font-size: .9em; }
.book-versions .version-links { display: flex; flex-wrap: wrap; gap: .6rem 1rem; align-items: center; }
.book-versions a { display: inline-block; padding: .35rem .6rem; border: 1px solid currentColor; border-radius: 5px; text-decoration: none; }
.book-versions a[aria-current="page"] { font-weight: bold; border-width: 2px; }
.book-versions a:focus-visible { outline: 3px solid var(--links); outline-offset: 3px; }
.book-versions p { margin: .65rem 0 0; }
@media print { .book-versions .version-links { display: none; } }
</style>`;
const href = (from, to) => relative(dirname(from), to).split(sep).join('/');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

function decorate(dir, version) {
  const files = readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.html'));
  for (const entry of files) {
    const file = join(entry.parentPath, entry.name);
    const page = relative(dir, file);
    // The root is a compatibility copy of v1; version folders are decorated separately.
    if (dir === output && /^(v1|v2)[\\/]/.test(page)) continue;
    let html = readFileSync(file, 'utf8');
    // Preserve the attached standalone HTML byte for byte, including its own layout.
    if (!html.includes('<main>') || page === join('proposal', 'original.html')) continue;
    // mdBook renames README.md chapters to index.html, but 0.4.40 leaves
    // some relative Markdown links pointing at README.html (also in print).
    // Repair generated links only; the preserved v1 source stays unchanged.
    html = html.replace(/href="([^"?#]*\bREADME\.html)([?#][^"]*)?"/g, (original, target, suffix = '') => {
      if (/^[a-z]+:|^\//i.test(target)) return original;
      const fixed = target.replace(/README\.html$/, 'index.html');
      return existsSync(resolve(dirname(file), fixed)) ? `href="${fixed}${suffix}"` : original;
    });
    const links = ['v1', 'v2'].map(targetVersion => {
      let target = join(output, targetVersion, page);
      const missing = !existsSync(target);
      if (missing) target = join(output, targetVersion, 'index.html');
      const label = targetVersion === 'v1' ? 'v1 원본' : 'v2 개선안';
      const current = targetVersion === version ? ' aria-current="page"' : '';
      return `<a href="${escape(href(file, target))}"${current}>${label}${missing ? ` (${targetVersion} 첫 페이지)` : ''}</a>`;
    });
    const changes = href(file, join(output, 'v2/changes.html'));
    const features = href(file, join(output, 'v2/features.html'));
    const history = href(file, join(output, 'v2/versions.html'));
    const status = version === 'v1'
      ? 'v1 원본 보존 · 2026-11-16 기준 문서. 이 판의 본문은 수정하지 않았습니다.'
      : 'v2 개정 제안판 · 신규 게임 규칙 미반영. 기획 상태와 구현 상태를 구분해 읽어 주세요.';
    const nav = `<nav class="book-versions" aria-label="문서 버전"><div class="version-links">${links.join(' ')} <a href="${escape(changes)}">변경 비교표</a> <a href="${escape(features)}">기능 관리</a> <a href="${escape(history)}">버전 이력</a></div><p>${status}</p></nav>`;
    html = html.replace('</head>', `${style}\n</head>`).replace('<main>', `<main>\n${nav}`);
    writeFileSync(file, html);
  }
}

const work = mkdtempSync(join(tmpdir(), 'project-f-mdbook-'));
try {
  for (const [version, source] of [['v1', 'docs/book'], ['v2', 'docs/book-v2']]) {
    const result = spawnSync(process.env.MDBOOK || 'mdbook', ['build', join(repo, source), '-d', join(work, version)], { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`mdBook ${version} build failed (${result.status})`);
  }
  mkdirSync(output, { recursive: true });
  cpSync(join(work, 'v1'), output, { recursive: true });
  cpSync(join(work, 'v1'), join(output, 'v1'), { recursive: true });
  cpSync(join(work, 'v2'), join(output, 'v2'), { recursive: true });
  decorate(output, 'v1');
  decorate(join(output, 'v1'), 'v1');
  decorate(join(output, 'v2'), 'v2');
  console.log(`Books built: ${output}`);
} finally {
  // Only the exact temporary directory created above is removed.
  const tempRoot = resolve(tmpdir()) + sep;
  if (!resolve(work).startsWith(tempRoot)) throw new Error('Unexpected temporary path');
  rmSync(work, { recursive: true, force: true });
}
