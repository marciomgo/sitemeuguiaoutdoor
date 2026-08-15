// Filename: public/conteudoPanelHtml.js
//
// HTML do popup "Conteudo" (ponto/enigma, mochila, diário, chegada final e
// comemoração), portado aqui pra viver como código versionado no Git em vez
// de só existir colado no Editor Wix. Carregado em `#htmlConteudo` via
// `Conteudo.uy7ep.js` (`.src = data:text/html;...`) e atualizado depois via
// `.postMessage(...)`.
//
// Mudanças em relação ao HTML original do popup:
// 1. O bloco que só ativava com `modo === "final"` foi dividido em dois
//    blocos independentes (mochila / diário), permitindo mostrar a mochila
//    sozinha (`modo === "mochila"`) sem precisar também mostrar o diário.
// 2. Cancelamento de animação da máquina de escrever quando uma mensagem
//    mais nova chega no meio de uma anterior (`renderId`).
// 3. A mensagem do Mineu só é reescrita (com efeito de máquina de escrever)
//    na primeira vez que o popup abre — atualizações depois disso (dica,
//    resposta certa/errada) não a reiniciam (`mensagemMostrada`).

export const htmlPainelConteudo = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700&display=swap" rel="stylesheet">
<style>

/* =========================================
   CSS GERAL
========================================= */
html,body{
    margin:0;
    padding:0;
    width:100%;
    height:100%;
    background:#ffffff;
    color:#222;
    font-family:'Baloo 2',Arial,Helvetica,sans-serif;
    overflow-y:auto;
}
#container{
    display:flex;
    flex-direction:column;
    gap:6px;
    padding:24px;
    box-sizing:border-box;
    height:100%;
    background:#ffffff;
}


#titulo{
    margin:0;
   text-align:center;
   font-size:18px;
}

#mensagem{
    margin:0;
    white-space:pre-line;
    text-align:center;
    font-size:15px;
    font-weight:bold;
    line-height:1.0;
}

  #pergunta{
    margin:-8px 0 0 0;
    text-align:center;
    font-size:15px;
    line-height:1.0;
}



#conteudo img,#conteudo video,#conteudo iframe{
    display:block;
    width:100%;
    max-width:100%;
    max-height:176px;
    object-fit:cover;
    border:none;
    border-radius:8px;
}

#pergunta,
#mensagemSistema,
#btnEnviar,
#btnDica,
#btnMochila,
#btnDiario,
#btnSalvarDiario,
#resposta,
#diario{

    display:none;

}

#resposta{
    margin-top:-6px;
}

button{
    padding:6px 18px;
    font-size:14px;
    font-family:inherit;
    border:1px solid #d0d0d0;
    border-radius:8px;
    cursor:pointer;
    background:#f5f5f5;
    color:#222;
}

.botao-icone{
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:2px;
    background:transparent;
    border:none;
    padding:4px;
}
.botao-icone img{
    height:72px;
    width:72px;
    object-fit:contain;
}
.botao-icone span{
    font-weight:bold;
    font-size:13px;
    color:#222;
}

input,
textarea{
    padding:10px;
    font-size:14px;
    font-family:inherit;
    border-radius:8px;
    border:1px solid #cfcfcf;
    background:#fff;
    color:#222;
    box-sizing:border-box;
    width:100%;
}
#mensagemSistema{
    background:#f4f4f4;
    color:#222;
    padding:6px 12px;
    font-size:14px;
    border-radius:8px;
    border:1px solid #ddd;
    text-align:center;
}
.botoes{
    display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:center;
}

#linhaBotoesResposta{
    margin-top:-4px;
}

.card{
    display:none;
    background:#f0f0f0;
    border:none;
    border-radius:10px;
    padding:12px;
    margin-top:12px;
    font-size:13px;
    line-height:1.35;
}

.card h3{
    margin:0 0 8px 0;
    color:#444;
    font-size:14px;
}
</style>
</head>
<body>

<!-- =========================================
     ESTRUTURA DO POPUP
