import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditPreservation } from './audit-book-preservation.mjs';

test('all v1 pages and original content remain except reviewed improvement-related replacements', () => {
  const audit = auditPreservation();
  assert.deepEqual(audit.failures, []);
  assert.ok(audit.pages.length > 60, 'Audit all chapters, not only economics');
});
