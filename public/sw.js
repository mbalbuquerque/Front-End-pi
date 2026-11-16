// Service worker do ColdTrack Control (SPA em React).
// Rede primeiro: cada publicação chega na hora. Sem internet, usa a última
// cópia guardada; navegação offline cai no /index.html guardado (o React
// Router resolve a rota). A API de telemetria nunca entra no cache.
// Subir CACHE_NAME a cada mudança neste arquivo.
//
// Decisão (issue #13, estado offline): o app abre sem internet porque o shell
// (index.html, manifest, JS/CSS com hash e os pedaços de tela) é guardado
// já na instalação e renovado a cada visita. Só arquivos da própria origem
// entram no cache; resposta da API (leituras, usuários, token) nunca entra, para
// que dado de uma sessão não apareça para outra. Offline, a tela mostra a faixa
// "Sem conexão" e as chamadas à API falham como falhariam sem service worker.

const CACHE_NAME = "coldtrack-v13";

const APP_SHELL = ["/", "/index.html", "/manifest.json"];

const HOST_API = "func-coldtrack-7319.azurewebsites.net";


// Guarda o shell e os arquivos que o index.html referencia (/assets/*.js e *.css),
// senão a primeira visita só os guardaria na segunda abertura.
async function guardarShell() {

  const cache = await caches.open(CACHE_NAME);

  await cache.addAll(APP_SHELL);

  try {

    const html = await (await cache.match("/index.html")).text();
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map(m => m[1]);

    await Promise.all([...new Set(assets)].map(url => cache.add(url).catch(() => {})));

    // Telas são pedaços carregados sob demanda (import()); o JS de entrada lista
    // os nomes deles. Guardar também, senão a rota aberta offline fica em branco.
    const pedacos = new Set();

    for (const url of assets.filter(url => url.endsWith(".js"))) {
      const codigo = await (await cache.match(url))?.text();
      for (const m of (codigo || "").matchAll(/assets\/[\w.-]+\.(?:js|css)/g)) {
        pedacos.add("/" + m[0]);
      }
    }

    await Promise.all([...pedacos].filter(url => !assets.includes(url)).map(url => cache.add(url).catch(() => {})));

  }

  catch {

    // Sem os assets o app ainda abre depois da primeira navegação com rede.

  }

}


self.addEventListener("install", event => {

  event.waitUntil(guardarShell());

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

        // ignoreVary: o precache da instalação e o pedido do <script type="module"> diferem em cabeçalhos.
        const guardada = await caches.match(pedido, { ignoreVary: true });

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
