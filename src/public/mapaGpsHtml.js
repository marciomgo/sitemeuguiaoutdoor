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
}
#mapGiro{
    position:absolute;
    width:150%;height:150%;
    top:-25%;left:-25%;
    transition: transform 0.15s linear;
}
#map{width:100%;height:100%;}
/* Pontinho da família — agora é a própria seta, estilo mapa do
   tesouro (traço grosso, cor terrosa/dourada). Gira em volta do
   próprio centro (não do rodapé, diferente dos pinos) — é uma agulha,
   não um marcador fixo num lugar. */
.icone-eu-seta{
    width:100%;height:100%;
    transform-origin:50% 50%;
    filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));
    transition: transform 0.15s linear;
}
.icone-eu-seta svg{ width:100%;height:100%; }
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
</style>
</head>
<body>

<div id="viewport">
    <div id="mapGiro">
        <div id="map"></div>
    </div>
</div>
<button id="btnCamada" onclick="alternarCamada()">🛰️</button>

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

}

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

function iconeEuSvg(){
    return '<div class="icone-eu-seta"><svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<polygon points="50,4 90,92 50,68 10,92" fill="#ffcc00" stroke="#a67c00" stroke-width="6" stroke-linejoin="round"/>' +
        '</svg></div>';
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

};

parent.postMessage({ acao: 'mapaPronto' }, '*');

</script>

</body>
</html>`;
