// Service worker: dopo il primo caricamento l'app e il replay restano disponibili offline.
// La shell e il file della regata vanno in cache all'installazione; le tessere della mappa
// entrano in cache quando arrivano, cosi' un secondo giro sulla stessa zona non chiede rete.

const CACHE = 'bordo-v1';
const SHELL = ['./', './index.html', './regata.json'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chiavi) =>
        Promise.all(chiavi.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
});

// La shell (pagina, regata e file degli eventi) chiede prima la rete, cosi' un nuovo deploy o
// una prova reimportata arrivano al primo ricaricamento; i bundle con hash nel nome e le
// tessere restano cache-first.
const eShell = (richiesta) => {
  if (richiesta.mode === 'navigate') return true;
  const percorso = new URL(richiesta.url).pathname;
  return (
    percorso.endsWith('/regata.json') ||
    (percorso.includes('/eventi/') && percorso.endsWith('.json'))
  );
};

const salvaInCache = (richiesta, risposta) => {
  if (!risposta.ok) return risposta;
  const copia = risposta.clone();
  caches
    .open(CACHE)
    .then((cache) => cache.put(richiesta, copia))
    .catch(() => undefined);
  return risposta;
};

self.addEventListener('fetch', (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;
  if (eShell(richiesta)) {
    evento.respondWith(
      fetch(richiesta)
        .then((risposta) => salvaInCache(richiesta, risposta))
        .catch(() => caches.match(richiesta).then((inCache) => inCache ?? Response.error())),
    );
    return;
  }
  evento.respondWith(
    caches
      .match(richiesta)
      .then(
        (inCache) =>
          inCache ?? fetch(richiesta).then((risposta) => salvaInCache(richiesta, risposta)),
      ),
  );
});
