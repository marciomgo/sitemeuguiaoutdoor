import { htmlMapaGps } from 'public/mapaGpsHtml';

// Página de teste do mapa GPS (Leaflet) — pontos fixos, só pra
// validar o mapa funcionando antes de conectar na missão de verdade.

const PONTOS_TESTE = [
    { codigo: 1, latitude: -30.0346, longitude: -51.2177, concluido: false },
    { codigo: 2, latitude: -30.0360, longitude: -51.2190, concluido: true },
    { codigo: 3, latitude: -30.0330, longitude: -51.2160, concluido: false }
];

$w.onReady(function () {

    $w("#htmlMapaGps").src =
        `data:text/html;charset=utf-8,${encodeURIComponent(htmlMapaGps)}`;

    $w("#htmlMapaGps").onMessage((event) => {

        const dados = event.data;

        console.log("Mensagem do mapa:", dados);

        if (dados.acao === "mapaPronto") {

            $w("#htmlMapaGps").postMessage({
                acao: "pontos",
                pontos: PONTOS_TESTE
            });

        } else if (dados.acao === "pontoClicado") {

            console.log("Ponto clicado:", dados.codigo);

        }

    });

});
