// Filename: public/setaGpsHtml.js
//
// Seta de navegação (bússola) — widget independente do mapa GPS,
// mesmo padrão de HTML embutido (data:text/html) dos outros arquivos
// desse projeto (mapaGpsHtml.js, conteudoPanelHtml.js). Recebe um
// ângulo pronto (em graus) via postMessage e só gira a seta na tela
// — quem calcula o ângulo (bearing até o próximo ponto menos a
// direção que o celular está apontando) é a página da missão.

export const htmlSetaGps = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
html,body{
    margin:0;padding:0;
    width:100%;height:100%;
    overflow:hidden;
    background:transparent;
}
#seta{
    width:100%;height:100%;
    display:flex;align-items:center;justify-content:center;
    transition: transform 0.15s linear;
    transform: rotate(0deg);
}
#seta svg{
    width:70%;height:70%;
}
</style>
</head>
<body>

<div id="seta">
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <polygon points="50,6 78,88 50,68 22,88" fill="#2b6ef2" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"/>
    </svg>
</div>

<script>

const seta = document.getElementById('seta');

// Ângulo já vem pronto (bearing - heading, 0-360) — só aplica a
// rotação. Sem ângulo ainda (bússola/GPS não prontos), fica parada
// apontando pra cima.
window.onmessage = function(event){

    const dados = event.data || {};

    if(dados.acao === 'angulo' && typeof dados.valor === 'number'){
        seta.style.transform = 'rotate(' + dados.valor + 'deg)';
    }

};

parent.postMessage({ acao: 'setaPronta' }, '*');

</script>

</body>
</html>`;
