const CACHE="coinpulse-shell-v1";
const SHELL=["/","/index.html","/styles.css","/app.js","/manifest.json","/icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",e=>{
 const url=new URL(e.request.url);
 if(e.request.method!=="GET"||url.hostname==="api.coingecko.com"||url.pathname.startsWith("/.netlify/functions/"))return;
 e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(response=>{
  if(response.ok&&url.origin===self.location.origin){const copy=response.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
  return response;
 }).catch(()=>caches.match("/index.html"))));
});