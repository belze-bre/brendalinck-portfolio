/* Archive screen viewer. Image links also work without JavaScript. */
(() => {
  const viewer = document.querySelector('.image-viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;

  const links = [...document.querySelectorAll('a[data-gallery]')];
  const image = viewer.querySelector('[data-viewer-image]');
  const title = viewer.querySelector('#viewer-title');
  const caption = viewer.querySelector('#viewer-caption');
  const status = viewer.querySelector('[data-viewer-status]');
  const previous = viewer.querySelector('[data-viewer-prev]');
  const next = viewer.querySelector('[data-viewer-next]');
  let group = [];
  let index = 0;
  let trigger = null;

  function render() {
    const link = group[index];
    image.src = link.href;
    image.alt = link.querySelector('img')?.alt || `${link.dataset.project}: ${link.dataset.caption}`;
    title.textContent = link.dataset.project;
    caption.textContent = link.dataset.caption;
    status.textContent = `${index + 1} of ${group.length}`;
    previous.disabled = group.length < 2;
    next.disabled = group.length < 2;
  }

  function move(direction) {
    index = (index + direction + group.length) % group.length;
    render();
  }

  links.forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    trigger = link;
    group = links.filter(item => item.dataset.gallery === link.dataset.gallery);
    index = group.indexOf(link);
    render();
    viewer.showModal();
  }));

  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  viewer.querySelector('[data-viewer-close]').addEventListener('click', () => viewer.close());
  viewer.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      viewer.close();
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  viewer.addEventListener('click', event => {
    if (event.target !== viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
  });
  viewer.addEventListener('close', () => {
    image.removeAttribute('src');
    trigger?.focus({ preventScroll:true });
  });
})();
