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
#map{width:100%;height:100%;border-radius:16px;}
.icone-eu{
    background:#2b6ef2;
    width:18px;height:18px;
    border-radius:50%;
    border:3px solid #fff;
    box-shadow:0 0 0 2px #2b6ef2, 0 1px 4px rgba(0,0,0,0.5);
}
</style>
</head>
<body>

<div id="map"></div>

<script>

let mapa = L.map('map', { zoomControl: true }).setView([-30.0346, -51.2177], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
}).addTo(mapa);

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
        fillOpacity: 0.93
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

}

let marcadoresPontos = {};
let marcadorEu = null;
let primeiraLocalizacao = true;

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

function iconePonto(codigo, ehChegada){
    const url = ehChegada ? ICONE_CHEGADA : (ICONES_NUMERADOS[codigo] || ICONES_NUMERADOS[1]);
    return L.icon({
        iconUrl: url,
        iconSize: [40,40],
        iconAnchor: [20,40]
    });
}

function desenharPontos(pontos){

    Object.values(marcadoresPontos).forEach(m => mapa.removeLayer(m));
    marcadoresPontos = {};

    const bounds = [];

    const maiorCodigo = Math.max(...pontos.map(p => p.codigo));

    pontos.forEach(ponto => {

        if(!ponto.latitude || !ponto.longitude) return;

        const marcador = L.marker([ponto.latitude, ponto.longitude], {
            icon: iconePonto(ponto.codigo, ponto.codigo === maiorCodigo)
        }).addTo(mapa);

        marcador.on('click', () => {
            parent.postMessage({ acao: 'pontoClicado', codigo: ponto.codigo }, '*');
        });

        marcadoresPontos[ponto.codigo] = marcador;
        bounds.push([ponto.latitude, ponto.longitude]);

    });

    if(bounds.length){
        mapa.fitBounds(bounds, { padding: [40,40] });
    }

}

function atualizarMinhaLocalizacao(lat, lng){

    if(!marcadorEu){
        marcadorEu = L.marker([lat,lng], {
            icon: L.divIcon({ className:'', html:'<div class="icone-eu"></div>', iconSize:[18,18], iconAnchor:[9,9] }),
            zIndexOffset: 1000
        }).addTo(mapa);
    } else {
        marcadorEu.setLatLng([lat,lng]);
    }

    if(primeiraLocalizacao){
        primeiraLocalizacao = false;
        mapa.setView([lat,lng], 17);
    }

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

    if(dados.acao === 'minhaLocalizacao'){
        atualizarMinhaLocalizacao(dados.lat, dados.lng);
    }

};

parent.postMessage({ acao: 'mapaPronto' }, '*');

</script>

</body>
</html>`;
