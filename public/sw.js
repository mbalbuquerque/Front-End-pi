// Service worker do ColdTrack Control (SPA em React).
// Rede primeiro: cada publicação chega na hora. Sem internet, usa a última
// cópia guardada; navegação offline cai no /index.html guardado (o React
// Router resolve a rota). A API de telemetria nunca entra no cache.
// Subir CACHE_NAME a cada mudança neste arquivo.

const CACHE_NAME = "coldtrack-v12";

const APP_SHELL = ["/", "/index.html", "/manifest.json"];

const HOST_API = "func-coldtrack-7319.azurewebsites.net";


self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );

  self.skipWaiting();

});


// Apaga os caches antigos (coldtrack-v11 e anteriores guardavam as páginas .html).
self.addEventListener("activate", event => {

  event.waitUntil(
    caches.keys().then(chaves => Promise.all(
      chaves.filter(chave => chave !== CACHE_NAME).map(chave => caches.delete(chave))
    ))
  );

  self.clients.claim();

});


self.addEventListener("fetch", event => {

  const pedido = event.request;
  const url = new URL(pedido.url);

  // Só GET da própria origem; API e serviços de terceiros passam direto.
  if (
    pedido.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.hostname === HOST_API ||
    url.hostname.endsWith(".azurewebsites.net")
  ) {
    return;
  }

  event.respondWith(

    fetch(pedido)
      .then(resposta => {

        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(pedido, copia));
        }

        return resposta;

      })
      .catch(async () => {

        const guardada = await caches.match(pedido);

        if (guardada) {
          return guardada;
        }

        if (pedido.mode === "navigate") {
          return caches.match("/index.html");
        }

        return Response.error();

      })

  );

});
