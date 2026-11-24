// BLOCO marcoMoeda (ver blocos/blocos.json): o MARCO do parque (e do modo livre). Uma rocha alta (Kenney Nature Kit, CC0: rock_tallB) no MEIO do parque, com o LOGO do MGO (no lugar da moeda de ouro) girando e flutuando em cima.
// O lugar vem do build (DADOS.marco = centro do terreno seguro do parque). Por enquanto e so enfeite/referencia (aparece tambem um pino no mapa); nao muda regra nenhuma do jogo.
// Roda como modulo DEPOIS do script do jogo (usa POS, DADOS, pino). Mesma tecnica 3D dos blocos monstros3d e bauFinal.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const ARQ = 'modelos/rock_tallB.glb', LOGO = 'modelos/logo-mgo-recortado.png', ESCALA_ROCHA = 11, LARGURA_LOGO = 6.4, RAIO_MOEDA = LARGURA_LOGO / 4 /* metade da altura do logo (proporcao 2:1) */, DIST_ESCONDE_PINO_M = 30, RAIO_BLOQUEIO_M = 4.3 /* pegada da montanha no chao */;
const rad = Math.PI / 180;
// parques: o lugar vem do build (DADOS.marco). Modo livre: nao ha parque; o marco aparece a ~24 m de onde a pessoa esta quando o jogo comeca (uma vez por sessao).
if (typeof DADOS !== 'undefined' && DADOS.marco) iniciar(DADOS.marco, false);
else if (typeof DADOS !== 'undefined' && DADOS.livre) iniciar({ lat: NaN, lng: NaN }, true);

