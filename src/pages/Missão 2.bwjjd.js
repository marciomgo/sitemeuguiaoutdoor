import wixData from 'wix-data';
import wixLocation from 'wix-location';
import { local } from 'wix-storage';
import wixWindow from 'wix-window';

import { iniciarMotor } from 'public/motorMissao';

let cronometro;
let inicioDesafio = 0;
let tempoLimite = 0;
let desafioConcluido = true;

//==================================================
// CONFIGURAÇÃO DA PÁGINA
//==================================================

const SLUG = "missao-2";

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

// Esconde o mapa ao carregar
$w("#htmlMapa").collapse();

$w("#btnMapa").onClick(() => {

    if ($w("#htmlMapa").collapsed) {

        $w("#htmlMapa").expand();

        $w("#btnMapa").label = "❌ Fechar mapa";

    } else {

        $w("#htmlMapa").collapse();

        $w("#btnMapa").label = "🧭 Mostrar mapa de apoio";

    }

});

        //=========================================
        // RESET (DESENVOLVIMENTO)
        //=========================================

        $w("#btnReset").onClick(() => {

            local.removeItem(`missao_${missao.slug}`);
            local.removeItem("configMissao");

            clearInterval(cronometro);

                inicioDesafio = 0;

                tempoLimite = 0;

                desafioConcluido = true;

            
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