========================================= -->
<div id="container">
        <!-- TÍTULO -->
    <h2 id="titulo"></h2>

        <!-- CONTEÚDO (Imagem, Vídeo, Áudio...) -->
    <div id="conteudo"></div>

        <!-- MENSAGEM -->
    <p id="mensagem"></p>

        <!-- PERGUNTA -->
    <p id="pergunta"></p>

        <!-- RESPOSTA -->
    <input id="resposta" type="text" placeholder="Digite sua resposta">

        <!-- BOTÕES DA RESPOSTA (logo abaixo do campo) -->
    <div class="botoes" id="linhaBotoesResposta">
        <button id="btnEnviar" onclick="enviarResposta()">Enviar</button>
        <button id="btnDica" onclick="pedirDica()">💡 Quero uma dica</button>
    </div>

      <!-- DIÁRIO (EDIÇÃO) -->
  <textarea
    id="diario"
    placeholder="Escreva suas anotações..."

style="
width:100%;
box-sizing:border-box;
height:220px;
padding:10px;
border-radius:6px;
border:none;
background:transparent;
display:none;
">


</textarea>

    <div class="botoes" id="linhaBotoesDiario">
      <button
    id="btnSalvarDiario"
    onclick="salvarDiario()">

    💾 Salvar Diário

</button>
    </div>

        <!-- MENSAGEM DO SISTEMA -->
    <div id="mensagemSistema"></div>

        <!-- BOTÕES QUE ABREM/FECHAM MOCHILA E DIÁRIO (TELA FINAL) -->
    <div class="botoes" id="linhaBotoesToggle">
        <button id="btnMochila" class="botao-icone" onclick="abrirMochila()"><img src="https://static.wixstatic.com/media/f02643_8dd642666c8348759d819e56a3dd690d~mv2.png"></button>
        <button id="btnDiario" class="botao-icone" onclick="abrirDiario()"><img src="https://static.wixstatic.com/media/f02643_bbf34cfe4884495ab30441f1e89c67f1~mv2.png"></button>
    </div>

  <!-- =========================================
     MOCHILA (POPUP FINAL)
========================================= -->

<div id="cardMochila" class="card">

<h3 id="tituloMochila" style="display:none;">
<img src="https://static.wixstatic.com/media/f02643_e7b087c7ae184d4c856489e67074e238~mv2.png" style="height:32px;vertical-align:middle;margin-right:6px;">Mochila
</h3>

<div
    id="conteudoMochila"
    style="display:none;line-height:1.3;">
</div>

</div>

<!-- =========================================
     DIÁRIO (POPUP FINAL)
========================================= -->

<div id="cardDiario" class="card">

<h3 id="tituloDiario" style="display:none;">
<img src="https://static.wixstatic.com/media/f02643_595d63c2751a4c97b90a29789170e76f~mv2.png" style="height:32px;vertical-align:middle;margin-right:6px;">Diário
</h3>

<div
    id="conteudoDiario"
    style="display:none;line-height:1.3;">
</div>

</div>

        <!-- ACEITAR/RECUSAR (desafios de ponto bônus — travessuras/coração) -->
    <div class="botoes" id="linhaBotoesDesafio">
        <button id="btnAceitar" onclick="aceitarDesafio()">✅ Aceitamos!</button>
        <button id="btnRecusar" onclick="recusarDesafio()">❌ Não vai rolar</button>
    </div>

        <!-- FECHAR (sempre por último) -->
    <div class="botoes" id="linhaBotoesFechar">
        <button id="btnFechar" onclick="fecharPopup()">Fechar</button>
    </div>

</div>

<script>

//==================================================
// COMUNICAÇÃO COM O WIX
//==================================================

function enviar(acao,obj={}){
    parent.postMessage(Object.assign({acao:acao},obj),"*");
}

