// Compare rendered top-level content blocks, never the shared site chrome.
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
export const plainText = html => html.replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g,
  entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' })[entity]).replace(/\s+/g, ' ').trim();

function blocks(html) {
  const result = [];
  let depth = 0, start = 0;
  for (const token of html.matchAll(/<!--[\s\S]*?-->|<\/?([a-z][\w:-]*)\b[^>]*>/gi)) {
    if (!token[1]) continue;
    const tag = token[1].toLowerCase();
    if (token[0].startsWith('</')) depth--;
    else if (!voidTags.has(tag) && !token[0].endsWith('/>')) depth++;
    if (depth === 0) {
      const end = token.index + token[0].length;
      result.push(html.slice(start, end));
      start = end;
    }
  }
  if (html.slice(start).trim()) result.push(html.slice(start));
  else if (result.length) result[result.length - 1] += html.slice(start);
  return result;
}

function signature(html) {
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map(([tag]) =>
    ['src', 'alt'].map(name => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1] || ''));
  return plainText(html) + (images.length ? JSON.stringify(images) : '');
}

export function changedBlocks(before, after) {
  const previous = new Set(blocks(before).map(signature));
  const result = blocks(after).map(html => {
    const text = plainText(html);
    const inheritedNote = text.startsWith('v1에서 유지한 설명.') || text === 'v1에서 이어받은 설명';
    const key = signature(html);
    return { html, changed: Boolean(key) && !inheritedNote && !previous.has(key) };
  });
  // A removal leaves no new paragraph to color. Mark the retained heading so
  // the chapter still exposes its change summary instead of silently disappearing.
  const current = new Set(result.map(part => signature(part.html)));
  const removed = [...previous].filter(text => text && !current.has(text));
  if (removed.length && result.length && !result.some(part => part.changed)) {
    result[0].changed = true;
    result[0].removed = removed;
  }
  return result;
}

export function markChangedContent(parts, page) {
  const key = page.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  let html = '', open = false;
  for (const part of parts) {
    if (part.changed && !open) {
      html += `<section class="book-change" data-book-change="${key}" aria-label="V1 대비 변경된 내용"><button type="button" class="book-change-trigger" aria-haspopup="dialog">변경 요약</button>`;
      open = true;
    } else if (!part.changed && open) {
      html += '</section>';
      open = false;
    }
    html += part.html;
  }
  return html + (open ? '</section>' : '');
}

export function comparisonRows(markdown) {
  return markdown.split(/\r?\n/).filter(line => /^\| [A-Z]+-\d{2} ·/.test(line)).map(line => {
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    return {
      id: cells[0].split(' · ')[0], name: cells[0].split(' · ')[1], before: cells[1], after: cells[2],
      reason: cells[3], state: `기획: ${cells[4]} / 게임: ${cells[5]}`,
      page: cells[6].match(/\[개정 장\]\(([^)]+)\)/)[1].replace(/README\.md$/, 'index.html').replace(/\.md$/, '.html'),
    };
  });
}
