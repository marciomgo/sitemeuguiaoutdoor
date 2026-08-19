// Filename: public/mapaGpsHtml.js
//
// Mapa GPS embutido (Leaflet + OpenStreetMap) — mostra os pontos da
// missão (ícones clicáveis, posicionados por coordenada real, sem
// distorcer em nenhum tamanho de tela) e a localização ao vivo da
// família. Carregado em `#htmlMapaGps` via `.src = data:text/html;...`
// na página da missão. Recebe os pontos por `.postMessage()` (evento
// "pontos") e avisa a página quando um marcador é clicado (evento
// "pontoClicado").

export const htmlMapaGps = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body{margin:0;padding:0;height:100%;overflow:hidden;}
/* #viewport é o "buraco" visível de verdade (tamanho do widget na
   página). #mapGiro é maior que isso de propósito (150%) e centralizado
   por cima — sobra o suficiente pra girar em qualquer ângulo sem
   deixar canto vazio aparecendo. Girar só o #mapGiro (nunca as panes
   internas do Leaflet) evita brigar com o jeito que o Leaflet já
   controla sozinho o posicionamento/zoom por dentro. */
#viewport{
    width:100%;height:100%;
    overflow:hidden;
    position:relative;
    border-radius:16px;
    /* Sem isso, com o arrastar/zoom do Leaflet desligados (modo foco),
       o celular pode interpretar o toque como um gesto de rolagem da
       página em vez de um clique no ícone — os pontos ficavam "surdos"
       ao toque por causa disso. */
    touch-action: none;
}
#mapGiro{
    position:absolute;
    width:150%;height:150%;
    top:-25%;left:-25%;
    transition: transform 0.15s linear;
}
#map{width:100%;height:100%;}
/* Pontinho da família — agora é a própria seta (a carinha do
   personagem). Gira em volta do próprio centro (não do rodapé,
   diferente dos pinos) — é uma agulha, não um marcador fixo num
   lugar. */
.icone-eu-seta{
    width:100%;height:100%;
    transform-origin:50% 50%;
    filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));
    transition: transform 0.15s linear;
}
.icone-eu-seta img{ width:100%;height:100%;object-fit:contain; }
.icone-ponto-img{
    width:100%;height:100%;
    object-fit:contain;
    display:block;
}
/* Contra-giro dos ícones — o mapa todo gira (#mapGiro), mas cada
   marcador tem esse wrapper girando pro lado oposto por dentro, pra
   ficar sempre "em pé" na tela (número/imagem legível), não de
   cabeça pra baixo. Ponto de rotação no rodapé/centro do ícone,
   batendo com o iconAnchor (base do pino é o ponto real no mapa). */
.giro-marcador{
    width:100%;height:100%;
    transform-origin:50% 100%;
}
.icone-ponto-cinza{
    filter: grayscale(100%) brightness(70%);
}
.icone-ponto-cinza-leve{
    filter: grayscale(100%);
}
.icone-bonus{
    background:#f0b429;
    color:#fff;
    width:30px;height:30px;
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-weight:bold;font-size:16px;
    border:2px solid #fff;
    box-shadow:0 1px 4px rgba(0,0,0,0.4);
}
.leaflet-control-attribution{
    font-size:8px;
    padding:0 3px;
    opacity:0.35;
    background:transparent;
}
#btnCamada{
    position:absolute;
    bottom:10px;right:10px;
    z-index:1000;
    width:34px;height:34px;
    padding:0;
    font-size:18px;
    line-height:34px;
    text-align:center;
    border:none;
    border-radius:50%;
    background:rgba(255,255,255,0.9);
    box-shadow:0 1px 4px rgba(0,0,0,0.4);
    cursor:pointer;
}
/* Barras de progresso — ficam FORA do #mapGiro de propósito, então
   não giram junto com o mapa; são só uma lista fixa na tela. Pontos
   oficiais na esquerda, bônus liberados na direita. Substituem os
   botões numerados que existiam fora do mapa. */
