import wixData from 'wix-data';
import wixLocation from 'wix-location';
import { local } from 'wix-storage';
import wixWindow from 'wix-window';

import { iniciarMotor, resetarProgresso, pularParaFinal, obterPontosParaMapa, verificarPontoPorCodigo } from 'public/motorMissao';
import { htmlMapaGps } from 'public/mapaGpsHtml';
import { calcularDistancia, raioPermitido } from 'public/gps';

let cronometro;
let intervaloLocalizacaoMapa;
let pontosBonus = [];
let mapaGpsVisivel = false;
let inicioDesafio = 0;
let tempoLimite = 0;
let desafioConcluido = true;

//==================================================
// CONFIGURAÇÃO DA PÁGINA
//==================================================

const SLUG = "missao-1";

//==================================================
// INICIALIZAÇÃO
//==================================================

$w.onReady(async function () {

    try {

//==================================================
// CONFIGURAÇÃO DA MISSÃO
//==================================================

const configMissao = JSON.parse(

    local.getItem("configMissao") ||

    "{}"

);

console.log("Configuração:");




console.log(configMissao);



const missao = await carregarMissao(SLUG);

tempoLimite = missao.tempoDesafio;

if (configMissao.desafio) {

    console.log("🏁 Modo Desafio Ativado");

    inicioDesafio = configMissao.inicio;

    $w("#boxModoDesafio").expand();

    iniciarCronometro();

} else {

    console.log("Modo Normal");

    $w("#boxModoDesafio").collapse();

}

console.log("Missão carregada:");
        console.log(missao);

        iniciarMotor($w, missao);


//=========================================
// MAPA DE APOIO
//=========================================


$w("#htmlMapaGps").collapse();

$w("#htmlMapaGps").src =
    `data:text/html;charset=utf-8,${encodeURIComponent(htmlMapaGps)}`;

$w("#htmlMapaGps").onMessage((event) => {

    const dadosMapa = event.data;

    if (dadosMapa.acao === "mapaPronto") {

        $w("#htmlMapaGps").postMessage({
            acao: "pontos",
            pontos: obterPontosParaMapa()
        });

        $w("#htmlMapaGps").postMessage({
            acao: "largada",
            latitude: missao.latitudeInicio,
            longitude: missao.longitudeInicio
        });

        carregarPerimetroMapa(missao.parquemissao);

        carregarPontosBonus(missao.id);

    } else if (dadosMapa.acao === "pontoClicado") {

        verificarPontoPorCodigo(dadosMapa.codigo);

    } else if (dadosMapa.acao === "pontoBonusClicado") {

        verificarPontoBonus(dadosMapa.id);

    }

});

$w("#btnMapa").onClick(() => {

    if (mapaGpsVisivel) {

        $w("#htmlMapaGps").collapse();
        $w("#imgmapa").expand();
        clearInterval(intervaloLocalizacaoMapa);
        mapaGpsVisivel = false;

    } else {

        $w("#imgmapa").collapse();
        $w("#htmlMapaGps").expand();
        atualizarLocalizacaoMapa();
        intervaloLocalizacaoMapa = setInterval(atualizarLocalizacaoMapa, 5000);
        mapaGpsVisivel = true;

    }

});

        //=========================================
        // PULAR PONTOS (DESENVOLVIMENTO)
        //=========================================

        try {

            $w("#btnPular").onClick(() => {

                pularParaFinal();

            });

        } catch (err) {

            console.log("Botão Pular não encontrado.");

        }

        //=========================================
        // RESET (DESENVOLVIMENTO)
        //=========================================

        $w("#btnReset").onClick(() => {

            resetarProgresso();

            local.removeItem("configMissao");

            clearInterval(cronometro);

                inicioDesafio = 0;

                tempoLimite = 0;

                desafioConcluido = true;

            $w("#boxModoDesafio").collapse();

            console.log("Progresso apagado.");

            wixLocation.to(wixLocation.url);

        });

    }
    catch (err) {

        console.error(err);

        $w("#txtResultado").text = err.message;

    }

});
//==================================================
// CARREGAR MISSÃO
//==================================================

