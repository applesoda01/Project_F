import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditPreservation } from './audit-book-preservation.mjs';

test('all v1 pages and original content remain except reviewed improvement-related replacements', () => {
  const audit = auditPreservation();
  assert.deepEqual(audit.failures, []);
  assert.ok(audit.pages.length > 60, 'Audit all chapters, not only economics');
});

test('v3 also keeps all v1 pages and original content except reviewed replacements', () => {
  const audit = auditPreservation('docs/book-v3/src', 'docs/tools/book-preservation-exceptions-v3.json');
  assert.deepEqual(audit.failures, []);
  assert.ok(audit.pages.length > 60, 'Audit all chapters, not only economics');
});

// 2026-11-19 V4: V3를 복사해 시장 제안만 더한 판 — V3와 같은 예외 목록으로 V1 원문 보존을 확인
test('v4 also keeps all v1 pages and original content except reviewed replacements', () => {
  const audit = auditPreservation('docs/book-v4/src', 'docs/tools/book-preservation-exceptions-v3.json');
  assert.deepEqual(audit.failures, []);
  assert.ok(audit.pages.length > 60, 'Audit all chapters, not only economics');
});

// 2026-11-24 V5: V4를 복사해 경영 · 육성 개편 장만 더한 판 — 같은 예외 목록으로 V1 원문 보존을 확인
test('v5 also keeps all v1 pages and original content except reviewed replacements', () => {
  const audit = auditPreservation('docs/book-v5/src', 'docs/tools/book-preservation-exceptions-v3.json');
  assert.deepEqual(audit.failures, []);
  assert.ok(audit.pages.length > 60, 'Audit all chapters, not only economics');
});

// 2026-11-26 V6: V5를 복사해 개편안을 장마다 합친 판 — 같은 예외 목록으로 V1 원문 보존을 확인
test('v6 also keeps all v1 pages and original content except reviewed replacements', () => {
  const audit = auditPreservation('docs/book-v6/src', 'docs/tools/book-preservation-exceptions-v3.json');
  assert.deepEqual(audit.failures, []);
  assert.ok(audit.pages.length > 60, 'Audit all chapters, not only economics');
});
