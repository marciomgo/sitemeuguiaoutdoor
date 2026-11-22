// BLOCO pesquisa (ver blocos/blocos.json): pesquisa rapida DENTRO do jogo (sem Forms, sem sair da pagina) + envio automatico dos dados tecnicos (bloco telemetria).
// - Ao terminar a missao: os dados tecnicos ja seguem sozinhos; depois abre 5 perguntinhas (pode pular). SO NO FINAL: nada de pesquisa no meio do jogo (decisao do Marcio, 22/11). Na tela de parabens fica um botao para reabrir, caso a crianca feche sem querer.
// - Ao desistir (aviso do botao voltar) ou sair da pagina no meio: segue um resumo "em-andamento"/"desistiu".
// - Envio ao Wix (funcao /pesquisa). Sem internet ou com o servidor fora do ar: fica numa FILA no celular e segue depois. Mesma partida = mesmo partidaId (o servidor atualiza, nao duplica).
// - Anonimo: sem nome, sem posicao. O comentario livre pede para nao escrever nomes.
(function pesquisa() {
  var ENDPOINT = 'https://www.meuguiaoutdoor.com.br/_functions/pesquisa', CHAVE_FILA = 'mgo-fila-pesquisa', CHAVE_ANON = 'mgo-anon', MAX_FILA = 30;
  var tel = window.MGO_TELEMETRIA;
  function uuid() { try { return crypto.randomUUID(); } catch (e) { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); } }
  var partidaId = uuid(), anonId = null, iniciou = false, terminou = false, respondeu = false, aberto = false;
  try { anonId = localStorage.getItem(CHAVE_ANON) || (localStorage.setItem(CHAVE_ANON, uuid()), localStorage.getItem(CHAVE_ANON)); } catch (e) { anonId = null; }

  // ---------- fila e envio ----------
  function lerFila() { try { return JSON.parse(localStorage.getItem(CHAVE_FILA) || '[]'); } catch (e) { return []; } }
  function gravarFila(f) { try { localStorage.setItem(CHAVE_FILA, JSON.stringify(f.slice(-MAX_FILA))); } catch (e) {} }
  function empilhar(p) { var f = lerFila().filter(function (x) { return x.partidaId !== p.partidaId; }); f.push(p); gravarFila(f); }
  var enviando = false;
  async function esvaziar() {
    if (enviando || !navigator.onLine) return; enviando = true;
    try {
      var f = lerFila();
      for (var i = 0; i < f.length; i++) {
        try {
          var r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(f[i]), keepalive: true });
          if (r.ok) { gravarFila(lerFila().filter(function (x) { return !(x.partidaId === f[i].partidaId && x.enviadoEm === f[i].enviadoEm); })); }
          else if (r.status === 400) { gravarFila(lerFila().filter(function (x) { return x.partidaId !== f[i].partidaId; })); } // servidor recusou o formato: nao adianta repetir
        } catch (e) { break; } // sem rede/servidor: tenta depois
      }
    } finally { enviando = false; }
  }
  function montar(resultado, respostas) {
    return { v: 1, partidaId: partidaId, anonId: anonId, enviadoEm: new Date().toISOString(), resultado: resultado, respostas: respostas || null, tecnico: tel ? tel.resumo() : null };
  }
  function enviar(resultado, respostas, comBeacon) {
    if (!iniciou) return; // nao houve partida
    var p = montar(resultado, respostas); empilhar(p);
    if (comBeacon && navigator.sendBeacon) { try { navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(p)], { type: 'text/plain;charset=UTF-8' })); } catch (e) {} }
    esvaziar();
  }

  // ---------- acompanha a partida ----------
  setInterval(function () {
    if (!iniciou && typeof jogoIniciado !== 'undefined' && jogoIniciado) iniciou = true;
    if (!terminou && typeof celebrou !== 'undefined' && celebrou) {
      terminou = true; enviar('concluiu', null); // os dados tecnicos seguem mesmo que a pesquisa seja pulada
      setTimeout(function () { if (!respondeu) abrir(); }, 3500);
    }
  }, 500);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && iniciou && !terminou) enviar('em-andamento', null, true); else if (document.visibilityState === 'visible') esvaziar(); });
  window.addEventListener('pagehide', function () { if (iniciou && !terminou) enviar('em-andamento', null, true); });
  document.addEventListener('mgo:saiu', function () { if (!terminou) { terminou = true; enviar('desistiu', null, true); } });
  window.addEventListener('online', esvaziar);
  esvaziar();

  // ---------- a tela de perguntas ----------
  var PROBLEMAS = [['travou', 'O jogo travou'], ['mapa', 'O mapa demorou'], ['monstros', 'Não achei os monstros'], ['gps', 'O GPS errou'], ['botoes', 'Os botões'], ['nada', 'Nada, foi tudo bem']];
  var CARAS = { gostou: [['1', '😞', 'Não'], ['2', '😐', 'Mais ou menos'], ['3', '😍', 'Sim!']], dificuldade: [['1', '😴', 'Fácil'], ['2', '🙂', 'Médio'], ['3', '😰', 'Difícil']] };
  var caixa = null, resp = {};
  function caras(chave) { return '<div class="pq-linha" data-chave="' + chave + '">' + CARAS[chave].map(function (c) { return '<button type="button" class="pq-cara" data-v="' + c[0] + '"><span>' + c[1] + '</span><small>' + c[2] + '</small></button>'; }).join('') + '</div>'; }
  function abrir() {
    if (aberto) return; aberto = true; resp = { problemas: [] };
    caixa = document.createElement('div'); caixa.id = 'pesquisaJogo'; caixa.setAttribute('role', 'dialog'); caixa.setAttribute('aria-modal', 'true');
    caixa.innerHTML = '<div class="pq-card">' +
      '<h2>Conta pra gente! 💚</h2><p class="pq-sub">É rapidinho e ajuda a melhorar o jogo.</p>' +
      '<div class="pq-pergunta">Gostou do jogo?</div>' + caras('gostou') +
      '<div class="pq-pergunta">Foi fácil ou difícil?</div>' + caras('dificuldade') +
      '<div class="pq-pergunta">Algo atrapalhou?</div><div class="pq-chips">' + PROBLEMAS.map(function (p) { return '<button type="button" class="pq-chip" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div>' +
      '<div class="pq-pergunta">Quer jogar de novo?</div><div class="pq-linha" data-chave="denovo"><button type="button" class="pq-cara" data-v="1"><span>👍</span><small>Sim</small></button><button type="button" class="pq-cara" data-v="0"><span>👎</span><small>Não</small></button></div>' +
      '<div class="pq-pergunta">Quer contar mais? <small>(opcional — não escreva nomes)</small></div><textarea id="pqComentario" maxlength="400" rows="3" placeholder="O que mais gostou? O que melhorar?"></textarea>' +
      '<div class="pq-nota">Enviamos também dados técnicos do aparelho, sem nome e sem sua localização.</div>' +
      '<button type="button" id="pqEnviar" disabled>Enviar</button><button type="button" id="pqPular">Agora não</button></div>';
    document.body.appendChild(caixa);
    caixa.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('pq-cara')) { var chave = b.parentNode.getAttribute('data-chave'); resp[chave] = Number(b.getAttribute('data-v')); [].forEach.call(b.parentNode.children, function (x) { x.classList.toggle('on', x === b); }); }
      else if (b.classList.contains('pq-chip')) {
        var k = b.getAttribute('data-p'), i = resp.problemas.indexOf(k);
        if (k === 'nada') { resp.problemas = i < 0 ? ['nada'] : []; } else { resp.problemas = resp.problemas.filter(function (x) { return x !== 'nada'; }); if (i < 0) resp.problemas.push(k); else resp.problemas = resp.problemas.filter(function (x) { return x !== k; }); }
        [].forEach.call(caixa.querySelectorAll('.pq-chip'), function (c) { c.classList.toggle('on', resp.problemas.indexOf(c.getAttribute('data-p')) >= 0); });
      }
      document.getElementById('pqEnviar').disabled = resp.gostou == null;
    });
    document.getElementById('pqPular').onclick = function () { fechar(); };
    document.getElementById('pqEnviar').onclick = function () {
      resp.comentario = String(document.getElementById('pqComentario').value || '').trim().slice(0, 400); respondeu = true;
      var p = montar(terminou ? 'concluiu' : 'em-andamento', { gostou: resp.gostou, dificuldade: resp.dificuldade || null, problemas: resp.problemas, jogariaDeNovo: resp.denovo == null ? null : !!resp.denovo, comentario: resp.comentario || null });
      empilhar(p); esvaziar();
      caixa.querySelector('.pq-card').innerHTML = '<div class="pq-obrigado">Obrigado! 💚</div>'; setTimeout(fechar, 1400);
    };
  }
  function fechar() { aberto = false; if (caixa && caixa.parentNode) caixa.parentNode.removeChild(caixa); caixa = null; }

  // tela de parabens: botao para reabrir a pesquisa (so aparece no fim)
  function botaoNoFim() { var cx = document.querySelector('#parabens .caixaP'); if (!cx || document.getElementById('bPesquisaFim')) return; var b = document.createElement('button'); b.id = 'bPesquisaFim'; b.type = 'button'; b.textContent = '📝 Contar como foi'; b.onclick = function () { if (!respondeu) abrir(); }; cx.appendChild(b); }
  setInterval(function () { if (terminou) botaoNoFim(); }, 800);
  window.MGO_PESQUISA = { abrir: function () { abrir(); }, fila: lerFila, esvaziar: esvaziar, partidaId: function () { return partidaId; }, endpoint: ENDPOINT };
})();
