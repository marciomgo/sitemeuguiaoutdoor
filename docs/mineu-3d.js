// BLOCO mineu3d (ver blocos/blocos.json): o CORPO do Mineu passa a ser desenhado DENTRO da cena 3D, com profundidade de verdade, para a montanha, o logo e os monstros taparem ele de forma exata (antes: recorte aproximado por cima).
// COMO: o jogo continua mexendo no Mineu de DOM do mesmo jeito (poses, passada, tamanho, zoom, animacoes). Este bloco so LE o que esta na tela (posicao/tamanho da imagem do Mineu) e desenha a MESMA imagem
// num quadro alinhado a tela, mas com a PROFUNDIDADE do Mineu no mundo. A imagem do Mineu de DOM fica invisivel (visibility:hidden); sombra, galho e barra de vida continuam em DOM.
// SE DER QUALQUER ERRO: o bloco desliga e o Mineu de DOM volta a aparecer (o jogo nunca fica sem Mineu).
// Roda como modulo DEPOIS dos outros (a camada precisa ser a ULTIMA: desenha por cima do que ja esta no mapa, com teste de profundidade).
import * as THREE from 'three';

const BIAS_Z = 0.0006; // empurra o Mineu um tiquinho para perto da camera (evita brigar com o chao)
const ALTURA_PROFUNDIDADE_M = 0.9; // a profundidade do Mineu e a do tronco dele
const cena = new THREE.Scene(), camera = new THREE.Camera(), texturas = {};
let falhou = false, ativo = false;

const material = new THREE.ShaderMaterial({
  uniforms: { uMap: { value: null }, uRect: { value: new THREE.Vector4() }, uUV: { value: new THREE.Vector4() }, uZ: { value: 0 }, uFade: { value: 0 } },
  vertexShader: 'varying vec2 vUv; uniform vec4 uRect; uniform float uZ; void main(){ vUv = uv; float x = mix(uRect.x, uRect.z, uv.x); float y = mix(uRect.w, uRect.y, uv.y); gl_Position = vec4(x, y, uZ, 1.0); }',
  fragmentShader: 'varying vec2 vUv; uniform sampler2D uMap; uniform vec4 uUV; uniform float uFade; void main(){ vec2 t = vec2(mix(uUV.x, uUV.z, vUv.x), mix(uUV.w, uUV.y, vUv.y)); vec4 c = texture2D(uMap, t); float a = c.a; if (uFade > 0.0) a *= clamp(vUv.y / uFade, 0.0, 1.0); if (a < 0.02) discard; gl_FragColor = vec4(c.rgb, a); }',
  transparent: true, depthTest: true, depthWrite: true, side: THREE.DoubleSide
});
const quadro = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material); quadro.frustumCulled = false; cena.add(quadro);

function textura(src) {
  if (!texturas[src]) { const t = new THREE.TextureLoader().load(src); t.colorSpace = THREE.NoColorSpace; texturas[src] = t; }
  const t = texturas[src]; return t.image && t.image.width ? t : null;
}
const corposDoMineu = () => [].slice.call(elMineu.querySelectorAll('.corpo'));
function esconderCorpoDOM(esconde) { corposDoMineu().forEach((c) => { c.style.visibility = esconde ? 'hidden' : ''; }); }
function desligar(e) { if (falhou) return; falhou = true; ativo = false; console.error('[mineu3d] desligado, voltando ao Mineu de DOM:', e); try { esconderCorpoDOM(false); } catch (x) {} }

