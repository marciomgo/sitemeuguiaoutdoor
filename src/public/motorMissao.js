import wixWindow from 'wix-window';
import wixLocation from 'wix-location';
import wixData from 'wix-data';
import { local } from 'wix-storage';

// (marca de versão pra forçar invalidação de cache do CDN)

// Ícones customizados (Gerenciador de Mídia do Wix) usados nos
// títulos dos popups, no lugar dos emojis. Exportados porque
// ConteudoResumo.c0xpf.js (popup aninhado da tela final) também usa.
export const ICONE_MOCHILA = "https://static.wixstatic.com/media/f02643_e7b087c7ae184d4c856489e67074e238~mv2.png";
export const ICONE_DIARIO = "https://static.wixstatic.com/media/f02643_595d63c2751a4c97b90a29789170e76f~mv2.png";
const ICONE_REGRAS = "https://static.wixstatic.com/media/f02643_16f6066157b9427fadf0fbcd4261097e~mv2.png";

// Mesmo ícone de chegada usado no mapa GPS (mapaGpsHtml.js) — o
// botão de chegada na tela agora é uma imagem, não mais um botão
// numerado com rótulo.
const ICONE_CHEGADA = "https://static.wixstatic.com/media/f02643_744242f786c449fe9a7c6133d6b91464~mv2.png";

export function tituloComIcone(url, texto) {

    return `<img src="${url}" style="height:80px;vertical-align:middle;margin-right:8px;">${texto}`;

}

// Ícones do botão dos pontos bônus — um par (cinza/travado +
// colorido/achado) por tipo. O campo "tipo" no CMS "PontosBonus"
// precisa vir com um destes valores exatos: prarir, travessuras,
// desafio, coracao, parceiro.
const ICONES_BONUS = {

    prarir: {
        bloqueado: "https://static.wixstatic.com/media/f02643_382e5debe5a74ede931d535c55a2bc94~mv2.png",
        encontrado: "https://static.wixstatic.com/media/f02643_456383dfca3040c2ad2901c2e0b6f080~mv2.png"
    },

    travessuras: {
        bloqueado: "https://static.wixstatic.com/media/f02643_19b5c5cea70942d981b18b89a9818b46~mv2.png",
        encontrado: "https://static.wixstatic.com/media/f02643_64580c372f554928b3660c41dc5d371d~mv2.png"
    },

    desafio: {
        bloqueado: "https://static.wixstatic.com/media/f02643_23c3dc5ce72b4f549a0cc46f4a0af21e~mv2.png",
        encontrado: "https://static.wixstatic.com/media/f02643_69f4f7425c5b460cb4eba9cff5651da4~mv2.png"
    },

    coracao: {
        bloqueado: "https://static.wixstatic.com/media/f02643_a07741afe9e1487d869ded4fc876aa0e~mv2.png",
        encontrado: "https://static.wixstatic.com/media/f02643_f0d39890f41c478d89d59f290aed4b0f~mv2.png"
    },

    parceiro: {
        bloqueado: "https://static.wixstatic.com/media/f02643_e7563194c8204108881b51d60dab95c2~mv2.png",
        encontrado: "https://static.wixstatic.com/media/f02643_1493775b224e498583f42448e9278266~mv2.png"
    }

};

let $wPage;
let missao;
let progresso = {

    concluidos: [],

    bonusConcluidos: [],

    bonusRecusados: [],

    mochila: [],

    diario: ""

}

//==================================================
// INICIAR MOTOR
//==================================================

export function iniciarMotor($w, dadosMissao) {

    $wPage = $w;
    missao = dadosMissao;
    carregarProgresso();

    console.log("=================================");
    console.log("MOTOR DE MISSÕES MGO");
    console.log("Missão:", missao.titulo);
    console.log("Pontos:", missao.pontos.length);
    console.log("=================================");

    conectarBotoes();
    conectarBotoesBonus();

}

// Fica na tela até a próxima mensagem substituir — vira um guia dos
// próximos passos durante o jogo, não um aviso passageiro.
function mostrarStatus(mensagem) {

    $wPage("#txtResultado").text = mensagem;

}