.barra-progresso{
    position:absolute;
    top:10px;
    bottom:50px;
    z-index:900;
    display:flex;
    flex-direction:column;
    gap:6px;
    overflow-y:auto;
    scrollbar-width:none;
}
.barra-progresso::-webkit-scrollbar{ display:none; }
#barraOficiais{ left:10px; }
#barraBonus{ right:10px; }
.icone-barra{
    width:34px;height:34px;
    flex:none;
    cursor:pointer;
}
.icone-barra img{
    width:100%;height:100%;
    object-fit:contain;
    display:block;
    /* Sem círculo branco atrás — só a sombra pra não sumir em cima de
       um fundo de mapa parecido com a cor do ícone. */
    filter:drop-shadow(0 1px 3px rgba(0,0,0,0.7));
}
/* Mais específico que ".icone-barra img" de propósito — senão a
   sombra acima ganha do filtro cinza (duas regras disputando a mesma
   propriedade "filter", só uma vale) e o ícone nunca fica cinza de
   verdade. Aqui inclui os dois efeitos juntos. */
.icone-barra img.icone-ponto-cinza{
    filter: grayscale(100%) brightness(70%) drop-shadow(0 1px 3px rgba(0,0,0,0.7));
}
.icone-barra.invisivel{ visibility:hidden; }

/* Overlay de bônus liberado — mesmo espírito do botão de ativar
   bússola (grande, centralizado, fundo escurecido). */
#overlayBonus{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.75);
    display:none;
    align-items:center;
    justify-content:center;
    z-index:99998;
    font-family:Arial,Helvetica,sans-serif;
    text-align:center;
    flex-direction:column;
    gap:16px;
    padding:24px;
    box-sizing:border-box;
}
#overlayBonusTexto{
    color:#fff;
    font-size:20px;
    font-weight:bold;
    max-width:80vw;
}
#overlayBonusBotoes{ display:flex; gap:12px; }
#overlayBonusBotoes button{
    padding:14px 22px;
    font-size:16px;
    font-weight:bold;
    border:none;
    border-radius:12px;
    cursor:pointer;
}
#btnBonusSim{ background:#2b6ef2; color:#fff; }
#btnBonusNao{ background:rgba(255,255,255,0.85); color:#333; }

/* Ícone que "voa" do centro até a posição dele na barra da direita —
   elemento próprio, fora do overlay, pra poder animar livremente por
   cima de tudo. */
#iconeVoando{
    position:fixed;
    z-index:99999;
    border-radius:50%;
    box-shadow:0 4px 20px rgba(0,0,0,0.5);
    transition: top 0.6s ease, left 0.6s ease, width 0.6s ease, height 0.6s ease, opacity 0.6s ease;
    pointer-events:none;
}
#iconeVoando img{ width:100%;height:100%;object-fit:contain;display:block; }
</style>
</head>
<body>

<div id="viewport">
    <div id="mapGiro">
        <div id="map"></div>
    </div>
</div>
<button id="btnCamada" onclick="alternarCamada()">🛰️</button>

<div id="barraOficiais" class="barra-progresso"></div>
<div id="barraBonus" class="barra-progresso" style="align-items:flex-end;"></div>

<div id="overlayBonus">
    <div id="overlayBonusTexto">Ponto bônus liberado! Quer ir até lá?</div>
    <div id="overlayBonusBotoes">
        <button id="btnBonusSim">✅ Sim, vamos!</button>
        <button id="btnBonusNao">Agora não</button>
    </div>
</div>

<div id="iconeVoando"><img id="iconeVoandoImg" src=""></div>

<script>

// Zoom fixo, sempre o mesmo — foco total no entorno próximo (o
// próximo ponto obrigatório), em vez de mostrar o parque inteiro.
// Modo simples de navegação: mapa sempre centralizado em quem está
// jogando, sem precisar arrastar nem dar zoom manual.
const ZOOM_FOCO = 18;

let mapa = L.map('map', {
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false,
    boxZoom: false,
    keyboard: false
}).setView([-30.0346, -51.2177], ZOOM_FOCO);

// Duas camadas de base — ruas (OpenStreetMap) e satélite (Esri World
// Imagery, gratuito, sem precisar de chave de API) — alternadas pelo
// botão #btnCamada.
const camadaRuas = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
});

const camadaSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
});

camadaRuas.addTo(mapa);

let sateliteAtivo = false;

