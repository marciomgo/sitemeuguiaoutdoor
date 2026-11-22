// BLOCO bauFinal (ver blocos/blocos.json): o BAU DO TESOURO, protegido pelo chefao final. Ele fica no lugar da "chegada" (missao de parque) ou onde nasce o chefao final (modo livre).
// - Trancado enquanto o chefao final estiver vivo. Quando ele cai, o bau fica liberado (balanca de leve) e basta chegar perto (4 m): a tampa abre e saltam muitas moedas de ouro.
// - So depois das moedas vem a tela de parabens (o jogo, ao ver que existe bau, NAO celebra sozinho quando os monstros acabam: quem celebra e o bau aberto).
// - Se o modelo do bau nao carregar, o jogo se comporta como antes (celebra ao limpar os monstros).
// Roda como modulo DEPOIS do script do jogo (usa POS, inimigos, aviso, tocarTom, celebrar, celebrou). Modelo: Quaternius Fantasy Props (CC0), texturas reduzidas. Moedas: cilindros dourados (sem arquivo).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const ARQ = 'modelos/Chest_Wood.gltf', ESCALA = 3.4, DIST_ABRIR_M = 4, DIST_AVISO_M = 9, N_MOEDAS = 110, DURACAO_MOEDAS_MS = 1800, CELEBRAR_APOS_MS = 6500;
const rad = Math.PI / 180;
const cena = new THREE.Scene();
cena.add(new THREE.AmbientLight(0xffffff, 2.4));
const sol = new THREE.DirectionalLight(0xffffff, 1.5); sol.position.set(-20, 40, 30); cena.add(sol);
const camera = new THREE.Camera(), relogio = new THREE.Clock();

let pos = null, estado = 'travado', modelo = null, falhou = false, grupo = null, mixer = null, fechadoAc = null, abrirAc = null;
let tAbriu = 0, geradas = 0, avisouTravado = 0, moedas = [];
const geoMoeda = new THREE.CylinderGeometry(0.2, 0.2, 0.045, 22);
const matMoeda = new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.35, roughness: 0.35, emissive: 0x9a6a00, emissiveIntensity: 0.9 });

// o modelo vem com texturas de normal/ORM grandes: nao baixamos (viram 1 pixel) e usamos materiais simples
const BRANCO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const gerente = new THREE.LoadingManager(); gerente.setURLModifier((u) => (/_(Normal|ORM)\.png/.test(u) ? BRANCO : u));
new GLTFLoader(gerente).load(ARQ, (g) => {
  g.scene.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => { m.normalMap = null; m.metalnessMap = null; m.roughnessMap = null; m.aoMap = null; m.metalness = 0.15; m.roughness = 0.75; m.needsUpdate = true; if (/Furniture/i.test(m.name || '')) m.color.setRGB(1.55, 1.05, 0.6); /* a madeira vinha acinzentada: esquenta para marrom-dourado */ }); });
  modelo = g; console.log('[bau] modelo pronto | animacoes', g.animations.map((a) => a.name).join(',')); mapa.triggerRepaint();
}, undefined, (e) => { falhou = true; console.error('[bau] erro ao carregar o modelo', e); });

