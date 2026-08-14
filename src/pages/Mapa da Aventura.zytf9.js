import wixWindow from 'wix-window';
import wixData from 'wix-data';
import { htmlMapaGps } from 'public/mapaGpsHtml';

// Página de teste do mapa GPS (Leaflet) — busca os pontos e o
// perímetro reais do CMS, pra validar o mapa antes de conectar na
// tela da missão de verdade.

let intervaloLocalizacao;

$w.onReady(function () {

    $w("#htmlMapaGps").src =
        `data:text/html;charset=utf-8,${encodeURIComponent(htmlMapaGps)}`;

    $w("#htmlMapaGps").onMessage((event) => {

        const dados = event.data;

        console.log("Mensagem do mapa:", dados);

        if (dados.acao === "mapaPronto") {

            carregarPontos();
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
// Pega os pontos reais da missão "missao-1" no CMS.
function carregarPontos() {

    wixData.query("Missoes")
        .eq("slug", "missao-1")
        .eq("ativo", true)
        .limit(1)
        .find()
        .then((resultadoMissao) => {

            if (resultadoMissao.items.length === 0) {
                console.log("Missão missao-1 não encontrada.");
                return;
            }

            const missaoId = resultadoMissao.items[0]._id;

            return wixData.query("Pontos")
                .eq("missao", missaoId)
                .eq("ativo", true)
                .ascending("ordem")
                .find();

        })
        .then((resultadoPontos) => {

            if (!resultadoPontos) return;

            const pontos = resultadoPontos.items.map(item => ({
                codigo: Number(item.codigo),
                latitude: item.latitude,
                longitude: item.longitude,
                concluido: false
            }));

            console.log("Pontos carregados do CMS:", pontos);

            $w("#htmlMapaGps").postMessage({
                acao: "pontos",
                pontos: pontos
            });

        })
        .catch((err) => {
            console.error("Erro ao carregar pontos:", err);
        });

}

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
