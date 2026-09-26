const CACHE_NAME = "coldtrack-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./css/home.css",
  "./js/home.js",
  "./css/style.css",
  "./js/config.js",
  "./js/app.js",
  "./manifest.json"
];


// Instalação
self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
  );

  self.skipWaiting();

});


// Ativação
self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys().then(keys => {

      return Promise.all(

        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))

      );

    })

  );

  self.clients.claim();

});


// Interceptação das requisições
self.addEventListener("fetch", event => {

  // Não armazenamos as APIs de telemetria no cache.
  if (
    event.request.url.includes(
      "api.thingspeak.com"
    ) ||
    event.request.url.includes(
      ".azurewebsites.net"
    )
  ) {
    return;
  }

  event.respondWith(

    caches.match(event.request)
      .then(response => {

        return response ||
          fetch(event.request);

      })

  );

});