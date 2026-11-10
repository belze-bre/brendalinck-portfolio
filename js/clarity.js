/* Load Clarity only after analytics consent; exclude local and test visits. */
(() => {
  const hosts = ['brendalinck.com', 'www.brendalinck.com'];
  if (!hosts.includes(location.hostname)) return;
  const preferenceKey = 'portfolio.analytics.consent.v1';
  const exclusionKey = 'portfolio.analytics.excluded';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Use this visit's choice. */ } };
  const url = new URL(location.href);
  let excluded = read(exclusionKey) === 'true' || document.cookie.split(';').some(cookie => cookie.trim() === 'portfolio_analytics_excluded=1');
  if (url.searchParams.get('analytics') === 'off') {
    excluded = true;
    write(exclusionKey, 'true');
    document.cookie = 'portfolio_analytics_excluded=1; Domain=brendalinck.com; Path=/; Max-Age=31536000; SameSite=Lax';
    url.searchParams.delete('analytics');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  } else if (url.searchParams.get('analytics') === 'on') {
    excluded = false;
    write(exclusionKey, 'false');
    document.cookie = 'portfolio_analytics_excluded=0; Domain=brendalinck.com; Path=/; Max-Age=31536000; SameSite=Lax';
    url.searchParams.delete('analytics');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }
  const automated = navigator.webdriver === true || /HeadlessChrome|HeadlessShell/i.test(navigator.userAgent);
  if (excluded || automated || window.__PORTFOLIO_DISABLE_ANALYTICS__ === true) {
    document.documentElement.dataset.analytics = 'excluded';
    return;
  }
  let preference = null;
  try {
    const saved = JSON.parse(read(preferenceKey));
    if (saved && ['granted', 'denied'].includes(saved.value) && saved.expires > Date.now()) preference = saved.value;
  } catch { /* Ask again if a saved choice cannot be read. */ }
  let loaded = false;
  let panel;
  let settings;
  function track() {
    if (loaded) return;
    loaded = true;
    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
    const script = document.createElement('script');
    script.id = 'clarity-tracking';
    script.async = true;
    script.src = 'https://www.clarity.ms/tag/zay25pt8o8';
    document.head.appendChild(script);
    document.documentElement.dataset.analytics = 'enabled';
  }
  function choose(value) {
    preference = value;
    write(preferenceKey, JSON.stringify({ value, expires: Date.now() + lifetime }));
    panel.hidden = true;
    settings.setAttribute('aria-expanded', 'false');
    settings.focus({ preventScroll: true });
    if (value === 'granted') track();
    else {
      document.documentElement.dataset.analytics = 'declined';
      if (loaded) {
        window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
        location.reload();
      }
    }
  }
  function mount() {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/css/analytics.css?v=consent-1';
    document.head.appendChild(stylesheet);
    panel = document.createElement('section');
    panel.className = 'analytics-consent';
    panel.id = 'analytics-consent';
    panel.setAttribute('aria-label', 'Analytics preferences');
    panel.hidden = preference !== null;
    const title = document.createElement('p');
    title.className = 'analytics-consent__title';
    title.textContent = 'Allow analytics cookies?';
    const description = document.createElement('p');
    description.className = 'analytics-consent__description';
    description.textContent = 'I use Microsoft Clarity to understand visits and interactions, including session recordings. You can change your choice below.';
    const privacy = document.createElement('a');
    privacy.href = 'https://privacy.microsoft.com/privacystatement';
    privacy.textContent = 'Microsoft privacy statement';
    privacy.target = '_blank';
    privacy.rel = 'noopener noreferrer';
    const actions = document.createElement('div');
    actions.className = 'analytics-consent__actions';
    for (const [value, label] of [['denied', 'Decline'], ['granted', 'Accept analytics']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.dataset.analyticsConsent = value;
      button.addEventListener('click', () => choose(value));
      actions.append(button);
    }
    panel.append(title, description, privacy, actions);
    const footer = document.createElement('div');
    footer.className = 'analytics-preferences';
    settings = document.createElement('button');
    settings.type = 'button';
    settings.textContent = 'Privacy settings';
    settings.setAttribute('aria-controls', panel.id);
    settings.setAttribute('aria-expanded', String(!panel.hidden));
    settings.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      settings.setAttribute('aria-expanded', String(!panel.hidden));
      if (!panel.hidden) panel.querySelector('button').focus();
    });
    footer.append(settings);
    document.body.append(panel, footer);
    document.documentElement.dataset.analytics = preference === 'denied' ? 'declined' : 'awaiting-consent';
    if (preference === 'granted') track();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
