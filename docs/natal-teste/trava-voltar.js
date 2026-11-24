// BLOCO travaVoltar (ver blocos/blocos.json): o botao VOLTAR do navegador (e o gesto de voltar do iPhone) nao tira o jogador do jogo sem avisar.
// Regra: voltar -> aparece "Sair do jogo? O jogo atual sera perdido" -> [Continuar jogando] (fica) ou [Sair e perder o jogo] (sai).
// Mesma tecnica ja testada no iPhone (docs/trava-voltar-elemento.js): so arma depois do 1o toque (regra do navegador) e empilha 4 entradas de reserva
// no historico, repostas a cada voltar (1 so furava com voltar rapido). Roda na pagina do jogo inteira (nao em iframe), por isso funciona no Safari do iPhone.
// Sem aviso quando nao ha o que perder: jogo ainda nao comecou ou ja terminado (tela de parabens).
// Saida: volta no historico ate a pagina de onde o jogador veio (ex.: a escolha de parques); se nao houver, vai para ?volta=<endereco> ou para jogo.html.
(function travaVoltar() {
  var PROFUNDIDADE = 4, armado = false, urlTrava = '', saindo = false, aberto = false, jogoAntes = false;

  function empilhar(de) { for (var i = de; i <= PROFUNDIDADE; i++) { try { history.pushState({ mgoTrava: i }, '', urlTrava); } catch (e) { break; } } }
  function nivelAtual() { var s = history.state; return (s && typeof s.mgoTrava === 'number') ? s.mgoTrava : PROFUNDIDADE; }
  function semNadaAPerder() { return (typeof jogoIniciado !== 'undefined' && !jogoIniciado && !aberto) || (typeof celebrou !== 'undefined' && celebrou); }

  function destinoDeSaida() {
    try { var v = new URLSearchParams(location.search).get('volta'); if (v && /^https?:\/\//i.test(v)) return v; } catch (e) {}
    return 'jogo.html';
  }
  function sair() {
    saindo = true; desarmar();
    try { document.dispatchEvent(new CustomEvent('mgo:saiu')); } catch (e) {} // avisa os outros blocos (ex.: pesquisa registra que desistiu)
    history.go(-(nivelAtual() + 1)); // desfaz as entradas de reserva e volta a pagina anterior
    setTimeout(function () { location.replace(destinoDeSaida()); }, 900); // nao havia pagina anterior (abriu por link/QR): vai para o destino
  }

  var caixa = null;
  function mostrarAviso() {
    if (aberto) return; aberto = true;
    jogoAntes = (typeof jogoIniciado !== 'undefined') ? jogoIniciado : false;
    if (typeof jogoIniciado !== 'undefined') jogoIniciado = false; // pausa os monstros enquanto o aviso esta aberto
    caixa = document.createElement('div');
    caixa.setAttribute('role', 'dialog'); caixa.setAttribute('aria-modal', 'true'); caixa.id = 'avisoSair';
    caixa.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    caixa.innerHTML = '<div style="background:#fff;border-radius:18px;padding:22px 20px;max-width:320px;width:100%;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.5)">' +
      '<div style="font-size:42px;line-height:1">⚠️</div>' +
      '<h2 style="margin:10px 0 6px;font-size:20px;color:#1b1b1b">Sair do jogo?</h2>' +
      '<p style="margin:0 0 18px;font-size:15px;color:#444">Se você sair agora, <b>o jogo atual será perdido</b>.</p>' +
      '<button id="avisoFica" style="display:block;width:100%;padding:14px;margin-bottom:10px;border:0;border-radius:12px;background:#2e7d32;color:#fff;font:bold 16px inherit;cursor:pointer">Continuar jogando</button>' +
      '<button id="avisoSai" style="display:block;width:100%;padding:12px;border:2px solid #c62828;border-radius:12px;background:#fff;color:#c62828;font:bold 15px inherit;cursor:pointer">Sair e perder o jogo</button></div>';
    document.body.appendChild(caixa);
    document.getElementById('avisoFica').onclick = continuar;
    document.getElementById('avisoSai').onclick = function () { fecharAviso(); sair(); };
  }
  function fecharAviso() { aberto = false; if (caixa && caixa.parentNode) caixa.parentNode.removeChild(caixa); caixa = null; if (typeof jogoIniciado !== 'undefined') jogoIniciado = jogoAntes; }
  function continuar() { fecharAviso(); }

  function aoVoltar() {
    if (!armado || saindo) return;
    if (semNadaAPerder()) { sair(); return; } // sem jogo em andamento: voltar funciona normal
    empilhar(nivelAtual() + 1); // repoe a reserva: o voltar nao tira da pagina
    mostrarAviso();
  }
  function armar() { if (armado || saindo) return; armado = true; urlTrava = location.href; empilhar(1); }
  var eventos = ['touchend', 'pointerup', 'click', 'keydown'];
  function desarmar() { armado = false; eventos.forEach(function (e) { window.removeEventListener(e, armar, true); }); window.removeEventListener('popstate', aoVoltar, true); }

  eventos.forEach(function (e) { window.addEventListener(e, armar, true); });
  window.addEventListener('popstate', aoVoltar, true);
  window.__travaVoltar = { armado: function () { return armado; }, profundidade: PROFUNDIDADE }; // so para conferir nos testes
})();
