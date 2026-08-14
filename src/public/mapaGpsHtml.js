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