function alternarCamada(){

    if(sateliteAtivo){
        mapa.removeLayer(camadaSatelite);
        camadaRuas.addTo(mapa);
        document.getElementById('btnCamada').textContent = '🛰️';
    } else {
        mapa.removeLayer(camadaRuas);
        camadaSatelite.addTo(mapa);
        document.getElementById('btnCamada').textContent = '🗺️';
    }

    sateliteAtivo = !sateliteAtivo;

}

// Perímetro do parque — não fica fixo aqui, vem de fora (campo
// "perimetro" da coleção "Parques" no CMS) via postMessage.
let camadaPerimetro = null;
let camadaMascara = null;

// Retângulo enorme (cobre o mapa inteiro) com um "buraco" no formato
// do parque — o resultado visual é tudo fora do perímetro ficando
// coberto de branco, só o parque aparecendo por baixo.
function desenharMascara(coordenadas){

    const anelExterno = [[-85,-180],[-85,180],[85,180],[85,-180]];
    const buraco = coordenadas.map(c => [c[1], c[0]]);

    camadaMascara = L.polygon([anelExterno, buraco], {
        stroke: false,
        fillColor: '#000000',
        fillOpacity: 0.5
    }).addTo(mapa);

    camadaMascara.bringToBack();

}

function desenharPerimetro(coordenadas){

    if(!coordenadas || !coordenadas.length) return;

    if(camadaPerimetro){
        mapa.removeLayer(camadaPerimetro);
    }

    if(camadaMascara){
        mapa.removeLayer(camadaMascara);
    }

    camadaPerimetro = L.geoJSON({
        type: "Polygon",
        coordinates: [coordenadas]
    }, {
        style: {
            color: '#000000',
            weight: 3,
            fillColor: 'transparent'
        }
    }).addTo(mapa);

    desenharMascara(coordenadas);

    Object.values(marcadoresPontos).forEach(m => m.bringToFront());
    if(marcadorEu) marcadorEu.bringToFront();
    if(marcadorLargada) marcadorLargada.bringToFront();

    // Zoom agora é sempre fixo (ZOOM_FOCO) — não dá mais fitBounds no
    // perímetro inteiro, senão perderia o foco no ponto próximo.

}

let marcadoresPontos = {};
let marcadoresBonus = {};
let marcadorEu = null;

// Tipos cujo desenho original já é mais escuro — usam um filtro
// mais leve (sem escurecer ainda mais) quando ainda não achado.
const TIPOS_FILTRO_LEVE = ['travessuras'];

// Ícones em divIcon com um wrapper .giro-marcador por dentro — é
// esse wrapper que recebe o contra-giro (aplicarContraGiro), não o
// marcador inteiro, senão o Leaflet perderia a posição dele no mapa.
function iconeBonus(url, achado, tipo){

    if(url){
        let classe = 'icone-ponto-img';
        if(!achado){
            classe += TIPOS_FILTRO_LEVE.includes(tipo) ? ' icone-ponto-cinza-leve' : ' icone-ponto-cinza';
        }
        return L.divIcon({
            className: '',
            html: '<div class="giro-marcador"><img src="' + url + '" class="' + classe + '"></div>',
            iconSize: [40,40],
            iconAnchor: [20,40]
        });
    }

    return L.divIcon({
        className: '',
        html: '<div class="giro-marcador"><div class="icone-bonus">?</div></div>',
        iconSize: [30,30],
        iconAnchor: [15,15]
    });
}

function desenharPontosBonus(pontosBonus){

    Object.values(marcadoresBonus).forEach(m => mapa.removeLayer(m));
    marcadoresBonus = {};

    pontosBonus.forEach(ponto => {

        if(!ponto.latitude || !ponto.longitude) return;

        const marcador = L.marker([ponto.latitude, ponto.longitude], {
            icon: iconeBonus(ponto.icone, ponto.achado, ponto.tipo)
        }).addTo(mapa);

        marcador.on('click', () => {
            parent.postMessage({ acao: 'pontoBonusClicado', id: ponto.id }, '*');
        });

        marcadoresBonus[ponto.id] = marcador;

    });

    aplicarContraGiro();

    renderizarBarraBonus(pontosBonus);

}