//==================================================
// CONECTAR BOTÕES
//==================================================

function conectarBotoes() {

    // Fileira de botões numerados (#btnPonto{codigo}) saiu — os
    // ícones de progresso dentro do próprio mapa (barra lateral)
    // cumprem esse papel agora, clicáveis do mesmo jeito que os
    // marcadores do mapa (via #htmlMapaGps onMessage).

    conectarImagemChegada();

    //=========================================
    // MOCHILA
    //=========================================

    try {

        $wPage("#btnMochila").onClick(() => {

            abrirMochila();

        });

    } catch (err) {

        console.log("Botão Mochila não encontrado.");

    }

    //=========================================
    // DIÁRIO
    //=========================================

    try {

        $wPage("#btnDiario").onClick(() => {

    abrirDiario();

});

    } catch (err) {

        console.log("Botão Diário não encontrado.");

    }

    //=========================================
    // COMO FUNCIONA
    //=========================================

    try {

        $wPage("#btnComoFunciona").onClick(() => {

            abrirComoFunciona();

        });

    } catch (err) {

        console.log("Botão Como Funciona não encontrado.");

    }

}

//==================================================
// IMAGEM DE CHEGADA
//==================================================

function conectarImagemChegada() {

    const pontoChegada = missao.pontos.find(
        p => p.ordem === missao.totalPontos
    );

    if (!pontoChegada) return;

    try {

        const imagem = $wPage("#imgChegada");

        imagem.src = ICONE_CHEGADA;

        imagem.onClick(() => {
            verificarPonto(pontoChegada);
        });

        console.log("✓ #imgChegada conectado");

    } catch (err) {

        console.log("Imagem de chegada (#imgChegada) não encontrada.");

    }

}

//==================================================
// VERIFICAR PONTO
//==================================================

async function verificarPonto(ponto) {

    // Se já foi concluído, abre direto o conteúdo
    if (progresso.concluidos.includes(ponto.codigo)) {

        mostrarConteudo(ponto);

        return;

    }

    // Ordem obrigatória — vale tanto pro clique no botão numerado
    // quanto pro clique no marcador do mapa (só os pontos bônus
    // ficam de fora dessa regra, podem ser achados a qualquer hora).
    const proximaOrdem = progresso.concluidos.length + 1;

    if (ponto.ordem !== proximaOrdem) {

        const pontoAtual = missao.pontos.find(p => p.ordem === proximaOrdem);

        mostrarStatus(
            `Vá primeiro pro ponto ${pontoAtual ? pontoAtual.codigo : proximaOrdem}`
        );

        return;

    }

    try {

        mostrarStatus("🛰️ Localizando...");

        const location =
            await wixWindow.getCurrentGeolocation();

        const lat =
            location.coords.latitude;

        const lng =
            location.coords.longitude;

        const accuracy =
            location.coords.accuracy;

        const distancia =
            calcularDistancia(

                lat,
                lng,

                ponto.latitude,
                ponto.longitude

            );

        const raio =
            raioPermitido(accuracy);

        if (distancia <= raio) {

            mostrarStatus("✅ Local encontrado!");

            mostrarConteudo(ponto);

        } else {

            mostrarStatus(
                `❌ Ainda não... (${Math.round(distancia)} m)`
            );

        }

    } catch (err) {

        console.error(err);

        mostrarStatus("⚠️ " + err.message);

    }

}

//==================================================
// SETA DE NAVEGAÇÃO (bússola)
//==================================================
// A conta do ângulo (bearing até o ponto - direção da bússola) e a
// leitura do sensor vivem no HTML da seta hospedado no GitHub Pages
// (docs/seta.html) — aqui só informa qual é o próximo ponto
// obrigatório. Bônus não entram, só a sequência numerada.

export function obterProximoPontoAlvo() {

    const proximaOrdem = progresso.concluidos.length + 1;

    const alvo = missao.pontos.find(p => p.ordem === proximaOrdem);

    if (!alvo) {
        return null;
    }

    return {
        latitude: alvo.latitude,
        longitude: alvo.longitude
    };

}

