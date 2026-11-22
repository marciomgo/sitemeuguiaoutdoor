// BLOCO pacoteObrigatorio (ver blocos/blocos.json): antes de jogar, o parque precisa estar BAIXADO no celular (mapa + jogo + monstros 3D).
// Por que: mapa em branco/lento por sinal fraco, atraso no meio da luta e a 1a abertura lenta. (Nao resolve travada por esforco do celular: isso a telemetria mede.)
// Regras: o botao de comecar so libera com o pacote inteiro (conferido toda vez que a pagina abre: o iPhone apaga dados de sites parados); saida: "Jogar assim mesmo".
// Usa a API que o modelo expoe: window.MGO_OFFLINE = { baixar, verificar, registro } e o evento 'mgo:offline' (progresso).
(function pacoteObrigatorio() {
  var ESTIMATIVA_MB = 8; // pacote do parque (mapa + jogo + 3D): 6,6 a 7,6 MB nos 5 parques (medido em 22/11/2026); o numero exato aparece depois de baixar.
  var api = window.MGO_OFFLINE, ini = document.getElementById('bInicio'), bx = document.getElementById('bOffline'), msg = document.getElementById('msgOff');
  if (!api || !ini || !bx || !msg) return; // pagina sem botao de baixar: nada a obrigar

  var barra = document.createElement('div'); barra.id = 'barraPacote'; barra.innerHTML = '<i></i>'; msg.parentNode.insertBefore(barra, msg);
  var assim = document.createElement('button'); assim.id = 'bAssimMesmo'; assim.type = 'button'; assim.textContent = 'Jogar assim mesmo (o mapa pode demorar e o jogo pode travar)';
  msg.parentNode.appendChild(assim);
  var preenchimento = barra.firstChild;

  function travar(sim) { ini.disabled = sim; ini.classList.toggle('pacoteTrava', sim); }
  function mostrarBarra(pct) { barra.style.display = pct == null ? 'none' : 'block'; if (pct != null) preenchimento.style.width = pct + '%'; }
  function dataDe(rg) { var d = new Date(rg.t); return d.getDate() + '/' + (d.getMonth() + 1); }

  var MOTIVOS = {
    'nao-baixado': 'Antes de jogar, baixe o parque (cerca de ' + ESTIMATIVA_MB + ' MB). Use o Wi-Fi, se puder.',
    'antigo': 'O parque baixado está velho. Baixe de novo antes de jogar.',
    'mapa-apagado': 'O celular apagou o mapa baixado. Baixe de novo antes de jogar.',
    'arquivos-apagados': 'O celular apagou parte do jogo baixado. Baixe de novo antes de jogar.',
    'incompleto': 'O download ficou incompleto. Baixe de novo.',
    'sem-cache': 'Este navegador não consegue guardar o parque. Você pode jogar assim mesmo.',
    'erro': 'Não consegui conferir o parque baixado. Baixe de novo.'
  };

  async function conferir() {
    var r = await api.verificar();
    if (r.ok) {
      travar(false); assim.style.display = 'none'; mostrarBarra(null); window.__semPacote = false;
      msg.textContent = '✓ Parque pronto (baixado em ' + dataDe(r.registro) + (r.registro.mbTotal ? ', ' + r.registro.mbTotal + ' MB' : '') + '). Pode começar!';
      bx.textContent = '⬇ Baixar de novo (atualizar)'; bx.classList.remove('pacotePrincipal');
    } else {
      travar(true); assim.style.display = 'block'; mostrarBarra(null);
      msg.textContent = MOTIVOS[r.motivo] || MOTIVOS.erro;
      bx.textContent = '⬇ Baixar o parque para jogar'; bx.classList.add('pacotePrincipal');
    }
    return r;
  }

  document.addEventListener('mgo:offline', function (e) { mostrarBarra(e.detail.pct); });
  bx.onclick = async function () { // o bloco passa a conduzir o download: baixa, e depois confere de verdade
    bx.disabled = true; mostrarBarra(0);
    await api.baixar();
    bx.disabled = false;
    var r = await conferir();
    if (!r.ok && r.motivo !== 'nao-baixado') { msg.textContent = 'Não terminou de baixar. Tente de novo com internet.'; }
  };
  assim.onclick = function () { window.__semPacote = true; travar(false); assim.style.display = 'none'; msg.textContent = 'Você escolheu jogar sem baixar o parque. Se o mapa demorar, volte e baixe.'; };

  travar(true); conferir();
})();
