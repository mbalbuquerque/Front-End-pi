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
//
// Alertas no celular (Web Push): a API manda um push quando um sensor passa para
// atenção ou crítico; o evento "push" mostra a notificação e o clique abre a tela
// de alertas daquele veículo. Só caminho da própria origem é aberto.
//
// Publicação nova (issue #69): o sw.js novo assume na hora (skipWaiting +
// clients.claim), apaga os caches das versões anteriores e busca a navegação
// (index.html) sempre na rede primeiro, para a aba não montar um index.html
// antigo que aponta para pedaços que a publicação já apagou. Pedaço com hash que
// sumiu do servidor (404) ainda sai da cópia guardada, se houver.

const CACHE_NAME = "coldtrack-v15";

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

  event.waitUntil(Promise.all([
    caches.keys().then(chaves => Promise.all(
      chaves.filter(chave => chave !== CACHE_NAME).map(chave => caches.delete(chave))
    )),
    self.clients.claim()
  ]));

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

  // Rede primeiro para tudo, navegação inclusive: o index.html sai do servidor
  // com Cache-Control no-cache (scripts/enviar-site.sh), então é revalidado.
  event.respondWith(

    fetch(pedido)
      .then(async resposta => {

        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(pedido, copia));
          return resposta;
        }

        // Pedaço com hash de uma publicação anterior (o servidor responde 404
        // com o index.html): a cópia guardada ainda serve a aba antiga.
        if (url.pathname.startsWith("/assets/")) {
          const guardada = await caches.match(pedido, { ignoreVary: true });
          if (guardada) {
            return guardada;
          }
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


// ---------------------------------------------------------------- alertas push

const ICONE = "/assets/icons/icon-192.png";
const URL_PADRAO = "/alertas";


// Só caminho relativo da própria origem ("/alertas?veiculo=X"); URL externa,
// "//host" ou "/\host" viram a tela de alertas.
function urlInterna(url) {

  if (typeof url !== "string" || !/^\/(?![/\\])/.test(url)) {
    return URL_PADRAO;
  }

  const destino = new URL(url, self.location.origin);

  return destino.origin === self.location.origin ? destino.pathname + destino.search : URL_PADRAO;

}


// Corpo do push em JSON ({ titulo, corpo, url, tag, status, deviceId }). Texto
// solto ou corpo vazio ainda vira uma notificação genérica.
function lerAlerta(dados) {

  let alerta = {};

  if (dados) {
    try {
      alerta = dados.json() || {};
    } catch {
      alerta = { corpo: dados.text() };
    }
  }

  return {
    titulo: typeof alerta.titulo === "string" && alerta.titulo ? alerta.titulo : "ColdTrack: alerta de temperatura",
    corpo: typeof alerta.corpo === "string" ? alerta.corpo : "",
    tag: typeof alerta.tag === "string" && alerta.tag ? alerta.tag : "coldtrack-alerta",
    critico: alerta.status === "CRITICO",
    url: urlInterna(alerta.url)
  };

}


self.addEventListener("push", event => {

  const alerta = lerAlerta(event.data);

  // Mesma tag por sensor: o alerta novo substitui o anterior em vez de empilhar.
  event.waitUntil(self.registration.showNotification(alerta.titulo, {
    body: alerta.corpo,
    icon: ICONE,
    badge: ICONE,
    tag: alerta.tag,
    renotify: true,
    requireInteraction: alerta.critico,
    data: { url: alerta.url }
  }));

});


async function abrirTela(url) {

  const destino = new URL(url, self.location.origin).href;
  const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const janela = janelas.find(cliente => new URL(cliente.url).origin === self.location.origin);

  if (!janela) {
    return self.clients.openWindow(destino);
  }

  await janela.focus();

  // navigate() só vale para janela controlada por este service worker.
  return janela.navigate ? janela.navigate(destino).catch(() => janela) : janela;

}


self.addEventListener("notificationclick", event => {

  event.notification.close();

  const dados = event.notification.data || {};

  event.waitUntil(abrirTela(urlInterna(dados.url)));

});