//==================================================
// MAPA GPS
//==================================================

// Dados que o mapa (Leaflet, dentro do HTML embutido) precisa pra
// desenhar os marcadores — coordenadas + se já foi concluído.
export function obterPontosParaMapa() {

    return missao.pontos.map(ponto => ({

        codigo: ponto.codigo,
        latitude: ponto.latitude,
        longitude: ponto.longitude,
        concluido: progresso.concluidos.includes(ponto.codigo)

    }));

}

// Clique num marcador do mapa GPS dispara a mesma verificação de
// GPS/conteúdo que os botões numerados já usam.
export function verificarPontoPorCodigo(codigo) {

    const ponto = missao.pontos.find(p => p.codigo === codigo);

    if (ponto) {
        verificarPonto(ponto);
    }

}

//==================================================
// PONTOS BÔNUS
//==================================================
// Mesma lógica dos pontos normais (checa GPS, abre o mesmo popup
// "Conteudo" com pergunta/dica/resposta se houver). Clicável tanto
// pelo ícone na barra lateral do mapa quanto por um elemento à parte
// na página (#imgBonus{codigo}, se existir). O progresso fica
// separado (bonusConcluidos) pra alimentar uma futura tela de
// recompensas.

// Um bônus só fica disponível depois que a família concluir o ponto
// oficial indicado em "liberaApos" — como os pontos são concluídos
// estritamente em ordem (1..N), o total já concluído até agora é o
// mesmo que "ordem do último ponto concluído", não precisa cruzar
// código/ordem pra descobrir isso.
function bonusLiberado(ponto) {
    return !ponto.liberaApos || progresso.concluidos.length >= ponto.liberaApos;
}

// Dados que o mapa GPS precisa pra desenhar os marcadores bônus —
// só os já liberados (senão apareceria no mapa antes de fazer
// sentido ir) — posição + ícone do tipo, já colorido ou cinza (filtro
// CSS, aplicado do lado do mapa) conforme já foi achado ou não.
export function obterPontosBonusParaMapa() {

    return (missao.pontosBonus || [])

        .filter(ponto => bonusLiberado(ponto))

        .map(ponto => {

        const icones = ICONES_BONUS[ponto.tipoBonus] || ICONES_BONUS.prarir;
        const achado = progresso.bonusConcluidos.includes(ponto.id);

        return {
            id: ponto.id,
            latitude: ponto.latitude,
            longitude: ponto.longitude,
            icone: icones.encontrado,
            achado: achado,
            tipo: ponto.tipoBonus
        };

    });

}

// Reenvia os pontos bônus pro mapa depois de achar um — mesmo
// princípio do atualizarMapaPontos() dos pontos normais.
function atualizarMapaPontosBonus() {

    try {

        $wPage("#htmlMapaGps").postMessage({
            acao: "pontosBonus",
            pontos: obterPontosBonusParaMapa()
        });

    } catch (err) {

        // Mapa não existe nessa página — ignora.

    }

}

// Clique num marcador do mapa GPS dispara a mesma verificação que
// a imagem #imgBonus{codigo} usa.
export function verificarPontoBonusPorId(id) {

    const ponto = (missao.pontosBonus || []).find(p => p.id === id);

    if (ponto) {
        verificarPontoBonus(ponto);
    }

}

function conectarBotoesBonus() {

    (missao.pontosBonus || []).forEach(ponto => {

        const idImagem = `#imgBonus${ponto.codigo}`;

        try {

            const imagem = $wPage(idImagem);

            atualizarImagemBonus(imagem, ponto);

            imagem.onClick(() => {
                verificarPontoBonus(ponto);
            });

            console.log("✓", idImagem, "conectado");

        } catch (err) {

            console.warn(idImagem + " não existe na página.");

        }

    });

}

function atualizarImagemBonus(imagem, ponto) {

    // Ainda não liberado (falta concluir o ponto oficial exigido) —
    // some da tela por completo, não é pra dar nem pra ver que existe.
    if (!bonusLiberado(ponto)) {
        try { imagem.collapse(); } catch (err) {}
        return;
    }

    try { imagem.expand(); } catch (err) {}

    const achado = progresso.bonusConcluidos.includes(ponto.id);

    const icones = ICONES_BONUS[ponto.tipoBonus] || ICONES_BONUS.prarir;

    imagem.src = achado ? icones.encontrado : icones.bloqueado;

}

