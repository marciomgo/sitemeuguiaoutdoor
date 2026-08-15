import wixWindow from 'wix-window';
import { respostaCorreta } from 'public/normalizador';
import { htmlPainelConteudo } from 'public/conteudoPanelHtml';
import { tituloComIcone, ICONE_MOCHILA, ICONE_DIARIO, salvarTextoDiario } from 'public/motorMissao';

let conteudo;
let dicaAtual = 1;

$w.onReady(function () {

    conteudo = wixWindow.lightbox.getContext();
    conteudo.perguntaOriginal = conteudo.pergunta1;

    if (!conteudo) {
        console.log("Nenhum conteúdo recebido.");
        return;
    }

    $w("#htmlConteudo").src =
        `data:text/html;charset=utf-8,${encodeURIComponent(htmlPainelConteudo)}`;

    // Pequeno atraso pra garantir que o iframe já carregou
    // e está ouvindo mensagens antes do primeiro envio.
    setTimeout(() => {
        enviarParaHTML();
    }, 150);


    $w("#htmlConteudo").onMessage((event) => {

        const dados = event.data;

        switch (dados.acao) {

        case "fechar":

            wixWindow.lightbox.close({
                acao: "fechar"
            });

            break;

        case "aceitar":

            wixWindow.lightbox.close({
                acao: "aceitar"
            });

            break;

        case "recusar":

            wixWindow.lightbox.close({
                acao: "recusar"
            });

            break;

        case "enviar":

            validarResposta(dados.resposta);

            break;

        case "dica":

            proximaDica();

            break;

        case "salvarDiario":

            wixWindow.lightbox.close({
                acao: "salvarDiario",
                texto: dados.texto
            });

            break;

        case "mochila":

            // Popup separado (não o mesmo "Conteudo") porque o Wix
            // não empilha um lightbox dentro dele mesmo.
            wixWindow.openLightbox("ConteudoResumo", {

                modo: "mochila",
                titulo: tituloComIcone(ICONE_MOCHILA, "Mochila"),
                mensagem: "Guarda as respostas de cada ponto",
                mochila: conteudo.mochila

            });

            break;

        case "diario":

            wixWindow.openLightbox("ConteudoResumo", {

                modo: "diario",
                titulo: tituloComIcone(ICONE_DIARIO, "Diário"),
                diario: conteudo.diario

            })

            .then((resultado) => {

                if (!resultado) return;

                if (resultado.acao === "salvarDiario") {

                    salvarTextoDiario(resultado.texto);

                    conteudo.diario = resultado.texto;

                }

            });

            break;

        }

    });

});

//==================================================
// ENVIA PARA O HTML
//==================================================

function enviarParaHTML() {

    //=====================================
    // TEXTO DO BOTÃO DA CORUJA
    //=====================================

    let totalAjudas = 1;

    if (conteudo.pergunta2) totalAjudas++;

    if (conteudo.pergunta3) totalAjudas++;

//=====================================
// Definir texto do botão da Coruja
//=====================================

let proximoCliqueRevelaResposta = false;

// Existe Pergunta 3 e estamos na Pergunta 3
if (conteudo.pergunta3 && dicaAtual === 3) {

    proximoCliqueRevelaResposta = true;

}

// Existe Pergunta 2 e estamos na Pergunta 2
else if (!conteudo.pergunta3 && conteudo.pergunta2 && dicaAtual === 2) {

    proximoCliqueRevelaResposta = true;

}

// Existe apenas Pergunta 1
else if (!conteudo.pergunta2 && dicaAtual === 1) {

    proximoCliqueRevelaResposta = true;

}

if (proximoCliqueRevelaResposta) {

    conteudo.textoBotaoDica = "💡 Ver Resposta";

} else {

    conteudo.textoBotaoDica =
`💡 Dica ${dicaAtual}/${totalAjudas}`;

}

    const dados = { ...conteudo };

$w("#htmlConteudo").postMessage(dados);

// limpa os campos temporários
delete conteudo.textoPergunta;
delete conteudo.maquinaPergunta;

}

//==================================================
// VALIDAR RESPOSTA
//==================================================

function validarResposta(resposta) {

    const correta = respostaCorreta(

        resposta,

        conteudo.respostasAceitas

    );

    if (correta) {

        conteudo.mensagemSistema =
            "✅ Resposta correta!";

        enviarParaHTML();

        setTimeout(() => {

            wixWindow.lightbox.close({

                acao: "concluido",

                resposta

            });

        }, 1000);

    } else {

        conteudo.mensagemSistema =
            "❌ Resposta incorreta.<br><br>Tentem novamente.";

        enviarParaHTML();

    }

}

//==================================================
// AJUDAS DO MINIEU
//==================================================

function proximaDica(){

    // Primeira dica
    if(dicaAtual === 1 && conteudo.pergunta2){

        conteudo.textoPergunta = conteudo.pergunta2;
        conteudo.maquinaPergunta = true;

        dicaAtual++;

    }

    // Segunda dica
    else if(dicaAtual === 2 && conteudo.pergunta3){

        conteudo.textoPergunta = conteudo.pergunta3;
        conteudo.maquinaPergunta = true;

        dicaAtual++;

    }

    // Revela a resposta
    else{

        conteudo.textoPergunta = conteudo.resposta;
        conteudo.maquinaPergunta = true;

        conteudo.esconderBotaoDica = true;

    }


    console.log("mensagem:", conteudo.mensagem);
    console.log("textoPergunta:", conteudo.textoPergunta);
    
    enviarParaHTML();

}