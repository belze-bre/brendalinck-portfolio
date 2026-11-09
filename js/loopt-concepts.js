// Play each conceptual illustration once when it enters the reading area.
(() => {
  const figures = document.querySelectorAll('[data-concept]');
  if (!figures.length || !('IntersectionObserver' in window)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      if (!reduced.matches) entry.target.classList.add('is-playing');
      observer.unobserve(entry.target);
    }
  }, { threshold:0.35 });
  figures.forEach(figure => observer.observe(figure));
})();

// Keep the original workflow readable, and trace its connected branches on demand.
(() => {
  const flow = document.querySelector('[data-flow]');
  if (!flow) return;
  const nodes = [...flow.querySelectorAll('[data-step]')];
  const edges = [...flow.querySelectorAll('[data-from][data-to]')];
  // Connections carry the colour of the step they leave (or enter, for neutral steps).
  edges.forEach(edge => {
    const from = nodes.find(node => node.dataset.step === edge.dataset.from);
    const to = nodes.find(node => node.dataset.step === edge.dataset.to);
    const tone = [from, to].find(node => node?.matches('.flow-node--success,.flow-node--exception,.flow-node--warning,.flow-node--ai'));
    const color = tone?.classList.contains('flow-node--success') ? '--flow-green'
      : tone?.classList.contains('flow-node--exception') ? '--flow-red'
      : tone?.classList.contains('flow-node--warning') ? '--flow-amber'
      : tone?.classList.contains('flow-node--ai') ? '--flow-ai' : '--flow-accent';
    edge.style.setProperty('--edge-color', `var(${color})`);
  });
  let selected = null;
  function trace(step) {
    const path = new Set(step ? [step] : []);
    // Search ancestors and descendants independently so sibling alternatives stay quiet.
    for (const direction of ['upstream', 'downstream']) {
      const visited = new Set(path.size ? [step] : []);
      const queue = step ? [step] : [];
      while (queue.length) {
        const key = queue.shift();
        edges.forEach(edge => {
          const from = direction === 'upstream' ? edge.dataset.to : edge.dataset.from;
          const to = direction === 'upstream' ? edge.dataset.from : edge.dataset.to;
          if (from !== key || visited.has(to)) return;
          visited.add(to); path.add(to); queue.push(to);
        });
      }
    }
    flow.classList.toggle('has-active', !!step);
    nodes.forEach(node => {
      node.classList.toggle('is-on-path', path.has(node.dataset.step));
      node.classList.toggle('is-current', node.dataset.step === step);
      node.setAttribute('aria-pressed', String(node.dataset.step === selected));
    });
    edges.forEach(edge => edge.classList.toggle('is-on-path', path.has(edge.dataset.from) && path.has(edge.dataset.to)));
  }
  nodes.forEach(node => {
    node.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') trace(node.dataset.step); });
    node.addEventListener('pointerleave', () => trace(selected || flow.querySelector(':focus-visible[data-step]')?.dataset.step));
    node.addEventListener('focus', () => trace(node.dataset.step));
    node.addEventListener('blur', () => trace(selected));
    const select = () => { selected = selected === node.dataset.step ? null : node.dataset.step; trace(selected); };
    node.addEventListener('click', select);
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); }
    });
  });
  flow.addEventListener('keydown', event => {
    if (event.key === 'Escape') { selected = null; trace(null); }
  });
  flow.addEventListener('click', event => {
    if (!event.target.closest('[data-step]')) { selected = null; trace(null); }
  });
})();
