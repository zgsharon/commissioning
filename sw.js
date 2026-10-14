// ICG field app core v1: keeps the app opening with no signal.
// The page: network first (past the browser cache, so updates show right away), saved copy after 4 seconds or when offline.
// Everything else (JSZip, fonts): saved copy first, refreshed in the background.
// The build step fills in CACHE (app name plus build stamp) and CORE (files to save on install).
const CACHE = 'commissioning-20261014-0820';
const PREFIX = 'commissioning-';
const CORE = ["./", "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"];
// The page itself must save. Other files (JSZip) save if they can, so one slow CDN never stops offline loading.
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map((u, i) => { const p = c.add(new Request(u, { cache: 'reload' })); return i === 0 ? p : p.catch(() => {}); }))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith(PREFIX)).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.open(CACHE).then(async c => {
      const saved = () => c.match(req, { ignoreSearch: true }).then(r => r || c.match('./'));
      // A slow download keeps going after the saved copy is shown, and replaces it for next time.
      const live = fetch(req, { cache: 'no-cache' }).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; });
      e.waitUntil(live.catch(() => {}));
      try {
        const r = await Promise.race([live, new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))]);
        if (r && r.ok) return r;
        return (await saved()) || r;
      } catch (err) { return (await saved()) || Response.error(); }
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
