import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changedBlocks, markChangedContent } from './book-changes.mjs';

test('only changed table rows and list items receive red styling', () => {
  const before = '<table><tr><th>규칙</th></tr><tr><td>유지</td></tr><tr><td>10%</td></tr></table><ul><li>기존</li><li>교체 전</li></ul>';
  const after = '<table><tr><th>규칙</th></tr><tr><td>유지</td></tr><tr><td>15%</td></tr></table><ul><li>기존</li><li>교체 후</li></ul>';
  const html = markChangedContent(changedBlocks(before, after), 'test.html');
  assert.match(html, /<tr><td>유지<\/td><\/tr>/);
  assert.match(html, /<li>기존<\/li>/);
  assert.match(html, /<tr class="book-unit-change"><td>15%/);
  assert.match(html, /<li class="book-unit-change">교체 후/);
  assert.equal((html.match(/book-change-partial/g) || []).length, 2);
});

test('image-only additions and replacements are marked, identical images stay unchanged', () => {
  const old = '<p><img src="old.jpg" alt="계약 시안"></p>';
  const next = '<p><img src="new.jpg" alt="계약 시안"></p>';
  assert.equal(changedBlocks('', next)[0].changed, true);
  assert.equal(changedBlocks(old, next)[0].changed, true);
  assert.equal(changedBlocks(next, next)[0].changed, false);
});

test('unchanged paragraphs stay unmarked when v2 adds only its inherited-source note', () => {
  const v1 = '<h1><a href="#a">성장</a></h1><p>레벨은 유지합니다.</p>';
  const v2 = '<h1><a href="#b">성장</a></h1><blockquote><p><strong>v1에서 유지한 설명.</strong> 참고 안내</p></blockquote><p>레벨은 유지합니다.</p>';
  assert.equal(changedBlocks(v1, v2).filter(block => block.changed).length, 0);
});

test('inserted contract section is red while original nested table and text remain intact', () => {
  const old = '<h1>모험가</h1><table><thead><tr><th>정원</th></tr></thead><tbody><tr><td>8명</td></tr></tbody></table><p>자유롭게 활동합니다.</p>';
  const next = '<h1>모험가</h1><h2>계약</h2><p>선택 계약을 추가합니다.<br>미반영입니다.</p><h2>v1에서 이어받은 설명</h2>' + old.slice(old.indexOf('<table>'));
  const marked = markChangedContent(changedBlocks(old, next), 'adventurers.html');
  assert.match(marked, /<section class="book-change"[^>]*>[\s\S]*선택 계약/);
  assert.match(marked, /<\/section>\s*<h2>v1에서 이어받은 설명<\/h2><table>/);
  assert.equal((marked.match(/class="book-change"/g) || []).length, 1);
});

test('new pages and actual table changes are identified without interpreting escaped code as tags', () => {
  const old = '<table><tr><td>10%</td></tr></table><pre><code>&lt;tag&gt;</code></pre>';
  const next = '<table><tr><td>20%</td></tr></table><pre><code>&lt;tag&gt;</code></pre>';
  assert.deepEqual(changedBlocks(old, next).map(b => b.changed), [true, false]);
  assert.ok(changedBlocks('', '<h1>새 계약</h1><p>제안</p>').every(b => b.changed));
});

test('a deletion-only revision still marks its heading for the change summary', () => {
  const result = changedBlocks('<h1>계약</h1><p>기본 규칙</p><p>삭제한 제약</p>', '<h1>계약</h1><p>기본 규칙</p>');
  assert.deepEqual(result.map(block => block.changed), [true, false]);
});