function atualizarBotoesBonus() {

    (missao.pontosBonus || []).forEach(ponto => {

        try {

            atualizarImagemBonus($wPage(`#imgBonus${ponto.codigo}`), ponto);

        } catch (err) {

            // Elemento não existe nessa página — ignora.

        }

    });

}

// Tipos de bônus que são desafio físico pra família topar ou não
// (em vez de só ler/responder) — mostram Aceitamos!/Não rolou no
// popup, no lugar do Fechar único.
const TIPOS_DESAFIO_BONUS = ["travessuras", "coracao"];

async function verificarPontoBonus(ponto) {

    // Defesa: não deveria nem estar visível/clicável se ainda
    // bloqueado, mas ignora aqui também por segurança.
    if (!bonusLiberado(ponto)) return;

    // Aponta a seta pro bônus assim que ele é tocado — ajuda a
    // caminhar até lá mesmo antes de estar no raio. Volta sozinha pra
    // sequência numérica quando o popup fechar (dentro de
    // mostrarConteudoBonus).
    apontarSetaPara(ponto.latitude, ponto.longitude);

    // Já resolvido (achado ou recusado) — abre direto o conteúdo de
    // novo, sem precisar repetir a checagem de GPS.
    if (progresso.bonusConcluidos.includes(ponto.id) || progresso.bonusRecusados.includes(ponto.id)) {

        mostrarConteudoBonus(ponto);

        return;

    }

    try {

        mostrarStatus("🛰️ Localizando...");

        const location =
            await wixWindow.getCurrentGeolocation();

        const distancia =
            calcularDistancia(

                location.coords.latitude,
                location.coords.longitude,

                ponto.latitude,
                ponto.longitude

            );

        const raio =
            raioPermitido(location.coords.accuracy);

        if (distancia <= raio) {

            mostrarStatus("✅ Local encontrado!");

            mostrarConteudoBonus(ponto);

        } else {

            mostrarStatus(
                `❌ Ainda não... (${Math.round(distancia)} m)`
            );

        }

    } catch (err) {

        console.error(err);

        mostrarStatus("⚠️ " + err.message);

    }

}

function mostrarConteudoBonus(ponto) {

    const ehDesafio = TIPOS_DESAFIO_BONUS.includes(ponto.tipoBonus);

    // Desafio (travessuras/coração): sempre mostra Aceitamos!/Não
    // vai rolar de novo, mesmo já tendo decidido antes — a família
    // pode trocar de ideia na hora.
    if (ehDesafio) {

        wixWindow.openLightbox("Conteudo", { ...ponto.conteudo, aceitarRecusar: true })

            .then((resultado) => {

                if (resultado && resultado.acao === "aceitar") {
                    concluirPontoBonus(ponto);
                } else if (resultado && resultado.acao === "recusar") {
                    recusarPontoBonus(ponto);
                }

            })

            .catch((err) => {
                console.error(err);
            })

            .finally(() => {
                // Popup do bônus fechou — seta volta pro próximo
                // ponto da sequência numérica.
                atualizarSetaAlvo();
            });

        return;

    }

    // Já achado antes (piada/fato/enigma) — só mostra o conteúdo de
    // novo, sem repetir a decisão.
    if (progresso.bonusConcluidos.includes(ponto.id)) {

        wixWindow.openLightbox("Conteudo", ponto.conteudo)
            .catch((err) => console.error(err))
            .finally(() => atualizarSetaAlvo());

        return;

    }

    // Sem pergunta1 (piada/fato sem resposta): o popup só mostra a
    // mensagem e um botão de fechar — considera achado ao
    // simplesmente ter visto. Com pergunta1: só conta como achado
    // quando responder certo (igual aos pontos normais).
    const temPergunta = !!ponto.conteudo.pergunta1;

    wixWindow.openLightbox("Conteudo", ponto.conteudo)

        .then((resultado) => {

            if (temPergunta) {

                if (resultado && resultado.acao === "concluido") {
                    concluirPontoBonus(ponto);
                }

            } else {

                concluirPontoBonus(ponto);

            }

        })

        .catch((err) => {
            console.error(err);
        })

        .finally(() => {
            // Popup do bônus fechou — seta volta pro próximo ponto da
            // sequência numérica.
            atualizarSetaAlvo();
        });

}