// Ícones customizados (imagens do Gerenciador de Mídia do Wix).
const ICONES_NUMERADOS = {
    1: "https://static.wixstatic.com/media/f02643_48f7c1d977754b23977fd2e7f58c6c27~mv2.png",
    2: "https://static.wixstatic.com/media/f02643_f14858e9c66d43feae48eff43148759e~mv2.png",
    3: "https://static.wixstatic.com/media/f02643_cba7ab04f17845d98a60cbdb48466302~mv2.png",
    4: "https://static.wixstatic.com/media/f02643_ea984cd4c0fc44aead08ba7a5af6b383~mv2.png",
    5: "https://static.wixstatic.com/media/f02643_6a69d7baa0794d37848b3948fed51e44~mv2.png",
    6: "https://static.wixstatic.com/media/f02643_801dffdc2e554552a5c134e097d91ea6~mv2.png",
    7: "https://static.wixstatic.com/media/f02643_cd0ee07d3fcd40fb9a33810c88f2d851~mv2.png",
    8: "https://static.wixstatic.com/media/f02643_91b88885a5c44c8c833417bc1190b7b5~mv2.png",
    9: "https://static.wixstatic.com/media/f02643_1b89172049664af79ec14bce19a83033~mv2.png",
    10: "https://static.wixstatic.com/media/f02643_033f68da0d1044bcbd9a97da09181820~mv2.png",
    11: "https://static.wixstatic.com/media/f02643_193c340555f24225b4d92d767d84255a~mv2.png",
    12: "https://static.wixstatic.com/media/f02643_1ff212affeb84c9584f484f04ba0535e~mv2.png",
    13: "https://static.wixstatic.com/media/f02643_741fb6aae44744de8ed6e009fb318faf~mv2.png",
    14: "https://static.wixstatic.com/media/f02643_b1b9ad3701be4696815636ec5dc6cedc~mv2.png",
    15: "https://static.wixstatic.com/media/f02643_ed5489163f5f4182b136c62a8f93eb33~mv2.png"
};
const ICONE_CHEGADA = "https://static.wixstatic.com/media/f02643_744242f786c449fe9a7c6133d6b91464~mv2.png";
const ICONE_LARGADA = "https://static.wixstatic.com/media/f02643_83d5d7c16a834a8e9a7a4205276fc8cf~mv2.png";

let marcadorLargada = null;

// Abre o mapa centralizado na largada (não na localização crua da
// família) só até a primeira localização ao vivo chegar — a partir
// daí quem manda no enquadramento é atualizarMinhaLocalizacao().
let primeiroDesenhoLargada = true;

function desenharLargada(latitude, longitude){

    if(!latitude || !longitude) return;

    if(marcadorLargada){
        mapa.removeLayer(marcadorLargada);
    }

    marcadorLargada = L.marker([latitude, longitude], {
        icon: L.divIcon({
            className: '',
            html: '<div class="giro-marcador"><img src="' + ICONE_LARGADA + '" class="icone-ponto-img"></div>',
            iconSize: [40,40],
            iconAnchor: [20,40]
        }),
        zIndexOffset: 900
    }).addTo(mapa);

    if(primeiroDesenhoLargada){
        mapa.setView([latitude, longitude], ZOOM_FOCO);
        primeiroDesenhoLargada = false;
    }

    aplicarContraGiro();

}

function iconePonto(codigo, ehChegada, concluido){
    const url = ehChegada ? ICONE_CHEGADA : (ICONES_NUMERADOS[codigo] || ICONES_NUMERADOS[1]);
    const classe = 'icone-ponto-img' + (concluido ? '' : ' icone-ponto-cinza');
    return L.divIcon({
        className: '',
        html: '<div class="giro-marcador"><img src="' + url + '" class="' + classe + '"></div>',
        iconSize: [40,40],
        iconAnchor: [20,40]
    });
}

function desenharPontos(pontos){

    Object.values(marcadoresPontos).forEach(m => mapa.removeLayer(m));
    marcadoresPontos = {};

    const maiorCodigo = Math.max(...pontos.map(p => p.codigo));

    pontos.forEach(ponto => {

        if(!ponto.latitude || !ponto.longitude) return;

        const marcador = L.marker([ponto.latitude, ponto.longitude], {
            icon: iconePonto(ponto.codigo, ponto.codigo === maiorCodigo, ponto.concluido)
        }).addTo(mapa);

        marcador.on('click', () => {
            parent.postMessage({ acao: 'pontoClicado', codigo: ponto.codigo }, '*');
        });

        marcadoresPontos[ponto.codigo] = marcador;

    });

    // Zoom agora é sempre fixo (ZOOM_FOCO) — não dá mais fitBounds nos
    // pontos, senão perderia o foco no ponto próximo.
    aplicarContraGiro();

    renderizarBarraOficiais(pontos, maiorCodigo);

}

