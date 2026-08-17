import wixData from 'wix-data';
import wixLocation from 'wix-location';
import { local } from 'wix-storage';
import wixWindow from 'wix-window';

import { iniciarMotor, resetarProgresso, pularParaFinal, obterPontosParaMapa, verificarPontoPorCodigo, obterPontosBonusParaMapa, verificarPontoBonusPorId, obterAnguloSeta } from 'public/motorMissao';
import { htmlMapaGps } from 'public/mapaGpsHtml';
import { htmlSetaGps } from 'public/setaGpsHtml';

let cronometro;
let intervaloLocalizacaoMapa;
let inicioDesafio = 0;
let tempoLimite = 0;
let desafioConcluido = true;

// Última posição/direção conhecidas — a bússola atualiza rápido
// (várias vezes por segundo), o GPS só a cada 5s. Guarda os dois
// aqui pra recalcular a seta a cada leitura da bússola, usando a
// posição mais recente que tiver.
let ultimaLat = null;
let ultimaLng = null;
let ultimoHeading = null;
let setaPronta = false;

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


$w("#htmlMapaGps").expand();

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

        $w("#htmlMapaGps").postMessage({
            acao: "pontosBonus",
            pontos: obterPontosBonusParaMapa()
        });

    } else if (dadosMapa.acao === "pontoClicado") {

        verificarPontoPorCodigo(dadosMapa.codigo);

    } else if (dadosMapa.acao === "pontoBonusClicado") {

        verificarPontoBonusPorId(dadosMapa.id);

    }

});

// Mapa GPS fica sempre visível na tela principal agora — o mapa
// imagem (#imgmapa) saiu daqui, virou um botão à parte que usa o
// próprio recurso de zoom/lightbox do Wix, sem precisar de código.
atualizarLocalizacaoMapa();
intervaloLocalizacaoMapa = setInterval(atualizarLocalizacaoMapa, 5000);

//=========================================
// SETA DE NAVEGAÇÃO (bússola)
//=========================================
// Widget separado do mapa — só uma seta que gira apontando pro
// próximo ponto. Mapa continua fixo, sem nenhuma lógica nova.

try {

    $w("#htmlSetaGps").src =
        `data:text/html;charset=utf-8,${encodeURIComponent(htmlSetaGps)}`;

    $w("#htmlSetaGps").onMessage((event) => {

        if (event.data && event.data.acao === "setaPronta") {
            setaPronta = true;
            atualizarSeta();
        }

    });

    ativarBussola();

} catch (err) {

    console.log("#htmlSetaGps não encontrado na página.");

}

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

