// BLOCO missaoNatal (ver blocos/blocos.json) — MISSAO DE NATAL v3 (roteiro: 08-App/Missao-de-Natal-Roteiro.md). So liga com ?missao=natal nos PARQUES (combate); sem o parametro NAO faz nada.
// 10 pontos em sequencia: 4 CASAS de duendes (enigmas com dicas) + 5 PASSAGENS (mini-missoes) + o BAU (ponto 10, bloco bauFinal). Cada ponto tem um marcador 3D de Natal (blocos/natal-props.js).
// As 4 casas entregam 4 BILHETES = 4 pistas do cofre (3 digitos, regra das colunas, resposta unica: gerador do bloco missaoEnigma). A senha se descobre juntando as pistas e e digitada no bau.
// Substitui window.MGO_MISSAO (mesma API que o bauFinal usa) quando ativo; se o percurso nao tiver 10 pontos, devolve o comando ao bloco missaoEnigma.
// Imagens das cenas = Canva (miniaturas por enquanto): recortadas (fundo branco -> transparente) na hora, pelo navegador.
import * as THREE from 'three';
import * as PR from './natal-props.js';

const Q = new URLSearchParams(location.search), NATAL = Q.get('missao') === 'natal';
const ENIGMA = window.MGO_MISSAO; // API do bloco missaoEnigma (usamos so o gerador de cofre)
if (NATAL) iniciarBloco();

