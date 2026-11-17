(() => {
  const select = document.getElementById('book-version-select');
  select?.addEventListener('change', () => window.location.assign(select.value));

  const dialog = document.getElementById('book-change-dialog');
  const data = document.getElementById('book-change-data');
  // mdBook has global arrow shortcuts, including on v1 where there is no dialog.
  document.addEventListener('keydown', event => {
    if (dialog?.open || event.target === select) event.stopImmediatePropagation();
  }, true);
  if (!dialog || !data) return;
  const changes = JSON.parse(data.textContent);
  let previousFocus;

  const paragraph = (label, text, className) => {
    const p = document.createElement('p');
    if (className) p.className = className;
    const strong = document.createElement('strong');
    strong.textContent = label;
    p.append(strong, document.createTextNode(text));
    return p;
  };
  function openSummary(trigger) {
    const record = changes[trigger.dataset.bookChange];
    if (!record) return;
    previousFocus = document.activeElement;
    document.getElementById('book-change-title').textContent = record.title;
    const body = document.getElementById('book-change-body');
    body.replaceChildren();
    for (const item of record.items.slice(0, 3)) {
      const section = document.createElement('div');
      section.className = 'change-item';
      section.append(paragraph('V1 · ', item.before), paragraph('V2 · ', item.after, 'change-after'));
      if (item.reason) section.append(paragraph('이유 · ', item.reason));
      section.append(paragraph('', item.state, 'change-state'));
      body.append(section);
    }
    if (record.items.length > 3) body.append(paragraph('', '나머지 변경은 전체 비교표에서 확인할 수 있습니다.'));
    document.getElementById('book-change-open').href = new URL(trigger.dataset.bookChange, new URL(data.dataset.bookRoot, window.location.href)).href;
    dialog.showModal();
    dialog.querySelector('.dialog-close').focus();
  }
  document.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const trigger = event.target.closest('[data-book-change]');
    if (!trigger) return;
    // Preserve normal article links; clicking a red heading or summary button opens the dialog.
    const link = event.target.closest('a');
    if (trigger.classList.contains('book-change') && link && !link.classList.contains('header')) return;
    event.preventDefault();
    openSummary(trigger);
  });
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => previousFocus?.focus());
})();