function recusarPontoBonus(ponto) {

    // Aceitar e recusar são mutuamente exclusivos — trocar de ideia
    // tem que tirar do outro estado também, senão a imagem colorida
    // (achado) nunca mais volta pra cinza.
    const indiceConcluido = progresso.bonusConcluidos.indexOf(ponto.id);
    if (indiceConcluido !== -1) {
        progresso.bonusConcluidos.splice(indiceConcluido, 1);
    }

    if (!progresso.bonusRecusados.includes(ponto.id)) {

        progresso.bonusRecusados.push(ponto.id);

    }

    salvarProgresso();

    atualizarBotoesBonus();
    atualizarMapaPontosBonus();

}

function concluirPontoBonus(ponto) {

    const indiceRecusado = progresso.bonusRecusados.indexOf(ponto.id);
    if (indiceRecusado !== -1) {
        progresso.bonusRecusados.splice(indiceRecusado, 1);
    }

    if (!progresso.bonusConcluidos.includes(ponto.id)) {

        progresso.bonusConcluidos.push(ponto.id);

    }

    salvarProgresso();

    atualizarBotoesBonus();
    atualizarMapaPontosBonus();

}

//==================================================
// ABRIR LIGHTBOX
//==================================================

function mostrarConteudo(ponto)

{

    const ultimoPonto =

    ponto.ordem === missao.totalPontos;

if(ultimoPonto){

    // Só faz sentido abrir o popup de Chegada (com pergunta,
    // mochila e diário) se houver uma pergunta final de verdade —
    // ela é o gatilho pra comemoração. Sem pergunta, vai direto.
    if(missao.perguntaFinal){

        mostrarPopupFinal();

    } else {

        concluirPonto(missao.totalPontos);
        mostrarComemoracao();

    }

    return;

}

    console.log("Abrindo conteúdo...");

    wixWindow.openLightbox(
        "Conteudo",
        ponto.conteudo
    )

    .then((resultado) => {

        if (!resultado) return;

        switch (resultado.acao) {

            case "fechar":

    // Apenas fecha o popup.
    // Não conclui o ponto.

    break;

            case "concluido":

                adicionarNaMochila(

                    ponto,

                    resultado.resposta

                );

                concluirPonto(ponto.codigo);

                break;

        }

    })

    .catch((err) => {

        console.error(err);

    });

}


//==================================================
// MOSTRAR POPUP FINAL
//==================================================


function mostrarPopupFinal(){

    wixWindow.openLightbox(

        "Conteudo",

        {

            modo:"final",

    titulo:"🏁 Chegada",

    mensagem: missao.mensagemChegada,

    tipo: missao.tipoChegada,

    valor: missao.valorChegada,

    pergunta1: missao.perguntaFinal,

    respostasAceitas: missao.respostasAceitasFinal,

    resposta: missao.respostaFinal,


    mochila: progresso.mochila,

    diario: progresso.diario    

        }

    )

    .then((resultado)=>{

        if(!resultado) return;

        switch(resultado.acao){

            case "concluido":

    concluirPonto(

        missao.totalPontos

    );

    mostrarComemoracao();

break;

        }

    });

}


//==================================================
// MOSTRAR COMEMORAÇÃO
//==================================================


