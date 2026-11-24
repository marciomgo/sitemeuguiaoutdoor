// BLOCO pesca (ver blocos/blocos.json): PESCARIA no lago, como acao extra tranquila (parques e modo livre que tenham agua por perto).
// Ideia do Marcio: pescar o tempo que quiser; o peixe demora ate alguns MINUTOS; serve para ter paciencia, conversar com o Mineu/pai e olhar o parque ao redor. A recompensa e o PEIXE (+ um pouco de vida).
// Fluxo: perto da agua (4 a 30 m da margem, nunca na beira) aparece o botao Pescar -> o Mineu fica com a VARINHA apontada para o lago, a boia aparece na agua e os monstros fazem uma pausa ->
// depois de uns minutos a boia balanca e aparece PUXAR! (4,5 s) -> peixe (cartao com nome, curiosidade e +vida). Dicas de conversa aparecem de tempos em tempos. Se se afastar ou tocar em Parar, a pescaria acaba.
// Usa do jogo: POS, mapa, aguas (poligonos de agua), pontoNoAnel, deslocar, elMineu, elInterno, aviso, tocarTom, vidaMineu, pintaVidaMineu, jogoIniciado, celebrou, maplibregl.
// Teste rapido: abra o jogo com ?pesca=rapido (espera de 4 a 8 s).
(function pesca() {
  var rapido = /[?&]pesca=rapido/.test(location.search);
  var CFG = { esperaMin: rapido ? 4 : 90, esperaMax: rapido ? 8 : 240, janelaMs: 4500, alcanceMin: 4, alcanceMax: 30, afastaMax: 16, dicaMin: rapido ? 9 : 40, dicaMax: rapido ? 14 : 75, tamanhoMinLago: 20 };
  var PEIXES = [
    { n: 'Lambari', e: '🐟', p: 38, v: 10, f: 'O lambari é pequenininho e anda sempre em grupo.' },
    { n: 'Tilápia', e: '🐠', p: 28, v: 12, f: 'A tilápia gosta de água quentinha e cuida dos filhotes na boca!' },
    { n: 'Traíra', e: '🐟', p: 16, v: 15, f: 'A traíra é caçadora: fica escondida esperando a hora certa.' },
    { n: 'Pacu', e: '🐡', p: 12, v: 15, f: 'O pacu tem dentes parecidos com os nossos e adora frutas que caem na água.' },
    { n: 'Dourado', e: '🐠', p: 6, v: 25, f: 'O dourado é chamado de "rei do rio". Que sorte a sua!', raro: true }
  ];
  var DICAS = [
    'Olhe em volta: que passarinho você consegue ver daqui?', 'Perguntem um para o outro: qual é o peixe preferido de vocês?', 'Fechem os olhos por 5 segundos: que sons vocês ouvem?',
    'Quantas árvores diferentes dá para contar daqui?', 'Que nome vocês dariam para o peixe que vai morder?', 'Alguém sabe por que o lago tem ondinhas? Conversem!',
    'Procurem uma nuvem com formato de bicho.', 'Quem fica mais tempo parado sem se mexer: o Mineu ou o papai?', 'Que cheiro tem o parque agora?', 'Contem uma coisa legal que aconteceu hoje.'
  ];
  var bloqueioClique = 0, estado = 'livre', inicio = null, boia = null, mkBoia = null, ponto = null, tMordida = 0, tJanela = 0, tDica = 0, n = 0, dicaAte = 0;
  var el = {}; // elementos de tela

  // ---------- agua perto (usa os poligonos de agua que o jogo ja carrega) ----------
  function grande(o) { if (o._grande === undefined) { var w = (o.bb[2] - o.bb[0]) * 111320 * Math.cos(POS.lat * Math.PI / 180), h = (o.bb[3] - o.bb[1]) * 111320; o._grande = Math.max(w, h) >= CFG.tamanhoMinLago; } return o._grande; }
  function emAgua(lat, lng) {
    if (typeof aguas === 'undefined') return false;
    for (var k = 0; k < aguas.length; k++) {
      var o = aguas[k]; if (!grande(o) || lng < o.bb[0] || lng > o.bb[2] || lat < o.bb[1] || lat > o.bb[3] || !pontoNoAnel(lng, lat, o.p[0])) continue;
      var buraco = false; for (var h = 1; h < o.p.length; h++) { if (pontoNoAnel(lng, lat, o.p[h])) { buraco = true; break; } }
      if (!buraco) return true;
    }
    return false;
  }
  function aguaPerto() { // a agua mais proxima numa grade de raios (a cada ~4 m): { d, lat, lng, ang } ou null
    if (typeof aguas === 'undefined' || !aguas.length || emAgua(POS.lat, POS.lng)) return null;
    for (var r = CFG.alcanceMin; r <= CFG.alcanceMax; r += 4) for (var a = 0; a < 360; a += 15) { var q = deslocar(POS.lat, POS.lng, r, a); if (emAgua(q.lat, q.lng)) return { d: r, lat: q.lat, lng: q.lng, ang: a }; }
    return null;
  }

  // ---------- tela ----------
  function criar() {
    el.btn = document.createElement('button'); el.btn.id = 'btnPescar'; el.btn.type = 'button'; document.body.appendChild(el.btn);
    el.faixa = document.createElement('div'); el.faixa.id = 'pescaFaixa'; document.body.appendChild(el.faixa);
    el.card = document.createElement('div'); el.card.id = 'pescaCard'; document.body.appendChild(el.card);
    el.btn.addEventListener('click', function (e) { e.stopPropagation(); clique(); });
    // varinha de pescar: desenho em vetor na mao do Mineu (igual ao galho), gira para apontar para a boia; a ponta (#varinhaPonta) serve para ligar a linha
    el.rod = document.createElement('div'); el.rod.id = 'varinhaMineu';
    el.rod.style.cssText = 'position:absolute;right:-20px;bottom:34px;width:22px;height:150px;transform-origin:50% 94%;pointer-events:none;display:none;filter:drop-shadow(0 2px 2px rgba(0,0,0,.45))';
    el.rod.innerHTML = '<svg viewBox="0 0 22 150" width="22" height="150" xmlns="http://www.w3.org/2000/svg"><path d="M11 146 L11 6" stroke="#4a2c12" stroke-width="5.5" stroke-linecap="round"/><path d="M11 146 L11 6" stroke="#b98450" stroke-width="3" stroke-linecap="round"/><rect x="6" y="104" width="10" height="26" rx="4" fill="#37474f" stroke="#102027" stroke-width="1.5"/><circle cx="11" cy="117" r="3.2" fill="#cfd8dc"/><path d="M11 6 L11 2" stroke="#4a2c12" stroke-width="2" stroke-linecap="round"/></svg><div id="varinhaPonta" style="position:absolute;left:10px;top:0;width:2px;height:2px"></div>';
    var interno = (typeof elInterno !== 'undefined') ? elInterno : elMineu.querySelector('.interno'); interno.appendChild(el.rod);
    // linha da varinha ate a boia (desenhada por cima do mapa)
    el.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); el.svg.setAttribute('style', 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:6;display:none');
    el.linha = document.createElementNS('http://www.w3.org/2000/svg', 'line'); el.linha.setAttribute('stroke', 'rgba(255,255,255,.9)'); el.linha.setAttribute('stroke-width', '1.6'); el.svg.appendChild(el.linha); document.body.appendChild(el.svg);
  }
  function pintaBotao(modo, d) {
    if (!modo) { el.btn.style.display = 'none'; return; }
    el.btn.style.display = 'block'; el.btn.className = modo === 'parar' ? 'parar' : (modo === 'puxar' ? 'puxar' : '');
    el.btn.innerHTML = modo === 'pescar' ? '<span>🎣</span><small>Pescar</small>' : modo === 'puxar' ? '<span>🎣</span><small>PUXAR!</small>' : '<span>✋</span><small>Parar</small>';
  }
  function dizer(t, ms) { try { aviso(t); dicaAte = performance.now() + (ms || 6000); } catch (e) {} }
  function sortear(min, max) { return (min + Math.random() * (max - min)) * 1000; }
  function peixeSorteado() { var s = 0, r; PEIXES.forEach(function (p) { s += p.p; }); r = Math.random() * s; for (var i = 0; i < PEIXES.length; i++) { r -= PEIXES[i].p; if (r <= 0) return PEIXES[i]; } return PEIXES[0]; }
  function som(tipo) {
    try {
      if (tipo === 'mordeu') { tocarTom(520, 260, 140, 'sine', 0.12); setTimeout(function () { tocarTom(640, 300, 120, 'sine', 0.1); }, 170); }
      else if (tipo === 'pegou') { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { tocarTom(f, f, 170, 'triangle', 0.1); }, i * 110); }); }
      else if (tipo === 'fugiu') { tocarTom(300, 120, 260, 'sine', 0.1); }
      else if (tipo === 'joga') { tocarTom(700, 200, 220, 'sine', 0.08); }
    } catch (e) {}
  }

  // ---------- estados ----------
  function iniciar(a) {
    if (estado !== 'livre' || !a) return;
    estado = 'pescando'; inicio = { lat: POS.lat, lng: POS.lng }; ponto = deslocar(a.lat, a.lng, 3, a.ang); if (!emAgua(ponto.lat, ponto.lng)) ponto = { lat: a.lat, lng: a.lng };
    window.MGO_PESCANDO = true; // o jogo pausa os monstros enquanto pesca
    var d = document.createElement('div'); d.className = 'pesca-boia'; d.innerHTML = '<span>🔴</span>'; boia = d;
    mkBoia = new maplibregl.Marker({ element: d, anchor: 'center', pitchAlignment: 'viewport', rotationAlignment: 'viewport' }).setLngLat([ponto.lng, ponto.lat]).addTo(mapa);
    el.rod.style.display = 'block'; el.svg.style.display = 'block'; som('joga');
    tMordida = performance.now() + sortear(CFG.esperaMin, CFG.esperaMax); tDica = performance.now() + sortear(CFG.dicaMin / 2, CFG.dicaMax / 2);
    dizer('🎣 Pescando... os monstros fizeram uma pausa. Tenha paciência!', 5000);
  }
  function parar(msg) {
    if (estado === 'livre') return; estado = 'livre'; window.MGO_PESCANDO = false;
    if (mkBoia) { mkBoia.remove(); mkBoia = null; } boia = null; el.rod.style.display = 'none'; el.svg.style.display = 'none'; el.faixa.style.display = 'none'; fechaCard();
    if (msg) dizer(msg, 3500); else { try { aviso(''); } catch (e) {} }
  }
  function mordeu() { estado = 'mordeu'; tJanela = performance.now() + CFG.janelaMs; boia.classList.add('mordeu'); pintaBotao('puxar'); som('mordeu'); if (navigator.vibrate) { try { navigator.vibrate([90, 60, 90]); } catch (e) {} } dizer('🐟 Mordeu! Toque em PUXAR!', CFG.janelaMs); }
  function puxar() {
    var p = peixeSorteado(); n++; var antes = vidaMineu; vidaMineu = Math.min(100, vidaMineu + p.v); pintaVidaMineu(); var ganhou = Math.round(vidaMineu - antes);
    estado = 'cartao'; boia.classList.remove('mordeu'); som('pegou'); if (navigator.vibrate) { try { navigator.vibrate(80); } catch (e) {} } try { aviso(''); } catch (e) {}
    el.card.innerHTML = '<div class="pc"><div class="pc-peixe">' + p.e + '</div>' + (p.raro ? '<div class="pc-raro">✨ Peixe raro!</div>' : '') + '<h2>Você pescou um ' + p.n + '!</h2><p>' + p.f + '</p><p class="pc-vida">' + (ganhou > 0 ? '+' + ganhou + ' de vida ❤️' : 'Sua vida já está cheia! 💪') + '</p><div class="pc-total">Peixes pescados: ' + n + '</div><div class="pc-botoes"><button class="pc-continua" type="button">Continuar pescando</button><button class="pc-para" type="button">Parar</button></div></div>';
    el.card.style.display = 'flex';
    el.card.querySelector('.pc-continua').onclick = function () { fechaCard(); estado = 'pescando'; tMordida = performance.now() + sortear(CFG.esperaMin, CFG.esperaMax); };
    el.card.querySelector('.pc-para').onclick = function () { parar(); };
  }
  function fechaCard() { el.card.style.display = 'none'; el.card.innerHTML = ''; }
  function clique() {
    if (performance.now() < bloqueioClique) return; // toque logo depois do peixe fugir: ignora (nao encerra a pescaria por engano)
    if (estado === 'livre') { var a = aguaPerto(); if (a) iniciar(a); }
    else if (estado === 'pescando') parar('Pescaria encerrada. Volte quando quiser!');
    else if (estado === 'mordeu') puxar();
  }

  // ---------- varinha apontada para a boia + linha ----------
  function apontar() {
    if (!boia || !mkBoia) return;
    var rm = elMineu.getBoundingClientRect(), pb = mapa.project([ponto.lng, ponto.lat]), cv = mapa.getCanvas().getBoundingClientRect();
    var bx = cv.left + pb.x, by = cv.top + pb.y, mx = rm.left + rm.width / 2, my = rm.bottom - Math.min(rm.height * 0.45, 60);
    var ang = Math.atan2(bx - mx, my - by) * 180 / Math.PI; // 0 = para cima; positivo = para a direita
    ang = Math.max(-70, Math.min(70, ang * 0.6)); /* a vara aponta para cima e para o lado do lago (como quem pesca), a linha cai ate a boia */ el.rod.style.transform = 'rotate(' + ang.toFixed(1) + 'deg)';
    var pt = el.rod.querySelector('#varinhaPonta').getBoundingClientRect();
    el.linha.setAttribute('x1', pt.left + 1); el.linha.setAttribute('y1', pt.top + 1); el.linha.setAttribute('x2', bx); el.linha.setAttribute('y2', by);
  }

  // ---------- relogio ----------
  function volta() {
    var agora = performance.now();
    try {
      if (typeof jogoIniciado === 'undefined' || !jogoIniciado || (typeof celebrou !== 'undefined' && celebrou)) { if (estado !== 'livre') parar(); pintaBotao(null); return; }
      if (dicaAte && agora > dicaAte) { dicaAte = 0; try { aviso(''); } catch (e) {} }
      if (estado === 'livre') {
        if (typeof satelite !== 'undefined' && satelite) { pintaBotao(null); return; }
        pintaBotao(aguaPerto() ? 'pescar' : null);
      } else {
        var dl = (POS.lat - inicio.lat) * 111320, dn = (POS.lng - inicio.lng) * 111320 * Math.cos(POS.lat * Math.PI / 180);
        if (Math.sqrt(dl * dl + dn * dn) > CFG.afastaMax) { parar('Você se afastou do lago: pescaria encerrada.'); pintaBotao(null); return; }
        el.faixa.style.display = estado === 'cartao' ? 'none' : 'block'; el.faixa.textContent = estado === 'mordeu' ? '🐟 Mordeu!' : '🎣 Pescando... paciência! Peixes: ' + n;
        pintaBotao(estado === 'mordeu' ? 'puxar' : estado === 'cartao' ? null : 'parar');
        if (estado === 'pescando') {
          if (agora >= tMordida) mordeu();
          else if (agora >= tDica) { dizer('💬 ' + DICAS[Math.floor(Math.random() * DICAS.length)], 7000); tDica = agora + sortear(CFG.dicaMin, CFG.dicaMax); }
        } else if (estado === 'mordeu' && agora >= tJanela) { boia.classList.remove('mordeu'); som('fugiu'); estado = 'pescando'; pintaBotao('parar'); bloqueioClique = agora + 1500; tMordida = agora + sortear(CFG.esperaMin * 0.6, CFG.esperaMax * 0.6); dizer('O peixe fugiu... Calma, outro vem! 🐟', 4000); }
      }
    } catch (e) { if (!window.__pescaErro) { window.__pescaErro = e; console.error('[pesca]', e); } }
  }
  function ligarTudo() { criar(); setInterval(volta, 400); (function quadro() { if (estado !== 'livre') { try { apontar(); } catch (e) {} } requestAnimationFrame(quadro); })(); }
  if (typeof elMineu !== 'undefined') ligarTudo(); else window.addEventListener('load', ligarTudo);
  window.MGO_PESCA = { cfg: CFG, estado: function () { return estado; }, peixes: function () { return n; }, iniciar: function () { var a = aguaPerto(); if (a) iniciar(a); return !!a; }, forcarMordida: function () { if (estado === 'pescando') mordeu(); }, aguaPerto: aguaPerto, parar: parar };
})();
