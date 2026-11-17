// Build complete, portable books without changing either source tree.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { changedBlocks, comparisonRows, markChangedContent, plainText } from './book-changes.mjs';

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

const href = (from, to) => relative(dirname(from), to).split(sep).join('/');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const mainContent = html => html.match(/<main>([\s\S]*?)<\/main>/)?.[1] || '';
const changeIndex = {};
const pageBlocks = new Map();

function collectChanges(v1, v2) {
  const rows = comparisonRows(readFileSync(join(repo, 'docs/book-v2/src/changes.md'), 'utf8'));
  for (const entry of readdirSync(v2, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.html') || ['print.html', 'original.html', '404.html'].includes(entry.name)) continue;
    const file = join(entry.parentPath, entry.name);
    const page = relative(v2, file).split(sep).join('/');
    const after = mainContent(readFileSync(file, 'utf8'));
    const original = join(v1, page);
    const before = existsSync(original) ? mainContent(readFileSync(original, 'utf8')) : '';
    const parts = changedBlocks(before, after);
    pageBlocks.set(page, parts);
    if (!parts.some(part => part.changed)) continue;
    const title = plainText(after.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] || page);
    const ids = new Set(plainText(after).match(/\b[A-Z]+-\d{2}\b/g) || []);
    const items = rows.filter(row => row.page === page || ids.has(row.id));
    const headings = parts.filter(part => part.changed && /^\s*<h[23]\b/.test(part.html)).slice(0, 3).map(part => plainText(part.html));
    changeIndex[page] = { title, items: items.length ? items : [{
      before: before ? `기존 「${plainText(before.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] || title)}」 설명` : 'V1에는 이 문서가 없습니다.',
      after: parts[0]?.removed ? `기존 설명 삭제: ${parts[0].removed.join(' · ').slice(0, 180)}` : headings.length ? `${headings.join(' · ')} 설명을 ${before ? '추가·수정' : '추가'}했습니다.` : `「${title}」 ${before ? '안내를 보완' : '문서를 새로 추가'}했습니다.`,
      state: page.startsWith('proposal/') ? '첨부 개선안 수록 / 새 게임 규칙은 제안·미반영' : '문서 변경 / 게임 구현 완료를 뜻하지 않음',
    }] };
  }
}

