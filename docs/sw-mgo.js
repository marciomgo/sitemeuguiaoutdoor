// Service worker do MGO: deixa o jogo abrir e rodar SEM internet (depois de baixar o parque).
// - Páginas e imagens do jogo: guardadas no celular, atualizadas quando há internet.
// - Bibliotecas (mapa, etc.) e a imagem do estilingue: guardadas na primeira vez.
// - Mapa (pedaços do OpenFreeMap): vêm do que foi baixado em "Baixar o parque"; com sinal fraco, também guarda o que for passando.
// Nome dos armazéns (o botão "Baixar o parque" da página escreve nos MESMOS nomes):
const APP = 'mgo-app-v1', TILES = 'mgo-tiles-v1', FLAGS = 'mgo-flags-v1';
const PRE = ['mineu-costas.png', 'mineu-golpe-1.png', 'mineu-golpe-2.png', 'mineu-golpe-3.png', 'mineu-estilingue-1.png', 'mineu-estilingue-2.png',
  'mineu-andar-1.png', 'mineu-andar-2.png', 'mineu-andar-3.png', 'mineu-comemora.png', 'icone-pau.png', 'icon-192.png'];
const HOSTS_CACHE_FIRST = ['cdnjs.cloudflare.com', 'unpkg.com', 'static.wixstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(APP).then((c) => Promise.all(PRE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

// modo de teste: finge que está sem internet (só serve do que está guardado)
async function forcaOffline() { try { const c = await caches.open(FLAGS); return !!(await c.match('offline-teste')); } catch (e) { return false; } }
self.addEventListener('message', (e) => {
  const m = e.data || {};
  if (m.t === 'offline-teste') e.waitUntil(caches.open(FLAGS).then((c) => (m.v ? c.put('offline-teste', new Response('1')) : c.delete('offline-teste'))));
});

async function daRede(req, off) { if (off) throw new Error('offline-teste'); return fetch(req); }
async function guardar(nome, req, resp) { try { if (resp && (resp.ok || resp.type === 'opaque')) { const c = await caches.open(nome); await c.put(req, resp.clone()); } } catch (e) {} return resp; }

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  e.respondWith((async () => {
    const off = await forcaOffline();

    // páginas do jogo: rede primeiro (até 4 s); sem rede, o que está guardado
    if (req.mode === 'navigate') {
      try {
        const r = await Promise.race([daRede(req, off), new Promise((_, rej) => setTimeout(() => rej(new Error('lento')), 4000))]);
        return guardar(APP, req, r);
      } catch (err) {
        const c = await caches.open(APP);
        return (await c.match(req, { ignoreSearch: true })) || (await caches.match(req, { ignoreSearch: true })) || new Response('Sem internet e esta página ainda não foi baixada.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    }

    // arquivos do próprio jogo (imagens, manifest...): guardado primeiro, atualiza por baixo
    if (url.origin === self.location.origin) {
      const c = await caches.open(APP); const hit = await c.match(req, { ignoreSearch: true });
      const rede = daRede(req, off).then((r) => guardar(APP, req, r)).catch(() => null);
      return hit || (await rede) || new Response('', { status: 504 });
    }

    // bibliotecas e imagem do estilingue: guardado primeiro
    if (HOSTS_CACHE_FIRST.includes(url.hostname)) {
      const hit = await caches.match(req);
      if (hit) return hit;
      try { return guardar(APP, req, await daRede(req, off)); } catch (err) { return new Response('', { status: 504 }); }
    }

    // mapa (OpenFreeMap): o que foi baixado primeiro; o resto, rede (e guarda o que passar)
    if (url.hostname === 'tiles.openfreemap.org') {
      const c = await caches.open(TILES); const hit = await c.match(req);
      if (hit) return hit; // o TileJSON baixado "trava" a versão do mapa, igual aos pedaços guardados
      try { return guardar(TILES, req, await daRede(req, off)); } catch (err) { return new Response('', { status: 504 }); }
    }

    // satélite (opcional): rede primeiro, guarda o que passar, sem rede usa o guardado
    if (/arcgisonline\.com$/.test(url.hostname)) {
      try { return guardar(TILES, req, await daRede(req, off)); } catch (err) { const hit = await caches.match(req); return hit || new Response('', { status: 504 }); }
    }

    return daRede(req, off).catch(() => new Response('', { status: 504 }));
  })());
});
