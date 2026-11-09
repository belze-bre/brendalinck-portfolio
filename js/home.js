// Pick one quote per visit, including returns restored from the browser cache.
(() => {
  const root = document.querySelector('[data-home-quote]');
  if (!root) return;
  const quotes = [
    {
      id:'nelson',
      text:'The purpose of computers is human freedom.',
      author:'Ted Nelson',
      source:'https://xanadu.com.au/ted/TN/WRITINGS/TCOMPARADIGM/tedCompOneLiners.html'
    },
    {
      id:'kay',
      text:'The best way to predict the future is to invent it.',
      author:'Alan Kay',
      source:'https://computerhistory.org/blog/from-alto-to-ai/'
    },
    {
      id:'antonelli',
      text:'Designers stand between revolutions and everyday life.',
      author:'Paola Antonelli',
      source:'https://www.moma.org/interactives/exhibitions/2008/elasticmind/assets/pdf/Design_and_the_Elastic_Mind.pdf'
    },
    {
      id:'culkin',
      text:'We shape our tools and thereafter they shape us.',
      author:'John M. Culkin',
      source:'https://quoteinvestigator.com/2016/06/26/shape/'
    }
  ];
  const key = 'blinck:last-home-quote';
  let previous;
  try { previous = sessionStorage.getItem(key); } catch (_) { /* Quotes also work without browser storage. */ }

  function chooseQuote() {
    const options = quotes.filter(quote => quote.id !== previous);
    const quote = options[Math.floor(Math.random() * options.length)];
    const author = root.querySelector('[data-quote-author]');
    root.querySelector('[data-quote-text]').textContent = `“${quote.text}”`;
    root.querySelector('blockquote').setAttribute('cite', quote.source);
    author.textContent = quote.author;
    root.dataset.homeQuote = quote.id;
    previous = quote.id;
    try { sessionStorage.setItem(key, quote.id); } catch (_) { /* The in-page fallback still avoids repeats on history restores. */ }
  }

  chooseQuote();
  window.addEventListener('pageshow', event => { if (event.persisted) chooseQuote(); });
})();

// Keep the shared words in place while rewriting the role's prefix and ending.
(() => {
  const root = document.querySelector('[data-role-rotator]');
  if (!root) return;

  const roles = [
    { prefix:'Senior', ending:'er' },
    { prefix:'Staff', ending:'er' },
    { prefix:'', ending:' Engineer' }
  ];
  const prefix = root.querySelector('[data-role-prefix]');
  const gap = root.querySelector('[data-role-gap]');
  const ending = root.querySelector('[data-role-ending]');
  const button = root.querySelector('[data-role-toggle]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, inView = true, userPaused = false, playing = false, controller;

  function render() {
    prefix.textContent = roles[index].prefix;
    gap.textContent = roles[index].prefix ? ' ' : '';
    ending.textContent = roles[index].ending;
  }

  function wait(duration, signal) {
    if (signal.aborted) return Promise.resolve(false);
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', cancel);
        resolve(true);
      }, duration);
      function cancel() { clearTimeout(timer); resolve(false); }
      signal.addEventListener('abort', cancel, { once:true });
    });
  }

  async function rewrite(node, value, caret, signal) {
    const previous = node.textContent;
    if (previous === value) return true;
    let shared = 0;
    while (shared < previous.length && shared < value.length && previous[shared] === value[shared]) shared++;
    root.dataset.roleCaret = caret;
    function write(text) {
      node.textContent = text;
      if (node === prefix) gap.textContent = text ? ' ' : '';
    }
    for (let length = previous.length - 1; length >= shared; length--) {
      if (signal.aborted) return false;
      write(previous.slice(0, length));
      if (!await wait(44, signal)) return false;
    }
    if (!await wait(160, signal)) return false;
    for (let length = shared + 1; length <= value.length; length++) {
      if (signal.aborted) return false;
      write(value.slice(0, length));
      if (!await wait(value[length - 1] === ' ' ? 150 : 78, signal)) return false;
    }
    return true;
  }

  async function cycle(signal, readingTime) {
    while (await wait(readingTime, signal)) {
      index = (index + 1) % roles.length;
      const next = roles[index];
      root.dataset.roleState = 'editing';
      // Restore "Designer" before adding a prefix, so the roles stay coherent.
      const edits = next.prefix
        ? [[ending, next.ending, 'ending'], [prefix, next.prefix, 'prefix']]
        : [[prefix, next.prefix, 'prefix'], [ending, next.ending, 'ending']];
      for (const [node, value, caret] of edits) {
        if (!await rewrite(node, value, caret, signal)) return;
      }
      if (signal.aborted) return;
      render();
      root.dataset.roleCaret = 'ending';
      root.dataset.roleState = 'holding';
      readingTime = next.prefix ? 3600 : 4200;
    }
  }

  function sync(initial = false) {
    const shouldPlay = inView && !document.hidden && !reduced.matches && !userPaused;
    button.hidden = reduced.matches;
    button.setAttribute('aria-pressed', String(userPaused));
    button.setAttribute('aria-label', userPaused ? 'Resume title animation' : 'Pause title animation');
    button.textContent = userPaused ? 'Resume title animation' : 'Pause title animation';
    if (playing === shouldPlay && !reduced.matches) return;
    controller?.abort();
    playing = shouldPlay;
    if (reduced.matches) index = 0;
    render();
    root.dataset.roleCaret = 'ending';
    root.dataset.roleState = shouldPlay ? 'holding' : 'paused';
    if (shouldPlay) {
      controller = new AbortController();
      cycle(controller.signal, initial ? 3000 : 3600);
    }
  }

  button.addEventListener('click', () => { userPaused = !userPaused; sync(); });
  reduced.addEventListener('change', () => sync());
  document.addEventListener('visibilitychange', () => sync());
  window.addEventListener('pageshow', () => sync());
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  }, { threshold:0 }).observe(root);
  sync(true);
})();

// Product previews play on pointer or keyboard intent; the cards stay regular links.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  document.querySelectorAll('[data-work-preview]').forEach(card => {
    const video = card.querySelector('[data-preview-video]');
    let hovered = false, request = 0;
    function wantsPreview() {
      const rect = card.getBoundingClientRect();
      return (hovered || document.activeElement === card)
        && rect.bottom > 0 && rect.top < innerHeight
        && !document.hidden && !reduced.matches;
    }
    function stop() {
      request++;
      video.pause();
      card.classList.remove('is-previewing');
    }
    async function update() {
      if (!wantsPreview()) { stop(); return; }
      const current = ++request;
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      try {
        await video.play();
        if (current !== request) return;
        if (wantsPreview()) card.classList.add('is-previewing');
        else stop();
      } catch (_) {
        if (current === request) stop();
      }
    }
    card.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || !finePointer.matches) return;
      hovered = true; update();
    });
    card.addEventListener('pointerleave', () => { hovered = false; update(); });
    card.addEventListener('focusin', update);
    card.addEventListener('focusout', () => queueMicrotask(update));
    video.addEventListener('error', stop);
    reduced.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('resize', update);
    new IntersectionObserver(update, { threshold:0 }).observe(card);
  });
})();
