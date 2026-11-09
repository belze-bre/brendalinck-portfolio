(() => {
  const alternate = new URLSearchParams(location.search).get('view') === 'valdivia';
  if (alternate) {
    document.querySelectorAll('a[href="index.html"]').forEach(link => {
      link.href = 'home-valdivia.html';
    });
  }
})();
