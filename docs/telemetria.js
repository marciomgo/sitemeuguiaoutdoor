// BLOCO telemetria (ver blocos/blocos.json): mede, SEM perguntar nada, como o jogo foi no aparelho. So tecnico e anonimo: nada de nome, nada de posicao.
// Mede: quadros por segundo (o "travou": tempo entre quadros), erros, aparelho/navegador/tela/GPU, internet, precisao do GPS, se o parque estava baixado,
// se o 3D carregou e como a partida andou. Entrega o resumo em window.MGO_TELEMETRIA.resumo(); quem envia e o bloco "pesquisa".
(function telemetria() {
  var quadros = [], ultimo = 0, erros = [], nErros = 0, precs = [];
  function jogando() { return typeof jogoIniciado !== 'undefined' && jogoIniciado && document.visibilityState === 'visible'; }

  // tempo entre quadros enquanto o jogo roda (so conta quando a partida esta em andamento e a aba visivel)
  function quadro(t) {
    if (jogando() && ultimo && t - ultimo < 2000) { quadros.push(t - ultimo); if (quadros.length > 6000) quadros.shift(); }
    ultimo = t; requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
  document.addEventListener('visibilitychange', function () { ultimo = 0; });

  window.addEventListener('error', function (e) { nErros++; if (erros.length < 3) erros.push(String(e.message || 'erro').slice(0, 160) + (e.filename ? ' @' + String(e.filename).split('/').pop() + ':' + (e.lineno || 0) : '')); });
  window.addEventListener('unhandledrejection', function (e) { nErros++; if (erros.length < 3) erros.push(('promessa: ' + (e.reason && (e.reason.message || e.reason))).slice(0, 160)); });
  setInterval(function () { if (jogando() && typeof ALVO !== 'undefined' && ALVO.prec) { precs.push(ALVO.prec); if (precs.length > 300) precs.shift(); } }, 3000);

  function pct(v, p) { if (!v.length) return null; var s = v.slice().sort(function (a, b) { return a - b; }); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; }
  function arred(n, c) { return n == null ? null : Math.round(n * c) / c; }

  function gpu() {
    try { var c = document.createElement('canvas'), g = c.getContext('webgl'), x = g && g.getExtension('WEBGL_debug_renderer_info'); return x ? String(g.getParameter(x.UNMASKED_RENDERER_WEBGL)).slice(0, 80) : null; } catch (e) { return null; }
  }
  function aparelho() {
    var c = navigator.connection || {};
    return {
      ua: String(navigator.userAgent).slice(0, 200), plataforma: navigator.platform || null,
      tela: screen.width + 'x' + screen.height, janela: innerWidth + 'x' + innerHeight, dpr: window.devicePixelRatio || 1,
      memoriaGB: navigator.deviceMemory || null, nucleos: navigator.hardwareConcurrency || null, gpu: gpu(),
      rede: c.effectiveType || null, downlinkMbps: c.downlink || null, instalado: !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone)
    };
  }
  function resumo() {
    var ms = quadros, media = ms.length ? ms.reduce(function (a, b) { return a + b; }, 0) / ms.length : null, rg = null;
    try { rg = window.MGO_OFFLINE && window.MGO_OFFLINE.registro(); } catch (e) {}
    var d = (typeof DADOS !== 'undefined') ? DADOS : {};
    return {
      versao: document.lastModified || null,
      parque: d.slug || (d.livre ? 'livre' : null), modo: d.livre ? 'livre' : 'combate',
      duracaoS: (typeof estat !== 'undefined' && estat.t0 && typeof jogoIniciado !== 'undefined' && jogoIniciado) ? Math.round((performance.now() - estat.t0) / 1000) : null,
      zumbisFeitos: typeof estat !== 'undefined' ? estat.zumbis : null, monstrosFeitos: typeof estat !== 'undefined' ? estat.monstros : null,
      inimigosTotal: typeof inimigos !== 'undefined' ? inimigos.length : null, inimigosVivos: typeof inimigos !== 'undefined' ? inimigos.filter(function (i) { return i.vivo; }).length : null,
      fps: { medio: media ? arred(1000 / media, 10) : null, pior5pct: pct(ms, 0.95) ? arred(1000 / pct(ms, 0.95), 10) : null, quadros: ms.length, paradas100ms: ms.filter(function (x) { return x > 100; }).length, paradas250ms: ms.filter(function (x) { return x > 250; }).length },
      erros: { total: nErros, amostra: erros },
      gps: { precisaoMediana: arred(pct(precs, 0.5), 10), precisaoPior: arred(pct(precs, 0.95), 10), amostras: precs.length },
      pacote: { baixado: !!rg, mb: rg ? (rg.mbTotal || rg.mb) : null, jogouSemPacote: !!window.__semPacote },
      modelo3d: { carregou: !!window.__monstros3d, corpos: window.__monstros3d && window.__monstros3d.corpos ? window.__monstros3d.corpos.size : 0 },
      aparelho: aparelho()
    };
  }
  window.MGO_TELEMETRIA = { resumo: resumo };
})();
