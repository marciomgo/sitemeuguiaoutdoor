// MODO LIVRE: joystick na tela para andar sem GPS (a "caminhada simulada" do jogo, a mesma das setas do teclado).
// Para cima = anda · para baixo = da re · esquerda/direita = gira (o tiro e a camera seguem para onde o Mineu olha).
// BLOCO joystick (ver blocos/blocos.json). Fica a ESQUERDA, ACIMA dos botoes da pedra (que agora ficam a esquerda do estilingue).
// So aparece quando o jogo ja comecou e NAO esta usando o GPS real (com GPS, voce anda de verdade). Classic script: usa as variaveis do jogo (tecla, modoReal, satelite, jogoIniciado).
(function joystickLivre() {
  var css = document.createElement('style');
  css.textContent = '#joy{position:fixed;left:12px;bottom:104px;width:112px;height:112px;border-radius:50%;background:rgba(255,255,255,.28);border:3px solid rgba(255,255,255,.8);z-index:6;touch-action:none;user-select:none;-webkit-user-select:none;display:none}' +
    '#joyBola{position:absolute;left:50%;top:50%;width:50px;height:50px;margin:-25px 0 0 -25px;border-radius:50%;background:rgba(255,255,255,.95);box-shadow:0 2px 6px rgba(0,0,0,.45);pointer-events:none}' +
    '#joy:before,#joy:after{content:"";position:absolute;background:rgba(255,255,255,.55);pointer-events:none}#joy:before{left:50%;top:10px;bottom:10px;width:2px;margin-left:-1px}#joy:after{top:50%;left:10px;right:10px;height:2px;margin-top:-1px}';
  document.head.appendChild(css);
  var joy = document.createElement('div'); joy.id = 'joy'; joy.setAttribute('aria-label', 'Joystick: anda e gira'); joy.innerHTML = '<div id="joyBola"></div>'; document.body.appendChild(joy);
  var bola = document.getElementById('joyBola'), ativo = null, R = 56;
  function soltar() { ativo = null; bola.style.transform = 'translate(0,0)'; tecla.esq = tecla.dir = tecla.anda = tecla.volta = false; }
  function mover(e) {
    var b = joy.getBoundingClientRect(), dx = (e.clientX - (b.left + b.width / 2)) / R, dy = (e.clientY - (b.top + b.height / 2)) / R, m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    bola.style.transform = 'translate(' + (dx * R * 0.7) + 'px,' + (dy * R * 0.7) + 'px)';
    tecla.esq = dx < -0.3; tecla.dir = dx > 0.3; tecla.anda = dy < -0.3; tecla.volta = dy > 0.3;
  }
  joy.addEventListener('pointerdown', function (e) { ativo = e.pointerId; try { joy.setPointerCapture(e.pointerId); } catch (x) {} mover(e); e.preventDefault(); });
  joy.addEventListener('pointermove', function (e) { if (ativo === e.pointerId) mover(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) { joy.addEventListener(n, function (e) { if (ativo === e.pointerId) soltar(); }); });
  setInterval(function () {
    var mostra = typeof jogoIniciado !== 'undefined' && jogoIniciado && !modoReal && !(typeof satelite !== 'undefined' && satelite);
    joy.style.display = mostra ? 'block' : 'none'; if (!mostra && ativo !== null) soltar();
  }, 300);
})();
