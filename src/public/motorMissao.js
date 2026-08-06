import wixWindow from 'wix-window';
import { local } from 'wix-storage';

let $wPage;
let missao;
let progresso = {

    concluidos: [],

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

    atualizarBotoes();

    console.log("=================================");
    console.log("MOTOR DE MISSÕES MGO");
    console.log("Missão:", missao.titulo);
    console.log("Pontos:", missao.pontos.length);
    console.log("=================================");

    conectarBotoes();

}

//==================================================
// CONECTAR BOTÕES
//==================================================

function conectarBotoes() {

    missao.pontos.forEach(ponto => {

        const idBotao = `#btnPonto${ponto.codigo}`;

        try {

            const botao = $wPage(idBotao);

            botao.onClick(() => {

                verificarPonto(ponto);

            });

            console.log("✓", idBotao, "conectado");

        } catch (err) {

            console.warn(idBotao + " não existe na página.");

        }

    });

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

    try {

        $wPage("#txtResultado").text =
            "🛰️ Confirmando sua localização pelo GPS...";

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

            $wPage("#txtResultado").text =
                "✅ Local encontrado!";

            mostrarConteudo(ponto);

        } else {

            $wPage("#txtResultado").text =

                `❌ Ainda não...

Distância: ${Math.round(distancia)} m

Precisão GPS: ${Math.round(accuracy)} m

Raio aceito: ${raio} m`;

        }

    } catch (err) {

        console.error(err);

        $wPage("#txtResultado").text =
            err.message;

    }

}

//==================================================
// ABRIR LIGHTBOX
//==================================================

function mostrarConteudo(ponto) 

{

    const ultimoPonto =

    ponto.ordem === missao.totalPontos;

if(ultimoPonto){

    mostrarPopupFinal();

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

const resultadoDesafio =

    local.getItem("resultadoDesafio") !== "false";

    let mensagemCompleta =
    resultadoDesafio

    ? "🏁 Modo Desafio concluído com sucesso!\n\n"

    : "⏱️ O tempo do Modo Desafio terminou, mas vocês concluíram a aventura!\n\n";

mensagemCompleta += missao.mensagemFinal;

    local.setItem(
    "missaoFinalizada",
    "true"
);

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

);

}


//==================================================
// RAIO ADAPTATIVO
//==================================================

function raioPermitido(accuracy) {

    if (accuracy <= 8) return 200000;

    if (accuracy <= 15) return 300000;

    if (accuracy <= 25) return 4000000;

    return 5000000;

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

    let texto = "";

    if (progresso.mochila.length === 0) {

        texto = "A mochila ainda está vazia.";

    } else {

        progresso.mochila.forEach(item => {

        texto += `📍 ${item.titulo}\n`;

        texto += `${item.texto}\n`;

        texto += "───────────────────────\n";

});

    }

    wixWindow.openLightbox("Conteudo", {

        modo: "mochila",

        titulo: "🎒 Mochila",

        mensagem: texto.replace(/\n/g,"<br>"),

        tipo: "texto"

    });

}

//==================================================
// ABRIR DIÁRIO
//==================================================

function abrirDiario() {

    wixWindow.openLightbox("Conteudo", {

        modo: "diario",

        titulo: "📔 Diário",

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

function concluirPonto(codigo) {

    console.log("Concluídos:", progresso.concluidos.length);
    console.log("Total:", missao.pontos.length);
    console.log("Tipo Total:", typeof missao.totalPontos);

    if (!progresso.concluidos.includes(codigo)) {

        progresso.concluidos.push(codigo);

        salvarProgresso();

    }

    atualizarBotoes();

    console.log(
        progresso.concluidos.length,
        "/",
        missao.pontos.length
    );

    //=========================================
    // MENSAGEM FINAL DA MISSÃO
    //=========================================

    if (progresso.concluidos.length === missao.totalPontos) {

        $wPage("#txtResultado").text =
            "🏆 Parabéns! Vocês concluíram esta missão!";

    } else {

        $wPage("#txtResultado").text =
            "✅ Ponto concluído! Próxima etapa liberada.";

    }

}

function atualizarBotoes() {

    const ultimoConcluido = progresso.concluidos.length;

    missao.pontos.forEach(ponto => {

        const botao = $wPage(`#btnPonto${ponto.codigo}`);

        if (progresso.concluidos.includes(ponto.codigo)) {

            botao.label = `✔${ponto.codigo}`;

            botao.enable();

        } else if (ponto.ordem === ultimoConcluido + 1) {

            botao.label = `🧭${ponto.codigo}`;

            botao.enable();

        } else {

            botao.label = `🔒${ponto.codigo}`;

            botao.disable();

        }

    });

}