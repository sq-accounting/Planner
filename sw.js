/* Күн тәртібі — Service Worker (оффлайн режим + кэш) */
const CACHE = 'kun-tartibi-v1';
const PRECACHE = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (e)=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(PRECACHE).catch(()=>{})).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.host.indexOf('fonts.googleapis.com')>-1 || url.host.indexOf('fonts.gstatic.com')>-1;

  // Бет ашу — желі бірінші (жаңарту түссін), оффлайнда кэштен
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put('./', copy)).catch(()=>{});
        return res;
      }).catch(()=> caches.match(req).then(r=> r || caches.match('./')))
    );
    return;
  }
  // Қаріптер — кэш бірінші, болмаса желіден алып сақтаймыз
  if(isFont){
    e.respondWith(
      caches.match(req).then(r=> r || fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(()=> r))
    );
    return;
  }
  // Сол домендегі басқа ресурстар — кэш бірінші
  if(sameOrigin){
    e.respondWith(
      caches.match(req).then(r=> r || fetch(req).then(res=>{
        if(res && res.ok){ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{}); }
        return res;
      }).catch(()=> r))
    );
  }
  // Бөтен домендер (Supabase, Apps Script, QR) — желіге тікелей, кэшсіз
});
