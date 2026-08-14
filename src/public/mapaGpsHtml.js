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
html,body{margin:0;padding:0;height:100%;}
#map{width:100%;height:100%;}
.icone-ponto{
    background:#e8622c;
    color:#fff;
    border-radius:50%;
    width:32px;height:32px;
    display:flex;align-items:center;justify-content:center;
    font-weight:bold;font-size:14px;
    border:2px solid #fff;
    box-shadow:0 1px 4px rgba(0,0,0,0.4);
}
.icone-ponto.concluido{ background:#3fa34d; }
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

// Perímetro real do Parque Farroupilha (dados do OpenStreetMap).
const PERIMETRO_PARQUE = {
    "type": "MultiPolygon",
    "coordinates": [[[[-51.2207589,-30.0347492],[-51.2207431,-30.0348915],[-51.220051,-30.0360148],[-51.2199704,-30.0361823],[-51.2198179,-30.0365081],[-51.2192948,-30.0372297],[-51.2171422,-30.0399781],[-51.217017,-30.0400697],[-51.2168814,-30.040051],[-51.214856,-30.0388624],[-51.2148127,-30.038837],[-51.2144177,-30.0386053],[-51.2143815,-30.038584],[-51.2113983,-30.0368334],[-51.2107808,-30.0364617],[-51.2108085,-30.0360032],[-51.2115343,-30.0356336],[-51.2153384,-30.0336514],[-51.2154543,-30.0336073],[-51.2157432,-30.0338004],[-51.2159959,-30.033917],[-51.2166386,-30.0340558],[-51.2167529,-30.0340968],[-51.2171541,-30.0342346],[-51.21731,-30.0343153],[-51.2175765,-30.034653],[-51.2176439,-30.0346964],[-51.2177259,-30.0347215],[-51.2178032,-30.0347197],[-51.2179038,-30.0346853],[-51.2181777,-30.0345917],[-51.2196663,-30.0344119],[-51.2202253,-30.0343444],[-51.220402,-30.0343445],[-51.2205392,-30.0343904],[-51.2207131,-30.0345399],[-51.2207493,-30.0346356],[-51.2207589,-30.0347492]]],[[[-51.2189088,-30.0328203],[-51.2180875,-30.033998],[-51.2179458,-30.0341847],[-51.2178444,-30.0341541],[-51.2173831,-30.0342323],[-51.2167238,-30.0339796],[-51.216669,-30.0339588],[-51.216037,-30.033814],[-51.2156004,-30.0335611],[-51.2173109,-30.0331833],[-51.2178398,-30.0330689],[-51.2189088,-30.0328203]]]]
};

L.geoJSON(PERIMETRO_PARQUE, {
    style: {
        color: '#2b6ef2',
        weight: 3,
        dashArray: '6 6',
        fillColor: '#2b6ef2',
        fillOpacity: 0.08
    }
}).addTo(mapa);

let marcadoresPontos = {};
let marcadorEu = null;
let primeiraLocalizacao = true;

function iconePonto(codigo, concluido){
    return L.divIcon({
        className: '',
        html: '<div class="icone-ponto' + (concluido ? ' concluido' : '') + '">' + codigo + '</div>',
        iconSize: [32,32],
        iconAnchor: [16,16]
    });
}

function desenharPontos(pontos){

    Object.values(marcadoresPontos).forEach(m => mapa.removeLayer(m));
    marcadoresPontos = {};

    const bounds = [];

    pontos.forEach(ponto => {

        if(!ponto.latitude || !ponto.longitude) return;

        const marcador = L.marker([ponto.latitude, ponto.longitude], {
            icon: iconePonto(ponto.codigo, ponto.concluido)
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

    if(dados.acao === 'minhaLocalizacao'){
        atualizarMinhaLocalizacao(dados.lat, dados.lng);
    }

};

parent.postMessage({ acao: 'mapaPronto' }, '*');

</script>

</body>
</html>`;
