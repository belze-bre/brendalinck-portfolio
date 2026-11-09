/* One preference for the homepage, case studies, and résumé. Load before CSS. */
(() => {
  const root = document.documentElement;
  const valid = value => value === 'light' || value === 'dark';
  let saved;
  try {
    saved = localStorage.getItem('theme');
    if (!valid(saved)) saved = localStorage.getItem('blinck:valdivia:theme');
  } catch (_) { /* Theme switching also works with browser storage disabled. */ }

  function syncControls() {
    const light = root.dataset.theme === 'light';
    document.querySelectorAll('[data-theme-toggle], [data-view-theme]').forEach(button => {
      button.querySelectorAll('[data-theme-label]').forEach(label => label.remove());
      [...button.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).forEach(node => node.remove());
      if (!button.querySelector('svg')) {
        button.innerHTML = '<svg data-theme-symbol width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"></svg>';
      }
      const symbol = button.querySelector('[data-theme-symbol]');
      if (symbol) symbol.innerHTML = light
        ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
        : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>';
      button.setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} mode`);
      button.title = button.getAttribute('aria-label');
      button.hidden = false;
    });
  }

  function apply(theme) {
    root.dataset.theme = theme;
    syncControls();
  }
  apply(valid(saved) ? saved : (valid(root.dataset.theme) ? root.dataset.theme : 'dark'));
  document.addEventListener('DOMContentLoaded', syncControls);
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-theme-toggle], [data-view-theme]')) return;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next);
    try {
      localStorage.setItem('theme', next);
      localStorage.setItem('blinck:valdivia:theme', next);
    } catch (_) {}
  });
  window.addEventListener('storage', event => {
    if (event.key === 'theme' && valid(event.newValue)) apply(event.newValue);
  });
})();