// Alguns campos de categoria/tipo podem ter sido criados como Tags
// no CMS (só existe Tags, não Dropdown, pra travar numa lista
// pré-definida) — aí vêm como array (ex: ["imagem"]) em vez de
// texto puro. Usa só o primeiro valor, funciona nos dois casos.
// Também tira espaço sobrando (ex: "imagem " digitado sem querer),
// que quebra a comparação exata lá no popup.
const primeiroValor = (campo) => {
    const valor = Array.isArray(campo) ? campo[0] : campo;
    return typeof valor === "string" ? valor.trim() : valor;
};

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

    // Busca pontos bônus (opcionais, fora da sequência)

    const resultadoBonus = await wixData.query("PontosBonus")
        .eq("missao", registroMissao._id)
        .eq("ativo", true)
        .find();

    // Monta objeto

    const missao = {

        id: registroMissao._id,

        titulo: registroMissao.titulo,

        subtitulo: registroMissao.subtitulo,

        slug: registroMissao.slug,

        descricao: registroMissao.descricao,

        capa: registroMissao.capa,

        // Calculado a partir de quantos pontos ativos existem de
        // verdade, em vez de confiar no campo manual "totalPontos"
        // do CMS -- que precisava ser atualizado à mão toda vez que
        // um ponto fosse criado/removido, e desalinhava fácil.
        totalPontos: resultadoPontos.items.length,

        mensagemFinal: registroMissao.mensagemFinal,

        tempoDesafio: registroMissao.tempoDesafio,

        tipoFinal: primeiroValor(registroMissao.tipoFinal),

        valorFinal: registroMissao.valorFinal,

        mensagemChegada: registroMissao.mensagemChegada,

        tipoChegada: primeiroValor(registroMissao.tipoChegada),

        valorChegada: registroMissao.valorChegada,

        perguntaFinal: registroMissao.perguntaFinal,

        respostasAceitasFinal: registroMissao.respostasAceitasFinal,

        respostaFinal: registroMissao.respostaFinal,

        latitudeInicio: registroMissao.latitudeInicio,

        longitudeInicio: registroMissao.longitudeInicio,

        parquemissao: registroMissao.parquemissao,


        pontos: [],

        pontosBonus: []

    };

    resultadoBonus.items.forEach(item => {

        missao.pontosBonus.push({

            id: item._id,

            codigo: primeiroValor(item.codigo),

            // Categoria do bônus (prarir/travessuras/desafio/coracao/
            // parceiro) — fica fora de "conteudo" pra não colidir com
            // tipo/valor de mídia (imagem/vídeo), que usam esses
            // mesmos nomes de campo no popup, igual aos pontos normais.
            tipoBonus: primeiroValor(item.tipo),

            latitude: item.latitude,

            longitude: item.longitude,

            conteudo: {

                titulo: item.titulo,

                mensagem: item.mensagem,

                tipo: primeiroValor(item.tipoMidia),

                valor: item.valorMidia,

                pergunta1: item.pergunta1,

                pergunta2: item.pergunta2,

                pergunta3: item.pergunta3,

                respostasAceitas: item.respostasAceitas,

                resposta: item.resposta

            }

        });

    });

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

            ultimaLat = posicao.coords.latitude;
            ultimaLng = posicao.coords.longitude;

            atualizarSeta();

        })
        .catch((err) => {
            console.error("Erro ao buscar localização pro mapa:", err);
        });

}

//=========================================
// BÚSSOLA
//=========================================
// A bússola atualiza a seta continuamente (muito mais rápido que o
// GPS) usando a última posição conhecida. iOS exige webkitCompass-
// Heading (mais confiável que "alpha" ali); Android usa "alpha" do
// evento absoluto.

function ativarBussola() {

    function aoReceberOrientacao(evento) {

        let heading = null;

        if (typeof evento.webkitCompassHeading === "number") {

            // iOS — já vem absoluto (0° = Norte).
            heading = evento.webkitCompassHeading;

        } else if (evento.absolute && typeof evento.alpha === "number") {

            // Android — "alpha" cresce sentido anti-horário a partir
            // do Norte, o oposto de heading de bússola.
            heading = (360 - evento.alpha) % 360;

        }

        if (heading === null) return;

        ultimoHeading = heading;

        atualizarSeta();

    }

    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {

        // iOS — a permissão já devia ter sido pedida no botão
        // Iniciar da página Aventura (precisa de gesto direto do
        // usuário). Se não foi concedida ainda, isso aqui não
        // funciona sozinho — só tenta escutar, sem travar a página.
        window.addEventListener("deviceorientation", aoReceberOrientacao);

    } else if ("ondeviceorientationabsolute" in window) {

        window.addEventListener("deviceorientationabsolute", aoReceberOrientacao);

    } else {

        window.addEventListener("deviceorientation", aoReceberOrientacao);

    }

}

function atualizarSeta() {

    if (!setaPronta) return;

    const angulo = obterAnguloSeta(ultimaLat, ultimaLng, ultimoHeading);

    if (angulo === null) return;

    try {
        $w("#htmlSetaGps").postMessage({ acao: "angulo", valor: angulo });
    } catch (err) {}

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
