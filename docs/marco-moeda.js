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
  let alturaRocha = 4, moeda = null, modeloPronto = false, posPronta = !esperaJogo, pinoFeito = false;
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
    modeloPronto = true; mostrar();
  }, undefined, (e) => console.error('[marco] erro ao carregar a rocha', e));

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
      this.renderer.resetState();
      this.renderer.render(cena, camera);
      this.map.triggerRepaint();
    }
  };
  const ligar = () => { if (!mapa.getLayer('marco-moeda')) mapa.addLayer(camada); };
  if (mapa.loaded()) ligar(); else mapa.on('load', ligar);
  window.MGO_MARCO = { posicao: marco, grupo };
}