function decorate(dir, version) {
  const files = readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.html'));
  for (const entry of files) {
    const file = join(entry.parentPath, entry.name);
    const page = relative(dir, file).split(sep).join('/');
    // The root is a compatibility copy of v1; version folders are decorated separately.
    if (dir === output && /^(v1|v2)[\\/]/.test(page)) continue;
    let html = readFileSync(file, 'utf8');
    // Preserve the attached standalone HTML byte for byte, including its own layout.
    if (!html.includes('<main>') || page === 'proposal/original.html') continue;
    // mdBook renames README.md chapters to index.html, but 0.4.40 leaves
    // some relative Markdown links pointing at README.html (also in print).
    // Repair generated links only; the preserved v1 source stays unchanged.
    html = html.replace(/href="([^"?#]*\bREADME\.html)([?#][^"]*)?"/g, (original, target, suffix = '') => {
      if (/^[a-z]+:|^\//i.test(target)) return original;
      const fixed = target.replace(/README\.html$/, 'index.html');
      return existsSync(resolve(dirname(file), fixed)) ? `href="${fixed}${suffix}"` : original;
    });
    const options = ['v1', 'v2'].map(targetVersion => {
      let target = join(output, targetVersion, page);
      const missing = !existsSync(target);
      if (missing) target = join(output, targetVersion, 'index.html');
      const label = targetVersion === 'v1' ? 'V1 원본' : 'V2 개선안';
      const current = targetVersion === version ? ' selected' : '';
      return `<option value="${escape(href(file, target))}"${current}>${label}${missing ? ' (첫 페이지)' : ''}</option>`;
    });
    const changes = href(file, join(output, 'v2/changes.html'));
    const history = href(file, join(output, 'v2/versions.html'));
    const status = version === 'v1'
      ? 'v1 원본 보존 · 2026-11-16 기준 문서. 이 판의 본문은 수정하지 않았습니다.'
      : 'V2 개정 제안판 · 신규 게임 규칙 미반영. 붉은 목차·본문을 클릭하면 V1 대비 변경 요약을 볼 수 있습니다.';
    const nav = `<nav class="book-version-menu" aria-label="문서 버전"><select id="book-version-select" aria-label="문서 버전 선택">${options.join('')}</select><a href="${escape(history)}">버전 이력</a></nav>`;
    html = html.replace('<div class="right-buttons">', `<div class="right-buttons">\n${nav}`);
    // Keep the underlying reference documents, but move/remove their sidebar entry points.
    html = html.replace(/<ol class="chapter">[\s\S]*?<\/nav>/, sidebar => {
      sidebar = sidebar.replace(/<li\b[^>]*>\s*<a\b[^>]*href="([^"]*)"[^>]*>[\s\S]*?<\/a><\/li>/g, (item, target) => {
        const resolved = relative(dir, resolve(dirname(file), target)).split(sep).join('/');
        return ['versions.html', 'features.html'].includes(resolved) ? '' : item;
      });
      if (version !== 'v2') return sidebar;
      return sidebar.replace(/<a\b([^>]*href="([^"]*)"[^>]*)>([\s\S]*?)<\/a>/g, (link, attributes, target, label) => {
        const key = relative(dir, resolve(dirname(file), target)).split(sep).join('/');
        if (!changeIndex[key]) return link;
        const classes = /class="/.test(attributes) ? attributes.replace('class="', 'class="book-toc-change ') : `${attributes} class="book-toc-change"`;
        return `<a${classes} data-book-change="${escape(key)}" aria-haspopup="dialog" title="V1 대비 변경 요약 보기">${label}<span class="book-change-tag" aria-hidden="true">변경</span></a>`;
      });
    });
    if (version === 'v2' && pageBlocks.has(page)) {
      // Mark after link normalization; partitioning uses the same top-level block order.
      const normalized = changedBlocks('', mainContent(html));
      const originalParts = pageBlocks.get(page);
      const parts = normalized.map((part, i) => ({ ...originalParts[i], html: part.html, changed: originalParts[i]?.changed || false }));
      html = html.replace(/<main>[\s\S]*?<\/main>/, () => `<main>${markChangedContent(parts, page)}</main>`);
    }
    const css = href(file, join(output, '_book-ui.css'));
    const js = href(file, join(output, '_book-ui.js'));
    html = html.replace('</head>', `<link rel="stylesheet" href="${escape(css)}">\n</head>`)
      .replace('<main>', `<main>\n<p class="book-version-status">${status}</p>`);
    let extra = '';
    if (version === 'v2') {
      const root = href(file, join(output, 'v2/index.html')).replace(/index\.html$/, '');
      const json = JSON.stringify(changeIndex).replaceAll('<', '\\u003c');
      extra = `<script type="application/json" id="book-change-data" data-book-root="${escape(root || './')}">${json}</script>
<dialog id="book-change-dialog" aria-labelledby="book-change-title"><button type="button" class="dialog-close" aria-label="변경 요약 닫기">×</button><h2 id="book-change-title">V1 대비 변경 요약</h2><div id="book-change-body"></div><div class="dialog-actions"><a id="book-change-open" href="${escape(href(file, file))}">문서 열기</a><a href="${escape(changes)}">전체 변경 비교표</a></div></dialog>`;
    }
    html = html.replace('</body>', `${extra}<script src="${escape(js)}"></script>\n</body>`);
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
  collectChanges(join(work, 'v1'), join(work, 'v2'));
  cpSync(join(repo, 'docs/tools/book-ui.css'), join(output, '_book-ui.css'));
  cpSync(join(repo, 'docs/tools/book-ui.js'), join(output, '_book-ui.js'));
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