function fecharPopup(){ enviar("fechar"); }
function aceitarDesafio(){ enviar("aceitar"); }
function recusarDesafio(){ enviar("recusar"); }
function enviarResposta(){
    enviar("enviar",{
        resposta:document.getElementById("resposta").value
    });
}
function pedirDica(){ enviar("dica"); }
// Abre/fecha os cards de Mochila e Diário na tela final,
// sem precisar de popup novo (fica tudo no mesmo popup).
// Nunca os dois abertos ao mesmo tempo: abrir um fecha o outro.
function alternarCard(idParaAbrir, idParaFechar){
    const abrir = document.getElementById(idParaAbrir);
    const fechar = document.getElementById(idParaFechar);

    const jaEstavaAberto = abrir.style.display === "block";

    fechar.style.display = "none";
    abrir.style.display = jaEstavaAberto ? "none" : "block";
}

function abrirMochila(){ alternarCard("cardMochila", "cardDiario"); }

function abrirDiario(){ alternarCard("cardDiario", "cardMochila"); }
  function salvarDiario(){

    enviar(

        "salvarDiario",

        {

            texto:

            document.getElementById("diario").value

        }

    );

}



//==================================================
// MÁQUINA DE ESCREVER
//==================================================

function escreverTexto(elemento, texto, callback, meuRenderId){

    elemento.textContent = "";

// remove as tags HTML antes da animação
texto = texto.replace(/<[^>]*>/g, "");

let i = 0;

    function escrever(){

        // Uma mensagem mais nova chegou enquanto esta
        // animação ainda estava rodando — aborta.
        if(meuRenderId !== renderId){

            return;

        }

        if(i >= texto.length){

            if(callback) callback();

            return;

        }

        if(texto.slice(i,i+3)==="..."){

            elemento.textContent += "...";

            i += 3;

            setTimeout(escrever,180);

            return;

        }

        const letra = texto[i];

        elemento.textContent += letra;

        i++;

        let tempo = 15;

        if(letra===" "){

            tempo = 0;

        }
        else if(letra==="," || letra===";"){

            tempo = 80;

        }
        else if(letra==="." || letra==="!" || letra==="?"){

            tempo = 120;

        }

        setTimeout(escrever,tempo);

    }

    escrever();

}



//==================================================
// RECEBER DADOS DO MOTOR
//==================================================

let renderId = 0;
let mensagemMostrada = false;

