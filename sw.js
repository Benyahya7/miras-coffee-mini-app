/* Mira's Coffee service worker: makes the Mini App installable from Chrome.
   App shell is cached so the installed app opens fast and works offline for
   already-visited pages. Navigation always tries the network first so new
   menu/prices show up; Firebase and other network APIs are never cached. */
var CACHE = "miras-coffee-v1";
var SHELL = ["./", "index.html", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png",
  "assets/mira-logo.jpg", "assets/sold-out-stamp.png"];
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  // Never cache Firebase / Google APIs or Telegram — always network.
  if (url.hostname.indexOf("googleapis.com") >= 0 || url.hostname.indexOf("firebase") >= 0 || url.hostname.indexOf("telegram.org") >= 0) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(function(res){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put("index.html", copy); });
      return res;
    }).catch(function(){ return caches.match("index.html"); }));
    return;
  }
  if (url.origin !== self.location.origin) return;
  e.respondWith(caches.match(req).then(function(hit){
    if (hit) return hit;
    return fetch(req).then(function(res){
      if (res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
      }
      return res;
    });
  }));
});
