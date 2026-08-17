// Filename: public/setaGpsHtml.js
//
// Seta de navegação (bússola) — widget independente do mapa GPS,
// mesmo padrão de HTML embutido (data:text/html) dos outros arquivos
// desse projeto (mapaGpsHtml.js, conteudoPanelHtml.js).
//
// Esse arquivo só faz a conta (bearing) e gira a seta — não pede
// permissão nem lê o sensor de bússola. Isso ficou pra ser feito do
// lado da página do Wix (endereço de verdade, https://...), porque
// dentro desse iframe (data: URI) o navegador trata como uma origem
// "sem endereço", e o iOS parece não disponibilizar a permissão de
// bússola nesse contexto (por isso a tentativa anterior, com o botão
// dentro do iframe, não funcionou).
//
// Recebe da página: localização atual, próximo ponto alvo, e a
// direção da bússola (heading) já lida.

export const htmlSetaGps = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
html,body{
    margin:0;padding:0;
    width:100%;height:100%;
    overflow:hidden;
    background:transparent;
}
#seta{
    width:100%;height:100%;
    display:flex;align-items:center;justify-content:center;
    transition: transform 0.15s linear;
    transform: rotate(0deg);
}
#seta svg{
    width:70%;height:70%;
}
</style>
</head>
<body>

<div id="seta">
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <polygon points="50,6 78,88 50,68 22,88" fill="#2b6ef2" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"/>
    </svg>
</div>

<script>

const seta = document.getElementById('seta');

let minhaLat = null;
let minhaLng = null;
let alvoLat = null;
let alvoLng = null;
let heading = null;

function calcularBearing(lat1, lon1, lat2, lon2){

    const toRad = g => g * Math.PI / 180;
    const toGrau = r => r * 180 / Math.PI;

    const dLon = toRad(lon2 - lon1);

    const y = Math.sin(dLon) * Math.cos(toRad(lat2));

    const x =
        Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

    const bearing = toGrau(Math.atan2(y, x));

    return (bearing + 360) % 360;

}

function atualizarRotacao(){

    if(minhaLat === null || minhaLng === null || alvoLat === null || alvoLng === null || heading === null){
        return;
    }

    const bearing = calcularBearing(minhaLat, minhaLng, alvoLat, alvoLng);
    const angulo = (bearing - heading + 360) % 360;

    seta.style.transform = 'rotate(' + angulo + 'deg)';

}

window.onmessage = function(event){

    const dados = event.data || {};

    if(dados.acao === 'minhaLocalizacao'){
        minhaLat = dados.lat;
        minhaLng = dados.lng;
        atualizarRotacao();
    }

    if(dados.acao === 'proximoPonto'){
        alvoLat = dados.latitude;
        alvoLng = dados.longitude;
        atualizarRotacao();
    }

    if(dados.acao === 'heading'){
        heading = dados.valor;
        atualizarRotacao();
    }

};

parent.postMessage({ acao: 'setaPronta' }, '*');

</script>

</body>
</html>`;