async function carregarMissao(slug) {

    // Busca missão

    const resultadoMissao = await wixData.query("Missoes")
        .eq("slug", slug)
        .eq("ativo", true)
        .limit(1)
        .find();

    if (resultadoMissao.items.length === 0) {

        throw new Error("Missão não encontrada.");

    }

    const registroMissao = resultadoMissao.items[0];

    // Busca pontos

    const resultadoPontos = await wixData.query("Pontos")
        .eq("missao", registroMissao._id)
        .eq("ativo", true)
        .ascending("ordem")
        .find();

    // Monta objeto

    const missao = {

        id: registroMissao._id,

        titulo: registroMissao.titulo,

        subtitulo: registroMissao.subtitulo,

        slug: registroMissao.slug,

        descricao: registroMissao.descricao,

        capa: registroMissao.capa,

        totalPontos: registroMissao.totalPontos,

        mensagemFinal: registroMissao.mensagemFinal,

        tempoDesafio: registroMissao.tempoDesafio,

        tipoFinal: registroMissao.tipoFinal,

        valorFinal: registroMissao.valorFinal,

        mensagemChegada: registroMissao.mensagemChegada,

        perguntaFinal: registroMissao.perguntaFinal,

        respostasAceitasFinal: registroMissao.respostasAceitasFinal,

        respostaFinal: registroMissao.respostaFinal,

        latitudeInicio: registroMissao.latitudeInicio,

        longitudeInicio: registroMissao.longitudeInicio,

        parquemissao: registroMissao.parquemissao,


        pontos: []

        
    };

    resultadoPontos.items.forEach(item => {

        missao.pontos.push({

            codigo: Number(item.codigo),

            ordem: item.ordem,

            latitude: item.latitude,

            longitude: item.longitude,

            conteudo: {

                    tipo: item.tipo,

    titulo: item.title,

    mensagem: item.mensagem,

    valor: item.valor,

    pergunta1: item.pergunta1,

    pergunta2: item.pergunta2,

    pergunta3: item.pergunta3,

    respostasAceitas: item.respostasAceitas,

    resposta: item.resposta
            }

        });

    });

    return missao;

}

//==================================================
// MAPA GPS
//==================================================

function atualizarLocalizacaoMapa() {

    wixWindow.getCurrentGeolocation()
        .then((posicao) => {

            $w("#htmlMapaGps").postMessage({
                acao: "minhaLocalizacao",
                lat: posicao.coords.latitude,
                lng: posicao.coords.longitude
            });

        })
        .catch((err) => {
            console.error("Erro ao buscar localização pro mapa:", err);
        });

}

function carregarPerimetroMapa(parqueId) {

    if (!parqueId) return;

    wixData.get("Parques", parqueId)
        .then((parque) => {

            const coordenadas = JSON.parse(parque.perimetro || "[]");

            $w("#htmlMapaGps").postMessage({
                acao: "perimetro",
                coordenadas: coordenadas
            });

        })
        .catch((err) => {
            console.error("Erro ao carregar perímetro do mapa:", err);
        });

}

//==================================================
// PONTOS BÔNUS
//==================================================

function carregarPontosBonus(missaoId) {

    wixData.query("PontosBonus")
        .eq("missao", missaoId)
        .eq("ativo", true)
        .find()
        .then((resultado) => {

            pontosBonus = resultado.items;

            $w("#htmlMapaGps").postMessage({
                acao: "pontosBonus",
                pontos: pontosBonus.map(p => ({
                    id: p._id,
                    latitude: p.latitude,
                    longitude: p.longitude
                }))
            });

        })
        .catch((err) => {
            console.error("Erro ao carregar pontos bônus:", err);
        });

}

function verificarPontoBonus(id) {

    const ponto = pontosBonus.find(p => p._id === id);

    if (!ponto) return;

    wixWindow.getCurrentGeolocation()
        .then((posicao) => {

            const distancia = calcularDistancia(
                posicao.coords.latitude,
                posicao.coords.longitude,
                ponto.latitude,
                ponto.longitude
            );

            const raio = raioPermitido(posicao.coords.accuracy);

            if (distancia <= raio) {

                wixWindow.openLightbox("Conteudo", {
                    modo: "bonus",
                    titulo: "🎁 Ponto bônus!",
                    mensagem: ponto.conteudo
                });

            } else {

                $w("#txtResultado").text =
                    `❌ Ainda não chegou lá... (${Math.round(distancia)} m)`;

            }

        })
        .catch((err) => {
            console.error(err);
            $w("#txtResultado").text = "⚠️ " + err.message;
        });

}

//==================================================
// CRONÔMETRO
//==================================================

function iniciarCronometro() {

    

    console.log("Cronômetro iniciou");

    atualizarCronometro();

    cronometro = setInterval(() => {

        atualizarCronometro();

    }, 1000);

}

function atualizarCronometro() {

    if (local.getItem("missaoFinalizada") === "true") {

    clearInterval(cronometro);

    return;

}

    const tempoDecorrido = Math.floor(
        (Date.now() - inicioDesafio) / 1000
    );

    const tempoRestante =
        (tempoLimite * 60) - tempoDecorrido;

    if (tempoRestante <= 0) {

        clearInterval(cronometro);

        desafioConcluido = false;

        local.setItem(
            "resultadoDesafio",
            "false"
        );

        $w("#txtCronometro").text = "00:00";

        $w("#boxModoDesafio").collapse();

        wixWindow.openLightbox("TempoEncerrado");

        return;

    }

    const minutos = Math.floor(tempoRestante / 60);

    const segundos = tempoRestante % 60;

    $w("#txtCronometro").text =
        `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;

}