//==================================================
// BARRAS DE PROGRESSO (dentro do mapa)
//==================================================
// Ficam fora do #mapGiro (não giram) — mostram de relance quais
// pontos já foram feitos, sem precisar do mapa cheio como antes.
// Cliques disparam a mesma mensagem que um marcador do mapa dispara.

const TAMANHO_MAX_ICONE_BARRA = 34;
const TAMANHO_MIN_ICONE_BARRA = 16;
const GAP_BARRA = 6;

// Encolhe os ícones o quanto precisar pra a fileira inteira caber na
// altura disponível, sem cortar nem precisar rolar (com poucos
// pontos, fica no tamanho máximo normal).
function ajustarTamanhoBarra(idBarra){

    const barra = document.getElementById(idBarra);
    const itens = barra.children;
    const total = itens.length;

    if(total === 0) return;

    const alturaDisponivel = barra.clientHeight;
    const alturaComGaps = alturaDisponivel - GAP_BARRA * (total - 1);

    let tamanho = Math.floor(alturaComGaps / total);
    tamanho = Math.max(TAMANHO_MIN_ICONE_BARRA, Math.min(TAMANHO_MAX_ICONE_BARRA, tamanho));

    for(let i = 0; i < total; i++){
        itens[i].style.width = tamanho + 'px';
        itens[i].style.height = tamanho + 'px';
    }

}

function renderizarBarraOficiais(pontos, maiorCodigo){

    const barra = document.getElementById('barraOficiais');
    barra.innerHTML = '';

    pontos.forEach((ponto) => {

        const url = ponto.codigo === maiorCodigo
            ? ICONE_CHEGADA
            : (ICONES_NUMERADOS[ponto.codigo] || ICONES_NUMERADOS[1]);

        const item = document.createElement('div');
        item.className = 'icone-barra';

        const img = document.createElement('img');
        img.src = url;
        if(!ponto.concluido){
            img.className = 'icone-ponto-cinza';
        }

        item.appendChild(img);

        item.addEventListener('click', () => {
            parent.postMessage({ acao: 'pontoClicado', codigo: ponto.codigo }, '*');
        });

        barra.appendChild(item);

    });

    ajustarTamanhoBarra('barraOficiais');

}

// Ids de bônus com a animação de liberação em andamento — ficam
// reservados (espaço ocupado, mas invisíveis) na barra até a
// animação terminar, pra não aparecer duplicado nem "pular" no lugar.
const bonusEmCelebracao = new Set();
let ultimoPontosBonus = [];

function renderizarBarraBonus(pontosBonus){

    ultimoPontosBonus = pontosBonus;

    const barra = document.getElementById('barraBonus');
    barra.innerHTML = '';

    pontosBonus.forEach((ponto) => {

        const item = document.createElement('div');
        item.className = 'icone-barra' + (bonusEmCelebracao.has(ponto.id) ? ' invisivel' : '');
        item.setAttribute('data-bonus-id', ponto.id);

        const img = document.createElement('img');
        img.src = ponto.icone;
        if(!ponto.achado){
            img.className = 'icone-ponto-cinza';
        }

        item.appendChild(img);

        item.addEventListener('click', () => {
            parent.postMessage({ acao: 'pontoBonusClicado', id: ponto.id }, '*');
        });

        barra.appendChild(item);

    });

    ajustarTamanhoBarra('barraBonus');

}

//==================================================
// BÔNUS LIBERADO — popup grande + animação até a barra
//==================================================

let bonusAguardando = null;

