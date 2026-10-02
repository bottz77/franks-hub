/* Frank's Hub service worker: network-first for everything same-origin, cache only as an offline fallback.
   News (index.html / data.json) is always fetched fresh when online. Build: 20261002185227 */
const CACHE = 'franks-hub-20261002185227';
const SHELL = ['./', './index.html', './app.css', './app.js', './manifest.webmanifest', './icons/icon-192.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('franks-hub-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return; // leave cross-origin images alone
  e.respondWith(
    // navigate requests can't take a RequestInit, so re-issue them as a plain GET that revalidates with the server
    fetch(req.mode === 'navigate' ? new Request(req.url, {cache: 'no-cache', credentials: 'same-origin'}) : new Request(req, {cache: 'no-cache'})).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
