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
  if (DEV) { // sem GPS de verdade (celular incluido): troca o GPS do navegador por um que sempre 'nega', e liga o joystick para andar
    const falso = { watchPosition: function (ok, err) { setTimeout(function () { if (err) err({ code: 1 }); }, 50); return 0; }, getCurrentPosition: function (ok, err) { setTimeout(function () { if (err) err({ code: 1 }); }, 50); }, clearWatch: function () {} };
    try { Object.defineProperty(navigator, 'geolocation', { value: falso, configurable: true }); } catch (e) { try { navigator.geolocation.watchPosition = falso.watchPosition; } catch (e2) {} }
    const js = document.createElement('script'); js.src = 'joystick.js'; document.head.appendChild(js);
    setInterval(function () { try { if (typeof modoReal !== 'undefined' && modoReal) modoReal = false; } catch (e) {} }, 400);
  }
  window.MGO_PESCA_MANUAL = true; // pescaria: so pela vara de pescar caida na beira do lago
  try { if (DADOS.regrasDinamicas && DADOS.regrasDinamicas.itens) Object.assign(DADOS.regrasDinamicas.itens, { curasPorBase: 0, pedrasPorBase: 0, curas: 0, pedras: 0 }); } catch (e) {} // cura = tenda hospital; municao = mamoneiras
  // 10 pontos no percurso (9 bases + o bau) e mais espalhados: so afeta a MONTAGEM do combate neste modo
  try { if (DADOS.regrasDinamicas && DADOS.regrasDinamicas.bases) Object.assign(DADOS.regrasDinamicas.bases, { quantidade: 8, raioMaxDaLargadaM: 320, distMinEntreBasesM: 30, distMinDaLargadaM: 50 }); } catch (e) {}
  const MAMONAS_INICIAIS = 10, rad = Math.PI / 180, CHEGADA_M = 10, GUARDIOES_M = 25, ESC = 2.2;
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
    { tipo: 'bau', id: 'bau', nome: 'Covil do Dragão', img: 'final', icone: '🐉', prop: () => PR.caverna(), iy: 4.2, off: { dist: 5.5, ang: 0 } }, // o BAU fica na entrada da caverna do dragao (o bloco bauFinal desenha o bau; aqui vai a caverna atras dele)
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

  recortar(IMG('mamona'), 1, 0).then((u) => { S.mamona = u; trocarIconeMunicao(); });
  recortar(IMG('vara'), 1, 0).then((u) => { S.vara = u; });
  function trocarIconeMunicao() {
    if (!S.mamona) return; const img = '<img src="' + S.mamona + '" alt="Mamona" style="width:32px;height:32px;object-fit:contain;vertical-align:middle">';
    try { window.MGO_ICONE_MUNICAO = img; const orig = window.iconeArma; if (orig && !orig._mamona) { const novo = (k) => (k === 'normal' ? img : orig(k)); novo._mamona = true; window.iconeArma = novo; } pintaMunicao(); } catch (e) { console.error('[natal] icone mamona', e); }
  }

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
    el.hud = $('div', '', ''); el.hud.id = 'ntHud'; el.cad = $('button', '', '📓<b id="ntConta">0/4</b>'); el.cad.id = 'ntBtnCad'; el.cad.type = 'button';
    el.tela = $('div', '', ''); el.tela.id = 'ntTela'; el.pista = $('div', '', ''); el.pista.id = 'ntPista'; el.caderno = $('div', '', ''); el.caderno.id = 'ntCaderno'; el.senha = $('div', '', ''); el.senha.id = 'ntSenha';
    [el.hud, el.cad, el.tela, el.pista, el.caderno, el.senha].forEach((e) => document.body.appendChild(e));
    el.cad.addEventListener('click', (e) => { e.stopPropagation(); abrirCaderno(); });
    el.alvo = $('div', '', ''); el.alvo.id = 'ntAlvo'; document.body.appendChild(el.alvo);
    el.bMamona = $('button', 'nt-lado', '<img alt="" src="' + IMG('mamona') + '">'); el.bMamona.id = 'ntBtnMamona'; el.bMamona.type = 'button'; el.bMamona.title = 'Caminho ate a mamoneira mais proxima';
    el.bCura = $('button', 'nt-lado', '✚'); el.bCura.id = 'ntBtnCura'; el.bCura.type = 'button'; el.bCura.title = 'Caminho ate a tenda de cura';
    [el.bMamona, el.bCura].forEach((b) => document.body.appendChild(b));
    el.bMamona.addEventListener('click', (e) => { e.stopPropagation(); alternarSecundario('municao'); });
    el.bCura.addEventListener('click', (e) => { e.stopPropagation(); alternarSecundario('cura'); });
    const atirar = document.getElementById('btnAtirar'); if (atirar) atirar.addEventListener('click', () => { if (M.ativa && municao.normal <= 0 && ativa === 'normal') avisarSemMamona(true); });
    el.hud.addEventListener('click', (e) => { e.stopPropagation(); if (M.secundario) { M.secundario = null; msg('Voltando para o próximo ponto.', 2000); atualizarAlvo(); return; } msg(el.hud.getAttribute('data-txt') || '', 3500); }); // toque no icone = mostra o texto completo
    // FLECHA: aponta para a proxima parada (canto superior direito, ao lado dos botoes do mapa). A cor da luz muda com a distancia: gelado -> morninho -> quentinho -> pegando fogo
    setInterval(linhaRota, 200); // linha tracejada ate a proxima parada
    if (DEV) { // painel de teste de casa
      el.dev = $('div', '', '<button type="button" id="ntDevIr" title="Ir à próxima parada">📍</button><button type="button" id="ntDevGuardas" title="Derrotar guardas">⚔️</button><button type="button" id="ntDevNovo" title="Recomeçar">🔄</button>'); el.dev.id = 'ntDev'; document.body.appendChild(el.dev);
      el.dev.addEventListener('click', (e) => e.stopPropagation());
      // teste de casa: pula as telas de "baixar o parque" e "ativar GPS" (sem GPS de verdade o jogo comeca no Parcao)
      let tent = 0; const auto = setInterval(() => { if ((typeof jogoIniciado !== 'undefined' && jogoIniciado) || tent > 60) { clearInterval(auto); return; } if (!M.ativa) return; tent++; const bt = [].find.call(document.querySelectorAll('button'), (b) => /Jogar assim mesmo/.test(b.textContent)); const btVis = bt && bt.offsetParent; if (btVis) bt.click(); const bi = document.getElementById('bInicio'); if (bi && bi.offsetParent && !btVis) bi.click(); }, 500);
      document.getElementById('ntDevIr').onclick = () => { if (!M.ativa) return; const a = alvoSeta(); if (!a) return; const q = deslocar(a.lat, a.lng, 6, 180); ALVO.lat = POS.lat = q.lat; ALVO.lng = POS.lng = q.lng; };
      document.getElementById('ntDevGuardas').onclick = () => { if (!M.ativa) return; const a = alvoSeta(); if (!a) return; inimigos.forEach((e) => { if (!e.vivo) return; if (e.final && M.idx < M.n) return; const dl = (e.lat - a.lat) * 111320, dn = (e.lng - a.lng) * 111320 * Math.cos(a.lat * rad); if (Math.sqrt(dl * dl + dn * dn) <= GUARDIOES_M + 5) acertou(e, 99999); }); };
      document.getElementById('ntDevNovo').onclick = () => { try { localStorage.removeItem('mgo-pesquisa-pendente'); } catch (e) {} location.reload(); };
    }
  }
  function hudIcone(ic, n, longo) { const k = ic + '|' + n; if (el.hud._k !== k) { el.hud._k = k; el.hud.innerHTML = '<span>' + ic + '</span>' + (n ? '<small>' + n + '</small>' : ''); } el.hud.setAttribute('data-txt', longo); }
  function alvoSeta() { // para onde a linha tracejada aponta: o alvo secundario (mamoneira/tenda), senao a proxima luzinha, senao o ponto atual
    if (!M.ativa) return null;
    if (M.secundario) return M.secundario;
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
    rena: ['Rena presa', 'Os ajudantes do dragão prenderam a rena do Tito! Vocês chegaram a tempo e <b>libertaram a rena</b>. Ela sai correndo, feliz, e deixa um rastro de brilho. 🦌✨', 'Continuar'],
    taberna: ['Taberna', 'Que cheirinho bom! Vocês descansam um pouco, tomam um chocolate quente e <b>recuperam toda a vida</b>. ❤️ Dica do Mineu: pensem com calma nos próximos enigmas, as dicas ajudam sem entregar a resposta!', 'Recarregar e seguir'],
    caverna: ['Caminho da caverna', 'Daqui para a frente o chão está queimado: é o <b>território do Dragão Resmungão</b>. Os ajudantes dele estão por aí (cuidado!). O baú está logo à frente!', 'Seguir']
  };
  function abrirIntro() {
    const f = FALAS.largada;
    mostrarTela(cabecalho({ nome: 'O portal do Natal', img: 'portal' }, '') + '<h2 class="nt-h">' + f[0] + '</h2><p class="nt-p">' + f[1] + '</p><div class="ms-bts"><button class="ms-bt ms-ok" type="button" id="ntOk">' + f[2] + '</button></div>', () => {
      document.getElementById('ntOk').onclick = () => { som('ok'); fecharTela(); msg('Sigam a linha tracejada até: ' + ROTEIRO[0].nome + '.', 5000); };
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
  // REGRA (24/11): UM PONTO POR VEZ no mapa. So aparece o ponto atual (pino, marcador 3D, enfeites, obstaculo); os proximos ficam escondidos e os anteriores somem. O bau tambem so aparece no fim.
  const obst = {}; // obstaculos (casas/caverna) so existem enquanto o ponto e o atual
  function obstaculo(i, ligado) {
    const r = ROTEIRO[i], raio = r.tipo === 'casa' ? 3.8 : r.off ? 3.2 : 0; if (!raio) return;
    if (ligado && !obst[i]) { try { const n = obstaculosFixos.length, pp = M.props[i] && M.props[i].userData.pos || M.pontos[i]; registrarObstaculoCircular(pp.lat, pp.lng, raio); obst[i] = obstaculosFixos[n]; } catch (e) {} }
    else if (!ligado && obst[i]) { const k = obstaculosFixos.indexOf(obst[i]); if (k >= 0) obstaculosFixos.splice(k, 1); obst[i] = null; try { quandoMapaPronto(function () { if (carregarObstaculos(POS.lat, POS.lng)) construirGrade(POS.lat, POS.lng); }); } catch (e) {} }
  }
  // Cada monstro pertence a UM ponto (o mais proximo; o chefao final = o bau). So os do ponto atual existem no mapa; os outros ficam guardados (nem aparecem nem andam).
  function distM(a, b) { return Math.hypot((a.lat - b.lat) * 111320, (a.lng - b.lng) * 111320 * Math.cos(a.lat * rad)); }
  function prepararMonstros(pontos) {
    inimigos.forEach((e) => { if (e.final) { e._pt = pontos.length - 1; return; } let k = 0, md = 1e9; pontos.forEach((p, i) => { const d = distM(e, p); if (d < md) { md = d; k = i; } }); e._pt = k; });
    // mini dragoes laranja: 3 no jogo todo, 2 pedradas cada (vida 10), mordida igual a dos outros monstros e um foguinho
    [1, 3, 5].forEach((k, n) => { const p = pontos[k]; if (!p) return; const q = deslocar(p.lat, p.lng, 13, 60 + n * 130); novoInimigo(q.lat, q.lng, 'p-zumbi', '🐲', 10); const e = inimigos[inimigos.length - 1]; e.mini = true; e._pt = k; });
    return inimigos.slice();
  }
  function mostrarMonstros(idx) {
    (M.monstros || []).forEach((e) => {
      const deve = e._pt === idx, no = inimigos.indexOf(e);
      if (deve && no < 0 && e.vivo) { try { if (!livreDeConstrucao(e.lat, e.lng)) { const q = pontoLivrePerto(e.lat, e.lng); if (q) { e.lat = q.lat; e.lng = q.lng; e.el._ll = [q.lng, q.lat]; e.el._mk.setLngLat([q.lng, q.lat]); } } } catch (x) {} inimigos.push(e); e.el._mk.addTo(mapa); }
      else if (!deve) { if (no >= 0) inimigos.splice(no, 1); e.el._mk.remove(); try { if (alvoAtual === e) alvoAtual = null; } catch (x) {} }
    });
  }
  function fogoDosMinis(agora) {
    inimigos.forEach((e) => { if (!e.mini || !e.vivo) return; const d = metrosAte(e.lat, e.lng).d; if (d > 18 || d < 3) return; if (!e.proximoFogo) e.proximoFogo = agora + 3000; else if (agora >= e.proximoFogo && !e.balaEmVoo) { e.proximoFogo = agora + 7000; dispararFogo(e); } });
  }

  // ================= ESTACOES: tenda hospital (cura, meio do percurso) e 2 mamoneiras (municao, 1o e ultimo terco) =================
  function pontoNaRota(rota, f) {
    const seg = []; let total = 0; for (let i = 1; i < rota.length; i++) { const d = distM(rota[i - 1], rota[i]); seg.push(d); total += d; }
    let alvo = total * f; for (let i = 0; i < seg.length; i++) { if (alvo <= seg[i] || i === seg.length - 1) { const k = seg[i] ? Math.min(1, alvo / seg[i]) : 0, a = rota[i], b = rota[i + 1]; return { lat: a.lat + (b.lat - a.lat) * k, lng: a.lng + (b.lng - a.lng) * k, rumo: Math.atan2((b.lng - a.lng) * Math.cos(a.lat * rad), b.lat - a.lat) / rad }; } alvo -= seg[i]; }
    return rota[0];
  }
  function lugarLivre(base, ocupados) {
    for (const d of [9, 13, 17, 22, 28]) for (const lado of [90, -90, 45, -45, 135, -135]) { const q = deslocar(base.lat, base.lng, d, (base.rumo || 0) + lado); let livre = true; try { livre = livreDeConstrucao(q.lat, q.lng); } catch (e) {} if (livre && ocupados.every((o) => distM(q, o) >= 11)) return afastar(q); }
    return deslocar(base.lat, base.lng, 12, (base.rumo || 0) + 90);
  }
  function criarEstacoes(Mp) {
    if (M.estacoes) return; const rota = [M.portal].concat(M.pontos), ocupados = rota.slice(); M.estacoes = [];
    [['cura', 0.5], ['municao', 0.17], ['municao', 0.83]].forEach(([tipo, f]) => {
      const q = lugarLivre(pontoNaRota(rota, f), ocupados); ocupados.push(q);
      const o = tipo === 'cura' ? PR.tendaHospital() : PR.mamoneira(); o.scale.setScalar(ESC * (tipo === 'cura' ? 0.9 : 1.15)); o.userData = { lat: q.lat, lng: q.lng }; Mp.cena.add(o); Mp.estacoes.push(o);
      pino('p-natal-est', tipo === 'cura' ? '<span class="nt-est nt-est-cura">✚</span>' : '<span class="nt-est"><img alt="Mamonas" src="' + (S.mamona || IMG('mamona')) + '"></span>', q.lat, q.lng);
      M.estacoes.push({ tipo, lat: q.lat, lng: q.lng });
    });
  }
  let tickEst = 0, ultimoAvisoEst = 0;
  function usarEstacoes(agora) {
    (M.estacoes || []).forEach((s) => {
      if (metrosAte(s.lat, s.lng).d > 7) return;
      tickEst++;
      if (s.tipo === 'cura') {
        if (vidaMineu < 100) { vidaMineu = Math.min(100, vidaMineu + 12); pintaVidaMineu(); if (agora - ultimoAvisoEst > 1500) { ultimoAvisoEst = agora; msg('❤️ Recuperando a energia na tenda…', 1600); try { tocarTom(523, 784, 160, 'triangle', 0.08); } catch (e) {} } }
        else if (agora - ultimoAvisoEst > 4000) { ultimoAvisoEst = agora; msg('❤️ Energia cheia!', 2000); }
      } else {
        municao.normal += tickEst % 2 ? 1 : 2; pintaMunicao(); // ~3 mamonas por segundo
        if (agora - ultimoAvisoEst > 900) { ultimoAvisoEst = agora; msg('Colhendo mamonas… ' + municao.normal, 1200); try { tocarTom(700, 900, 70, 'sine', 0.06); } catch (e) {} }
      }
    });
  }

  // ================= VARA DE PESCAR caida na beira do lago =================
  function naAgua(lat, lng) { try { return aguas.some((o) => { const w = (o.bb[2] - o.bb[0]) * 111320 * Math.cos(lat * rad), h = (o.bb[3] - o.bb[1]) * 111320; if (Math.max(w, h) < 20 || lng < o.bb[0] || lng > o.bb[2] || lat < o.bb[1] || lat > o.bb[3] || !pontoNoAnel(lng, lat, o.p[0])) return false; return !o.p.slice(1).some((a) => pontoNoAnel(lng, lat, a)); }); } catch (e) { return false; } }
  let ultimaBuscaVara = 0;
  function procurarVara(agora) {
    if (M.vara || agora - ultimaBuscaVara < 3000 || typeof aguas === 'undefined' || !aguas.length) return; ultimaBuscaVara = agora; if (naAgua(POS.lat, POS.lng)) return;
    for (let d = 10; d <= 60; d += 3) for (let a = 0; a < 360; a += 15) {
      const w = deslocar(POS.lat, POS.lng, d, a); if (!naAgua(w.lat, w.lng)) continue;
      const q = deslocar(w.lat, w.lng, 6, a + 180); if (naAgua(q.lat, q.lng)) continue; // 6 m para tras: na margem, em terra
      const e = document.createElement('div'); e.className = 'nt-vara'; e.innerHTML = '<img alt="Vara de pescar" src="' + (S.vara || IMG('vara')) + '">';
      new maplibregl.Marker({ element: e, anchor: 'center', pitchAlignment: 'map', rotationAlignment: 'map' }).setLngLat([q.lng, q.lat]).addTo(mapa);
      M.vara = { lat: q.lat, lng: q.lng, perguntou: false }; return;
    }
  }
  function usarVara() {
    const v = M.vara; if (!v || window.MGO_PESCANDO) return; const d = metrosAte(v.lat, v.lng).d;
    if (d > 12) { v.perguntou = false; return; }
    if (d > 5 || v.perguntou) return; v.perguntou = true;
    mostrarTela('<div class="nt-vara-card"><img alt="" src="' + (S.vara || IMG('vara')) + '"></div><h2 class="nt-h">Vocês acharam uma vara de pescar!</h2><p class="nt-p">Querem passar um tempo pescando e descobrir que peixe pegam? Enquanto pescam, <b>o jogo fica parado</b>: os monstros não atacam.</p><div class="ms-bts"><button class="ms-bt" type="button" id="ntNao">Agora não</button><button class="ms-bt ms-ok" type="button" id="ntPescar">Pescar 🎣</button></div>', () => {
      document.getElementById('ntNao').onclick = () => fecharTela();
      document.getElementById('ntPescar').onclick = () => { fecharTela(); try { if (!window.MGO_PESCA || !window.MGO_PESCA.iniciar()) msg('Cheguem um pouco mais perto da água.', 3000); } catch (e) { console.error('[natal] pesca', e); } };
    });
  }

  // ================= LINHA TRACEJADA ate a proxima parada (no lugar da flecha) =================
  function linhaRota() {
    try {
      if (!M.ativa || !mapa.style) return;
      if (!mapa.getSource('natal-rota')) { if (!mapa.getSource('area-fora')) return; mapa.addSource('natal-rota', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); mapa.addLayer({ id: 'natal-rota', type: 'line', source: 'natal-rota', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#ff3d00', 'line-width': 5, 'line-opacity': 0.9, 'line-dasharray': [0.4, 2] } }); }
      const a = alvoSeta(); let f = [];
      if (a && typeof jogoIniciado !== 'undefined' && jogoIniciado && !M.resolvido) { const d = metrosAte(a.lat, a.lng); if (d.d > 9) { const ini = deslocar(POS.lat, POS.lng, 4, d.ang); f = [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [[ini.lng, ini.lat], [a.lng, a.lat]] } }]; } }
      mapa.getSource('natal-rota').setData({ type: 'FeatureCollection', features: f });
    } catch (e) { if (!window.__rotaErro) { window.__rotaErro = e; console.error('[natal] linha', e); } }
  }

  function alternarSecundario(tipo) {
    if (!M.ativa) return;
    if (M.secundario && M.secundario.tipo === tipo) { M.secundario = null; msg('Voltando para o próximo ponto.', 2000); atualizarAlvo(); return; }
    const lista = (M.estacoes || []).filter((s) => s.tipo === tipo).sort((a, b) => metrosAte(a.lat, a.lng).d - metrosAte(b.lat, b.lng).d);
    if (!lista.length) { msg('Ainda procurando no mapa…', 2000); return; }
    M.secundario = { tipo, lat: lista[0].lat, lng: lista[0].lng };
    msg(tipo === 'cura' ? 'Sigam a linha até a tenda de cura.' : 'Sigam a linha até a mamoneira mais próxima.', 3500); atualizarAlvo();
  }
  function atualizarAlvo() {
    if (!el.alvo || !M.ativa) return;
    const ligado = typeof jogoIniciado !== 'undefined' && jogoIniciado && !(typeof celebrou !== 'undefined' && celebrou) && !M.resolvido;
    [el.alvo, el.bMamona, el.bCura].forEach((e) => { e.style.display = ligado ? '' : 'none'; });
    if (!ligado) return;
    const a = alvoSeta(); if (!a) return; const d = Math.round(metrosAte(a.lat, a.lng).d);
    const nome = M.secundario ? (M.secundario.tipo === 'cura' ? '✚ Tenda de cura' : '🌿 Mamoneira') : (M.luzes && !M.luzes.concluida && M.luzes.idx === M.idx ? '⭐ Luzinha' : '🎯 ' + ROTEIRO[Math.min(M.idx, ROTEIRO.length - 1)].nome);
    const txt = nome + ' · ' + (d > 999 ? Math.round(d / 100) / 10 + ' km' : d + ' m');
    if (el.alvo.textContent !== txt) el.alvo.textContent = txt;
    el.alvo.classList.toggle('sec', !!M.secundario);
    el.bMamona.classList.toggle('sel', !!M.secundario && M.secundario.tipo === 'municao');
    el.bCura.classList.toggle('sel', !!M.secundario && M.secundario.tipo === 'cura');
    el.bMamona.classList.toggle('vazio', municao.normal <= 0);
  }
  // chegou na mamoneira/tenda: o alvo secundario acabou, a linha volta para o proximo ponto
  function conferirSecundario() { const s = M.secundario; if (s && metrosAte(s.lat, s.lng).d <= 7) { M.secundario = null; atualizarAlvo(); } }
  // so aparecem as bombas dentro do alcance de visao (o mesmo do tiro): o resto se descobre explorando
  function bombasNoAlcance() { document.querySelectorAll('.pino.p-bomba').forEach((e) => { if (!e._ll) return; e.style.visibility = metrosAte(e._ll[1], e._ll[0]).d <= ALCANCE_TIRO_M ? '' : 'hidden'; }); }
  // desenho da mamoneira (o mesmo modelo 3D, fotografado uma vez) para o aviso
  let fotoArvore = '';
  function desenhoDaArvore() {
    if (fotoArvore) return fotoArvore;
    try {
      const rd = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); rd.setSize(360, 360);
      const cena = new THREE.Scene(); cena.add(new THREE.AmbientLight(0xffffff, 1.8)); const luz = new THREE.DirectionalLight(0xfff0d8, 2); luz.position.set(3, 6, 5); cena.add(luz); cena.add(PR.mamoneira());
      const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 50); cam.position.set(0, 2.9, 5.8); cam.lookAt(0, 1.7, 0); rd.render(cena, cam);
      fotoArvore = rd.domElement.toDataURL('image/png'); rd.dispose(); if (rd.forceContextLoss) rd.forceContextLoss();
    } catch (e) { console.error('[natal] desenho da arvore', e); fotoArvore = IMG('mamona'); }
    return fotoArvore;
  }
  let ultimoAvisoSem = 0;
  function avisarSemMamona(forcar) {
    if (window.MGO_DESAFIO || window.MGO_PESCANDO) return; const agora = performance.now(); if (!forcar && M.avisouSemMamona) return; if (forcar && agora - ultimoAvisoSem < 3000) return; M.avisouSemMamona = true; ultimoAvisoSem = agora;
    mostrarTela('<div class="nt-arvore"><img alt="Mamoneira" src="' + desenhoDaArvore() + '"></div><h2 class="nt-h">As mamonas acabaram!</h2><p class="nt-p">Procurem uma <b>mamoneira</b> como esta e fiquem perto dela para colher mais.</p><div class="ms-bts"><button class="ms-bt" type="button" id="ntNao">Depois</button><button class="ms-bt ms-ok" type="button" id="ntLevar">Mostrar o caminho</button></div>', () => {
      document.getElementById('ntNao').onclick = () => { fecharTela(); ultimoAvisoSem = performance.now(); };
      document.getElementById('ntLevar').onclick = () => { fecharTela(); ultimoAvisoSem = performance.now(); if (!M.secundario || M.secundario.tipo !== 'municao') alternarSecundario('municao'); };
    });
  }

  function estiloPinos() {
    mostrarMonstros(M.idx);
    M.pinos.forEach((p, i) => { if (!p) return; p.classList.remove('ms-feito'); if (i === M.idx) { p.style.display = ''; p.classList.add('ms-ativo'); } else { p.style.display = 'none'; p.classList.remove('ms-ativo'); } });
    M.props.forEach((g, i) => { if (g) g.visible = i === M.idx; });
    ROTEIRO.forEach((r, i) => obstaculo(i, i === M.idx));
    try { if (window.MGO_BAU && MGO_BAU.ocultar) MGO_BAU.ocultar(M.idx < M.n); } catch (e) {}
  }
  function avancar(i) {
    M.secundario = null; M.idx = i + 1; estiloPinos(); atualizarAlvo();
    if (M.idx >= M.n) msg('🎉 Todos os bilhetes! Derrote o Dragão Resmungão e vá ao baú 🧰 para digitar a senha.', 7000);
    else msg('Muito bem! Próximo ponto: ' + ROTEIRO[M.idx].nome + '.', 4500);
  }
  let avisouGuard = 0;
  function laco() {
    try {
      if (!M.ativa || typeof jogoIniciado === 'undefined' || !jogoIniciado || (typeof celebrou !== 'undefined' && celebrou)) { el.hud.style.display = 'none'; el.cad.style.display = 'none'; atualizarAlvo(); return; }
      el.cad.style.display = 'block'; el.hud.style.display = 'block';
      if (!M.intro && !window.MGO_DESAFIO) { M.intro = true; abrirIntro(); }
      { const agora = performance.now(); if (!window.MGO_DESAFIO && !window.MGO_PESCANDO) { usarEstacoes(agora); fogoDosMinis(agora); procurarVara(agora); usarVara(); } }
      conferirSecundario(); atualizarAlvo(); bombasNoAlcance();
      if (municao.normal > 0) M.avisouSemMamona = false; else avisarSemMamona(false);
      laçoLuzes();
      if (M.idx < M.n) {
        const p = M.pontos[M.idx], r = ROTEIRO[M.idx], d = Math.round(metrosAte(p.lat, p.lng).d), luzes = M.luzes && M.luzes.idx === M.idx && !M.luzes.concluida;
        { const longo = luzes ? '⭐ Luzinhas ' + M.luzes.n + '/3' : '🎯 Ponto ' + (M.idx + 1) + ' de ' + M.pontos.length + ' · ' + r.nome + ' · ' + (d > 999 ? Math.round(d / 100) / 10 + ' km' : d + ' m'); hudIcone(luzes ? '⭐' : '🎯', luzes ? M.luzes.n + '/3' : (M.idx + 1) + '/' + M.pontos.length, longo); }
        if (!window.MGO_DESAFIO && !window.MGO_PESCANDO && !luzes && d <= CHEGADA_M) {
          // REGRA (24/11): os monstros NAO travam a missao; podem ser ignorados. Chegou perto, abre.
          if (r.tipo === 'casa') CASAS[r.id](r, M.idx); else if (r.tipo === 'passagem') passagem(r, M.idx);
        }
      } else hudIcone('🧰', '', M.resolvido ? '🧰 Baú aberto!' : '🧰 Vá ao baú (derrote o Dragão Resmungão)');
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
      g.rotation.y = r.off ? 0 : (i % 2 ? 0.5 : -0.4); g.userData = { obj, acesa, icone: ic, y0: ic.position.y, i, off: r.off || null, pos: null }; // (caverna: de frente para quem chega pelo sul)
      if (r.off) g.userData.pos = deslocar(pontos[i].lat, pontos[i].lng, r.off.dist, r.off.ang);
      cena.add(g); props[i] = g; grupos[i] = g; g.visible = false;
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
        Mp.grupos.forEach((g, i) => { if (!g) return; const p = g.userData.pos || M.pontos[i]; g.position.set((p.lng - POS.lng) * 111320 * Math.cos(POS.lat * rad), 0, -((p.lat - POS.lat) * 111320)); const u = g.userData; if (u.obj.userData && u.obj.userData.anima) u.obj.userData.anima(t); u.icone.position.y = u.y0 + Math.sin(t * 2 + i) * 0.35; if (u.acesa) { u.obj.visible = !M.arvoreAcesa; u.acesa.visible = !!M.arvoreAcesa; }
          // icone some quando ja foi feito
          u.icone.visible = i >= M.idx; });
        { const u = Mp.portal.userData; Mp.portal.position.set((u.lng - POS.lng) * 111320 * Math.cos(POS.lat * rad), 0, -((u.lat - POS.lat) * 111320)); if (u.obj.userData.anima) u.obj.userData.anima(t); }
        (Mp.estacoes || []).forEach((o) => { const u = o.userData; o.position.set((u.lng - POS.lng) * 111320 * Math.cos(POS.lat * rad), 0, -((u.lat - POS.lat) * 111320)); });
        Mp.decs.forEach((o) => { const u = o.userData; o.visible = u.i === M.idx; o.position.set((u.lng - POS.lng) * 111320 * Math.cos(POS.lat * rad), 0, -((u.lat - POS.lat) * 111320)); });
        const mc = maplibregl.MercatorCoordinate.fromLngLat([POS.lng, POS.lat], 0), s = mc.meterInMercatorCoordinateUnits();
        const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
        const l = new THREE.Matrix4().makeTranslation(mc.x, mc.y, mc.z).scale(new THREE.Vector3(s, -s, s)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
        camera.projectionMatrix = m.multiply(l);
        this.renderer.resetState(); this.renderer.render(Mp.cena, camera); this.map.triggerRepaint();
      }
    };
  }

  // ================= INICIAR =================
  const DIST_MARCO_M = 14; // a rocha com o logo MGO ocupa o meio do parque: nenhum ponto/portal pode nascer em cima dela
  function afastar(p) { try { const m = DADOS.marco; if (!m || isNaN(m.lat)) return p; const dl = (p.lat - m.lat) * 111320, dn = (p.lng - m.lng) * 111320 * Math.cos(m.lat * rad), d = Math.hypot(dl, dn); if (d >= DIST_MARCO_M) return p; const ang = d < 0.5 ? 0 : Math.atan2(dn, dl) / rad; return deslocar(m.lat, m.lng, DIST_MARCO_M, ang); } catch (e) { return p; } }
  function afastarDoMarco(d, pinos) {
    d.pontos.forEach((p, i) => { const q = afastar(p); if (q.lat === p.lat && q.lng === p.lng) return; p.lat = q.lat; p.lng = q.lng; const pin = pinos && pinos[i]; try { if (pin && pin._mk) { pin._mk.setLngLat([q.lng, q.lat]); pin._ll = [q.lng, q.lat]; } } catch (e) {} if (i === d.pontos.length - 1) { try { MGO_BAU.colocar(q.lat, q.lng); } catch (e) {} } });
  }
  function iniciar(d, pinos) {
    if (M.ativa) return;
    const nPontos = d.pontos.length;
    if (nPontos !== ROTEIRO.length) { console.warn('[natal] o percurso tem ' + nPontos + ' pontos (precisa de ' + ROTEIRO.length + '): devolvendo ao bloco missaoEnigma'); window.MGO_MISSAO = ENIGMA; if (ENIGMA && ENIGMA.iniciar) ENIGMA.iniciar(d, pinos); return; }
    const cofre = ENIGMA && ENIGMA._gerarCofre ? ENIGMA._gerarCofre(4, 1) : null; if (!cofre) { console.error('[natal] nao consegui gerar o cofre'); return; }
    afastarDoMarco(d, pinos);
    const portalPos = afastar(deslocar(POS.lat, POS.lng, 6, bearing + 50)), Mp = montarProps(d.pontos, portalPos);
    M = { ativa: true, pontos: d.pontos, n: ROTEIRO.length - 1, pinos, idx: 0, pecas: 0, intro: false, portal: portalPos, cofre, resolvido: false, props: Mp.grupos, arvoreAcesa: false, luzes: null };
    M.monstros = prepararMonstros(d.pontos); Mp.estacoes = [];
    estiloPinos(); atualizarConta();
    try { municao.normal = MAMONAS_INICIAIS; pintaMunicao(); } catch (e) {}
    try { zoom = 20.6; } catch (e) {} // zoom de perto: um passo antes do maximo (21)
    quandoMapaPronto(() => setTimeout(() => criarEstacoes(Mp), 600));
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