function mostrarBonusLiberado(bonus){

    bonusAguardando = bonus;

    bonusEmCelebracao.add(bonus.id);
    renderizarBarraBonus(ultimoPontosBonus);

    document.getElementById('overlayBonusTexto').textContent =
        bonus.titulo + ' liberado! Quer ir até lá?';

    document.getElementById('overlayBonus').style.display = 'flex';

    const voando = document.getElementById('iconeVoando');
    const img = document.getElementById('iconeVoandoImg');

    img.src = bonus.icone;

    // Tudo em pixel absoluto (nada de margem/transform) — são
    // exatamente as mesmas propriedades que a transição do CSS
    // observa (top/left/width/height/opacity), então anima liso do
    // início ao fim, sem pulo no meio do caminho.
    const tamanhoInicial = 120;

    voando.style.transition = 'none';
    voando.style.opacity = '1';
    voando.style.width = tamanhoInicial + 'px';
    voando.style.height = tamanhoInicial + 'px';
    voando.style.top = (window.innerHeight * 0.3 - tamanhoInicial / 2) + 'px';
    voando.style.left = (window.innerWidth * 0.5 - tamanhoInicial / 2) + 'px';
    voando.style.display = 'block';

    // Força o navegador a aplicar o estado inicial antes de religar a
    // transição — senão essa primeira aparição também animaria.
    void voando.offsetWidth;
    voando.style.transition = '';

}

function fecharOverlayBonus(){

    document.getElementById('overlayBonus').style.display = 'none';

    const voando = document.getElementById('iconeVoando');
    const alvo = bonusAguardando
        ? document.querySelector('.icone-barra[data-bonus-id="' + bonusAguardando.id + '"]')
        : null;

    if(alvo){

        const rect = alvo.getBoundingClientRect();

        voando.style.top = rect.top + 'px';
        voando.style.left = rect.left + 'px';
        voando.style.width = rect.width + 'px';
        voando.style.height = rect.height + 'px';
        voando.style.opacity = '0';

    } else {

        voando.style.opacity = '0';

    }

    const idTerminando = bonusAguardando ? bonusAguardando.id : null;
    bonusAguardando = null;

    setTimeout(() => {

        voando.style.display = 'none';

        if(idTerminando){
            bonusEmCelebracao.delete(idTerminando);
            renderizarBarraBonus(ultimoPontosBonus);
        }

    }, 650);

}

document.getElementById('btnBonusSim').addEventListener('click', () => {

    if(bonusAguardando){
        parent.postMessage({ acao: 'pontoBonusClicado', id: bonusAguardando.id }, '*');
    }

    fecharOverlayBonus();

});

document.getElementById('btnBonusNao').addEventListener('click', () => {
    fecharOverlayBonus();
});

// Distância (metros) que o centro do mapa fica deslocado pra frente
// de quem está jogando — não centraliza exatamente em cima da pessoa,
// centraliza um pouco à frente. Resultado: o pontinho acaba sobrando
// mais pra baixo na tela, sobrando mais mapa visível do que vem pela
// frente (igual apps de navegação a pé).
const DESLOCAMENTO_FRENTE_M = 25;

// Calcula um ponto a uma distância/direção de outro (fórmula padrão
// de "destino a partir de origem + bearing + distância", esfera).
function deslocarPonto(lat, lng, bearingGraus, distanciaMetros){

    const R = 6371000;
    const brng = bearingGraus * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lon1 = lng * Math.PI / 180;

    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(distanciaMetros / R) +
        Math.cos(lat1) * Math.sin(distanciaMetros / R) * Math.cos(brng)
    );

    const lon2 = lon1 + Math.atan2(
        Math.sin(brng) * Math.sin(distanciaMetros / R) * Math.cos(lat1),
        Math.cos(distanciaMetros / R) - Math.sin(lat1) * Math.sin(lat2)
    );

    return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];

}

// Direção (bearing, 0°=Norte, sentido horário) de um ponto até outro
// — mesma fórmula que a seta antiga usava.
function calcularBearing(lat1, lon1, lat2, lon2){

    const toRad = g => g * Math.PI / 180;
    const toGrau = r => r * 180 / Math.PI;

    const dLon = toRad(lon2 - lon1);

    const y = Math.sin(dLon) * Math.cos(toRad(lat2));

    const x =
        Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

    return (toGrau(Math.atan2(y, x)) + 360) % 360;

}

const ICONE_EU = "https://static.wixstatic.com/media/f02643_750c3c17b1fd4cbc929e825f71145400~mv2.png";