function mostrarComemoracao(){

    // "resultadoDesafio" só diz se o tempo acabou (fica "false"), mas
    // nunca é setado se o Modo Desafio nem foi ativado — por isso
    // precisa checar também se ele foi ligado de verdade (mesma
    // fonte que a página usa pra mostrar/esconder o cronômetro).
    const configMissao = JSON.parse(local.getItem("configMissao") || "{}");
    const modoDesafioAtivo = !!configMissao.desafio;

const resultadoDesafio =

    local.getItem("resultadoDesafio") !== "false";

    // Placar final — sempre recalculado na hora (não fica salvo em
    // lugar nenhum), porque os pontos bônus podem ser marcados e
    // desmarcados (aceitar/recusar) até o último minuto.
    const totalBonus = (missao.pontosBonus || []).length;
    const bonusAchados = progresso.bonusConcluidos.length;

    let mensagemCompleta = "";

    if (modoDesafioAtivo) {

        mensagemCompleta += resultadoDesafio
            ? "🏁 Modo Desafio: concluído com sucesso!\n\n"
            : "⏱️ Modo Desafio: tempo esgotado, mas vocês terminaram!\n\n";

    }

    mensagemCompleta += `✅ Pontos oficiais: ${progresso.concluidos.length}/${missao.totalPontos}\n\n`;

    if (totalBonus > 0) {
        mensagemCompleta += `🎁 Pontos bônus: ${bonusAchados}/${totalBonus}\n`;
    }

    mensagemCompleta += "\n" + missao.mensagemFinal;

    local.setItem(
    "missaoFinalizada",
    "true"
);

    gerarESalvarCodigoResgate().finally(() => {

        abrirPopupComemoracao(mensagemCompleta, resultadoDesafio);

    });

}

//==================================================
// CÓDIGO DE RESGATE (tesouros dos parceiros)
//==================================================

function gerarCodigoResgate() {

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I

    let codigo = "";

    for (let i = 0; i < 4; i++) {
        codigo += chars[Math.floor(Math.random() * chars.length)];
    }

    return "MGO-" + codigo;

}

function gerarESalvarCodigoResgate() {

    const chaveCodigo = `codigoResgate_${missao.slug}`;

    // Já foi gerado antes pra essa missão — não gera outro.
    if (local.getItem(chaveCodigo)) {

        return Promise.resolve();

    }

    const resgateId = local.getItem("resgateId");

    // Sem resgate cadastrado (ex: não passou pelo cadastro com nome),
    // segue sem código/tesouro — não trava a comemoração.
    if (!resgateId) {

        return Promise.resolve();

    }

    const codigo = gerarCodigoResgate();

    console.log("Salvando código de resgate. resgateId:", resgateId, "codigo:", codigo);

    // Reenvia nomeFamilia/missao junto — o update() aqui não faz um
    // merge parcial de verdade, ele "perde" os campos que não vierem
    // nessa chamada (foi assim que nome/missão sumiam mesmo depois
    // de terem sido salvos certinho no cadastro).
    return wixData.update("Resgates", {

        _id: resgateId,
        nomeFamilia: local.getItem("nomeFamilia"),
        missao: missao.id,
        dataCadastro: new Date(local.getItem("dataCadastro")),
        codigo: codigo,
        dataConclusao: new Date()

    })

    .then((item) => {

        console.log("Código de resgate salvo com sucesso:", item);

        local.setItem(chaveCodigo, codigo);

    })

    .catch((err) => {

        console.error("Erro ao salvar código de resgate:", err);

    });

}

function abrirPopupComemoracao(mensagemCompleta, resultadoDesafio) {

    wixWindow.openLightbox(

        "Conteudo",

        {

            modo:"comemoracao",

            titulo:"🏆 Parabéns!",

            mensagem: mensagemCompleta,

            tipo: missao.tipoFinal,

            valor: missao.valorFinal,

            desafio: resultadoDesafio

        }

    )

    .then(() => {

        const codigo = local.getItem(`codigoResgate_${missao.slug}`);

        if (codigo) {

            wixLocation.to("/resgates/" + codigo);

        }

    });

}


//==================================================
// RAIO ADAPTATIVO
//==================================================

// TESTE: 10km fixo (facilita testar de longe, sem estar no parque).
function raioPermitido(accuracy) {

    return 10000;

}

//==================================================
// DISTÂNCIA (HAVERSINE)
//==================================================

