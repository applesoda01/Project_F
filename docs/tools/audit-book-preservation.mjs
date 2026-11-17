import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

export function auditPreservation() {
  const baseline = 'docs/book/src';
  const revised = 'docs/book-v2/src';
  const exceptions = JSON.parse(readFileSync('docs/tools/book-preservation-exceptions.json', 'utf8'));
  const pages = [], failures = [];
  for (const entry of readdirSync(baseline, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'SUMMARY.md') continue;
    const page = relative(baseline, join(entry.parentPath, entry.name)).replaceAll('\\', '/');
    const before = readFileSync(join(baseline, page), 'utf8');
    const after = readFileSync(join(revised, page), 'utf8');
    const lines = [...new Set(before.split(/\r?\n/).filter(line => line.trim()))];
    const missing = lines.filter(line => !after.includes(line));
    for (const line of missing) {
      if (!exceptions.some(item => item.page === page && item.before === line && item.reason)) failures.push({ page, line });
    }
    pages.push({ page, originalLines: lines.length, retained: lines.length - missing.length, replaced: missing.length });
  }
  // Every original chapter must remain addressable from the v2 contents.
  const links = [...readFileSync(join(baseline, 'SUMMARY.md'), 'utf8').matchAll(/\]\(([^)]+\.md)\)/g)].map(m => m[1]);
  const contents = readFileSync(join(revised, 'SUMMARY.md'), 'utf8');
  for (const link of links) if (!contents.includes(`](${link})`)) failures.push({ page: 'SUMMARY.md', line: link });
  for (const item of exceptions) {
    if (!readFileSync(join(baseline, item.page), 'utf8').includes(item.before) || readFileSync(join(revised, item.page), 'utf8').includes(item.before)) {
      failures.push({ page: item.page, line: 'Stale replacement exception: ' + item.before });
    }
  }
  return { pages, exceptions, failures };
}