function iconeEuSvg(){
    return '<div class="icone-eu-seta"><img src="' + ICONE_EU + '"></div>';
}

let minhaLatAtual = null;
let minhaLngAtual = null;
let alvoLat = null;
let alvoLng = null;

// Gira o pontinho (que agora é a seta) pra apontar pro alvo. Só
// precisa do bearing puro (sem descontar o heading) — o desconto já
// acontece uma vez só, no giro do mapa inteiro (#mapGiro); como o
// pontinho gira JUNTO com o mapa, o resultado na tela já sai certo.
function atualizarSetaEu(){

    if(!marcadorEu) return;

    const el = marcadorEu.getElement();
    if(!el) return;

    const seta = el.querySelector('.icone-eu-seta');
    if(!seta) return;

    let angulo = 0;

    if(minhaLatAtual !== null && minhaLngAtual !== null && alvoLat !== null && alvoLng !== null){
        angulo = calcularBearing(minhaLatAtual, minhaLngAtual, alvoLat, alvoLng);
    }

    seta.style.transform = 'rotate(' + angulo + 'deg)';

}

// Marca onde a família está e recentraliza o mapa (deslocado pra
// frente) nela, sempre — modo foco: mapa segue a pessoa em vez dela
// precisar arrastar.
function atualizarMinhaLocalizacao(lat, lng){

    minhaLatAtual = lat;
    minhaLngAtual = lng;

    if(!marcadorEu){
        marcadorEu = L.marker([lat,lng], {
            icon: L.divIcon({ className:'', html: iconeEuSvg(), iconSize:[50,50], iconAnchor:[25,25] }),
            zIndexOffset: 1000
        }).addTo(mapa);
    } else {
        marcadorEu.setLatLng([lat,lng]);
    }

    atualizarSetaEu();

    const [latCentro, lngCentro] = deslocarPonto(lat, lng, anguloAtual, DESLOCAMENTO_FRENTE_M);

    mapa.setView([latCentro, lngCentro], ZOOM_FOCO, { animate: true });

}

// Gira o mapa inteiro (#mapGiro) pro sentido oposto do heading da
// bússola — assim "pra cima na tela" sempre é "pra frente de quem
// está segurando o celular", igual ao modo bússola do Google Maps.
// Cada marcador tem seu próprio contra-giro (.giro-marcador) pra não
// ficar de cabeça pra baixo.
let anguloAtual = 0;

function girarMapa(heading){

    if(typeof heading !== 'number' || isNaN(heading)) return;

    anguloAtual = heading;

    const giro = document.getElementById('mapGiro');
    if(giro){
        giro.style.transform = 'rotate(' + (-heading) + 'deg)';
    }

    aplicarContraGiro();

}

function aplicarContraGiro(){

    document.querySelectorAll('.giro-marcador').forEach((el) => {
        el.style.transform = 'rotate(' + anguloAtual + 'deg)';
    });

}

// A geolocalização não é pega aqui dentro do iframe (costuma ser
// bloqueada por política de segurança) — vem de fora, via postMessage,
// usando a mesma wixWindow.getCurrentGeolocation() que a página já usa
// pra conferir os pontos.
window.onmessage = function(event){

    const dados = event.data || {};

    if(dados.acao === 'pontos'){
        desenharPontos(dados.pontos || []);
    }

    if(dados.acao === 'perimetro'){
        desenharPerimetro(dados.coordenadas || []);
    }

    if(dados.acao === 'largada'){
        desenharLargada(dados.latitude, dados.longitude);
    }

    if(dados.acao === 'pontosBonus'){
        desenharPontosBonus(dados.pontos || []);
    }

    if(dados.acao === 'minhaLocalizacao'){
        atualizarMinhaLocalizacao(dados.lat, dados.lng);
    }

    if(dados.acao === 'heading'){
        girarMapa(dados.valor);
    }

    if(dados.acao === 'alvoAtual'){
        alvoLat = dados.latitude;
        alvoLng = dados.longitude;
        atualizarSetaEu();
    }

    if(dados.acao === 'bonusLiberado' && dados.bonus){
        mostrarBonusLiberado(dados.bonus);
    }

};

parent.postMessage({ acao: 'mapaPronto' }, '*');

</script>

</body>
</html>`;
