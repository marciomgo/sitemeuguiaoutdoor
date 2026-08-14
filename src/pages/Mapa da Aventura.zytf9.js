import wixWindow from 'wix-window';
import wixData from 'wix-data';
import { htmlMapaGps } from 'public/mapaGpsHtml';

// Página de teste do mapa GPS (Leaflet) — pontos fixos, só pra
// validar o mapa funcionando antes de conectar na missão de verdade.

// Coordenadas reais dos pontos da missão (do Google My Maps).
const PONTOS_TESTE = [
    { codigo: 1, latitude: -30.0378222, longitude: -51.2163404, concluido: true },
    { codigo: 2, latitude: -30.0369352, longitude: -51.2163776, concluido: true },
    { codigo: 3, latitude: -30.0353764, longitude: -51.2180724, concluido: false },
    { codigo: 4, latitude: -30.0350734, longitude: -51.2195838, concluido: false },
    { codigo: 5, latitude: -30.0351699, longitude: -51.215422, concluido: false },
    { codigo: 6, latitude: -30.034983, longitude: -51.21381, concluido: false },
    { codigo: 7, latitude: -30.0368684, longitude: -51.2141901, concluido: false },
    { codigo: 8, latitude: -30.0381922, longitude: -51.2149293, concluido: false }
];

let intervaloLocalizacao;

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

            carregarPerimetro();

            atualizarLocalizacao();
            intervaloLocalizacao = setInterval(atualizarLocalizacao, 5000);

        } else if (dados.acao === "pontoClicado") {

            console.log("Ponto clicado:", dados.codigo);

        }

    });

});

// Pega o perímetro do parque no CMS (coleção "Parques", campo
// "perimetro" com a lista de coordenadas em JSON) — teste busca o
// primeiro parque cadastrado, direto (sem passar por missão ainda).
function carregarPerimetro() {

    wixData.query("Parques")
        .limit(1)
        .find()
        .then((resultado) => {

            if (resultado.items.length === 0) {
                console.log("Nenhum parque cadastrado ainda.");
                return;
            }

            const parque = resultado.items[0];

            const coordenadas = JSON.parse(parque.perimetro || "[]");

            $w("#htmlMapaGps").postMessage({
                acao: "perimetro",
                coordenadas: coordenadas
            });

        })
        .catch((err) => {
            console.error("Erro ao carregar perímetro:", err);
        });

}

function atualizarLocalizacao() {

    wixWindow.getCurrentGeolocation()
        .then((posicao) => {

            $w("#htmlMapaGps").postMessage({
                acao: "minhaLocalizacao",
                lat: posicao.coords.latitude,
                lng: posicao.coords.longitude
            });

        })
        .catch((err) => {
            console.error("Erro ao buscar localização:", err);
        });

}