window.onmessage=function(event){

    renderId++;
    const meuRenderId = renderId;

    const c=event.data||{};

    // Fundo por tipo de tela — combinando com as cores dos ícones
    // (Diário, Mochila, Regras, Pontos). Final/comemoração ficam
    // brancos por enquanto.
    let fundo = "#ffffff";
    if(c.modo==="mochila"){ fundo = "#eef2e4"; }
    else if(c.modo==="diario"){ fundo = "#f7f0dc"; }
    else if(c.modo==="regras"){ fundo = "#fdf3d8"; }
    else if(!c.modo){ fundo = "#fdece0"; }
    document.body.style.background = fundo;
    document.getElementById("container").style.background = fundo;

    document.getElementById("titulo").innerHTML=c.titulo||"";
    const mensagem = document.getElementById("mensagem");

    const conteudo=document.getElementById("conteudo");
    conteudo.innerHTML="";

    if(c.tipo==="imagem" && c.valor){
        conteudo.innerHTML='<img src="'+c.valor+'">';
    }

    if(c.tipo==="youtube" && c.valor){
        conteudo.innerHTML='<iframe src="https://www.youtube.com/embed/'+c.valor+'?autoplay=1" allowfullscreen></iframe>';
    }

    if(c.tipo==="video" && c.valor){
        conteudo.innerHTML='<video controls autoplay><source src="'+c.valor+'"></video>';
    }

    if(c.tipo==="audio" && c.valor){
        conteudo.innerHTML='<audio controls autoplay><source src="'+c.valor+'"></audio>';
    }

    // Vazio (sem mídia) não deve ocupar espaço no layout.
    conteudo.style.display = conteudo.innerHTML ? "block" : "none";

        //==================================================
    // ELEMENTOS DA TELA
    //==================================================

    const pergunta=document.getElementById("pergunta");
    const resposta=document.getElementById("resposta");
    const btnEnviar=document.getElementById("btnEnviar");
    const btnDica=document.getElementById("btnDica");
    const btnMochila=document.getElementById("btnMochila");
    btnMochila.style.display = c.modo==="final" ? "inline-block" : "none";

  btnDica.innerHTML = c.textoBotaoDica || "💡 Pedir uma dica";

    const btnDiario=document.getElementById("btnDiario");
    btnDiario.style.display = c.modo==="final" ? "inline-block" : "none";
    const msgSistema=document.getElementById("mensagemSistema");
    const diario=document.getElementById("diario");
    const btnSalvarDiario=document.getElementById("btnSalvarDiario");
    const tituloMochila=document.getElementById("tituloMochila");
    const conteudoMochila=document.getElementById("conteudoMochila");

    const tituloDiario=document.getElementById("tituloDiario");
    const conteudoDiario=document.getElementById("conteudoDiario");
    const cardMochila = document.getElementById("cardMochila");
    const cardDiario = document.getElementById("cardDiario");

    // As fileiras de botão em si (não só os botões dentro delas)
    // precisam ficar escondidas quando vazias, senão sobra espaço.
    const linhaBotoesDiario = document.getElementById("linhaBotoesDiario");
    linhaBotoesDiario.style.display = (c.modo==="diario") ? "flex" : "none";

    const linhaBotoesToggle = document.getElementById("linhaBotoesToggle");
    linhaBotoesToggle.style.display = (c.modo==="final") ? "flex" : "none";

    // Desafio de ponto bônus (travessuras/coração) — troca o botão
    // "Fechar" único por "Aceitamos!"/"Não rolou", pra registrar se
    // a família topou o desafio, não só se abriu o popup.
    const linhaBotoesDesafio = document.getElementById("linhaBotoesDesafio");
    const linhaBotoesFechar = document.getElementById("linhaBotoesFechar");
    linhaBotoesDesafio.style.display = c.aceitarRecusar ? "flex" : "none";
    linhaBotoesFechar.style.display = c.aceitarRecusar ? "none" : "flex";

//=========================================
// TEXTO PRINCIPAL
//=========================================

let textoPrincipal = c.pergunta1 || c.resposta;

// Se veio uma dica temporária,
// ela substitui a pergunta original.
if(c.textoPergunta){

    textoPrincipal = c.textoPergunta;

}

const usarMaquina =

    !c.modo ||

    c.modo === "final" ||

    c.modo === "comemoracao";

// Esconde tudo enquanto o Minieu fala

const linhaBotoesResposta = document.getElementById("linhaBotoesResposta");

pergunta.style.display = "none";
resposta.style.display = "none";
btnEnviar.style.display = "none";
btnDica.style.display = "none";
linhaBotoesResposta.style.display = "none";

function mostrarPergunta(){

    if(!textoPrincipal){

        return;

    }

    pergunta.style.display = "block";

if(c.maquinaPergunta){

    escreverTexto(

        pergunta,

        textoPrincipal,

        ()=>{},

        meuRenderId

    );

}
else{

    pergunta.innerHTML = textoPrincipal;

}

    resposta.style.display = "block";
    linhaBotoesResposta.style.display = "flex";

    btnEnviar.style.display = "inline-block";

    if (c.esconderBotaoDica) {

    btnDica.style.display = "none";

} else {

    btnDica.style.display = c.pergunta1
        ? "inline-block"
        : "none";

}

}

// Se for apenas uma atualização da pergunta (dica) ou se a
// mensagem do Minieu já foi mostrada nesta abertura do popup
// (ex: resposta certa/errada), não reescreve ela de novo.

if(c.maquinaPergunta || mensagemMostrada){

    mostrarPergunta();

}
else{

    mensagemMostrada = true;

    // Limpa completamente a mensagem anterior
    mensagem.textContent = "";

    if(c.mensagem && usarMaquina){

        escreverTexto(

            mensagem,

            c.mensagem,

            mostrarPergunta,

            meuRenderId

        );

    }
    else{

        mensagem.innerHTML = c.mensagem || "";

        mostrarPergunta();

    }

}

        //==================================================
    // MENSAGEM DO SISTEMA
    //==================================================

    if(c.mensagemSistema){
        msgSistema.style.display="block";
        msgSistema.innerHTML=c.mensagemSistema;
    }else{
        msgSistema.style.display="none";
        msgSistema.innerHTML="";
    }

  //=========================================
// MOCHILA (card) — modo "final" ou "mochila"
//=========================================

if(c.modo==="final" || c.modo==="mochila"){

    // O título "Mochila" só aparece na tela final combinada —
    // no popup só de mochila já tem o título principal, seria repetido.
    tituloMochila.style.display = (c.modo==="final") ? "block" : "none";
    conteudoMochila.style.display="block";

    // Na tela final começa escondido, só abre se clicar no botão.
    // No popup só de mochila já aparece direto.
    cardMochila.style.display = (c.modo==="final") ? "none" : "block";

    // No popup só de mochila, sem fundo próprio — pega a cor do
    // popup. Na tela final continua com fundo cinza claro, pra
    // se diferenciar do fundo branco ali.
    cardMochila.style.background = (c.modo==="mochila") ? "transparent" : "#f0f0f0";

    let html="";

    (c.mochila || []).forEach(item=>{

        html +=

"<div style='margin-bottom:8px;'>"

+

"<strong>📍 "

+ item.titulo + "</strong><br>"

+

(item.texto || "").replace(/\\n/g,"<br>")

+

"</div>";

    });

    conteudoMochila.innerHTML=html;

}
else{

    tituloMochila.style.display="none";
    conteudoMochila.style.display="none";
    cardMochila.style.display="none";

}

//=========================================
// DIÁRIO (card resumo) — só no modo "final"
//=========================================

if(c.modo==="final"){

    tituloDiario.style.display="block";
    conteudoDiario.style.display="block";

    // Começa escondido, só abre se clicar no botão "Diário".
    cardDiario.style.display="none";

conteudoDiario.innerHTML =

    c.diario

    ? "<div style='white-space:normal;'>" +

      c.diario.replace(/\\n/g,"<br>")

      + "</div>"

    : "<i>Nenhuma anotação.</i>";

}
else{

    tituloDiario.style.display="none";
    conteudoDiario.style.display="none";
    cardDiario.style.display="none";

}

  //=========================================
// DIÁRIO (edição)
//=========================================

if(c.modo==="diario"){


    conteudo.innerHTML="";

    pergunta.style.display="none";

    resposta.style.display="none";

    btnEnviar.style.display="none";

    btnDica.style.display="none";

  btnMochila.style.display="none";

btnDiario.style.display="none";

    msgSistema.style.display="none";

    document.getElementById("mensagem").style.display = c.mensagem ? "block" : "none";

    diario.style.display="block";

    diario.value=c.diario || "";

    btnSalvarDiario.style.display="inline-block";

}
else{

    diario.style.display="none";

    btnSalvarDiario.style.display="none";

    // Só ocupa espaço se realmente tiver mensagem pra mostrar
    // (mochila e regras, por exemplo, não usam esse campo).
    document.getElementById("mensagem").style.display = c.mensagem ? "block" : "none";

}

//=========================================
// COMEMORAÇÃO
//=========================================

if(c.modo==="comemoracao"){

    conteudo.innerHTML = "";

    pergunta.style.display = "none";

    resposta.style.display = "none";

    btnEnviar.style.display = "none";

    btnDica.style.display = "none";

    btnMochila.style.display = "none";

    btnDiario.style.display = "none";

    btnSalvarDiario.style.display = "none";

    msgSistema.style.display = "none";

}

};

</script>
</body>
</html>`;
