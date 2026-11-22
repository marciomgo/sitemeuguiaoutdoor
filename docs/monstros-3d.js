// BLOCO monstros3d (ver blocos/blocos.json): os monstros do jogo aparecem em 3D de verdade (Quaternius, CC0) no lugar dos bonecos planos. Dando a volta, aparece o lado e as costas.
// Zumbi = Orc (golpeia com o bastao); chefao = BlueDemon (sem fogo, golpes fortes de perto); chefao FINAL = Dragon_Evolved (da UMA cabecada ao soltar o fogo laranja; golpeia de perto se voce chegar). A logica do jogo NAO muda: cada inimigo do jogo (lista `inimigos`) ganha um corpo 3D
// que segue a posicao dele, vira para onde ele anda (ou para o jogador), e toca a animacao certa: parado, andando, atacando, levando dano e morrendo.
// Roda como modulo DEPOIS do script do jogo (usa as variaveis do jogo: mapa, POS, inimigos, CONTATO_M, ZUMBI_VEL, CHEFAO_VEL...). So acrescenta uma camada.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// VIVO: mesma cor do modelo (matiz 0), so mais saturada. Sem isso as cores originais ficam apagadas sob a luz do jogo. Ajuste: sat (1 = original), luz (1 = original)
const VIVO = { matiz: 0, luz: 1, sat: 1.5 };
// anim: nomes das animacoes de cada modelo quando diferem do padrao (Idle, Walk, golpe=Punch). O dragao nao tem Idle/Walk: usa Flying_Idle/Fast_Flying.
const TIPOS = {
  zumbi: { arquivo: 'modelos/Orc.gltf', altura: 1.7, fonte: 36, anim: { golpe: 'Weapon' }, cor: VIVO },
  chefao: { arquivo: 'modelos/BlueDemon.gltf', altura: 3.0, fonte: 68, anim: { golpe: 'Weapon' }, cor: VIVO },
  final: { arquivo: 'modelos/Dragon_Evolved.gltf', altura: 3.6, fonte: 90, anim: { Idle: 'Flying_Idle', Walk: 'Fast_Flying', golpe: 'Punch' }, cor: VIVO }
};
const rad = Math.PI / 180;
const cena = new THREE.Scene();
cena.add(new THREE.AmbientLight(0xffffff, 2.4)); // luz fisica: ~0,75 da cor do modelo vem do ambiente + ~0,5 do sol = cor fiel ao modelo (antes 1.1/1.6 deixava tudo escuro)
const sol = new THREE.DirectionalLight(0xffffff, 1.5); sol.position.set(-20, 40, 30); cena.add(sol);
const camera = new THREE.Camera();
const relogio = new THREE.Clock();
const modelos = {}; // arquivo -> { cena, animacoes, altura }
const corpos = new Map(); // inimigo do jogo -> corpo 3D

// troca a cor do modelo: copia os materiais e ajusta matiz/claridade/saturacao da textura (pixel a pixel, funciona em qualquer navegador). Cinza, branco e preto nao mudam (contornos, olhos).
function texturaComMatiz(tex, cor) {
  const img = tex.image, w = img.width, h = img.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
  const d = cx.getImageData(0, 0, w, h), p = d.data, dh = cor.matiz / 360;
  for (let k = 0; k < p.length; k += 4) {
    const r = p[k] / 255, g = p[k + 1] / 255, b = p[k + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn;
    if (dd < 0.02) continue; // cinza/branco/preto: nao tem cor para girar
    const s0 = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn), s = Math.min(1, s0 * cor.sat), lc = Math.min(0.78, l * cor.luz);
    let hh = mx === r ? ((g - b) / dd + (g < b ? 6 : 0)) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; hh = ((hh / 6 + dh) % 1 + 1) % 1;
    const q = lc < 0.5 ? lc * (1 + s) : lc + s - lc * s, pp = 2 * lc - q, f = (tt) => { tt = (tt % 1 + 1) % 1; return tt < 1 / 6 ? pp + (q - pp) * 6 * tt : tt < 1 / 2 ? q : tt < 2 / 3 ? pp + (q - pp) * (2 / 3 - tt) * 6 : pp; };
    p[k] = Math.round(f(hh + 1 / 3) * 255); p[k + 1] = Math.round(f(hh) * 255); p[k + 2] = Math.round(f(hh - 1 / 3) * 255);
  }
  cx.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.flipY = tex.flipY; t.colorSpace = tex.colorSpace; t.wrapS = tex.wrapS; t.wrapT = tex.wrapT; t.anisotropy = tex.anisotropy; return t;
}
function comMatiz(cenaOrig, cor) {
  const c = SkeletonUtils.clone(cenaOrig);
  c.traverse((o) => { if (o.isMesh) { const m = o.material.clone(); if (m.map && m.map.image) m.map = texturaComMatiz(m.map, cor); o.material = m; } });
  return c;
}
new Set(Object.values(TIPOS).map((t) => t.arquivo)).forEach((arq) => {
  new GLTFLoader().load(arq, (g) => {
    const caixa = new THREE.Box3().setFromObject(g.scene), tam = caixa.getSize(new THREE.Vector3());
    modelos[arq] = { cena: g.scene, animacoes: g.animations, altura: tam.y || 1, base: caixa.min.y };
    console.log('[3D] modelo pronto:', arq, '| animacoes', g.animations.length);
    mapa.triggerRepaint();
  }, undefined, (e) => console.error('[3D] erro ao carregar', arq, e));
});