function criarBau() {
  if (grupo || !modelo || !pos) return;
  const corpo = SkeletonUtils.clone(modelo.scene); corpo.scale.setScalar(ESCALA);
  grupo = new THREE.Group(); grupo.add(corpo); cena.add(grupo);
  mixer = new THREE.AnimationMixer(corpo);
  const clipe = (n) => modelo.animations.find((a) => a.name === n);
  if (clipe('Chest_Closed')) { fechadoAc = mixer.clipAction(clipe('Chest_Closed')); fechadoAc.play(); }
  if (clipe('Chest_Open')) { abrirAc = mixer.clipAction(clipe('Chest_Open')); abrirAc.setLoop(THREE.LoopOnce, 1); abrirAc.clampWhenFinished = true; }
  grupo.rotation.y = 0;
}
function limparTudo() {
  if (grupo) { cena.remove(grupo); grupo = null; mixer = null; fechadoAc = null; abrirAc = null; }
  moedas.forEach((m) => cena.remove(m.malha)); moedas = []; geradas = 0; estado = 'travado'; tAbriu = 0; avisouTravado = 0;
  document.querySelectorAll('.p-bau').forEach((e) => { e.style.display = ''; });
}
function jingle(n) { try { for (let k = 0; k < n; k++) setTimeout(() => { const f = 1500 + Math.random() * 1000; tocarTom(f, f * 1.25, 90, 'triangle', 0.05); }, k * 55); } catch (e) {} }
function abrir(agora) {
  estado = 'abrindo'; tAbriu = agora;
  if (fechadoAc) fechadoAc.fadeOut(0.1);
  if (abrirAc) abrirAc.reset().fadeIn(0.1).play();
  try { tocarTom(150, 90, 380, 'sawtooth', 0.12); setTimeout(() => tocarTom(300, 120, 200, 'square', 0.06), 120); } catch (e) {}
  if (navigator.vibrate) { try { navigator.vibrate([60, 40, 60, 40, 160]); } catch (e) {} }
  aviso(''); document.querySelectorAll('.p-bau').forEach((e) => { e.style.display = 'none'; });
}
function novaMoeda() {
  const malha = new THREE.Mesh(geoMoeda, matMoeda), a = Math.random() * Math.PI * 2, h = 1.2 + Math.random() * 3.6;
  malha.scale.setScalar(1.9 + Math.random() * 0.9);
  const p = new THREE.Vector3((Math.random() - 0.5) * 0.8, 1.0 * ESCALA * 0.5, (Math.random() - 0.5) * 0.6);
  moedas.push({ malha, p, v: new THREE.Vector3(Math.cos(a) * h, 5.5 + Math.random() * 4.5, Math.sin(a) * h), w: new THREE.Vector3((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 18), parada: false });
  cena.add(malha); geradas++;
}
function fisicaMoedas(dt) {
  moedas.forEach((m) => {
    if (m.parada) return;
    m.v.y -= 9.8 * dt; m.p.addScaledVector(m.v, dt);
    m.malha.rotation.x += m.w.x * dt; m.malha.rotation.y += m.w.y * dt; m.malha.rotation.z += m.w.z * dt;
    if (m.p.y < 0.05) {
      m.p.y = 0.05;
      if (Math.abs(m.v.y) > 1.4) { m.v.y *= -0.42; m.v.x *= 0.7; m.v.z *= 0.7; m.w.multiplyScalar(0.6); }
      else { m.parada = true; m.malha.rotation.x = 0; m.malha.rotation.z = 0; } // pousa deitada no chao
    }
  });
}

function passo(dt, agora) {
  if (!pos) return;
  criarBau(); if (!grupo) return;
  const dx = (pos.lng - POS.lng) * 111320 * Math.cos(POS.lat * rad), dz = -((pos.lat - POS.lat) * 111320), dist = Math.hypot(dx, dz);
  grupo.position.set(dx, 0, dz);
  const temFinal = inimigos.some((i) => i.final), finalVivo = inimigos.some((i) => i.final && i.vivo);
  if (estado === 'travado') {
    if (temFinal && !finalVivo) { estado = 'liberado'; aviso('O chefão caiu! Vá até o baú do tesouro! 💰'); setTimeout(() => { if (estado === 'liberado') aviso(''); }, 4500); }
    else if (dist < DIST_AVISO_M && agora - avisouTravado > 8000) { avisouTravado = agora; aviso('🔒 O baú está trancado! Derrote o chefão final.'); setTimeout(() => { if (estado === 'travado') aviso(''); }, 2800); }
  }
  if (estado === 'liberado') {
    grupo.scale.setScalar(1 + 0.05 * Math.sin(agora / 180)); // balanca de leve: chama a atencao
    if (dist <= DIST_ABRIR_M) { grupo.scale.setScalar(1); abrir(agora); }
  }
  if (estado === 'abrindo') {
    const t = agora - tAbriu;
    if (t > 350 && geradas < N_MOEDAS) { const alvo = Math.min(N_MOEDAS, Math.floor(((t - 350) / DURACAO_MOEDAS_MS) * N_MOEDAS)); if (alvo > geradas) jingle(Math.min(3, alvo - geradas)); while (geradas < alvo) novaMoeda(); }
    if (t > CELEBRAR_APOS_MS) { estado = 'aberto'; if (!celebrou) celebrar(); }
  }
  fisicaMoedas(dt);
  moedas.forEach((m) => m.malha.position.set(grupo.position.x + m.p.x, m.p.y, grupo.position.z + m.p.z));
}

const camada = {
  id: 'bau-final', type: 'custom', renderingMode: '3d',
  onAdd(map, gl) { this.map = map; this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true }); this.renderer.autoClear = false; },
  render(gl, args) {
    if (!pos) return;
    const dt = Math.min(0.1, relogio.getDelta()), agora = performance.now();
    passo(dt, agora); if (mixer) mixer.update(dt);
    if (!grupo) { this.map.triggerRepaint(); return; }
    const mc = maplibregl.MercatorCoordinate.fromLngLat([POS.lng, POS.lat], 0), s = mc.meterInMercatorCoordinateUnits();
    const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
    const l = new THREE.Matrix4().makeTranslation(mc.x, mc.y, mc.z).scale(new THREE.Vector3(s, -s, s)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    camera.projectionMatrix = m.multiply(l);
    this.renderer.resetState();
    this.renderer.render(cena, camera);
    this.map.triggerRepaint();
  }
};
function ligar() { if (!mapa.getLayer('bau-final')) mapa.addLayer(camada); }
if (mapa.loaded()) ligar(); else mapa.on('load', ligar);

// API que o jogo usa (proto-modelo.html): colocar(lat,lng) no lugar da chegada; temBau() para nao celebrar sozinho; reiniciar() ao comecar um novo nivel
window.MGO_BAU = {
  colocar(lat, lng) { limparTudo(); pos = { lat, lng }; mapa.triggerRepaint(); },
  reiniciar() { limparTudo(); pos = null; },
  temBau() { return !!pos && !falhou; },
  estado() { return estado; },
  moedas() { return moedas.length; }
};