function calcularDistancia(lat1, lon1, lat2, lon2) {

    const R = 6371000;

    const dLat = (lat2 - lat1) * Math.PI / 180;

    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =

        Math.sin(dLat / 2) * Math.sin(dLat / 2) +

        Math.cos(lat1 * Math.PI / 180) *

        Math.cos(lat2 * Math.PI / 180) *

        Math.sin(dLon / 2) *

        Math.sin(dLon / 2);

    const c =

        2 * Math.atan2(

            Math.sqrt(a),

            Math.sqrt(1 - a)

        );

    return R * c;

}

//==================================================
// MOCHILA
//==================================================

function adicionarNaMochila(ponto, resposta) {

    // Já tem esse ponto na mochila — não duplica (pode acontecer se
    // responderem certo de novo num ponto já concluído).
    const jaTem = progresso.mochila.some((item) => item.ponto === ponto.codigo);
    if (jaTem) return;

    const texto =

        ponto.conteudo.resposta ||

        resposta ||

        "";

    if (!texto) return;

    console.log(ponto.conteudo);

    progresso.mochila.push({

        ponto: ponto.codigo,

        titulo: ponto.conteudo.titulo,

        texto: texto

    });

    salvarProgresso();

}

//==================================================
// ABRIR MOCHILA
//==================================================

export function abrirMochila() {

    wixWindow.openLightbox("Conteudo", {

        modo: "mochila",

        titulo: tituloComIcone(ICONE_MOCHILA, "Mochila"),

        mensagem: "Guarda automaticamente as respostas e pistas dos pontos",

        mochila: progresso.mochila

    });

}

//==================================================
// ABRIR DIÁRIO
//==================================================

export function abrirDiario() {

    wixWindow.openLightbox("Conteudo", {

        modo: "diario",

        titulo: tituloComIcone(ICONE_DIARIO, "Diário"),

        mensagem: "Suas anotações da aventura",

        diario: progresso.diario

    })

    .then((resultado) => {

        if (!resultado) return;

        if (resultado.acao === "salvarDiario") {

            progresso.diario = resultado.texto;

            salvarProgresso();

        }

    });

}

//==================================================
// COMO FUNCIONA
//==================================================
// Regras/instruções — mesmo texto da tela de boas-vindas
// (mantenha os dois em sincronia se um dos dois mudar).

function abrirComoFunciona() {

    wixWindow.openLightbox("Conteudo", {

        modo: "regras",

        titulo: tituloComIcone(ICONE_REGRAS, "Como funciona"),

        mensagem:
            "Passo a passo de como jogar<br><br>" +
            "Sejam bem vindos!<br><br>" +
            "1º Encontre os pontos na ordem numérica<br><br>" +
            "2º Confirme que chegou clicando no ponto<br><br>" +
            "3º Complete a missão do ponto<br><br>" +
            "4º Repita até o fim<br><br>" +
            "Pelo caminho, fiquem de olho nos pontos bônus — são opcionais, não seguem a ordem numérica e podem ser encontrados a qualquer momento.<br><br>" +
            "Boa diversão!"

    });

}

//==================================================
// PROGRESSO
//==================================================

function chaveStorage() {

    return `missao_${missao.slug}`;

}

function carregarProgresso() {

    const salvo = local.getItem(chaveStorage());

    if (salvo) {

        progresso = JSON.parse(salvo);

    }

}

function salvarProgresso() {

    local.setItem(

        chaveStorage(),

        JSON.stringify(progresso)

    );

}

// Usado por ConteudoResumo.c0xpf.js (popup aninhado da tela final)
// pra salvar o diário editado ali.
export function salvarTextoDiario(texto) {

    progresso.diario = texto;

    salvarProgresso();

}

//==================================================
// RESET (DESENVOLVIMENTO)
//==================================================
// Zera o progresso em memória na hora, sem depender de
// recarregar a página (útil pra testar rápido no Editor —
// navegar pra mesma URL costuma não recarregar de verdade).

// Marca todos os pontos como concluídos, exceto o último — só pra
// agilizar teste, pra não precisar passar pelos pontos um por um.
export function pularParaFinal() {

    missao.pontos.forEach(ponto => {

        if (ponto.ordem !== missao.totalPontos) {

            concluirPonto(ponto.codigo);

        }

    });

}

