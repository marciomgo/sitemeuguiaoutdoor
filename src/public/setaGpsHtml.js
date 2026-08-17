// Filename: public/setaGpsHtml.js
//
// Seta de navegação (bússola) — widget independente do mapa GPS,
// mesmo padrão de HTML embutido (data:text/html) dos outros arquivos
// desse projeto (mapaGpsHtml.js, conteudoPanelHtml.js).
//
// A bússola inteira (pedido de permissão no iOS + leitura do sensor)
// vive AQUI DENTRO, não na página do Wix — o clique através do
// $w(...).onClick() do Wix não é "gesto direto" o suficiente pro
// Safari liberar a permissão (mesma trava que o botão de copiar PIX
// já mostrou nesse projeto). Um botão HTML nativo, dentro do iframe,
// resolve isso.
//
// Recebe da página: a localização atual (mesmo formato usado no
// mapa) e o próximo ponto alvo. Calcula o bearing e gira a seta.

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
    font-family:Arial,Helvetica,sans-serif;
}
#container{
    width:100%;height:100%;
    display:flex;align-items:center;justify-content:center;
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
#btnAtivar{
    padding:14px 20px;
    font-size:15px;
    font-weight:bold;
    border:none;
    border-radius:10px;
    background:#2b6ef2;
    color:#fff;
    cursor:pointer;
}
</style>
</head>
<body>

<div id="container">

    <button id="btnAtivar" onclick="ativarBussola()">🧭 Ativar bússola</button>

    <div id="seta" style="display:none;">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <polygon points="50,6 78,88 50,68 22,88" fill="#2b6ef2" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"/>
        </svg>
    </div>

</div>

<script>

const btnAtivar = document.getElementById('btnAtivar');
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

function aoReceberOrientacao(evento){

    if(typeof evento.webkitCompassHeading === 'number'){

        // iOS — já vem absoluto (0° = Norte).
        heading = evento.webkitCompassHeading;

    } else if(evento.absolute && typeof evento.alpha === 'number'){

        // Android — "alpha" cresce sentido anti-horário a partir do
        // Norte, o oposto de heading de bússola.
        heading = (360 - evento.alpha) % 360;

    } else if(typeof evento.alpha === 'number'){

        // Sem confirmação de "absolute" — usa mesmo assim, melhor
        // que nada em aparelhos que não mandam esse sinalizador.
        heading = (360 - evento.alpha) % 360;

    } else {
        return;
    }

    atualizarRotacao();

}

function iniciarEscuta(){

    btnAtivar.style.display = 'none';
    seta.style.display = 'flex';

    if('ondeviceorientationabsolute' in window){
        window.addEventListener('deviceorientationabsolute', aoReceberOrientacao);
    } else {
        window.addEventListener('deviceorientation', aoReceberOrientacao);
    }

}

// Clique nativo (onclick do HTML puro, não passa pelo Wix) — é isso
// que faz o iOS aceitar como gesto direto de verdade.
function ativarBussola(){

    if(typeof DeviceOrientationEvent !== 'undefined' &&
       typeof DeviceOrientationEvent.requestPermission === 'function'){

        DeviceOrientationEvent.requestPermission()
            .then((resultado) => {

                if(resultado === 'granted'){
                    iniciarEscuta();
                } else {
                    btnAtivar.textContent = '⚠️ Permissão negada';
                }

            })
            .catch(() => {
                btnAtivar.textContent = '⚠️ Erro ao pedir permissão';
            });

    } else {

        // Android e navegadores que não exigem essa permissão.
        iniciarEscuta();

    }

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

};

parent.postMessage({ acao: 'setaPronta' }, '*');

</script>

</body>
</html>`;
