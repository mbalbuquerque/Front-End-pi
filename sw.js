const CACHE_NAME = "coldtrack-v5";

const APP_SHELL = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./alertas.html",
  "./relatorios.html",
  "./veiculos.html",
  "./viagens.html",
  "./configuracoes.html",
  "./css/telas.css",
  "./js/comum.js",
  "./js/grafico.js",
  "./js/alertas.js",
  "./js/relatorios.js",
  "./js/veiculos.js",
  "./js/viagens.js",
  "./js/configuracoes.js",
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

  // Só GET entra no cache.
  if (event.request.method !== "GET") {
    return;
  }

  // Rede primeiro: cada publicação chega na hora.
  // Sem internet, usa a última cópia guardada.
  event.respondWith(

    fetch(event.request)
      .then(response => {

        if (response.ok) {

          const copia = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, copia));

        }

        return response;

      })
      .catch(() => caches.match(event.request))

  );

});