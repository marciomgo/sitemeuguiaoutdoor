// MODO LIVRE: os monstros do jogo aparecem em 3D de verdade (Quaternius, CC0) no lugar dos bonecos planos. Dando a volta, aparece o lado e as costas.
// Zumbi = Orc_Skull; chefao = Demon (o chefao FINAL e um Demon maior). A logica do jogo NAO muda: cada inimigo do jogo (lista `inimigos`) ganha um corpo 3D
// que segue a posicao dele, vira para onde ele anda (ou para o jogador), e toca a animacao certa: parado, andando, atacando, levando dano e morrendo.
// Roda como modulo DEPOIS do script do jogo (usa as variaveis do jogo: mapa, POS, inimigos, CONTATO_M, ZUMBI_VEL, CHEFAO_VEL...). So acrescenta uma camada.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const TIPOS = {
  zumbi: { arquivo: 'modelos/Orc_Skull.gltf', altura: 1.7, fonte: 36 },
  chefao: { arquivo: 'modelos/Demon.gltf', altura: 3.0, fonte: 68 },
  final: { arquivo: 'modelos/Demon.gltf', altura: 4.2, fonte: 90 }
};
const rad = Math.PI / 180;
const cena = new THREE.Scene();
cena.add(new THREE.AmbientLight(0xffffff, 1.1));
const sol = new THREE.DirectionalLight(0xffffff, 1.6); sol.position.set(-20, 40, 30); cena.add(sol);
const camera = new THREE.Camera();
const relogio = new THREE.Clock();
const modelos = {}; // arquivo -> { cena, animacoes, altura }
const corpos = new Map(); // inimigo do jogo -> corpo 3D

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
  const corpo = SkeletonUtils.clone(m.cena), k = tipo.altura / m.altura;
  corpo.scale.setScalar(k); corpo.position.y = -m.base * k; // em pe no chao
  const grupo = new THREE.Group(); grupo.add(corpo); cena.add(grupo);
  const mixer = new THREE.AnimationMixer(corpo), acoes = {};
  m.animacoes.forEach((c) => { acoes[c.name] = mixer.clipAction(c); });
  const em = i.el.querySelector('.em'); if (em) { em.style.visibility = 'hidden'; em.style.fontSize = tipo.fonte + 'px'; } // o boneco plano some; o espaco fica para a barra de vida ficar acima da cabeca
  const c = { i, grupo, mixer, acoes, atual: null, nome: '', theta: Math.PI, lat: i.lat, lng: i.lng, vidaAnt: i.vida, tHit: -1e9, tMorte: 0 };
  tocar(c, 'Idle'); return c;
}
function tocar(c, nome, vel) {
  const a = c.acoes[nome] || c.acoes.Idle; if (!a) return;
  if (c.nome !== nome) {
    if (c.atual) c.atual.fadeOut(0.2);
    a.reset().fadeIn(0.2).play(); c.atual = a; c.nome = nome;
    a.setLoop(nome === 'Death' || nome === 'HitReact' ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = true;
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
  else if (i.chefao ? !!i.balaEmVoo : dist <= CONTATO_M + 0.6) tocar(c, 'Punch');
  else if (andando) tocar(c, 'Walk', Math.max(0.4, Math.min(1.3, vel / 1.1)));
  else tocar(c, 'Idle');
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
    this.renderer.resetState();
    this.renderer.render(cena, camera);
    this.map.triggerRepaint();
  }
};
function ligar() { if (!mapa.getLayer('monstros-3d')) mapa.addLayer(camada); }
if (mapa.loaded()) ligar(); else mapa.on('load', ligar);
window.__monstros3d = { corpos };