function iniciar(marco, esperaJogo) {
  const cena = new THREE.Scene();
  cena.add(new THREE.AmbientLight(0xffffff, 2.4));
  const sol = new THREE.DirectionalLight(0xffffff, 1.5); sol.position.set(-20, 40, 30); cena.add(sol);
  const camera = new THREE.Camera(), relogio = new THREE.Clock();
  const grupo = new THREE.Group(); cena.add(grupo); grupo.visible = false;
  let pontosRocha = null, alturaRocha = 4, moeda = null, modeloPronto = false, posPronta = !esperaJogo, pinoFeito = false;
  let bloqueou = false;
  const mostrar = () => { // so aparece com o modelo carregado E o lugar definido
    if (!modeloPronto || !posPronta) return; grupo.visible = true;
    if (!bloqueou) { bloqueou = true; try { registrarObstaculoCircular(marco.lat, marco.lng, RAIO_BLOQUEIO_M); } catch (e) { console.error('[marco] nao consegui registrar o obstaculo', e); } } /* a montanha NAO pode ser atravessada: jogador e monstros dao a volta */
    if (!pinoFeito) { pinoFeito = true; try { pino('p-ponto p-marco', '<img src="' + LOGO + '" alt="Marco" style="width:60px;height:30px">', marco.lat, marco.lng); } catch (e) {} } // pino no mapa para o jogador saber onde fica
    console.log('[marco] pronto | altura', alturaRocha.toFixed(2), 'm | em', marco.lat, marco.lng); mapa.triggerRepaint();
  };
  if (esperaJogo) { const espera = setInterval(() => { if (typeof jogoIniciado !== 'undefined' && jogoIniciado) { clearInterval(espera); const p = deslocar(POS.lat, POS.lng, 24, Math.random() * 360); marco.lat = p.lat; marco.lng = p.lng; posPronta = true; mostrar(); } }, 500); }

  // o LOGO do MGO no lugar da moeda: dois planos costas com costas (para ler certo dos dois lados), sem iluminacao (cores fieis), fundo transparente; gira em torno do eixo vertical
  moeda = new THREE.Group();
  const tex = new THREE.TextureLoader().load(LOGO); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const matLogo = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.FrontSide });
  const frente = new THREE.Mesh(new THREE.PlaneGeometry(LARGURA_LOGO, LARGURA_LOGO / 2), matLogo); frente.position.z = 0.03;
  const costas = frente.clone(); costas.rotation.y = Math.PI; costas.position.z = -0.03;
  moeda.add(frente, costas); grupo.add(moeda);

  new GLTFLoader().load(ARQ, (g) => {
    g.scene.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => { m.metalness = 0.05; m.roughness = 0.95; const cor = { dirt: 0x9a8f80, grass: 0x6b9a45 }[m.name]; m.color.set(cor !== undefined ? cor : 0xb9b4ab); /* tons de pedra e musgo (as cores originais do modelo ficavam rosa e azul) */ m.needsUpdate = true; }); });
    g.scene.scale.setScalar(ESCALA_ROCHA); grupo.add(g.scene);
    g.scene.updateMatrixWorld(true); alturaRocha = new THREE.Box3().setFromObject(g.scene).max.y;
    // vertices da rocha (relativos ao centro dela, em metros): servem para calcular o CONTORNO dela na tela e fazer ela tapar o Mineu (que e 2D, nao tem profundidade)
    { const v = new THREE.Vector3(), todos = []; g.scene.traverse((o) => { if (o.isMesh) { const pos = o.geometry.attributes.position; for (let i = 0; i < pos.count; i += 1) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); todos.push(v.x, v.y, v.z); } } }); pontosRocha = new Float32Array(todos); }
    modeloPronto = true; mostrar();
  }, undefined, (e) => console.error('[marco] erro ao carregar a rocha', e));

  // ---- OCLUSAO: a rocha tapa quem esta ATRAS dela (vista da camera). Monstros sao 3D e ja sao tapados pela profundidade; o Mineu (figura 2D) e as barras de vida dos monstros sao cortados pelo contorno da rocha na tela ----
  const hull = (pts) => { // contorno convexo (Andrew)
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const L = [], U = [];
    for (const p of pts) { while (L.length >= 2 && cr(L[L.length - 2], L[L.length - 1], p) <= 0) L.pop(); L.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (U.length >= 2 && cr(U[U.length - 2], U[U.length - 1], p) <= 0) U.pop(); U.push(p); }
    L.pop(); U.pop(); return L.concat(U);
  };
  const dentroPoligono = (x, y, poli) => { let d = false; for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) { const xi = poli[i][0], yi = poli[i][1], xj = poli[j][0], yj = poli[j][1]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d; } return d; };
  let clipAtivo = false, clipLogoAtivo = false, clipMonstroAtivo = false, barraOculta = false; // barraOculta: a barra de vida do Mineu some se ele esta tapado pela rocha, pelo logo OU por um monstro (cada um so liga; quem aplica e aplicarBarra)
  const aplicarBarra = () => { const el = (typeof elMineu !== 'undefined') ? elMineu : null, b = el && el.querySelector('.mine-vida'); if (b) b.style.visibility = barraOculta ? 'hidden' : ''; };
  const furoStr = (poli, ox, oy) => 'polygon(evenodd, -3000px -3000px, 3000px -3000px, 3000px 3000px, -3000px 3000px, -3000px -3000px, ' + poli.map((p) => (p[0] + ox).toFixed(1) + 'px ' + (p[1] + oy).toFixed(1) + 'px').join(', ') + ', ' + (poli[0][0] + ox).toFixed(1) + 'px ' + (poli[0][1] + oy).toFixed(1) + 'px)';
  const escondidos = new Set(); // monstros escondidos atras da rocha neste quadro: o jogo NAO trava a mira neles (ver escolherAlvo)
  window.MGO_ESCONDIDO = (inimigo) => escondidos.has(inimigo);
  function oclusao(M, W, H, gx, gz, dMarco) {
    const elM = (typeof elMineu !== 'undefined') ? elMineu : null, corpos = window.__monstros3d ? window.__monstros3d.corpos : null;
    if (!pontosRocha || dMarco > 70) { escondidos.clear(); if (clipLogoAtivo && elM) { const inn = elM.querySelector('.interno'); if (inn) inn.style.clipPath = ''; clipLogoAtivo = false; } if (clipAtivo && elM) { elM.style.clipPath = ''; clipAtivo = false; } aplicarBarra(); if (corpos) corpos.forEach((c) => { if (c.vida && c.vida.style.visibility) c.vida.style.visibility = ''; }); if (typeof elMira !== 'undefined' && elMira.style.visibility) elMira.style.visibility = ''; return; }
    const proj = (x, y, z) => { const cx = M[0] * x + M[4] * y + M[8] * z + M[12], cy = M[1] * x + M[5] * y + M[9] * z + M[13], cw = M[3] * x + M[7] * y + M[11] * z + M[15]; return [((cx / cw + 1) / 2) * W, ((1 - cy / cw) / 2) * H, cw]; };
    const wRocha = proj(gx, 0, gz)[2], pts = [];
    for (let i = 0; i < pontosRocha.length; i += 3) { const p = proj(pontosRocha[i] + gx, pontosRocha[i + 1], pontosRocha[i + 2] + gz); pts.push([p[0], p[1]]); }
    const contorno = hull(pts), cv = mapa.getCanvas().getBoundingClientRect();
    // Mineu (na origem do mundo): atras da rocha se a rocha esta mais perto da camera (w menor)
    if (elM) {
      const wM = proj(0, 0, 0)[2];
      if (wM > wRocha + 0.5) { const r = elM.getBoundingClientRect(), ox = cv.left - r.left, oy = cv.top - r.top; elM.style.clipPath = 'polygon(evenodd, -3000px -3000px, 3000px -3000px, 3000px 3000px, -3000px 3000px, -3000px -3000px, ' + contorno.map((p) => (p[0] + ox).toFixed(1) + 'px ' + (p[1] + oy).toFixed(1) + 'px').join(', ') + ', ' + (contorno[0][0] + ox).toFixed(1) + 'px ' + (contorno[0][1] + oy).toFixed(1) + 'px)'; clipAtivo = true; const barra = elM.querySelector('.mine-vida'); if (barra) { const rb = barra.getBoundingClientRect(); if (dentroPoligono(rb.left + rb.width / 2 - cv.left, rb.top + rb.height / 2 - cv.top + 14, contorno)) barraOculta = true; } /* a barra fica um pouco acima da cabeca: some junto quando ele esta escondido */ }
      else if (clipAtivo) { elM.style.clipPath = ''; clipAtivo = false; }
    }
    // LOGO MGO (plano girando em cima da rocha): tambem tapa o Mineu quando ele esta atras dele. O clip vai no elemento interno (os dois recortes se somam).
    if (elM) {
      const wM2 = proj(0, 0, 0)[2], ang = moeda.rotation.y, cy0 = moeda.position.y, hw = LARGURA_LOGO / 2, hh = LARGURA_LOGO / 4, rx = Math.cos(ang), rz = -Math.sin(ang);
      const quad = [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]].map((q) => proj(gx + q[0] * rx, cy0 + q[1], gz + q[0] * rz)), wLogo = proj(gx, cy0, gz)[2];
      const poliLogo = quad.map((p) => [p[0], p[1]]), inn = elM.querySelector('.interno');
      if (inn && wM2 > wLogo + 0.5) { const r = inn.getBoundingClientRect(); inn.style.clipPath = furoStr(poliLogo, cv.left - r.left, cv.top - r.top); clipLogoAtivo = true; }
      else if (inn && clipLogoAtivo) { inn.style.clipPath = ''; clipLogoAtivo = false; }
      const barra = elM.querySelector('.mine-vida');
      if (barra && wM2 > wLogo + 0.5) { const rb = barra.getBoundingClientRect(); if (dentroPoligono(rb.left + rb.width / 2 - cv.left, rb.top + rb.height / 2 - cv.top + 14, poliLogo)) barraOculta = true; }
      if (window.MGO_MARCO) window.MGO_MARCO.ultimo = { logo: poliLogo, rocha: contorno }; // (so para conferir em testes)
      aplicarBarra();
    }
    // monstros escondidos (centro do corpo dentro do contorno e mais longe que a rocha): nao podem ser mirados
    escondidos.clear(); if (corpos) corpos.forEach((c) => { const g = c.grupo.position, pm = proj(g.x, 0, g.z), pc = proj(g.x, (c.altura || 2) * 0.5, g.z); if (pm[2] > wRocha + 0.5 && dentroPoligono(pc[0], pc[1], contorno)) escondidos.add(c.i); });
    // barras de vida dos monstros que estao atras da rocha
    if (corpos) corpos.forEach((c) => { if (!c.vida) return; const g = c.grupo.position, pm = proj(g.x, 0, g.z), r = c.vida.getBoundingClientRect(); const atras = pm[2] > wRocha + 0.5 && dentroPoligono(r.left + r.width / 2 - cv.left, r.top + r.height / 2 - cv.top, contorno); c.vida.style.visibility = atras ? 'hidden' : ''; });
    // o ALVO (circulo vermelho de mira) tambem some se o monstro mirado esta escondido atras da rocha
    if (typeof elMira !== 'undefined' && typeof alvoAtual !== 'undefined') {
      let escondido = false;
      if (alvoAtual && corpos) { const c = corpos.get(alvoAtual); if (c) { const g = c.grupo.position, pm = proj(g.x, 0, g.z), r = elMira.getBoundingClientRect(); escondido = pm[2] > wRocha + 0.5 && dentroPoligono(r.left + r.width / 2 - cv.left, r.top + r.height / 2 - cv.top, contorno); } }
      elMira.style.visibility = escondido ? 'hidden' : '';
    }
  }

  // ---- MONSTROS tapam o Mineu: o Mineu e 2D (sem profundidade); um monstro 3D que esteja ENTRE a camera e ele recorta o Mineu pelo contorno do corpo (caixa do corpo projetada na tela). Vale o monstro que mais cobre o Mineu; o clip vai nos .corpo (3o nivel, soma com o da rocha e o do logo). ----
  function monstrosTapamMineu(M, W, H) {
    const elM = (typeof elMineu !== 'undefined') ? elMineu : null, corpos = window.__monstros3d ? window.__monstros3d.corpos : null; if (!elM) return;
    barraOculta = false;
    const limpar = () => { if (clipMonstroAtivo) { elM.querySelectorAll('.corpo').forEach((e) => { e.style.clipPath = ''; }); clipMonstroAtivo = false; } };
    if (!corpos || !corpos.size) { limpar(); return; }
    const proj = (x, y, z) => { const cx = M[0] * x + M[4] * y + M[8] * z + M[12], cy = M[1] * x + M[5] * y + M[9] * z + M[13], cw = M[3] * x + M[7] * y + M[11] * z + M[15]; return [((cx / cw + 1) / 2) * W, ((1 - cy / cw) / 2) * H, cw]; };
    const cv = mapa.getCanvas().getBoundingClientRect(), rm = elM.getBoundingClientRect(), wM = proj(0, 0, 0)[2];
    const mx0 = rm.left - cv.left, mx1 = rm.right - cv.left, my0 = rm.top - cv.top, my1 = rm.bottom - cv.top;
    let melhor = null, melhorA = 0;
    corpos.forEach((c) => {
      const g = c.grupo.position; if (Math.hypot(g.x, g.z) < 0.5) return; const pm = proj(g.x, 0, g.z); if (pm[2] >= wM - 0.3) return; // so quem esta MAIS PERTO da camera que o Mineu
      const alt = c.altura || 2, r = alt * 0.32, pts = []; [0, alt].forEach((y) => [[-r, -r], [r, -r], [r, r], [-r, r]].forEach((q) => { const p = proj(g.x + q[0], y, g.z + q[1]); pts.push([p[0], p[1]]); }));
      let a0 = 1e9, b0 = 1e9, a1 = -1e9, b1 = -1e9; pts.forEach((p) => { a0 = Math.min(a0, p[0]); a1 = Math.max(a1, p[0]); b0 = Math.min(b0, p[1]); b1 = Math.max(b1, p[1]); });
      const ov = Math.max(0, Math.min(a1, mx1) - Math.max(a0, mx0)) * Math.max(0, Math.min(b1, my1) - Math.max(b0, my0)); if (ov > melhorA) { melhorA = ov; melhor = hull(pts); }
    });
    if (!melhor || melhorA < 20) { limpar(); return; }
    elM.querySelectorAll('.corpo').forEach((e) => { const r = e.getBoundingClientRect(); e.style.clipPath = furoStr(melhor, cv.left - r.left, cv.top - r.top); }); clipMonstroAtivo = true;
    const barra = elM.querySelector('.mine-vida'); if (barra) { const rb = barra.getBoundingClientRect(); if (dentroPoligono(rb.left + rb.width / 2 - cv.left, rb.top + rb.height / 2 - cv.top + 14, melhor)) barraOculta = true; }
  }

  const camada = {
    id: 'marco-moeda', type: 'custom', renderingMode: '3d',
    onAdd(map, gl) { this.map = map; this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true }); this.renderer.autoClear = false; },
    render(gl, args) {
      if (!grupo.visible) return;
      const t = relogio.getElapsedTime();
      const dMarco = Math.hypot((marco.lng - POS.lng) * 111320 * Math.cos(POS.lat * rad), (marco.lat - POS.lat) * 111320);
      document.querySelectorAll('.p-marco').forEach((e) => { e.style.visibility = dMarco < DIST_ESCONDE_PINO_M ? 'hidden' : ''; }); // de perto o pino some e deixa ver a rocha
      grupo.position.set((marco.lng - POS.lng) * 111320 * Math.cos(POS.lat * rad), 0, -((marco.lat - POS.lat) * 111320));
      moeda.position.y = alturaRocha + RAIO_MOEDA + 0.9 + Math.sin(t * 1.6) * 0.25; // flutua em cima da rocha
      moeda.rotation.y = t * 1.9; // gira
      const mc = maplibregl.MercatorCoordinate.fromLngLat([POS.lng, POS.lat], 0), s = mc.meterInMercatorCoordinateUnits();
      const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
      const l = new THREE.Matrix4().makeTranslation(mc.x, mc.y, mc.z).scale(new THREE.Vector3(s, -s, s)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      camera.projectionMatrix = m.multiply(l);
      try { // a oclusao e so um detalhe visual: se der erro, o jogo segue (e o erro aparece no console)
        monstrosTapamMineu(camera.projectionMatrix.elements, this.map.getCanvas().clientWidth, this.map.getCanvas().clientHeight);
        oclusao(camera.projectionMatrix.elements, this.map.getCanvas().clientWidth, this.map.getCanvas().clientHeight, grupo.position.x, grupo.position.z, dMarco);
      } catch (e) { if (!window.__marcoErro) { window.__marcoErro = e; console.error('[marco] erro na oclusao', e); } }
      this.renderer.resetState();
      this.renderer.render(cena, camera);
      this.map.triggerRepaint();
    }
  };
  const ligar = () => { if (!mapa.getLayer('marco-moeda')) mapa.addLayer(camada); };
  if (mapa.loaded()) ligar(); else mapa.on('load', ligar);
  window.MGO_MARCO = { posicao: marco, grupo };
}
