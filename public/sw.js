const CACHE='gvd-shell-v057';
const SHELL=['/manifest.webmanifest','/pwa-icon.svg','/pwa-maskable.svg','/logo-karaka.png'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const request=event.request;
  const url=new URL(request.url);

  // El HTML/navegación siempre intenta red primero para evitar ejecutar una versión vieja.
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        return await fetch(request,{cache:'no-store'});
      }catch{
        return (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  // Los assets con hash y los recursos PWA pueden almacenarse.
  if(url.origin===self.location.origin && /\.(?:js|css|png|jpg|jpeg|webp|svg|woff2?|webmanifest)$/i.test(url.pathname)){
    event.respondWith((async()=>{
      const cached=await caches.match(request);
      if(cached) return cached;
      const response=await fetch(request);
      if(response.ok){
        const cache=await caches.open(CACHE);
        await cache.put(request,response.clone());
      }
      return response;
    })());
  }
});