function retDe(e, cv) { const r = e.getBoundingClientRect(); return { x0: r.left - cv.left, y0: r.top - cv.top, x1: r.right - cv.left, y1: r.bottom - cv.top }; }
// escolhe a imagem que o jogo esta mostrando AGORA (base, andar, estilingue ou golpe) e calcula o pedaco visivel dela
function imagemVisivel(cv) {
  const comPau = elMineu.classList.contains('comPau');
  for (const corpo of corposDoMineu()) {
    const ehBase = !corpo.id, cs = getComputedStyle(corpo);
    if (cs.display === 'none' || (ehBase && comPau)) continue;
    const img = corpo.querySelector('img'); if (!img || !img.naturalWidth) continue;
    const ir = retDe(img, cv), cr = retDe(corpo, cv); if (ir.x1 - ir.x0 < 2 || cr.x1 - cr.x0 < 2) continue;
    let vx0 = ir.x0, vy0 = ir.y0, vx1 = ir.x1, vy1 = ir.y1;
    if (ehBase) { vx0 = Math.max(vx0, cr.x0); vx1 = Math.min(vx1, cr.x1); vy0 = Math.max(vy0, cr.y0); vy1 = Math.min(vy1, cr.y1); } // base: o corpo recorta a imagem pelos 4 lados
    else { vy1 = Math.min(vy1, cr.y1); } // poses: so o pe (borda de baixo) e recortado
    if (vx1 <= vx0 || vy1 <= vy0) continue;
    const mask = corpo.style.maskImage || corpo.style.webkitMaskImage, comFade = ehBase && mask && mask !== 'none';
    return { src: img.currentSrc || img.src, ir, vx0, vy0, vx1, vy1, fade: comFade ? Math.min(1, (0.24 * (cr.y1 - cr.y0)) / (vy1 - vy0)) : 0 };
  }
  return null;
}

const camada = {
  id: 'mineu-3d', type: 'custom', renderingMode: '3d',
  onAdd(map, gl) { this.map = map; this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true }); this.renderer.autoClear = false; },
  render(gl, args) {
    if (falhou || typeof elMineu === 'undefined') return;
    try {
      const canvas = this.map.getCanvas(), cv = canvas.getBoundingClientRect(), W = canvas.clientWidth, H = canvas.clientHeight;
      if (!ativo) { esconderCorpoDOM(true); ativo = true; }
      const v = imagemVisivel(cv); if (!v) return;
      const tex = textura(v.src); if (!tex) { esconderCorpoDOM(false); ativo = false; return; } // textura ainda carregando: mostra o de DOM nesse instante
      // profundidade do Mineu = a do tronco dele (mesma matriz dos outros blocos; origem do mundo = o jogador)
      const mc = maplibregl.MercatorCoordinate.fromLngLat([POS.lng, POS.lat], 0), s = mc.meterInMercatorCoordinateUnits();
      const m = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
      const l = new THREE.Matrix4().makeTranslation(mc.x, mc.y, mc.z).scale(new THREE.Vector3(s, -s, s)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
      const M = m.multiply(l).elements, y = ALTURA_PROFUNDIDADE_M;
      const cz = M[6] * y + M[14], cw = M[7] * y + M[15]; // z e w (coordenadas de recorte) do ponto (0, y, 0)
      const z = cz / cw - BIAS_Z;
      const iw = v.ir.x1 - v.ir.x0, ih = v.ir.y1 - v.ir.y0;
      material.uniforms.uMap.value = tex;
      material.uniforms.uRect.value.set((v.vx0 / W) * 2 - 1, 1 - (v.vy0 / H) * 2, (v.vx1 / W) * 2 - 1, 1 - (v.vy1 / H) * 2);
      material.uniforms.uUV.value.set((v.vx0 - v.ir.x0) / iw, 1 - (v.vy0 - v.ir.y0) / ih, (v.vx1 - v.ir.x0) / iw, 1 - (v.vy1 - v.ir.y0) / ih);
      material.uniforms.uZ.value = z; material.uniforms.uFade.value = v.fade;
      this.renderer.resetState();
      this.renderer.render(cena, camera);
      this.map.triggerRepaint();
    } catch (e) { desligar(e); }
  }
};
function ligar() { try { if (!mapa.getLayer('mineu-3d')) mapa.addLayer(camada); } catch (e) { desligar(e); } }
if (mapa.loaded()) ligar(); else mapa.on('load', ligar);
window.MGO_MINEU3D = { ativo: () => ativo, falhou: () => falhou, desligar: () => desligar('desligado de fora') };
