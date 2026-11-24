// BLOCO missaoEnigma (ver blocos/blocos.json) — PASSO 1 da mecanica em familia (08-App/Mecanica-Jogo-em-Familia.md). So nos PARQUES (combate), 1 jogador.
// Fluxo: os pontos aparecem EM SEQUENCIA. Chegando num ponto (e com os guardioes derrotados) abre um DESAFIO (quiz ou charada, com o Mineu fazendo a pergunta).
// Acertando, a equipe ganha uma PISTA do cofre (anotada no caderno). No fim, o chefao final guarda o BAU: a senha de 3 digitos se descobre juntando as pistas.
// Regras (decididas com o Marcio em 23/11): 2 tentativas por pergunta; errou as 2 -> outra pergunta (sem peca); 3 trocas de desafio por ponto; 1 dica por pergunta (corta uma errada); a peca so vem de ACERTAR.
// Enigma do cofre: 3 digitos diferentes; REGRA DAS COLUNAS (cada digito da senha so pode ficar numa coluna onde ja apareceu nas tentativas); resposta unica; gerado na hora com N pistas = (pontos - 1).
// Se algo falhar (banco nao carrega, etc.) a missao NAO liga e o jogo segue como antes (baú abre com o chefao, sem pistas).
// Usa do jogo: POS, inimigos, aviso, tocarTom, vidaMineu, metrosAte, jogoIniciado, celebrou. O bloco bauFinal chama MGO_MISSAO.pecasCompletas/pedirSenha.
(function missaoEnigma() {
  var P = new URLSearchParams(location.search), NIVEL_BASE = Math.max(1, Math.min(3, Number(P.get('nivel')) || 1));
  var CFG = { chegadaM: 10, guardioesM: 25, tentativas: 2, trocasPorPonto: 3, usadosMax: 60 };
  var banco = null, M = { ativa: false };
  function $(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function embaralhar(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function som(t) { try { if (t === 'ok') [523, 659, 784].forEach(function (f, i) { setTimeout(function () { tocarTom(f, f, 150, 'triangle', 0.1); }, i * 90); }); else if (t === 'erro') tocarTom(220, 120, 220, 'square', 0.07); else if (t === 'pista') [659, 784, 1047, 1319].forEach(function (f, i) { setTimeout(function () { tocarTom(f, f, 160, 'triangle', 0.1); }, i * 100); }); } catch (e) {} }

  // ================= ENIGMA DO COFRE (3 digitos, regra das colunas, resposta unica) =================
  function feedback(g, c) { var A = 0, B = 0, i; for (i = 0; i < 3; i++) { if (g[i] === c[i]) A++; else if (c.indexOf(g[i]) >= 0) B++; } return [A, B]; }
  function sorteio3() { var d = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], i, j, t; for (i = 9; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = d[i]; d[i] = d[j]; d[j] = t; } return d.slice(0, 3).join(''); }
  var TODAS = (function () { var o = [], a, b, c; for (a = 0; a < 10; a++) for (b = 0; b < 10; b++) for (c = 0; c < 10; c++) if (a !== b && b !== c && a !== c) o.push('' + a + b + c); return o; })();
  function candidatas(gs, fbs, usarRegra, idxs) {
    var col = [0, 1, 2].map(function (k) { var s = {}; gs.forEach(function (g) { s[g[k]] = 1; }); return s; });
    return TODAS.filter(function (c) {
      if (usarRegra && !(col[0][c[0]] && col[1][c[1]] && col[2][c[2]])) return false;
      return idxs.every(function (i) { var f = feedback(gs[i], c); return f[0] === fbs[i][0] && f[1] === fbs[i][1]; });
    });
  }
  function gerarCofre(nPistas, nivel) {
    var todosIdx = []; for (var q = 0; q < nPistas; q++) todosIdx.push(q);
    for (var tent = 0; tent < 6000; tent++) {
      var code = sorteio3(), gs = todosIdx.map(sorteio3), fbs = gs.map(function (g) { return feedback(g, code); });
      var col = [0, 1, 2].map(function (k) { return gs.some(function (g) { return g[k] === code[k]; }); });
      if (!col[0] || !col[1] || !col[2]) continue; // a senha obedece a regra das colunas
      if (gs.indexOf(code) >= 0) continue; // nenhuma tentativa pode ser a propria senha (entregaria a resposta)
      var uni = candidatas(gs, fbs, true, todosIdx); if (uni.length !== 1) continue; // resposta unica
      // nivel 1: bem resolvivel (so 2 ou 3 pistas ja bastam); nivel 2+: exige mais pistas
      var min = nPistas; for (var m = 1; m < (1 << nPistas); m++) { var sub = todosIdx.filter(function (i) { return m & (1 << i); }); if (sub.length < min && candidatas(gs, fbs, true, sub).length === 1) min = sub.length; }
      if (nivel <= 1 && (min > 3 || (min < 2 && nPistas > 2))) continue; if (nivel >= 2 && min < Math.min(3, nPistas)) continue;
      return { codigo: code, pistas: gs.map(function (g, i) { return { g: g, A: fbs[i][0], B: fbs[i][1] }; }), minimo: min };
    }
    return null;
  }
  function textoPista(p) {
    var t = []; if (p.A + p.B === 0) return 'nenhum número certo';
    if (p.A) t.push(p.A + (p.A > 1 ? ' números certos' : ' número certo') + ', no lugar certo'); if (p.B) t.push(p.B + (p.B > 1 ? ' números certos' : ' número certo') + ', mas no lugar errado');
    return t.join(' e ');
  }

  // ================= BANCO DE DESAFIOS =================
  function usados() { try { return JSON.parse(localStorage.getItem('mgo-desafios-usados') || '[]'); } catch (e) { return []; } }
  function marcarUsado(id) { try { var u = usados().filter(function (x) { return x !== id; }); u.push(id); localStorage.setItem('mgo-desafios-usados', JSON.stringify(u.slice(-CFG.usadosMax))); } catch (e) {} }
  function sortearDesafio(nivel) {
    var recentes = usados(), deste = M.usadosMissao || (M.usadosMissao = {}); var prefTipo = Math.random() < 0.3 ? 'charada' : 'quiz';
    function pool(f) { return banco.filter(function (q) { return q.nivel === nivel && !deste[q.id] && f(q); }); }
    var c = pool(function (q) { return q.tipo === prefTipo && recentes.indexOf(q.id) < 0; });
    if (!c.length) c = pool(function (q) { return recentes.indexOf(q.id) < 0; });
    if (!c.length) c = pool(function () { return true; });
    if (!c.length) c = banco.filter(function (q) { return !deste[q.id]; });
    if (!c.length) c = banco; var q = c[Math.floor(Math.random() * c.length)]; deste[q.id] = 1; marcarUsado(q.id); return q;
  }
  function nivelDoPonto(i, n) { return Math.max(1, Math.min(4, NIVEL_BASE + Math.floor(i * 2 / n))); }

  // ================= TELAS =================
  var el = {};
  function criarTelas() {
    el.hud = $('div', '', ''); el.hud.id = 'msHud'; el.caderno = $('button', '', '📓 Pistas <b id="msContaPistas">0</b>'); el.caderno.id = 'msBtnCaderno'; el.caderno.type = 'button';
    el.desafio = $('div', '', ''); el.desafio.id = 'msDesafio'; el.pista = $('div', '', ''); el.pista.id = 'msPistaCard'; el.cad = $('div', '', ''); el.cad.id = 'msCadernoPainel'; el.senha = $('div', '', ''); el.senha.id = 'msSenha';
    [el.hud, el.caderno, el.desafio, el.pista, el.cad, el.senha].forEach(function (e) { document.body.appendChild(e); });
    el.caderno.addEventListener('click', function (e) { e.stopPropagation(); abrirCaderno(); });
  }
  function fecha(e) { e.style.display = 'none'; e.innerHTML = ''; }

  // ---- caderno de pistas ----
  function listaPistasHtml(compacto) {
    var h = ''; for (var i = 0; i < M.cofre.pistas.length; i++) { var p = M.cofre.pistas[i];
      if (i < M.pecas) h += '<div class="ms-pista"><span class="ms-n">Pista ' + (i + 1) + '</span><span class="ms-dig">' + p.g.split('').map(function (d) { return '<i>' + d + '</i>'; }).join('') + '</span><span class="ms-tx">' + esc(textoPista(p)) + '</span></div>';
      else h += '<div class="ms-pista ms-trancada"><span class="ms-n">Pista ' + (i + 1) + '</span><span class="ms-tx">🔒 ganhe vencendo o ponto ' + (i + 1) + '</span></div>'; }
    return h;
  }
  function regrasHtml() { return '<ul class="ms-regras"><li>A senha tem <b>3 números diferentes</b>.</li><li>Cada número só pode ficar <b>numa coluna onde ele já apareceu</b> nas pistas.</li><li>“No lugar errado” = o número está na senha, mas <b>não nessa coluna</b>.</li></ul>'; }
  function abrirCaderno() {
    el.cad.innerHTML = '<div class="ms-card"><h2>📓 Caderno do cofre</h2><p class="ms-sub">Junte as pistas para descobrir a senha do baú.</p>' + listaPistasHtml() + regrasHtml() + '<div class="ms-bts"><button class="ms-bt" type="button" id="msFechaCad">Fechar</button></div></div>';
    el.cad.style.display = 'flex'; document.getElementById('msFechaCad').onclick = function () { fecha(el.cad); };
  }

  // ---- pista ganha ----
  function mostrarPista(i, aoFechar) {
    var p = M.cofre.pistas[i]; som('pista'); window.MGO_DESAFIO = true;
    el.pista.innerHTML = '<div class="ms-card ms-festa"><img class="ms-mineu-g" src="mineu-comemora.png" alt="Mineu"><h2>Você ganhou a pista ' + (i + 1) + ' do cofre!</h2><div class="ms-pista ms-grande"><span class="ms-dig">' + p.g.split('').map(function (d) { return '<i>' + d + '</i>'; }).join('') + '</span><span class="ms-tx">' + esc(textoPista(p)) + '</span></div><p class="ms-sub">Ela foi anotada no seu caderno 📓</p><div class="ms-bts"><button class="ms-bt ms-ok" type="button" id="msPistaOk">Continuar</button></div></div>';
    el.pista.style.display = 'flex'; document.getElementById('msPistaOk').onclick = function () { fecha(el.pista); window.MGO_DESAFIO = false; aoFechar(); };
  }

  // ---- desafio (quiz / charada) ----
  function abrirDesafio(i) {
    var n = M.nPontos, nivel = nivelDoPonto(i, n), trocas = CFG.trocasPorPonto, q = null, tent = 0, dicaUsada = false, ordem = [], eliminadas = {}, travado = false;
    window.MGO_DESAFIO = true; M.estat.desafios++;
    function montar() {
      q = sortearDesafio(nivel); tent = 0; dicaUsada = false; eliminadas = {}; travado = false; ordem = embaralhar([0, 1, 2, 3]); desenhar('');
    }
    function desenhar(msg, curiosidade) {
      var botoes = ordem.map(function (k, pos) { return '<button type="button" class="ms-alt' + (eliminadas[k] ? ' ms-off' : '') + '" data-k="' + k + '"' + (eliminadas[k] || travado ? ' disabled' : '') + '><b>' + 'ABCD'[pos] + '</b> ' + esc(q.alts[k]) + '</button>'; }).join('');
      el.desafio.innerHTML = '<div class="ms-card"><div class="ms-topo"><span>Ponto ' + (i + 1) + ' de ' + n + ' · ' + (q.tipo === 'charada' ? 'Charada' : 'Quiz') + '</span><span>❤️ ' + Math.round(vidaMineu) + '</span></div>' +
        '<div class="ms-fala"><img class="ms-mineu" src="mineu-comemora.png" alt="Mineu"><div class="ms-balao">' + esc(q.pergunta) + '</div></div><div class="ms-alts">' + botoes + '</div>' +
        '<div class="ms-msg">' + (msg || '') + '</div>' + (curiosidade || '') +
        '<div class="ms-rodape"><button class="ms-peq" type="button" id="msTroca"' + (trocas > 0 && !travado ? '' : ' disabled') + '>🔄 Trocar (' + trocas + ')</button><button class="ms-peq" type="button" id="msDica"' + (dicaUsada || travado ? ' disabled' : '') + '>💡 Dica</button></div></div>';
      el.desafio.style.display = 'flex';
      [].forEach.call(el.desafio.querySelectorAll('.ms-alt'), function (b) { b.onclick = function () { responder(Number(b.getAttribute('data-k'))); }; });
      var bt = document.getElementById('msTroca'); if (bt) bt.onclick = function () { if (trocas > 0 && !travado) { trocas--; M.estat.trocas++; montar(); } };
      var bd = document.getElementById('msDica'); if (bd) bd.onclick = function () { if (dicaUsada || travado) return; dicaUsada = true; M.estat.dicas++; var erradas = [0, 1, 2, 3].filter(function (k) { return k !== q.certa && !eliminadas[k]; }); if (erradas.length > 1) eliminadas[erradas[Math.floor(Math.random() * erradas.length)]] = 1; desenhar('💡 Uma alternativa errada saiu!'); };
    }
    function responder(k) {
      if (travado) return; var botoes = el.desafio.querySelectorAll('.ms-alt');
      if (k === q.certa) {
        travado = true; som('ok'); M.estat.acertos++; var curi = q.curiosidade ? '<div class="ms-cur">🌿 ' + esc(q.curiosidade) + '</div>' : '';
        desenhar('✅ Acertou!', curi); marcarClasse(k, 'ms-certa');
        var bts = el.desafio.querySelector('.ms-card'); var b = $('div', 'ms-bts', '<button class="ms-bt ms-ok" type="button" id="msPega">Pegar a pista 🔑</button>'); bts.appendChild(b);
        document.getElementById('msPega').onclick = function () { fecha(el.desafio); window.MGO_DESAFIO = false; M.pecas++; atualizarContaPistas(); mostrarPista(i, function () { avancar(i); }); };
      } else {
        tent++; som('erro'); M.estat.erros++; eliminadas[k] = 1;
        if (tent >= CFG.tentativas) { // errou as 2: mostra a resposta certa (aprende) e entra OUTRA pergunta, sem dar a peca
          travado = true; var certaTxt = esc(q.alts[q.certa]), curi2 = q.curiosidade ? '<div class="ms-cur">🌿 ' + esc(q.curiosidade) + '</div>' : '';
          desenhar('❌ A resposta era <b>' + certaTxt + '</b>. O guardião trocou a pergunta!', curi2); marcarClasse(k, 'ms-errada');
          var card = el.desafio.querySelector('.ms-card'); card.appendChild($('div', 'ms-bts', '<button class="ms-bt" type="button" id="msProx">Próxima pergunta</button>')); document.getElementById('msProx').onclick = function () { montar(); };
        } else { desenhar('Quase! Mais uma chance.'); marcarClasse(k, 'ms-errada'); }
      }
    }
    function marcarClasse(k, cls) { [].forEach.call(el.desafio.querySelectorAll('.ms-alt'), function (b) { if (Number(b.getAttribute('data-k')) === k) b.classList.add(cls); }); }
    montar();
  }

  // ---- senha do bau ----
  function pedirSenha(aoAcertar, aoFechar) {
    window.MGO_DESAFIO = true; var dig = ['', '', ''], pos = 0;
    function desenhar(msg, errou) {
      var caixas = [0, 1, 2].map(function (k) { return '<span class="ms-cx' + (k === pos ? ' ms-foco' : '') + '">' + (dig[k] || '') + '</span>'; }).join('');
      var teclas = [1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, 'OK'].map(function (t) { return '<button type="button" class="ms-tecla' + (t === 'OK' ? ' ms-teclaok' : '') + '" data-t="' + t + '">' + t + '</button>'; }).join('');
      el.senha.innerHTML = '<div class="ms-card' + (errou ? ' ms-balanca' : '') + '"><h2>🔐 Senha do baú</h2>' + listaPistasHtml() + '<details class="ms-det"><summary>📘 Regras do enigma</summary>' + regrasHtml() + '</details>' + '<div class="ms-caixas">' + caixas + '</div><div class="ms-msg">' + (msg || '') + '</div><div class="ms-teclado">' + teclas + '</div><div class="ms-bts"><button class="ms-peq" type="button" id="msFechaSenha">Voltar</button></div></div>';
      el.senha.style.display = 'flex';
      [].forEach.call(el.senha.querySelectorAll('.ms-tecla'), function (b) { b.onclick = function () { tecla(b.getAttribute('data-t')); }; });
      document.getElementById('msFechaSenha').onclick = function () { fecha(el.senha); window.MGO_DESAFIO = false; if (aoFechar) aoFechar(); };
    }
    function tecla(t) {
      if (t === '⌫') { if (dig[pos] === '' && pos > 0) pos--; dig[pos] = ''; desenhar(''); return; }
      if (t === 'OK') {
        if (dig.some(function (d) { return d === ''; })) { desenhar('Digite os 3 números.'); return; }
        var tent = dig.join(''); M.estat.senhas++;
        if (tent === M.cofre.codigo) { som('ok'); fecha(el.senha); window.MGO_DESAFIO = false; M.resolvido = true; aoAcertar(); }
        else { som('erro'); M.estat.senhaErros++; dig = ['', '', '']; pos = 0; desenhar('❌ Senha errada. Releia as pistas do caderno!', true); }
        return;
      }
      if (dig.indexOf(String(t)) >= 0) { desenhar('Os 3 números são diferentes entre si.'); return; }
      dig[pos] = String(t); if (pos < 2) pos++; desenhar('');
    }
    desenhar('');
  }

  // ================= SEQUENCIA DOS PONTOS =================
  function atualizarContaPistas() { var b = document.getElementById('msContaPistas'); if (b) b.textContent = M.pecas + '/' + M.cofre.pistas.length; }
  function estiloPinos() {
    M.pinos.forEach(function (p, i) { if (!p) return; var chegada = i === M.pontos.length - 1; p.classList.remove('ms-ativo', 'ms-feito');
      if (chegada) { p.style.display = ''; return; }
      if (i < M.idx) { p.style.display = ''; p.classList.add('ms-feito'); } else if (i === M.idx) { p.style.display = ''; p.classList.add('ms-ativo'); } else p.style.display = 'none'; });
  }
  function avancar(i) {
    M.idx = i + 1; estiloPinos();
    if (M.idx >= M.nPontos) { try { aviso('🎉 Todas as pistas! Derrote o chefão final e vá ao baú 🧰 para digitar a senha.'); setTimeout(function () { aviso(''); }, 6500); } catch (e) {} }
    else { try { aviso('Pista guardada! Agora vá ao ponto ' + (M.idx + 1) + '.'); setTimeout(function () { aviso(''); }, 4500); } catch (e) {} }
  }
  var avisouGuardioes = 0;
  function laco() {
    try {
      if (!M.ativa || typeof jogoIniciado === 'undefined' || !jogoIniciado || (typeof celebrou !== 'undefined' && celebrou)) { el.hud.style.display = 'none'; el.caderno.style.display = 'none'; return; }
      el.caderno.style.display = 'block'; el.hud.style.display = 'block';
      if (M.idx < M.nPontos) {
        var p = M.pontos[M.idx], d = Math.round(metrosAte(p.lat, p.lng).d); el.hud.textContent = '🎯 Ponto ' + (M.idx + 1) + ' de ' + M.nPontos + ' · ' + (d > 999 ? Math.round(d / 100) / 10 + ' km' : d + ' m');
        if (!window.MGO_DESAFIO && d <= CFG.chegadaM) {
          var guard = inimigos.some(function (e) { if (!e.vivo || e.final) return false; var dl = (e.lat - p.lat) * 111320, dn = (e.lng - p.lng) * 111320 * Math.cos(p.lat * Math.PI / 180); return Math.sqrt(dl * dl + dn * dn) <= CFG.guardioesM; });
          if (guard) { var agora = performance.now(); if (agora - avisouGuardioes > 7000) { avisouGuardioes = agora; try { aviso('⚔️ Os guardiões ainda protegem este ponto! Derrote-os.'); setTimeout(function () { aviso(''); }, 3000); } catch (e) {} } }
          else abrirDesafio(M.idx);
        }
      } else { el.hud.textContent = M.resolvido ? '🧰 Baú aberto!' : '🧰 Vá ao baú (derrote o chefão final)'; }
    } catch (e) { if (!window.__missaoErro) { window.__missaoErro = e; console.error('[missao]', e); } }
  }

  function iniciar(d, pinos) {
    if (M.ativa) return; if (!banco) { setTimeout(function () { iniciar(d, pinos); }, 400); return; } if (banco === 'erro') return;
    var nPontos = d.pontos.length - 1; // o ultimo ponto e o bau (chegada)
    var cofre = gerarCofre(nPontos, NIVEL_BASE); if (!cofre) { console.error('[missao] nao consegui gerar o cofre'); return; }
    M = { ativa: true, pontos: d.pontos, nPontos: nPontos, pinos: pinos, idx: 0, pecas: 0, cofre: cofre, resolvido: false, usadosMissao: {}, estat: { desafios: 0, acertos: 0, erros: 0, trocas: 0, dicas: 0, senhas: 0, senhaErros: 0 } };
    estiloPinos(); atualizarContaPistas();
    try { aviso('🎯 Vá até o ponto 1 e vença o desafio para ganhar a primeira pista do cofre!'); setTimeout(function () { aviso(''); }, 6000); } catch (e) {}
    console.log('[missao] pronta | senha (so para teste):', cofre.codigo, '| pistas:', cofre.pistas.map(function (p) { return p.g + ' ' + p.A + '/' + p.B; }).join(' · '), '| minimo de pistas:', cofre.minimo);
  }
  fetch('banco-desafios.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (b) { banco = b; }).catch(function (e) { banco = 'erro'; console.error('[missao] banco de desafios nao carregou', e); });
  function pronto() { criarTelas(); setInterval(laco, 500); }
  if (document.body) pronto(); else window.addEventListener('load', pronto);
  window.MGO_MISSAO = {
    iniciar: iniciar, ativa: function () { return !!M.ativa && banco !== 'erro'; }, pecasCompletas: function () { return !M.ativa || M.pecas >= M.cofre.pistas.length; },
    faltam: function () { return M.ativa ? M.cofre.pistas.length - M.pecas : 0; }, exigeSenha: function () { return !!M.ativa && !M.resolvido; }, pedirSenha: pedirSenha,
    estado: function () { return M; }, _gerarCofre: gerarCofre
  };
})();
