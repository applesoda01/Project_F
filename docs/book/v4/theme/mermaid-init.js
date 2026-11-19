// ```mermaid 코드 블록을 그림으로 바꿈 (밝은/어두운 테마에 맞춤)
(function () {
  if (!window.mermaid) return;
  var dark = /navy|coal|ayu/.test(document.documentElement.className);
  document.querySelectorAll('code.language-mermaid').forEach(function (c) {
    var d = document.createElement('div'); d.className = 'mermaid'; d.textContent = c.textContent;
    c.parentElement.replaceWith(d);
  });
  mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'neutral', fontFamily: 'inherit' });
  mermaid.run();
})();
