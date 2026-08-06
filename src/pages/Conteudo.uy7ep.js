import wixWindow from 'wix-window';
import { respostaCorreta } from 'public/normalizador';

let conteudo;
let dicaAtual = 1;

$w.onReady(function () {

    conteudo = wixWindow.lightbox.getContext();
    conteudo.perguntaOriginal = conteudo.pergunta1;

    if (!conteudo) {
        console.log("Nenhum conteúdo recebido.");
        return;
    }

    enviarParaHTML();


    $w("#htmlConteudo").onMessage((event) => {

        const dados = event.data;

        switch (dados.acao) {

        case "fechar":

            wixWindow.lightbox.close({
                acao: "fechar"
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

            console.log("Abrir Mochila");

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