export function resetarProgresso() {

    local.removeItem(chaveStorage());

    progresso = {
        concluidos: [],
        bonusConcluidos: [],
        bonusRecusados: [],
        mochila: [],
        diario: ""
    };

    atualizarBotoesBonus();
    atualizarMapaPontos();
    atualizarMapaPontosBonus();

    $wPage("#txtResultado").text = "";

}

function concluirPonto(codigo) {

    console.log("Concluídos:", progresso.concluidos.length);
    console.log("Total:", missao.pontos.length);
    console.log("Tipo Total:", typeof missao.totalPontos);

    let novosBonusLiberados = [];

    if (!progresso.concluidos.includes(codigo)) {

        progresso.concluidos.push(codigo);

        salvarProgresso();

        // Bônus cujo "liberaApos" bate exatamente com a contagem nova
        // acabaram de ficar disponíveis agora.
        novosBonusLiberados = (missao.pontosBonus || []).filter(
            (ponto) => ponto.liberaApos === progresso.concluidos.length
        );

    }

    atualizarBotoesBonus();
    atualizarMapaPontos();
    atualizarMapaPontosBonus();
    atualizarSetaAlvo();

    // Aviso de bônus liberado vira o popup grande no mapa (ícone +
    // nome + Sim/Não), não o texto de status — evita também o texto
    // de status ser sobrescrito pela mensagem de "ponto concluído"
    // logo em seguida.
    novosBonusLiberados.forEach((bonus) => {
        try {
            const icones = ICONES_BONUS[bonus.tipoBonus] || ICONES_BONUS.prarir;
            $wPage("#htmlMapaGps").postMessage({
                acao: "bonusLiberado",
                bonus: {
                    id: bonus.id,
                    titulo: bonus.conteudo.titulo || "Ponto bônus",
                    icone: icones.encontrado
                }
            });
        } catch (err) {
            // Mapa não existe nessa página — ignora.
        }
    });

    console.log(
        progresso.concluidos.length,
        "/",
        missao.pontos.length
    );

    //=========================================
    // MENSAGEM FINAL DA MISSÃO
    //=========================================

    if (progresso.concluidos.length === missao.totalPontos) {

        mostrarStatus("🏆 Missão concluída!");

    } else {

        const pontoConcluido = missao.pontos.find((p) => p.codigo === codigo);
        const nomePonto = (pontoConcluido && pontoConcluido.conteudo.titulo) || `Ponto ${codigo}`;

        mostrarStatus(`✅ ${nomePonto} concluído!`);

    }

}

// Reenvia os pontos pro mapa GPS depois de concluir um — assim o
// marcador troca de cinza (não achado) pra colorido na hora, sem
// precisar reabrir o mapa. Silencioso se o mapa ainda não existe
// na página (#htmlMapaGps).
function atualizarMapaPontos() {

    try {

        $wPage("#htmlMapaGps").postMessage({
            acao: "pontos",
            pontos: obterPontosParaMapa()
        });

    } catch (err) {

        // Mapa não existe nessa página — ignora.

    }

}

// Atualiza o alvo que o pontinho do mapa aponta, depois de concluir
// um ponto — o alvo muda a cada ponto.
function atualizarSetaAlvo() {

    try {

        const alvo = obterProximoPontoAlvo();

        if (alvo) {
            $wPage("#htmlMapaGps").postMessage({
                acao: "alvoAtual",
                latitude: alvo.latitude,
                longitude: alvo.longitude
            });
        }

    } catch (err) {

        // Mapa não existe nessa página — ignora.

    }

}

// Aponta o pontinho temporariamente pra um ponto bônus (usado ao
// tocar num marcador bônus no mapa) — volta pra sequência numérica
// quando o popup desse bônus fecha, via atualizarSetaAlvo().
function apontarSetaPara(latitude, longitude) {

    try {

        $wPage("#htmlMapaGps").postMessage({
            acao: "alvoAtual",
            latitude: latitude,
            longitude: longitude
        });

    } catch (err) {

        // Mapa não existe nessa página — ignora.

    }

}

