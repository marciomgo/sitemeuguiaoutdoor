// Filename: public/conteudoPanelHtml.js
//
// HTML do painel de conteúdo (mesmo componente usado no popup "Conteudo",
// portado aqui para viver como código versionado no Git). Injetado num
// componente HTML fixo na página via `.src = data:text/html;...` e
// atualizado depois via `.postMessage(...)`.
//
// Duas mudanças em relação ao HTML original do popup:
// 1. `overflow-y:auto` no `html,body` — habilita rolagem interna quando o
//    componente tem altura fixa (em vez de crescer/encolher).
// 2. O bloco que só ativava com `modo === "final"` foi dividido em dois
//    blocos independentes (mochila / diário), permitindo mostrar a mochila
//    sozinha (`modo === "mochila"`) sem precisar também mostrar o diário.

export const htmlPainelConteudo = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    font-family:Arial,Helvetica,sans-serif;
    overflow-y:auto;
}
#container{
    display:flex;
    flex-direction:column;
    gap:18px;
    padding:24px;
    box-sizing:border-box;
    height:100%;
    background:#ffffff;
}


#titulo{
    margin:0;
   text-align:center;
}

#mensagem{
    margin:0;
    white-space:pre-line;
    text-align:center;
}

  #pergunta{
    margin:0;
    text-align:center;
}



#conteudo img,#conteudo video,#conteudo iframe{
    width:100%;max-width:100%;border:none;border-radius:8px;
}

#pergunta,
#mensagemSistema,
#btnEnviar,
#btnDica,
#btnMochila,
#btnDiario,
#btnSalvarDiario,
#btnFechar,
#resposta,
#diario{

    display:none;

}

button{
    padding:12px 18px;
    border:1px solid #d0d0d0;
    border-radius:8px;
    cursor:pointer;
    background:#f5f5f5;
    color:#222;
}

input,
textarea{
    padding:10px;
    border-radius:8px;
    border:1px solid #cfcfcf;
    background:#fff;
    color:#222;
}
#mensagemSistema{
    background:#f4f4f4;
    color:#222;
    padding:12px;
    border-radius:8px;
    border:1px solid #ddd;
}
.botoes{
    display:flex;gap:10px;flex-wrap:wrap;
}

.card{
    display:none;
    background:#f3f3f3;
    border:1px solid #dddddd;
    border-radius:12px;
    padding:18px;
    margin-top:22px;
}

.card h3{
    margin:0 0 14px 0;
    color:#444;
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
        <!-- MENSAGEM -->
    <p id="mensagem"></p>

        <!-- CONTEÚDO (Imagem, Vídeo, Áudio...) -->
    <div id="conteudo"></div>

        <!-- PERGUNTA -->
    <p id="pergunta"></p>

        <!-- RESPOSTA -->
    <input id="resposta" type="text" placeholder="Digite sua resposta">

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
border:1px solid #666;
display:none;
">


</textarea>

        <!-- BOTÕES -->
    <div class="botoes">
        <button id="btnEnviar" onclick="enviarResposta()">Enviar</button>
        <button id="btnDica" onclick="pedirDica()">💡 Quero uma dica</button>
      <button
    id="btnSalvarDiario"
    onclick="salvarDiario()">

    💾 Salvar Diário

</button>
        <button id="btnMochila" onclick="abrirMochila()">🎒 Mochila</button>
        <button id="btnDiario" onclick="abrirDiario()">📔 Diário</button>
        <button id="btnFechar" onclick="fecharPopup()">Fechar</button>
    </div>

        <!-- MENSAGEM DO SISTEMA -->
    <div id="mensagemSistema"></div>

  <!-- =========================================
     MOCHILA (POPUP FINAL)
========================================= -->

<div id="cardMochila" class="card">

<h3 id="tituloMochila" style="display:none;">
🎒 Mochila
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
📔 Diário
</h3>

<div
    id="conteudoDiario"
    style="display:none;line-height:1.3;">
</div>

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
function enviarResposta(){
    enviar("enviar",{
        resposta:document.getElementById("resposta").value
    });
}
function pedirDica(){ enviar("dica"); }
function abrirMochila(){
    // será usado apenas no Popup Final
}

function abrirDiario(){
    // será usado apenas no Popup Final
}
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

function escreverTexto(elemento, texto, callback){

    elemento.textContent = "";

// remove as tags HTML antes da animação
texto = texto.replace(/<[^>]*>/g, "");

let i = 0;

    function escrever(){

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

window.onmessage=function(event){

    const c=event.data||{};

document.getElementById("container").style.background = "#FFFFFF";

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

        //==================================================
    // ELEMENTOS DA TELA
    //==================================================

    const pergunta=document.getElementById("pergunta");
    const resposta=document.getElementById("resposta");
    const btnEnviar=document.getElementById("btnEnviar");
    const btnDica=document.getElementById("btnDica");
    const btnMochila=document.getElementById("btnMochila");

  btnDica.innerHTML = c.textoBotaoDica || "💡 Pedir uma dica";

    const btnDiario=document.getElementById("btnDiario");
    const msgSistema=document.getElementById("mensagemSistema");
    const diario=document.getElementById("diario");
    const btnSalvarDiario=document.getElementById("btnSalvarDiario");
    const tituloMochila=document.getElementById("tituloMochila");
    const conteudoMochila=document.getElementById("conteudoMochila");

    const tituloDiario=document.getElementById("tituloDiario");
    const conteudoDiario=document.getElementById("conteudoDiario");
    const cardMochila = document.getElementById("cardMochila");
    const cardDiario = document.getElementById("cardDiario");



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

pergunta.style.display = "none";
resposta.style.display = "none";
btnEnviar.style.display = "none";
btnDica.style.display = "none";

function mostrarPergunta(){

    if(!textoPrincipal){

        return;

    }

    pergunta.style.display = "block";

if(c.maquinaPergunta){

    escreverTexto(

        pergunta,

        textoPrincipal,

        ()=>{}

    );

}
else{

    pergunta.innerHTML = textoPrincipal;

}

    resposta.style.display = "block";

    btnEnviar.style.display = "inline-block";

    if (c.esconderBotaoDica) {

    btnDica.style.display = "none";

} else {

    btnDica.style.display = c.pergunta1
        ? "inline-block"
        : "none";

}

}

// Se for apenas uma atualização da pergunta (dica),
// não reescreve a mensagem do Minieu.

if(c.maquinaPergunta){

    mostrarPergunta();

}
else{

    // Limpa completamente a mensagem anterior
    mensagem.textContent = "";

    if(c.mensagem && usarMaquina){

        escreverTexto(

            mensagem,

            c.mensagem,

            mostrarPergunta

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

    tituloMochila.style.display="block";
    conteudoMochila.style.display="block";
    cardMochila.style.display="block";
    document.getElementById("btnFechar").style.display="inline-block";

    let html="";

    (c.mochila || []).forEach(item=>{

        html +=

"<div style='margin-bottom:14px;'>"

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
    document.getElementById("btnFechar").style.display="none";

}

//=========================================
// DIÁRIO (card resumo) — só no modo "final"
//=========================================

if(c.modo==="final"){

    tituloDiario.style.display="block";
    conteudoDiario.style.display="block";
    cardDiario.style.display="block";

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

    document.getElementById("mensagem").style.display = "none";

    diario.style.display="block";

    diario.value=c.diario || "";

    btnSalvarDiario.style.display="inline-block";

}
else{

    diario.style.display="none";

    btnSalvarDiario.style.display="none";

    document.getElementById("mensagem").style.display = "block";

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