function criar(i) {
  const tipo = i.chefao ? (i.final ? TIPOS.final : TIPOS.chefao) : TIPOS.zumbi, m = modelos[tipo.arquivo]; if (!m) return null;
  const chave = i.final ? 'final' : 'chefao'; m.copias = m.copias || {};
  const origem = tipo.cor ? (m.copias[chave] || (m.copias[chave] = comMatiz(m.cena, tipo.cor))) : m.cena; // chefao comum = copia vermelha, final = copia lilas (cada uma feita uma vez)
  const corpo = SkeletonUtils.clone(origem), k = tipo.altura / m.altura;
  corpo.scale.setScalar(k); corpo.position.y = -m.base * k; // em pe no chao
  const grupo = new THREE.Group(); grupo.add(corpo); cena.add(grupo);
  const mixer = new THREE.AnimationMixer(corpo), acoes = {};
  m.animacoes.forEach((c) => { acoes[c.name] = mixer.clipAction(c); });
  const em = i.el.querySelector('.em'); if (em) { em.style.visibility = 'hidden'; em.style.fontSize = tipo.fonte + 'px'; } // o boneco plano some; o espaco fica para a barra de vida ficar acima da cabeca
  const c = { tipo, i, grupo, mixer, acoes, atual: null, nome: '', theta: Math.PI, lat: i.lat, lng: i.lng, vidaAnt: i.vida, tHit: -1e9, tMorte: 0, altura: tipo.altura, vida: i.el.querySelector('.vida'), hCaixa: i.el.offsetHeight || tipo.fonte, topoAnt: null };
  tocar(c, 'Idle');
  // MEDE o corpo de verdade (animado): a caixa do modelo parado, usada para dimensionar, fica na METADE da altura real (o esqueleto estica a malha).
  // Assim a barra de energia sabe onde esta a cabeca, e os pes encostam no chao. O tamanho que se ve na tela NAO muda.
  mixer.update(0.001); corpo.updateMatrixWorld(true);
  let melhor = null; corpo.traverse((o) => { if (o.isMesh) { const b = new THREE.Box3().setFromObject(o, true); if (!melhor || (b.max.y - b.min.y) > (melhor.max.y - melhor.min.y)) melhor = b; } });
  if (melhor && isFinite(melhor.min.y)) { corpo.position.y -= melhor.min.y; c.altura = melhor.max.y - melhor.min.y; }
  return c;
}
function tocar(c, nome, vel) {
  const mapa_ = (c.tipo && c.tipo.anim) || {}, real = (n) => mapa_[n] || (n === 'golpe' ? 'Punch' : n);
  const a = c.acoes[real(nome)] || c.acoes[real('Idle')]; if (!a) return;
  if (c.nome !== nome) {
    if (c.atual) c.atual.fadeOut(0.2);
    a.reset().fadeIn(0.2).play(); c.atual = a; c.nome = nome;
    a.setLoop(nome === 'Death' || nome === 'HitReact' || nome === 'Headbutt' ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = true;
  }
  a.timeScale = vel || 1;
}
function metros(i) { // posicao do inimigo em relacao ao jogador (leste, norte)
  return { e: (i.lng - POS.lng) * 111320 * Math.cos(POS.lat * rad), n: (i.lat - POS.lat) * 111320 };
}
function giraPara(atual, alvo, passo) { let d = alvo - atual; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return atual + Math.max(-passo, Math.min(passo, d)); }

function atualizar(c, dt, agora) {
  const i = c.i, p = metros(i), dist = Math.hypot(p.e, p.n);
  c.grupo.position.set(p.e, 0, -p.n); // origem = jogador; leste = +x, norte = -z
  // direcao: andando -> vira para onde anda; parado -> olha para o jogador
  const dm = Math.hypot((i.lat - c.lat) * 111320, (i.lng - c.lng) * 111320 * Math.cos(i.lat * rad));
  c.vel = (c.vel || 0) * 0.9 + (dt > 0 ? dm / dt : 0) * 0.1; // velocidade suavizada (m/s): o zumbi anda 0,5 m/s, so uns 8 mm por quadro
  if (dm > 0.0005) c.rumo = Math.atan2((i.lng - c.lng) * Math.cos(i.lat * rad), i.lat - c.lat); // rumo (rad, desde o norte, horario)
  const andando = c.vel > 0.1;
  const alvo = (andando && c.rumo !== undefined) ? c.rumo : Math.atan2(-p.e, -p.n); // andando: vira para onde anda; parado: de frente para o jogador
  c.lat = i.lat; c.lng = i.lng;
  c.theta = giraPara(c.theta, Math.PI - alvo, 8 * dt); // o modelo olha para +z (sul): theta = 180 graus - rumo
  c.grupo.rotation.y = c.theta;
  // qual animacao
  if (!i.vivo) {
    if (!c.tMorte) { c.tMorte = agora; tocar(c, 'Death'); const em = i.el.querySelector('.em'); if (em) em.style.visibility = ''; } // a explosao 💥 do jogo aparece junto com a queda
    return;
  }
  if (i.vida < c.vidaAnt) c.tHit = agora; c.vidaAnt = i.vida;
  const vel = i.chefao ? (i.final ? CHEFAO_FINAL_VEL : CHEFAO_VEL) : ZUMBI_VEL;
  if (agora - c.tHit < 450) tocar(c, 'HitReact');
  else if (i.final && i.tCabecada && agora - i.tCabecada < 1500) tocar(c, 'Headbutt'); // UMA cabecada ao soltar o fogo (1,5 s); depois volta a voar parado enquanto o fogo viaja
  else if (dist <= (i.chefao ? CONTATO_CHEFAO_M : CONTATO_M) + 0.6) tocar(c, 'golpe');
  else if (andando) tocar(c, 'Walk', Math.max(0.4, Math.min(1.3, vel / 1.1)));
  else tocar(c, 'Idle');
}

const pGround = new THREE.Vector3(), pHead = new THREE.Vector3();
// A barra de energia e um elemento da pagina preso ao PE do monstro. Aqui medimos, na tela, quantos pixels vai do pe ate o topo da cabeca (a projecao muda com a inclinacao e o zoom)
// e subimos a barra ate la. 'top' e contado a partir do topo da caixa do marcador, cuja base esta no pe do monstro.
function posicionarBarrasDeVida(alturaTelaPx) {
  corpos.forEach((c) => {
    if (!c.vida || !c.i.vivo) return;
    const g = c.grupo.position;
    pGround.set(g.x, 0, g.z).applyMatrix4(camera.projectionMatrix); pHead.set(g.x, c.altura + 0.15, g.z).applyMatrix4(camera.projectionMatrix);
    const acimaDoPe = ((pHead.y - pGround.y) / 2) * alturaTelaPx; // pixels do pe ate o topo da cabeca
    if (!isFinite(acimaDoPe)) return;
    const top = Math.round(c.hCaixa - acimaDoPe - 8); // 8 = altura da barra + folga
    if (c.topoAnt === null || Math.abs(top - c.topoAnt) >= 1) { c.vida.style.top = top + 'px'; c.topoAnt = top; }
  });
}

const camada = {
  id: 'monstros-3d', type: 'custom', renderingMode: '3d',
  onAdd(map, gl) { this.map = map; this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true }); this.renderer.autoClear = false; },
  render(gl, args) {
    const dt = Math.min(0.1, relogio.getDelta()), agora = performance.now();
    inimigos.forEach((i) => { if (i.vivo && !corpos.has(i)) { const c = criar(i); if (c) corpos.set(i, c); } });
    corpos.forEach((c, i) => {
      if (inimigos.indexOf(i) < 0 || (c.tMorte && agora - c.tMorte > 2600)) { cena.remove(c.grupo); corpos.delete(i); return; } // sumiu do jogo (ou ja morreu e acabou a animacao)
      c.mixer.update(dt); atualizar(c, dt, agora);
    });
    // origem do mundo 3D = onde o jogador esta (coordenadas pequenas, sem perder precisao)
    const mc = maplibregl.MercatorCoordinate.fromLngLat([POS.lng, POS.lat], 0), s = mc.meterInMercatorCoordinateUnits();
    const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
    const l = new THREE.Matrix4().makeTranslation(mc.x, mc.y, mc.z).scale(new THREE.Vector3(s, -s, s)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    camera.projectionMatrix = m.multiply(l);
    posicionarBarrasDeVida(this.map.getCanvas().clientHeight); // a barra de energia fica ACIMA da cabeca de cada monstro (projecao do topo do corpo na tela)
    this.renderer.resetState();
    this.renderer.render(cena, camera);
    this.map.triggerRepaint();
  }
};
function ligar() { if (!mapa.getLayer('monstros-3d')) mapa.addLayer(camada); }
if (mapa.loaded()) ligar(); else mapa.on('load', ligar);
window.__monstros3d = { corpos };