function iniciarBloco() {
  // ?dev=1 = TESTE DE CASA: o jogo monta o percurso no Parcao (?teste=1), ignora o GPS de verdade e mostra um painel para pular de ponto em ponto
  const DEV = Q.get('dev') === '1';
  if (DEV) { try { if (localStorage.getItem('mgo-pesquisa-pendente')) { localStorage.removeItem('mgo-pesquisa-pendente'); location.reload(); return; } } catch (e) {} } // teste de casa: a pesquisa obrigatoria do fim nao atrapalha
  if (DEV && location.search.indexOf('teste=1') < 0) { location.replace(location.pathname + location.search + '&teste=1' + location.hash); return; }
  if (DEV && navigator.geolocation) { try { navigator.geolocation.watchPosition = function (ok, err) { setTimeout(function () { if (err) err({ code: 1 }); }, 50); return 0; }; } catch (e) {} }
  // 10 pontos no percurso (9 bases + o bau) e mais espalhados: so afeta a MONTAGEM do combate neste modo
  try { if (DADOS.regrasDinamicas && DADOS.regrasDinamicas.bases) Object.assign(DADOS.regrasDinamicas.bases, { quantidade: 9, raioMaxDaLargadaM: 320, distMinEntreBasesM: 30, distMinDaLargadaM: 50 }); } catch (e) {}
  const rad = Math.PI / 180, CHEGADA_M = 10, GUARDIOES_M = 25, ESC = 2.2;
  const IMG = (n) => 'natal/' + n + '.png';

  // ================= ROTEIRO DOS 10 PONTOS =================
  const ROTEIRO = [
    { tipo: 'casa', id: 'padaria', nome: 'Padaria do Pipo', img: 'padaria', duende: 0, icone: '🍪', prop: () => PR.chale(0xb3392d), iy: 4.6 },
    { tipo: 'passagem', id: 'arvore', nome: 'Árvore apagada', img: 'arvore', icone: '💡', prop: () => PR.arvore(false), iy: 4.9, prop2: () => PR.arvore(true) },
    { tipo: 'casa', id: 'oficina', nome: 'Oficina da Lola', img: 'oficina', duende: 1, icone: '🎁', prop: () => PR.chale(0x2f6fb3, 0x2f6fb3), iy: 4.6 },
    { tipo: 'passagem', id: 'rena', nome: 'Rena presa', img: 'rena', icone: '🦌', prop: () => PR.rena(), iy: 3.6 },
    { tipo: 'casa', id: 'sinos', nome: 'Casa dos Sinos do Tito', img: 'sinos', duende: 2, icone: '🔔', prop: () => PR.chale(0x2f8f4e, 0x3b2a1a), iy: 4.6 },
    { tipo: 'passagem', id: 'taberna', nome: 'Taberna', img: 'taberna', icone: '🍵', prop: () => PR.chale(0x8d5a2b, 0xb3392d), iy: 4.6 },
    { tipo: 'casa', id: 'biblioteca', nome: 'Biblioteca da Bia', img: 'biblioteca', duende: 3, icone: '📖', prop: () => PR.chale(0x6a3fa0, 0x3b2a1a), iy: 4.6 },
    { tipo: 'passagem', id: 'caverna', nome: 'Caminho da caverna', img: 'caverna', icone: '🐉', prop: () => PR.caverna(), iy: 4.2 },
    { tipo: 'bau', id: 'bau', nome: 'Baú do Papai Noel', img: 'final' },
  ];
  const DUENDES = [['Pipo', 'o padeiro'], ['Lola', 'a inventora de brinquedos'], ['Tito', 'o guardião dos sinos'], ['Bia', 'a bibliotecária']];

  // ================= IMAGENS: recorte do fundo branco =================
  const S = { duendes: [], biscoitos: [], caixas: [], objetos: [], seta: '' };
  function recortar(src, cols, k) {
    return new Promise((ok) => {
      const im = new Image(); im.onload = () => {
        try {
          const w = Math.floor(im.naturalWidth / cols), c = document.createElement('canvas'); c.width = w; c.height = im.naturalHeight;
          const g = c.getContext('2d'); g.drawImage(im, k * w, 0, w, im.naturalHeight, 0, 0, w, im.naturalHeight);
          const d = g.getImageData(0, 0, w, im.naturalHeight), p = d.data;
          for (let i = 0; i < p.length; i += 4) { const m = Math.min(p[i], p[i + 1], p[i + 2]); if (m > 238) p[i + 3] = 0; else if (m > 212) p[i + 3] = Math.round(255 * (238 - m) / 26); }
          g.putImageData(d, 0, 0); ok(c.toDataURL('image/png'));
        } catch (e) { ok(src); }
      }; im.onerror = () => ok(''); im.src = src;
    });
  }
  [['duendes', 'duendes', 4], ['biscoitos', 'biscoitos', 4], ['caixas', 'caixas', 3], ['objetos', 'objetos', 6]].forEach(([chave, arq, n]) => { for (let k = 0; k < n; k++) recortar(IMG(arq), n, k).then((u) => { S[chave][k] = u; }); });

  recortar(IMG('seta'), 1, 0).then((u) => { S.seta = u; const i = document.querySelector('#ntSeta img'); if (i) i.src = u; });

  // ================= UTIL =================
  const $ = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const som = (t) => { try { if (t === 'ok') [523, 659, 784].forEach((f, i) => setTimeout(() => tocarTom(f, f, 150, 'triangle', 0.1), i * 90)); else if (t === 'erro') tocarTom(220, 120, 220, 'square', 0.07); else if (t === 'pista') [659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tocarTom(f, f, 160, 'triangle', 0.1), i * 100)); } catch (e) {} };
  const msg = (t, ms) => { try { aviso(t); if (ms) setTimeout(() => aviso(''), ms); } catch (e) {} };
  const textoPista = (p) => { const t = []; if (p.A + p.B === 0) return 'nenhum número certo'; if (p.A) t.push(p.A + (p.A > 1 ? ' números certos' : ' número certo') + ', no lugar certo'); if (p.B) t.push(p.B + (p.B > 1 ? ' números certos' : ' número certo') + ', mas no lugar errado'); return t.join(' e '); };
  const imgSprite = (arr, k, cls) => arr[k] ? '<img class="' + (cls || '') + '" src="' + arr[k] + '" alt="">' : '<span class="' + (cls || '') + '"></span>';

  // ================= ESTADO =================
  let M = { ativa: false };
  const el = {};
  function criarTelas() {
    el.hud = $('div', '', ''); el.hud.id = 'ntHud'; el.cad = $('button', '', '📓 Pistas <b id="ntConta">0/4</b>'); el.cad.id = 'ntBtnCad'; el.cad.type = 'button';
    el.tela = $('div', '', ''); el.tela.id = 'ntTela'; el.pista = $('div', '', ''); el.pista.id = 'ntPista'; el.caderno = $('div', '', ''); el.caderno.id = 'ntCaderno'; el.senha = $('div', '', ''); el.senha.id = 'ntSenha';
    [el.hud, el.cad, el.tela, el.pista, el.caderno, el.senha].forEach((e) => document.body.appendChild(e));
    el.cad.addEventListener('click', (e) => { e.stopPropagation(); abrirCaderno(); });
    // FLECHA: aponta para a proxima parada (canto superior direito, ao lado dos botoes do mapa). A cor da luz muda com a distancia: gelado -> morninho -> quentinho -> pegando fogo
    el.seta = $('div', '', '<img alt="" src="' + (S.seta || '') + '"><span class="nt-seta-t">Siga a flecha</span><span class="nt-seta-q"></span>'); el.seta.id = 'ntSeta'; document.body.appendChild(el.seta);
    requestAnimationFrame(quadroSeta);
    if (DEV) { // painel de teste de casa
      el.dev = $('div', '', '<b>🧪 Teste</b><button type="button" id="ntDevIr">📍 Ir à próxima parada</button><button type="button" id="ntDevGuardas">⚔️ Derrotar guardas</button><button type="button" id="ntDevNovo">🔄 Recomeçar</button>'); el.dev.id = 'ntDev'; document.body.appendChild(el.dev);
      el.dev.addEventListener('click', (e) => e.stopPropagation());
      // teste de casa: pula as telas de "baixar o parque" e "ativar GPS" (sem GPS de verdade o jogo comeca no Parcao)
      let tent = 0; const auto = setInterval(() => { tent++; if ((typeof jogoIniciado !== 'undefined' && jogoIniciado) || tent > 60) { clearInterval(auto); return; } if (!M.ativa) return; const bt = [].find.call(document.querySelectorAll('button'), (b) => /Jogar assim mesmo/.test(b.textContent)); const btVis = bt && bt.offsetParent; if (btVis) bt.click(); const bi = document.getElementById('bInicio'); if (bi && bi.offsetParent && !btVis) bi.click(); }, 500);
      document.getElementById('ntDevIr').onclick = () => { if (!M.ativa) return; const a = alvoSeta(); if (!a) return; const q = deslocar(a.lat, a.lng, 6, 180); ALVO.lat = POS.lat = q.lat; ALVO.lng = POS.lng = q.lng; };
      document.getElementById('ntDevGuardas').onclick = () => { if (!M.ativa) return; const a = alvoSeta(); if (!a) return; inimigos.forEach((e) => { if (!e.vivo) return; if (e.final && M.idx < M.n) return; const dl = (e.lat - a.lat) * 111320, dn = (e.lng - a.lng) * 111320 * Math.cos(a.lat * rad); if (Math.sqrt(dl * dl + dn * dn) <= GUARDIOES_M + 5) acertou(e, 99999); }); };
      document.getElementById('ntDevNovo').onclick = () => { try { localStorage.removeItem('mgo-pesquisa-pendente'); } catch (e) {} location.reload(); };
    }
  }
  function alvoSeta() { // para onde a flecha aponta: a proxima luzinha (na arvore apagada) ou o ponto atual
    if (!M.ativa) return null;
    if (M.luzes && !M.luzes.concluida && M.luzes.idx === M.idx) { const l = M.luzes.lista.filter((z) => !z.pega).sort((a, b) => metrosAte(a.lat, a.lng).d - metrosAte(b.lat, b.lng).d)[0]; if (l) return l; }
    return M.pontos[Math.min(M.idx, M.pontos.length - 1)];
  }
  function quadroSeta() {
    try {
      const s = el.seta, a = alvoSeta();
      if (!s || !a || typeof jogoIniciado === 'undefined' || !jogoIniciado || window.MGO_DESAFIO || (typeof celebrou !== 'undefined' && celebrou) || M.resolvido) { if (s) s.style.display = 'none'; }
      else {
        s.style.display = 'flex';
        const dl = a.lat - POS.lat, dn = (a.lng - POS.lng) * Math.cos(POS.lat * rad), brg = Math.atan2(dn, dl) / rad, d = metrosAte(a.lat, a.lng).d;
        const cor = d > 150 ? '#4fc3f7' : d > 70 ? '#ffd54f' : d > 30 ? '#ff9800' : '#ff3d00', q = d > 150 ? 'gelado ❄️' : d > 70 ? 'morninho' : d > 30 ? 'quentinho 🔥' : 'pegando fogo!!';
        const im = s.querySelector('img'); im.style.transform = 'rotate(' + (brg - bearing).toFixed(1) + 'deg) scale(' + (d < 30 ? 1.15 : 1) + ')'; im.style.filter = 'drop-shadow(0 0 5px ' + cor + ') drop-shadow(0 0 10px ' + cor + ')';
        s.querySelector('.nt-seta-q').textContent = q; s.querySelector('.nt-seta-q').style.color = cor;
      }
    } catch (e) {}
    requestAnimationFrame(quadroSeta);
  }
  const fecha = (e) => { e.style.display = 'none'; e.innerHTML = ''; };

  // ================= CADERNO / PISTA / SENHA =================
  function listaPistas() {
    let h = '';
    M.cofre.pistas.forEach((p, i) => {
      if (i < M.pecas) h += '<div class="ms-pista"><span class="ms-n">Bilhete ' + (i + 1) + '</span><span class="ms-dig">' + p.g.split('').map((d) => '<i>' + d + '</i>').join('') + '</span><span class="ms-tx">' + esc(textoPista(p)) + '</span></div>';
      else h += '<div class="ms-pista ms-trancada"><span class="ms-n">Bilhete ' + (i + 1) + '</span><span class="ms-tx">🔒 ganhe na casa ' + (i + 1) + ' (' + esc(ROTEIRO.filter((r) => r.tipo === 'casa')[i].nome) + ')</span></div>';
    });
    return h;
  }
  const regras = () => '<ul class="ms-regras"><li>A senha tem <b>3 números diferentes</b>.</li><li>Cada número só pode ficar <b>numa coluna onde ele já apareceu</b> nos bilhetes.</li><li>“No lugar errado” = o número está na senha, mas <b>não nessa coluna</b>.</li></ul>';
  function abrirCaderno() {
    el.caderno.innerHTML = '<div class="ms-card"><h2>📓 Bilhetes dos duendes</h2><p class="ms-sub">Cada bilhete é uma tentativa que os duendes fizeram no cadeado do baú. Junte as 4 para deduzir a senha.</p>' + listaPistas() + regras() + '<div class="ms-bts"><button class="ms-bt" type="button" id="ntFechaCad">Fechar</button></div></div>';
    el.caderno.style.display = 'flex'; document.getElementById('ntFechaCad').onclick = () => fecha(el.caderno);
  }
  function mostrarBilhete(iCasa, aoFechar) {
    const p = M.cofre.pistas[iCasa], d = DUENDES[iCasa]; som('pista'); window.MGO_DESAFIO = true;
    el.pista.innerHTML = '<div class="ms-card ms-festa"><div class="nt-retrato">' + imgSprite(S.duendes, iCasa, 'nt-duende-g') + '</div><h2>' + esc(d[0]) + ' entregou o bilhete ' + (iCasa + 1) + '!</h2><div class="ms-pista ms-grande"><span class="ms-dig">' + p.g.split('').map((x) => '<i>' + x + '</i>').join('') + '</span><span class="ms-tx">' + esc(textoPista(p)) + '</span></div><p class="ms-sub">Anotado no seu caderno 📓</p><div class="ms-bts"><button class="ms-bt ms-ok" type="button" id="ntPistaOk">Continuar</button></div></div>';
    el.pista.style.display = 'flex'; document.getElementById('ntPistaOk').onclick = () => { fecha(el.pista); window.MGO_DESAFIO = false; aoFechar(); };
  }
  function pedirSenha(aoAcertar, aoFechar) {
    window.MGO_DESAFIO = true; let dig = ['', '', ''], pos = 0;
    function desenhar(m, errou) {
      const caixas = [0, 1, 2].map((k) => '<span class="ms-cx' + (k === pos ? ' ms-foco' : '') + '">' + (dig[k] || '') + '</span>').join('');
      const teclas = [1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, 'OK'].map((t) => '<button type="button" class="ms-tecla' + (t === 'OK' ? ' ms-teclaok' : '') + '" data-t="' + t + '">' + t + '</button>').join('');
      el.senha.innerHTML = '<div class="ms-card' + (errou ? ' ms-balanca' : '') + '"><h2>🔐 Senha do baú</h2>' + listaPistas() + '<details class="ms-det"><summary>📘 Regras do enigma</summary>' + regras() + '</details><div class="ms-caixas">' + caixas + '</div><div class="ms-msg">' + (m || '') + '</div><div class="ms-teclado">' + teclas + '</div><div class="ms-bts"><button class="ms-peq" type="button" id="ntFechaSenha">Voltar</button></div></div>';
      el.senha.style.display = 'flex';
      [].forEach.call(el.senha.querySelectorAll('.ms-tecla'), (b) => { b.onclick = () => tecla(b.getAttribute('data-t')); });
      document.getElementById('ntFechaSenha').onclick = () => { fecha(el.senha); window.MGO_DESAFIO = false; if (aoFechar) aoFechar(); };
    }
    function tecla(t) {
      if (t === '⌫') { if (dig[pos] === '' && pos > 0) pos--; dig[pos] = ''; desenhar(''); return; }
      if (t === 'OK') {
        if (dig.some((d) => d === '')) { desenhar('Digite os 3 números.'); return; }
        if (dig.join('') === M.cofre.codigo) { som('ok'); fecha(el.senha); window.MGO_DESAFIO = false; M.resolvido = true; aoAcertar(); }
        else { som('erro'); dig = ['', '', '']; pos = 0; desenhar('❌ Senha errada. Releia os bilhetes do caderno!', true); }
        return;
      }
      if (dig.indexOf(String(t)) >= 0) { desenhar('Os 3 números são diferentes entre si.'); return; }
      dig[pos] = String(t); if (pos < 2) pos++; desenhar('');
    }
    desenhar('');
  }

  // ================= TELA DE CENA (cabecalho com a imagem + duende) =================
  function cabecalho(r, fala) {
    const d = r.duende !== undefined ? DUENDES[r.duende] : null;
    return '<div class="nt-banner" style="background-image:url(' + IMG(r.img) + ')"><div class="nt-titulo">' + esc(r.nome) + '</div></div>' +
      (fala ? '<div class="ms-fala nt-fala">' + (d ? '<div class="nt-retrato">' + imgSprite(S.duendes, r.duende, 'nt-duende') + '</div>' : '<img class="ms-mineu" src="mineu-comemora.png" alt="Mineu">') + '<div class="ms-balao">' + fala + '</div></div>' : '');
  }
  function mostrarTela(html, aoMontar) { window.MGO_DESAFIO = true; el.tela.innerHTML = '<div class="ms-card nt-card">' + html + '</div>'; el.tela.style.display = 'flex'; el.tela.scrollTop = 0; if (aoMontar) aoMontar(); }
  function fecharTela() { fecha(el.tela); window.MGO_DESAFIO = false; }
  function dicasHtml(dicas, usadas) { return '<div class="nt-dicas">' + dicas.slice(0, usadas).map((t, i) => '<div class="ms-cur">💡 <b>Dica ' + (i + 1) + ':</b> ' + esc(t) + '</div>').join('') + '</div>'; }
  function botaoDica(usadas, total) { return '<button class="ms-peq" type="button" id="ntDica"' + (usadas >= total ? ' disabled' : '') + '>💡 Dica do Mineu (' + usadas + '/' + total + ')</button>'; }

  // ---------- CASA 1: PADARIA — ordem com regras ----------
  function casaPadaria(r, i) {
    const NOMES = ['Estrela', 'Sino', 'Pinheiro', 'Boneco'], CERTA = ['Sino', 'Boneco', 'Pinheiro', 'Estrela'];
    const tray = [null, null, null, null]; let dicas = 0, texto = '', ok = false;
    const DICAS = ['Comece pelo Boneco: a regra 2 diz onde ele não pode ficar.', 'Imagine o Boneco na 3ª posição. Pinheiro e Estrela precisam ficar colados e só cabem na 1ª e 2ª… então onde iria o Sino? Dá certo?', 'Então o Boneco está na 2ª posição. Sobra um lugar antes dele: quem pode ocupá-lo?'];
    function ver() {
      const slots = tray.map((k, p) => '<button type="button" class="nt-slot" data-p="' + p + '">' + (k === null ? '<span class="nt-slotn">' + (p + 1) + '</span>' : imgSprite(S.biscoitos, k, 'nt-bisc')) + '</button>').join('');
      const bisc = NOMES.map((n, k) => '<button type="button" class="nt-bisc-b' + (tray.indexOf(k) >= 0 ? ' nt-off' : '') + '" data-k="' + k + '">' + imgSprite(S.biscoitos, k, 'nt-bisc') + '<small>' + n + '</small></button>').join('');
      mostrarTela(cabecalho(r, '<b>' + DUENDES[0][0] + ':</b> Só dou o bilhete a quem monta a bandeja <b>na ordem da receita</b>, da esquerda para a direita!') +
        '<ol class="nt-regras"><li>O <b>Sino</b> fica em algum lugar <b>antes</b> do <b>Boneco</b>.</li><li>O <b>Boneco</b> <b>não</b> fica numa das pontas.</li><li>O <b>Pinheiro</b> fica <b>colado</b> na <b>Estrela</b>.</li><li>O <b>Pinheiro</b> <b>não</b> é o último.</li></ol>' +
        '<div class="nt-bandeja">' + slots + '</div><div class="nt-fila">' + bisc + '</div><div class="ms-msg">' + texto + '</div>' + dicasHtml(DICAS, dicas) +
        '<div class="ms-rodape">' + botaoDica(dicas, 3) + '<button class="ms-bt ms-ok" type="button" id="ntPronto" style="flex:1">Pronto!</button></div>', () => {
        [].forEach.call(el.tela.querySelectorAll('.nt-bisc-b'), (b) => { b.onclick = () => { const k = Number(b.getAttribute('data-k')); if (tray.indexOf(k) >= 0) return; const p = tray.indexOf(null); if (p >= 0) { tray[p] = k; texto = ''; ver(); } }; });
        [].forEach.call(el.tela.querySelectorAll('.nt-slot'), (b) => { b.onclick = () => { tray[Number(b.getAttribute('data-p'))] = null; texto = ''; ver(); }; });
        document.getElementById('ntDica').onclick = () => { if (dicas < 3) { dicas++; ver(); } };
        document.getElementById('ntPronto').onclick = () => {
          if (tray.indexOf(null) >= 0) { texto = 'Coloque os 4 biscoitos na bandeja.'; ver(); return; }
          const certos = tray.filter((k, p) => NOMES[k] === CERTA[p]).length;
          if (certos === 4) { som('ok'); concluirCasa(r, i); } else { som('erro'); texto = certos === 0 ? 'Ainda não! Nenhum biscoito está no lugar certo.' : 'Ainda não! ' + certos + (certos > 1 ? ' biscoitos já estão' : ' biscoito já está') + ' no lugar certo.'; ver(); }
        };
      });
    }
    ver();
  }

  // ---------- CASA 2: OFICINA — verdade e mentira ----------
  function casaOficina(r, i) {
    const COR = ['vermelha', 'verde', 'dourada'], ET = [['A chave está na caixa <b>verde</b>.', (k) => k === 1], ['A chave <b>não</b> está <b>nesta</b> caixa.', (k) => k !== 1], ['A chave <b>não</b> está na caixa <b>vermelha</b>.', (k) => k !== 0]];
    const riscada = [false, false, false]; let dicas = 0, texto = '';
    const DICAS = ['Teste uma caixa de cada vez: imagine que a chave está nela e conte quantas etiquetas ficam verdadeiras.', 'O certo é dar exatamente UMA verdadeira. Se a chave estivesse na caixa verde, quantas dariam verdade?', 'Com a chave na verde, dão duas verdadeiras. Não serve! Restam duas caixas para testar.'];
    function ver() {
      const caixas = COR.map((c, k) => '<button type="button" class="nt-caixa' + (riscada[k] ? ' nt-vazia' : '') + '" data-k="' + k + '"' + (riscada[k] ? ' disabled' : '') + '>' + imgSprite(S.caixas, k, 'nt-cx') + '<span class="nt-etq">' + ET[k][0] + '</span>' + (riscada[k] ? '<em>vazia</em>' : '') + '</button>').join('');
      mostrarTela(cabecalho(r, '<b>' + DUENDES[1][0] + ':</b> A chave da minha gaveta está numa destas caixas. Mas atenção: <b>só UMA etiqueta diz a verdade</b>. As outras duas mentem!') +
        '<div class="nt-caixas">' + caixas + '</div><div class="ms-msg">' + texto + '</div>' + dicasHtml(DICAS, dicas) + '<div class="ms-rodape">' + botaoDica(dicas, 3) + '</div>', () => {
        [].forEach.call(el.tela.querySelectorAll('.nt-caixa'), (b) => { b.onclick = () => {
          const k = Number(b.getAttribute('data-k')), n = ET.filter((e) => e[1](k)).length;
          if (n === 1) { som('ok'); concluirCasa(r, i); } else { som('erro'); riscada[k] = true; texto = 'Vazia! Com a chave na caixa ' + COR[k] + ', <b>' + n + '</b> etiquetas ficariam verdadeiras. Mas só pode ser uma!'; ver(); }
        }; });
        document.getElementById('ntDica').onclick = () => { if (dicas < 3) { dicas++; ver(); } };
      });
    }
    ver();
  }

  // ---------- CASA 3: CASA DOS SINOS — cifra ----------
  function casaSinos(r, i) {
    const LEG = [['⭐', 'A'], ['🔔', 'L'], ['🎄', 'R'], ['❄️', 'E'], ['🎁', 'I'], ['🕯️', 'O'], ['🧦', 'S'], ['🍪', 'C']], PALAVRA = 'LAREIRA';
    const letra = {}; LEG.forEach((p) => { letra[p[1]] = p[0]; });
    const rec = PALAVRA.split('').map((l) => letra[l]), TILES = 'ACDEILMNORST'.split('');
    let resp = [], dicas = 0, texto = '';
    const DICAS = ['A legenda traduz cada desenho em uma letra. Troque um desenho de cada vez.', 'O primeiro desenho é o sino. Qual letra ele vale na legenda?', 'As três primeiras letras são L, A, R. Continue a decifrar o resto.'];
    function ver() {
      const leg = LEG.map((p) => '<span class="nt-chip">' + p[0] + ' = <b>' + p[1] + '</b></span>').join('');
      const caixas = PALAVRA.split('').map((x, k) => '<span class="ms-cx nt-cxl">' + (resp[k] || '') + '</span>').join('');
      const tiles = TILES.map((t) => '<button type="button" class="ms-tecla nt-tile" data-t="' + t + '">' + t + '</button>').join('') + '<button type="button" class="ms-tecla nt-tile" data-t="⌫">⌫</button>';
      mostrarTela(cabecalho(r, '<b>' + DUENDES[2][0] + ':</b> Escondi o bilhete no lugar mais quentinho da casa. Só que escrevi o nome dele em <b>desenhos</b>! A legenda está no quadro.') +
        '<div class="nt-quadro"><div class="nt-leg">' + leg + '</div><div class="nt-rec">' + rec.join(' ') + '</div></div><div class="nt-resp">' + caixas + '</div><div class="nt-tiles">' + tiles + '</div><div class="ms-msg">' + texto + '</div>' + dicasHtml(DICAS, dicas) +
        '<div class="ms-rodape">' + botaoDica(dicas, 3) + '<button class="ms-bt ms-ok" type="button" id="ntAbrir" style="flex:1">Abrir!</button></div>', () => {
        [].forEach.call(el.tela.querySelectorAll('.nt-tile'), (b) => { b.onclick = () => { const t = b.getAttribute('data-t'); if (t === '⌫') resp.pop(); else if (resp.length < PALAVRA.length) resp.push(t); texto = ''; ver(); }; });
        document.getElementById('ntDica').onclick = () => { if (dicas < 3) { dicas++; ver(); } };
        document.getElementById('ntAbrir').onclick = () => {
          if (resp.length !== PALAVRA.length) { texto = 'A palavra tem ' + PALAVRA.length + ' letras.'; ver(); return; }
          if (resp.join('') === PALAVRA) { som('ok'); concluirCasa(r, i); }
          else { som('erro'); const c = resp.filter((l, k) => l === PALAVRA[k]).length; texto = c ? 'Ainda não! ' + c + (c > 1 ? ' letras estão' : ' letra está') + ' no lugar certo.' : 'Ainda não! Releia desenho por desenho.'; ver(); }
        };
      });
    }
    ver();
  }

  // ---------- CASA 4: BIBLIOTECA — poema por eliminacao ----------
  function casaBiblioteca(r, i) {
    const OBJ = [['Vela', 'cera'], ['Livro', 'papel'], ['Meia', 'pano'], ['Lanterna', 'metal'], ['Relógio', 'metal'], ['Urso', 'pano']];
    const VERSOS = [
      ['Não durmo nas pontas da prateleira, nem na primeira, nem na derradeira.', (p) => p !== 0 && p !== 5],
      ['Não sou de pano, nem sou de cera.', (p) => OBJ[p][1] !== 'pano' && OBJ[p][1] !== 'cera'],
      ['O Urso é meu amigo, mas <b>não é meu vizinho</b>.', (p) => Math.abs(p - 5) !== 1],
      ['O meu vizinho da <b>direita</b> não é de pano.', (p) => p < 5 && OBJ[p + 1][1] !== 'pano'],
    ];
    const risc = [false, false, false, false, false, false]; let dicas = 0, texto = '';
    const DICAS = ['Cada verso risca alguns objetos. Comece pelo verso 1: quem dorme nas pontas está fora.', 'Depois dos versos 1 e 2, sobram três objetos. Quais são?', 'O verso 3 risca quem fica ao lado do Urso. Quem sobrou? O verso 4 decide entre os dois.'];
    function ver() {
      const rest = risc.map((x, k) => (x ? -1 : k)).filter((k) => k >= 0);
      const prat = OBJ.map((o, k) => '<button type="button" class="nt-obj' + (risc[k] ? ' nt-risc' : '') + '" data-k="' + k + '">' + imgSprite(S.objetos, k, 'nt-ob') + '<small>' + o[0] + '</small></button>').join('');
      mostrarTela(cabecalho(r, '<b>' + DUENDES[3][0] + ':</b> O bilhete dorme dentro de <b>um</b> destes seis objetos. Escrevi um poema para quem souber <b>riscar</b> os que <b>não</b> são. Toque num objeto para riscá-lo.') +
        '<div class="nt-poema"><i>Seis amigos na estante, de olho em quem vem aqui. Só um guarda o bilhete: descubra quem é, vai!</i><ol>' + VERSOS.map((v) => '<li>' + v[0] + '</li>').join('') + '</ol></div><div class="nt-prat">' + prat + '</div><div class="ms-msg">' + texto + '</div>' + dicasHtml(DICAS, dicas) +
        '<div class="ms-rodape">' + botaoDica(dicas, 3) + '<button class="ms-bt ms-ok" type="button" id="ntEsse" style="flex:1"' + (rest.length === 1 ? '' : ' disabled') + '>É esse!</button></div>', () => {
        [].forEach.call(el.tela.querySelectorAll('.nt-obj'), (b) => { b.onclick = () => { const k = Number(b.getAttribute('data-k')); risc[k] = !risc[k]; texto = ''; ver(); }; });
        document.getElementById('ntDica').onclick = () => { if (dicas < 3) { dicas++; ver(); } };
        document.getElementById('ntEsse').onclick = () => {
          const k = rest[0], falha = VERSOS.findIndex((v) => !v[1](k));
          if (falha < 0) { som('ok'); concluirCasa(r, i); } else { som('erro'); texto = 'Esse objeto não combina com o verso ' + (falha + 1) + '. Risque de novo!'; risc[k] = true; ver(); }
        };
      });
    }
    ver();
  }
  const CASAS = { padaria: casaPadaria, oficina: casaOficina, sinos: casaSinos, biblioteca: casaBiblioteca };
  function concluirCasa(r, i) { fecharTela(); const nCasa = ROTEIRO.slice(0, i).filter((x) => x.tipo === 'casa').length; M.pecas++; atualizarConta(); mostrarBilhete(nCasa, () => avancar(i)); }

  // ================= PASSAGENS =================
  const FALAS = {
    largada: ['O portal se abriu!', 'Os parques escondem <b>portais secretos</b> para um <b>mundo de fantasias</b>, e vocês são o <b>canal de acesso</b> a ele! Do outro lado, o Natal está em perigo: o <b>Dragão Resmungão</b> quer levar a <b>Estrela do Natal</b>. O Papai Noel a trancou num baú e escondeu pistas da senha com <b>4 duendes</b>, cada um numa casa trancada por um enigma. Atravessem o portal e ajudem!', 'Atravessar o portal'],
    rena: ['Rena presa', 'Os ajudantes do dragão prenderam a rena do Tito! Vocês derrotaram os guardas e <b>libertaram a rena</b>. Ela sai correndo, feliz, e deixa um rastro de brilho. 🦌✨', 'Continuar'],
    taberna: ['Taberna', 'Que cheirinho bom! Vocês descansam um pouco, tomam um chocolate quente e <b>recuperam toda a vida</b>. ❤️ Dica do Mineu: pensem com calma nos próximos enigmas, as dicas ajudam sem entregar a resposta!', 'Recarregar e seguir'],
    caverna: ['Caminho da caverna', 'Daqui para a frente o chão está queimado: é o <b>território do Dragão Resmungão</b>. Os últimos ajudantes dele estão aí. Derrotados eles, o baú está logo à frente!', 'Seguir']
  };
  function abrirIntro() {
    const f = FALAS.largada;
    mostrarTela(cabecalho({ nome: 'O portal do Natal', img: 'portal' }, '') + '<h2 class="nt-h">' + f[0] + '</h2><p class="nt-p">' + f[1] + '</p><div class="ms-bts"><button class="ms-bt ms-ok" type="button" id="ntOk">' + f[2] + '</button></div>', () => {
      document.getElementById('ntOk').onclick = () => { som('ok'); fecharTela(); msg('Siga a flecha até: ' + ROTEIRO[0].nome + '.', 5000); };
    });
  }
  function passagem(r, i) {
    if (r.id === 'arvore') return passagemArvore(r, i);
    const f = FALAS[r.id];
    mostrarTela(cabecalho(r, '') + (r.id === 'largada' ? '' : '') + '<h2 class="nt-h">' + f[0] + '</h2><p class="nt-p">' + f[1] + '</p><div class="ms-bts"><button class="ms-bt ms-ok" type="button" id="ntOk">' + f[2] + '</button></div>', () => {
      document.getElementById('ntOk').onclick = () => { if (r.id === 'taberna') { try { vidaMineu = 100; pintaVidaMineu(); } catch (e) {} } som('ok'); fecharTela(); avancar(i); };
    });
  }
  function passagemArvore(r, i) {
    if (M.luzes && M.luzes.idx === i) { fecharTela(); return; }
    const p = M.pontos[i], luzes = [];
    for (let k = 0; k < 3; k++) { const q = deslocar(p.lat, p.lng, 12 + Math.random() * 10, k * 120 + Math.random() * 60); const e = pino('p-luz', '<span class="nt-luz">⭐</span>', q.lat, q.lng); luzes.push({ lat: q.lat, lng: q.lng, el: e, pega: false }); }
    M.luzes = { idx: i, lista: luzes, n: 0 };
    mostrarTela(cabecalho(r, '') + '<h2 class="nt-h">A árvore está apagada!</h2><p class="nt-p">Sem as luzinhas, a árvore de Natal do parque não acende. Procure as <b>3 luzinhas ⭐</b> espalhadas aqui perto e volte à árvore!</p><div class="ms-bts"><button class="ms-bt ms-ok" type="button" id="ntOk">Procurar as luzinhas</button></div>', () => {
      document.getElementById('ntOk').onclick = () => { fecharTela(); msg('⭐ Pegue as 3 luzinhas perto da árvore!', 4500); };
    });
  }
  function laçoLuzes() {
    const L = M.luzes; if (!L || L.concluida) return;
    L.lista.forEach((z) => { if (z.pega) return; if (metrosAte(z.lat, z.lng).d <= 6) { z.pega = true; z.el.style.display = 'none'; L.n++; som('ok'); msg('⭐ Luzinha ' + L.n + '/3!', 2000); } });
    if (L.n >= 3) { L.concluida = true; M.arvoreAcesa = true; som('pista'); const r = ROTEIRO[L.idx]; mostrarTela(cabecalho(r, '') + '<h2 class="nt-h">A árvore acendeu! 🎄✨</h2><p class="nt-p">As luzinhas voltaram aos galhos e a Estrela de cima brilha de novo. O parque inteiro ficou mais bonito!</p><div class="ms-bts"><button class="ms-bt ms-ok" type="button" id="ntOk">Continuar</button></div>', () => { document.getElementById('ntOk').onclick = () => { fecharTela(); avancar(L.idx); }; }); }
  }

  // ================= SEQUENCIA =================
  function atualizarConta() { const b = document.getElementById('ntConta'); if (b) b.textContent = M.pecas + '/4'; }
  function estiloPinos() {
    M.pinos.forEach((p, i) => { if (!p) return; const chegada = i === M.pontos.length - 1; p.classList.remove('ms-ativo', 'ms-feito');
      if (chegada) { p.style.display = ''; return; }
      if (i < M.idx) { p.style.display = ''; p.classList.add('ms-feito'); } else if (i === M.idx) { p.style.display = ''; p.classList.add('ms-ativo'); } else p.style.display = 'none'; });
    M.props.forEach((g, i) => { if (g) g.visible = i <= M.idx; });
  }
  function avancar(i) {
    M.idx = i + 1; estiloPinos();
    if (M.idx >= M.n) msg('🎉 Todos os bilhetes! Derrote o Dragão Resmungão e vá ao baú 🧰 para digitar a senha.', 7000);
    else msg('Muito bem! Próximo ponto: ' + ROTEIRO[M.idx].nome + '.', 4500);
  }
  let avisouGuard = 0;
  function laco() {
    try {
      if (!M.ativa || typeof jogoIniciado === 'undefined' || !jogoIniciado || (typeof celebrou !== 'undefined' && celebrou)) { el.hud.style.display = 'none'; el.cad.style.display = 'none'; return; }
      el.cad.style.display = 'block'; el.hud.style.display = 'block';
      if (!M.intro && !window.MGO_DESAFIO) { M.intro = true; abrirIntro(); }
      laçoLuzes();
      if (M.idx < M.n) {
        const p = M.pontos[M.idx], r = ROTEIRO[M.idx], d = Math.round(metrosAte(p.lat, p.lng).d), luzes = M.luzes && M.luzes.idx === M.idx && !M.luzes.concluida;
        el.hud.textContent = luzes ? '⭐ Luzinhas ' + M.luzes.n + '/3' : '🎯 ' + (M.idx + 1) + '/' + M.pontos.length + ' · ' + r.nome + ' · ' + (d > 999 ? Math.round(d / 100) / 10 + ' km' : d + ' m');
        if (!window.MGO_DESAFIO && !luzes && d <= CHEGADA_M) {
          const guard = inimigos.some((e) => { if (!e.vivo || e.final) return false; const dl = (e.lat - p.lat) * 111320, dn = (e.lng - p.lng) * 111320 * Math.cos(p.lat * rad); return Math.sqrt(dl * dl + dn * dn) <= GUARDIOES_M; });
          if (guard) { const agora = performance.now(); if (agora - avisouGuard > 7000) { avisouGuard = agora; msg('⚔️ Os guardiões ainda protegem este ponto! Derrote-os.', 3000); } }
          else if (r.tipo === 'casa') CASAS[r.id](r, M.idx); else if (r.tipo === 'passagem') passagem(r, M.idx);
        }
      } else el.hud.textContent = M.resolvido ? '🧰 Baú aberto!' : '🧰 Vá ao baú (derrote o Dragão Resmungão)';
    } catch (e) { if (!window.__natalErro) { window.__natalErro = e; console.error('[natal]', e); } }
  }

  // ================= MARCADORES 3D NO MAPA =================
  function iconeSprite(emoji) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = '#d7263d'; g.stroke();
    g.font = '70px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, 64, 72);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true })); s.scale.set(2.6, 2.6, 1); return s;
  }
  function montarProps(pontos, portalPos) {
    const cena = new THREE.Scene(); cena.add(new THREE.AmbientLight(0xffffff, 1.6)); const sol = new THREE.DirectionalLight(0xfff0d8, 2.2); sol.position.set(-20, 40, 30); cena.add(sol);
    const props = [], grupos = [];
    ROTEIRO.forEach((r, i) => {
      if (!r.prop) { props[i] = null; grupos[i] = null; return; }
      const g = new THREE.Group(), obj = r.prop(); obj.scale.setScalar(ESC); g.add(obj);
      let acesa = null; if (r.prop2) { acesa = r.prop2(); acesa.scale.setScalar(ESC); acesa.visible = false; g.add(acesa); }
      const ic = iconeSprite(r.icone); ic.position.y = r.iy * ESC / 2.2 + 1.2; g.add(ic);
      g.rotation.y = (i % 2 ? 0.5 : -0.4); g.userData = { obj, acesa, icone: ic, y0: ic.position.y, i };
      cena.add(g); props[i] = g; grupos[i] = g; g.visible = false;
      if (r.tipo === 'casa' || r.id === 'caverna') { try { registrarObstaculoCircular(pontos[i].lat, pontos[i].lng, r.id === 'caverna' ? 3.2 : 3.8); } catch (e) {} } // nao da pra atravessar a casa
    });
    // PORTAL = a LARGADA: fica ao lado de onde o Mineu comeca; 
    const portal = new THREE.Group(), pg = PR.portal(); pg.scale.setScalar(ESC); portal.add(pg); portal.userData = { obj: pg, lat: portalPos.lat, lng: portalPos.lng };
    { const dx = (POS.lng - portalPos.lng) * Math.cos(POS.lat * rad), dz = -(POS.lat - portalPos.lat); portal.rotation.y = Math.atan2(dx, dz); } // de frente para o Mineu
    cena.add(portal); try { registrarObstaculoCircular(portalPos.lat, portalPos.lng, 2.6); } catch (e) {}
    // enfeites espalhados no caminho (nao sao pontos): boneco de neve perto da arvore, trenó perto da taberna, presentes na oficina
    const dec = [[5, () => PR.treno(), 7, 130], [1, () => PR.boneco(), 6, -60], [2, () => PR.presente(0xd7263d, 0xffffff), 5, 40], [2, () => PR.presente(0x2f8f4e, 0xd7263d), 5.5, 110]];
    const decs = [];
    dec.forEach(([i, f, dist, ang]) => { const o = f(); o.scale.setScalar(ESC * 0.9); const base = i < 0 ? portalPos : pontos[i]; const q = deslocar(base.lat, base.lng, dist, ang); o.userData = { i, lat: q.lat, lng: q.lng }; o.visible = false; cena.add(o); decs.push(o); });
    return { cena, props, grupos, decs, portal };
  }
  function camada(Mp) {
    const camera = new THREE.Camera(), relogio = new THREE.Clock();
    return {
      id: 'natal-props', type: 'custom', renderingMode: '3d',
      onAdd(map, gl) { this.map = map; this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true }); this.renderer.autoClear = false; },
      render(gl, args) {
        if (!M.ativa) return; const t = relogio.getElapsedTime();
        Mp.grupos.forEach((g, i) => { if (!g) return; const p = M.pontos[i]; g.position.set((p.lng - POS.lng) * 111320 * Math.cos(POS.lat * rad), 0, -((p.lat - POS.lat) * 111320)); const u = g.userData; if (u.obj.userData && u.obj.userData.anima) u.obj.userData.anima(t); u.icone.position.y = u.y0 + Math.sin(t * 2 + i) * 0.35; if (u.acesa) { u.obj.visible = !M.arvoreAcesa; u.acesa.visible = !!M.arvoreAcesa; }
          // icone some quando ja foi feito
          u.icone.visible = i >= M.idx; });
        { const u = Mp.portal.userData; Mp.portal.position.set((u.lng - POS.lng) * 111320 * Math.cos(POS.lat * rad), 0, -((u.lat - POS.lat) * 111320)); if (u.obj.userData.anima) u.obj.userData.anima(t); }
        Mp.decs.forEach((o) => { const u = o.userData; o.visible = u.i <= M.idx; o.position.set((u.lng - POS.lng) * 111320 * Math.cos(POS.lat * rad), 0, -((u.lat - POS.lat) * 111320)); });
        const mc = maplibregl.MercatorCoordinate.fromLngLat([POS.lng, POS.lat], 0), s = mc.meterInMercatorCoordinateUnits();
        const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
        const l = new THREE.Matrix4().makeTranslation(mc.x, mc.y, mc.z).scale(new THREE.Vector3(s, -s, s)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
        camera.projectionMatrix = m.multiply(l);
        this.renderer.resetState(); this.renderer.render(Mp.cena, camera); this.map.triggerRepaint();
      }
    };
  }

  // ================= INICIAR =================
  function iniciar(d, pinos) {
    if (M.ativa) return;
    const nPontos = d.pontos.length;
    if (nPontos !== ROTEIRO.length) { console.warn('[natal] o percurso tem ' + nPontos + ' pontos (precisa de ' + ROTEIRO.length + '): devolvendo ao bloco missaoEnigma'); window.MGO_MISSAO = ENIGMA; if (ENIGMA && ENIGMA.iniciar) ENIGMA.iniciar(d, pinos); return; }
    const cofre = ENIGMA && ENIGMA._gerarCofre ? ENIGMA._gerarCofre(4, 1) : null; if (!cofre) { console.error('[natal] nao consegui gerar o cofre'); return; }
    const portalPos = deslocar(POS.lat, POS.lng, 6, bearing + 50), Mp = montarProps(d.pontos, portalPos);
    M = { ativa: true, pontos: d.pontos, n: ROTEIRO.length - 1, pinos, idx: 0, pecas: 0, intro: false, portal: portalPos, cofre, resolvido: false, props: Mp.grupos, arvoreAcesa: false, luzes: null };
    estiloPinos(); atualizarConta();
    const ligar = () => { if (!mapa.getLayer('natal-props')) mapa.addLayer(camada(Mp)); };
    if (mapa.loaded()) ligar(); else mapa.on('load', ligar);
    console.log('[natal] pronta | senha (so para teste):', cofre.codigo, '| bilhetes:', cofre.pistas.map((p) => p.g + ' ' + p.A + '/' + p.B).join(' · '));
  }
  window.MGO_MISSAO = {
    iniciar, ativa: () => !!M.ativa, pecasCompletas: () => !M.ativa || M.pecas >= 4, faltam: () => (M.ativa ? 4 - M.pecas : 0), exigeSenha: () => !!M.ativa && !M.resolvido, pedirSenha, estado: () => M, _gerarCofre: ENIGMA && ENIGMA._gerarCofre,
    _ir: (n) => { const p = M.pontos[n]; POS.lat = p.lat; POS.lng = p.lng; } // so para teste: teletransporta para o ponto n (0..9)
  };
  const pronto = () => { criarTelas(); setInterval(laco, 500); };
  if (document.body) pronto(); else window.addEventListener('load', pronto);
}
