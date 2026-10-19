const CACHE_NAME = "coldtrack-v1";

const APP_SHELL = [
  "./",
  "./index.html",
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

  // Não armazenamos a API do ThingSpeak no cache.
  if (
    event.request.url.includes(
      "api.thingspeak.com"
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

const CACHE_NAME = "coldtrack-public-v2";

const PUBLIC_ASSETS = [
  "./",
  "./index.html",
  "./login.html",
  "./css/home.css",
  "./css/login.css",
  "./js/home.js",
  "./js/login.js",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PUBLIC_ASSETS)
    )
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Nunca interceptar API, dashboard ou rotas protegidas.
  if (
    url.pathname.includes("/api/") ||
    url.pathname.endsWith("/dashboard.html") ||
    url.pathname.includes("/admin/") ||
    url.pathname.includes("/auditoria/")
  ) {
    return;
  }

  const allowedPaths = new Set(
    PUBLIC_ASSETS.map((path) =>
      new URL(path, self.registration.scope).pathname
    )
  );

  if (!allowedPaths.has(url.pathname)) return;

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

});

