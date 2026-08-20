// Filename: public/mapaGpsHtml.js
//
// Mapa GPS embutido (Leaflet + OpenStreetMap) — mostra os pontos da
// missão (ícones clicáveis, posicionados por coordenada real, sem
// distorcer em nenhum tamanho de tela) e a localização ao vivo da
// família. Carregado em `#htmlMapaGps` via `.src = data:text/html;...`
// na página da missão. Recebe os pontos por `.postMessage()` (evento
// "pontos") e avisa a página quando um marcador é clicado (evento
// "pontoClicado").

export const htmlMapaGps = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body{margin:0;padding:0;height:100%;overflow:hidden;}
/* #viewport é o "buraco" visível de verdade (tamanho do widget na
   página). #mapGiro é maior que isso de propósito (150%) e centralizado
   por cima — sobra o suficiente pra girar em qualquer ângulo sem
   deixar canto vazio aparecendo. Girar só o #mapGiro (nunca as panes
   internas do Leaflet) evita brigar com o jeito que o Leaflet já
   controla sozinho o posicionamento/zoom por dentro. */
#viewport{
    width:100%;height:100%;
    overflow:hidden;
    position:relative;
    border-radius:16px;
    /* Sem isso, com o arrastar/zoom do Leaflet desligados (modo foco),
       o celular pode interpretar o toque como um gesto de rolagem da
       página em vez de um clique no ícone — os pontos ficavam "surdos"
       ao toque por causa disso. */
    touch-action: none;
}
#mapGiro{
    position:absolute;
    width:150%;height:150%;
    top:-25%;left:-25%;
    /* Sem transição — o mapa girando o tempo todo (mesmo suave)
       deixava o toque nos marcadores muito instável (media uns 10
       toques até um registrar). Atualiza em saltinhos a cada leitura
       da bússola em vez de deslizar continuamente. */
}
#map{width:100%;height:100%;}
/* Pontinho da família — agora é a própria seta (a carinha do
   personagem). Gira em volta do próprio centro (não do rodapé,
   diferente dos pinos) — é uma agulha, não um marcador fixo num
   lugar. */
/* O Leaflet cria um <div> PRÓPRIO por fora do meu (com a classe que
   eu passo em "className" no L.divIcon) — é ESSE que precisa do
   pointer-events:none, não só o meu de dentro, senão ele continua
   "sólido" pro navegador mesmo com o filho marcado como transparente
   a toque (pointer-events não sobe pro pai, só desce pros filhos). */
.icone-eu-wrapper{
    pointer-events:none;
}
.icone-eu-seta{
    position:relative;
    width:100%;height:100%;
    transform-origin:50% 50%;
    filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5));
    transition: transform 0.15s linear;
}
.icone-eu-seta img{ width:100%;height:100%;object-fit:contain; }
/* Tracinhos de vento — só aparecem durante o "pulsinho" de caminhada
   (mesma janela da troca de perna). A imagem é vista de cima e
   aponta pra cima dela mesma (frente = topo do desenho), então o
   rastro sai por BAIXO (atrás), não do lado. Fica dentro do mesmo
   elemento que gira, então gira junto com o personagem. */
.linhas-movimento{
    position:absolute;
    bottom:-18px;left:50%;
    transform:translateX(-50%);
    display:none;
    flex-direction:column;
    align-items:center;
    gap:4px;
}
.linhas-movimento.ativo{ display:flex; }
.linhas-movimento span{
    display:block;
    width:3px;
    background:rgba(255,255,255,0.85);
    border-radius:2px;
    box-shadow:0 0 2px rgba(0,0,0,0.4);
    opacity:0;
}
.linhas-movimento span:nth-child(1){ height:14px; }
.linhas-movimento span:nth-child(2){ height:10px; }
.linhas-movimento span:nth-child(3){ height:7px; }
/* Cada tracinho "flui" (desliza pra longe/baixo e some, repetindo)
   em vez de só aparecer/sumir parado — dá o ar de vento passando.
   Atraso diferente em cada um pra não moverem todos junto, tipo
   rajada. */
@keyframes ventoLinha{
    0%{ opacity:0; transform:translateY(-4px); }
    25%{ opacity:1; transform:translateY(0); }
    100%{ opacity:0; transform:translateY(16px); }
}
.linhas-movimento.ativo span{
    animation: ventoLinha 0.55s ease-out infinite;
}
.linhas-movimento.ativo span:nth-child(2){ animation-delay:0.15s; }
.linhas-movimento.ativo span:nth-child(3){ animation-delay:0.3s; }
.icone-ponto-img{
    width:100%;height:100%;
    object-fit:contain;
    display:block;
}
/* Contra-giro dos ícones — o mapa todo gira (#mapGiro), mas cada
   marcador tem esse wrapper girando pro lado oposto por dentro, pra
   ficar sempre "em pé" na tela (número/imagem legível), não de
   cabeça pra baixo. Girar em volta do CENTRO (não do rodapé) —
   girando pelo rodapé, em ângulos grandes o desenho "balança" pra
   longe da posição real (a caixinha do Leaflet, que decide onde o
   toque vale, não gira e fica pra trás) — o ícone parecia noutro
   lugar da tela, mas o toque só funcionava na posição de verdade.
   Girando pelo centro, o ícone só gira no lugar, sem se deslocar. */
.giro-marcador{
    width:100%;height:100%;
    transform-origin:50% 50%;
}
.icone-ponto-cinza{
    filter: grayscale(100%) brightness(70%);
}
.icone-ponto-cinza-leve{
    filter: grayscale(100%);
}
.icone-bonus{
    background:#f0b429;
    color:#fff;
    width:30px;height:30px;
    border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-weight:bold;font-size:16px;
    border:2px solid #fff;
    box-shadow:0 1px 4px rgba(0,0,0,0.4);
}
.leaflet-control-attribution{
    font-size:8px;
    padding:0 3px;
    opacity:0.35;
    background:transparent;
}
#btnCamada{
    position:absolute;
    bottom:10px;right:10px;
    z-index:1000;
    width:34px;height:34px;
    padding:0;
    font-size:18px;
    line-height:34px;
    text-align:center;
    border:none;
    border-radius:50%;
    background:rgba(255,255,255,0.9);
    box-shadow:0 1px 4px rgba(0,0,0,0.4);
    cursor:pointer;
}
/* Barras de progresso — ficam FORA do #mapGiro de propósito, então
   não giram junto com o mapa; são só uma lista fixa na tela. Pontos
   oficiais na esquerda, bônus liberados na direita. Substituem os
   botões numerados que existiam fora do mapa. */
.barra-progresso{
    position:absolute;
    top:10px;
    bottom:50px;
    z-index:900;
    display:flex;
    flex-direction:column;
    gap:4px;
    overflow-y:auto;
    scrollbar-width:none;
    /* A faixa inteira (inclusive os espaços vazios entre ícones) NÃO
       pode bloquear toque — o mapa gira por baixo, então qualquer
       marcador pode girar pra debaixo dessa faixa fixa e ficar
       "surdo" ao toque. Cada ícone reativa o toque individualmente
       (.icone-barra abaixo), só onde ele realmente está desenhado. */
    pointer-events:none;
}
.barra-progresso::-webkit-scrollbar{ display:none; }
/* Invertida — chegada em cima, ponto 1 embaixo (sobe conforme avança
   na missão). Só inverte a ORDEM VISUAL, os dados continuam vindo
   1..N normalmente. */
#barraOficiais{ left:10px; flex-direction:column-reverse; }
/* Bônus não estica do topo à base como a de oficiais — cresce a
   partir do centro vertical (top:50% + translateY), então conforme
   mais bônus vão sendo liberados a fileira cresce pros dois lados,
   sem "pular" de posição nem ficar grudada no topo com poucos itens. */
#barraBonus{
    right:10px;
    top:50%;
    bottom:auto;
    max-height:calc(100% - 60px);
    transform:translateY(-50%);
}
.icone-barra{
    width:34px;height:34px;
    flex:none;
    cursor:pointer;
    pointer-events:auto;
}
.icone-barra img{
    width:100%;height:100%;
    object-fit:contain;
    display:block;
    /* Sem círculo branco atrás — só a sombra pra não sumir em cima de
       um fundo de mapa parecido com a cor do ícone. */
    filter:drop-shadow(0 1px 3px rgba(0,0,0,0.7));
}
/* Mais específico que ".icone-barra img" de propósito — senão a
   sombra acima ganha do filtro cinza (duas regras disputando a mesma
   propriedade "filter", só uma vale) e o ícone nunca fica cinza de
   verdade. Aqui inclui os dois efeitos juntos. */
.icone-barra img.icone-ponto-cinza{
    filter: grayscale(100%) brightness(70%) drop-shadow(0 1px 3px rgba(0,0,0,0.7));
}
.icone-barra.invisivel{ visibility:hidden; }
/* Só o bônus ganha o círculo branco atrás — o ícone dentro dele fica
   sem sombra (o círculo já dá contraste sozinho; a sombra por cima do
   fundo branco ficava com um ar borrado/sujo). Seletores com #barraBonus
   na frente de propósito, pra ganhar das regras de sombra/cinza acima
   (mesma pegadinha de especificidade CSS de antes). */
#barraBonus .icone-barra{
    background:rgba(255,255,255,0.9);
    border-radius:50%;
    box-shadow:0 1px 4px rgba(0,0,0,0.4);
    padding:4px;
    box-sizing:border-box;
}
#barraBonus .icone-barra img{
    filter:none;
}
#barraBonus .icone-barra img.icone-ponto-cinza{
    filter: grayscale(100%) brightness(70%);
}

/* Overlay de bônus liberado — mesmo espírito do botão de ativar
   bússola (grande, centralizado, fundo escurecido). */
#overlayBonus{
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.75);
    display:none;
    align-items:center;
    justify-content:center;
    z-index:99998;
    font-family:Arial,Helvetica,sans-serif;
    text-align:center;
    flex-direction:column;
    gap:16px;
    padding:24px;
    box-sizing:border-box;
}
/* Espaço reservado pro ícone que fica flutuando por cima (fixed) —
   sem isso, o ícone e o texto disputavam o mesmo centro da tela e
   ficavam sobrepostos. */
#overlayIconeEspaco{
    width:120px;height:120px;
    flex:none;
}
#overlayBonusTexto{
    color:#fff;
    font-size:15px;
    font-weight:bold;
    max-width:80vw;
}
#overlayBonusBotoes{ display:flex; gap:8px; }
#overlayBonusBotoes button{
    padding:7px 11px;
    font-size:13px;
    font-weight:bold;
    border:none;
    border-radius:8px;
    cursor:pointer;
}
#btnBonusSim{ background:#e8a33d; color:#4a2e05; }
#btnBonusNao{ background:rgba(255,255,255,0.85); color:#333; }

/* Ícone que "voa" do centro até a posição dele na barra da direita —
   elemento próprio, fora do overlay, pra poder animar livremente por
   cima de tudo. */
#iconeVoando{
    position:fixed;
    z-index:99999;
    border-radius:50%;
    background:rgba(255,255,255,0.9);
    box-shadow:0 4px 20px rgba(0,0,0,0.5);
    transition: top 0.6s ease, left 0.6s ease, width 0.6s ease, height 0.6s ease, opacity 0.6s ease;
    pointer-events:none;
    box-sizing:border-box;
}
#iconeVoando img{ width:100%;height:100%;object-fit:contain;display:block; }

/* Confirma visualmente que o toque foi recebido, mesmo quando não
   acerta em cima de nada — ajuda a não ficar tocando freneticamente
   sem saber se o app "sentiu" o toque. */
.toque-splash{
    position:fixed;
    width:42px;height:42px;
    margin-left:-21px;margin-top:-21px;
    border-radius:50%;
    background:rgba(255,255,255,0.55);
    border:2px solid rgba(255,255,255,0.85);
    box-sizing:border-box;
    pointer-events:none;
    z-index:99997;
    transform:scale(0.3);
    opacity:1;
    transition: transform 0.45s ease-out, opacity 0.45s ease-out;
}
</style>
</head>
<body>

<div id="viewport">
    <div id="mapGiro">
        <div id="map"></div>
    </div>
</div>
<button id="btnCamada" onclick="alternarCamada()">🛰️</button>

<div id="barraOficiais" class="barra-progresso"></div>
<div id="barraBonus" class="barra-progresso" style="align-items:flex-end;"></div>

<div id="overlayBonus">
    <div id="overlayIconeEspaco"></div>
    <div id="overlayBonusTexto">Ponto bônus liberado! Quer ir até lá?</div>
    <div id="overlayBonusBotoes">
        <button id="btnBonusSim">✅ Sim, vamos!</button>
        <button id="btnBonusNao">Agora não</button>
    </div>
</div>

<div id="iconeVoando"><img id="iconeVoandoImg" src=""></div>

<script>

// Splash de toque — feedback visual imediato em qualquer toque na
// tela, mesmo que não acerte em cima de nada. pointerdown/pointermove
// cobre touch e mouse num só evento, sem duplicar.
function criarSplash(x, y){

    const el = document.createElement('div');
    el.className = 'toque-splash';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);

    requestAnimationFrame(() => {
        el.style.transform = 'scale(1.9)';
        el.style.opacity = '0';
    });

    setTimeout(() => el.remove(), 500);

}

let arrastando = false;
let ultimoSplashArraste = 0;

document.addEventListener('pointerdown', function(evento){
    arrastando = true;
    criarSplash(evento.clientX, evento.clientY);
});

document.addEventListener('pointermove', function(evento){

    if(!arrastando) return;

    // Limita a frequência do "rastro" durante o arraste — sem isso,
    // um arrasto longo criaria dezenas de elementos por segundo à
    // toa (o dedo se move rápido demais pra precisar de um splash a
    // cada pixel).
    const agora = Date.now();
    if(agora - ultimoSplashArraste < 45) return;
    ultimoSplashArraste = agora;

    criarSplash(evento.clientX, evento.clientY);

});

document.addEventListener('pointerup', function(){ arrastando = false; });
document.addEventListener('pointercancel', function(){ arrastando = false; });

// Zoom fixo, sempre o mesmo — foco total no entorno próximo (o
// próximo ponto obrigatório), em vez de mostrar o parque inteiro.
// Modo simples de navegação: mapa sempre centralizado em quem está
// jogando, sem precisar arrastar nem dar zoom manual.
const ZOOM_FOCO = 18;

let mapa = L.map('map', {
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false,
    boxZoom: false,
    keyboard: false
}).setView([-30.0346, -51.2177], ZOOM_FOCO);

// Duas camadas de base — ruas (OpenStreetMap) e satélite (Esri World
// Imagery, gratuito, sem precisar de chave de API) — alternadas pelo
// botão #btnCamada.
const camadaRuas = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
});

const camadaSatelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
});

camadaRuas.addTo(mapa);

let sateliteAtivo = false;

function alternarCamada(){

    if(sateliteAtivo){
        mapa.removeLayer(camadaSatelite);
        camadaRuas.addTo(mapa);
        document.getElementById('btnCamada').textContent = '🛰️';
    } else {
        mapa.removeLayer(camadaRuas);
        camadaSatelite.addTo(mapa);
        document.getElementById('btnCamada').textContent = '🗺️';
    }

    sateliteAtivo = !sateliteAtivo;

}

// Perímetro do parque — não fica fixo aqui, vem de fora (campo
// "perimetro" da coleção "Parques" no CMS) via postMessage.
let camadaPerimetro = null;
let camadaMascara = null;

// Retângulo enorme (cobre o mapa inteiro) com um "buraco" no formato
// do parque — o resultado visual é tudo fora do perímetro ficando
// coberto de branco, só o parque aparecendo por baixo.
function desenharMascara(coordenadas){

    const anelExterno = [[-85,-180],[-85,180],[85,180],[85,-180]];
    const buraco = coordenadas.map(c => [c[1], c[0]]);

    camadaMascara = L.polygon([anelExterno, buraco], {
        stroke: false,
        fillColor: '#000000',
        // TEMPORÁRIO: 0 pra tirar print fora do parque sem o fundo
        // preto. Volta pra 0.5 depois.
        fillOpacity: 0,
        // Puramente decorativa (nunca teve clique nenhum nela) — mas
        // por padrão o Leaflet deixa toda forma vetorial (polígono)
        // clicável, e o "buraco" do formato não conta pra isso: o
        // navegador enxerga o contorno inteiro como área de toque,
        // roubando cliques de marcadores que caem por cima dela.
        interactive: false
    }).addTo(mapa);

    camadaMascara.bringToBack();

}

function desenharPerimetro(coordenadas){

    if(!coordenadas || !coordenadas.length) return;

    if(camadaPerimetro){
        mapa.removeLayer(camadaPerimetro);
    }

    if(camadaMascara){
        mapa.removeLayer(camadaMascara);
    }

    camadaPerimetro = L.geoJSON({
        type: "Polygon",
        coordinates: [coordenadas]
    }, {
        style: {
            color: '#000000',
            weight: 3,
            fillColor: 'transparent'
        },
        // Também decorativa — mesma razão do interactive:false na
        // máscara logo abaixo.
        interactive: false
    }).addTo(mapa);

    desenharMascara(coordenadas);

    Object.values(marcadoresPontos).forEach(m => m.bringToFront());
    if(marcadorEu) marcadorEu.bringToFront();
    if(marcadorLargada) marcadorLargada.bringToFront();

    // Zoom agora é sempre fixo (ZOOM_FOCO) — não dá mais fitBounds no
    // perímetro inteiro, senão perderia o foco no ponto próximo.

}

let marcadoresPontos = {};
let marcadoresBonus = {};
let marcadorEu = null;

// Tipos cujo desenho original já é mais escuro — usam um filtro
// mais leve (sem escurecer ainda mais) quando ainda não achado.
const TIPOS_FILTRO_LEVE = ['travessuras'];

// Ícones em divIcon com um wrapper .giro-marcador por dentro — é
// esse wrapper que recebe o contra-giro (aplicarContraGiro), não o
// marcador inteiro, senão o Leaflet perderia a posição dele no mapa.
function iconeBonus(url, achado, tipo){

    if(url){
        let classe = 'icone-ponto-img';
        if(!achado){
            classe += TIPOS_FILTRO_LEVE.includes(tipo) ? ' icone-ponto-cinza-leve' : ' icone-ponto-cinza';
        }
        return L.divIcon({
            className: '',
            html: '<div class="giro-marcador"><img src="' + url + '" class="' + classe + '"></div>',
            iconSize: [50,50],
            // Ancorado pelo centro (não pela base) — bate exatamente
            // com o ponto de giro (.giro-marcador, transform-origin
            // 50% 50%), senão o desenho gira em volta de um ponto
            // diferente de onde o toque de verdade vale, e "descola"
            // conforme o ângulo. Mesmo esquema do bonequinho, que
            // nunca teve esse problema.
            iconAnchor: [25,25]
        });
    }

    return L.divIcon({
        className: '',
        html: '<div class="giro-marcador"><div class="icone-bonus">?</div></div>',
        iconSize: [38,38],
        iconAnchor: [19,19]
    });
}

function desenharPontosBonus(pontosBonus){

    Object.values(marcadoresBonus).forEach(m => mapa.removeLayer(m));
    marcadoresBonus = {};

    pontosBonus.forEach(ponto => {

        if(!ponto.latitude || !ponto.longitude) return;

        const marcador = L.marker([ponto.latitude, ponto.longitude], {
            icon: iconeBonus(ponto.icone, ponto.achado, ponto.tipo),
            zIndexOffset: 950
        }).addTo(mapa);

        marcador.on('click', () => {
            parent.postMessage({ acao: 'pontoBonusClicado', id: ponto.id }, '*');
        });

        marcadoresBonus[ponto.id] = marcador;

    });

    aplicarContraGiro();

    renderizarBarraBonus(pontosBonus);

}

// Ícones customizados (imagens do Gerenciador de Mídia do Wix).
const ICONES_NUMERADOS = {
    1: "https://static.wixstatic.com/media/f02643_48f7c1d977754b23977fd2e7f58c6c27~mv2.png",
    2: "https://static.wixstatic.com/media/f02643_f14858e9c66d43feae48eff43148759e~mv2.png",
    3: "https://static.wixstatic.com/media/f02643_cba7ab04f17845d98a60cbdb48466302~mv2.png",
    4: "https://static.wixstatic.com/media/f02643_ea984cd4c0fc44aead08ba7a5af6b383~mv2.png",
    5: "https://static.wixstatic.com/media/f02643_6a69d7baa0794d37848b3948fed51e44~mv2.png",
    6: "https://static.wixstatic.com/media/f02643_801dffdc2e554552a5c134e097d91ea6~mv2.png",
    7: "https://static.wixstatic.com/media/f02643_cd0ee07d3fcd40fb9a33810c88f2d851~mv2.png",
    8: "https://static.wixstatic.com/media/f02643_91b88885a5c44c8c833417bc1190b7b5~mv2.png",
    9: "https://static.wixstatic.com/media/f02643_1b89172049664af79ec14bce19a83033~mv2.png",
    10: "https://static.wixstatic.com/media/f02643_033f68da0d1044bcbd9a97da09181820~mv2.png",
    11: "https://static.wixstatic.com/media/f02643_193c340555f24225b4d92d767d84255a~mv2.png",
    12: "https://static.wixstatic.com/media/f02643_1ff212affeb84c9584f484f04ba0535e~mv2.png",
    13: "https://static.wixstatic.com/media/f02643_741fb6aae44744de8ed6e009fb318faf~mv2.png",
    14: "https://static.wixstatic.com/media/f02643_b1b9ad3701be4696815636ec5dc6cedc~mv2.png",
    15: "https://static.wixstatic.com/media/f02643_ed5489163f5f4182b136c62a8f93eb33~mv2.png"
};
const ICONE_CHEGADA = "https://static.wixstatic.com/media/f02643_744242f786c449fe9a7c6133d6b91464~mv2.png";
const ICONE_LARGADA = "https://static.wixstatic.com/media/f02643_83d5d7c16a834a8e9a7a4205276fc8cf~mv2.png";

let marcadorLargada = null;

// Abre o mapa centralizado na largada (não na localização crua da
// família) só até a primeira localização ao vivo chegar — a partir
// daí quem manda no enquadramento é atualizarMinhaLocalizacao().
let primeiroDesenhoLargada = true;

function desenharLargada(latitude, longitude){

    if(!latitude || !longitude) return;

    if(marcadorLargada){
        mapa.removeLayer(marcadorLargada);
    }

    marcadorLargada = L.marker([latitude, longitude], {
        icon: L.divIcon({
            className: '',
            html: '<div class="giro-marcador"><img src="' + ICONE_LARGADA + '" class="icone-ponto-img"></div>',
            iconSize: [40,40],
            iconAnchor: [20,20]
        }),
        zIndexOffset: 900
    }).addTo(mapa);

    if(primeiroDesenhoLargada){
        mapa.setView([latitude, longitude], ZOOM_FOCO);
        primeiroDesenhoLargada = false;
    }

    aplicarContraGiro();

}

function iconePonto(codigo, ehChegada, concluido){
    const url = ehChegada ? ICONE_CHEGADA : (ICONES_NUMERADOS[codigo] || ICONES_NUMERADOS[1]);
    const classe = 'icone-ponto-img' + (concluido ? '' : ' icone-ponto-cinza');
    return L.divIcon({
        className: '',
        html: '<div class="giro-marcador"><img src="' + url + '" class="' + classe + '"></div>',
        iconSize: [40,40],
        iconAnchor: [20,20]
    });
}

function desenharPontos(pontos){

    Object.values(marcadoresPontos).forEach(m => mapa.removeLayer(m));
    marcadoresPontos = {};

    const maiorCodigo = Math.max(...pontos.map(p => p.codigo));

    pontos.forEach(ponto => {

        if(!ponto.latitude || !ponto.longitude) return;

        const marcador = L.marker([ponto.latitude, ponto.longitude], {
            icon: iconePonto(ponto.codigo, ponto.codigo === maiorCodigo, ponto.concluido),
            zIndexOffset: 950
        }).addTo(mapa);

        marcador.on('click', () => {
            parent.postMessage({ acao: 'pontoClicado', codigo: ponto.codigo }, '*');
        });

        marcadoresPontos[ponto.codigo] = marcador;

    });

    // Zoom agora é sempre fixo (ZOOM_FOCO) — não dá mais fitBounds nos
    // pontos, senão perderia o foco no ponto próximo.
    aplicarContraGiro();

    renderizarBarraOficiais(pontos, maiorCodigo);

}

//==================================================
// BARRAS DE PROGRESSO (dentro do mapa)
//==================================================
// Ficam fora do #mapGiro (não giram) — mostram de relance quais
// pontos já foram feitos, sem precisar do mapa cheio como antes.
// Cliques disparam a mesma mensagem que um marcador do mapa dispara.

const TAMANHO_MAX_ICONE_BARRA = 34;
const TAMANHO_MIN_ICONE_BARRA = 16;
const GAP_BARRA = 4;

// Bônus não usa o encolhimento dinâmico (a barra dele não estica do
// topo à base, cresce a partir do centro — ver CSS #barraBonus), fica
// nesse tamanho fixo, um pouco maior que os oficiais.
const TAMANHO_ICONE_BONUS = 32;

// Encolhe os ícones o quanto precisar pra a fileira inteira caber na
// altura disponível, sem cortar nem precisar rolar (com poucos
// pontos, fica no tamanho máximo normal).
function ajustarTamanhoBarra(idBarra){

    const barra = document.getElementById(idBarra);
    const itens = barra.children;
    const total = itens.length;

    if(total === 0) return;

    const alturaDisponivel = barra.clientHeight;
    const alturaComGaps = alturaDisponivel - GAP_BARRA * (total - 1);

    let tamanho = Math.floor(alturaComGaps / total);
    tamanho = Math.max(TAMANHO_MIN_ICONE_BARRA, Math.min(TAMANHO_MAX_ICONE_BARRA, tamanho));

    for(let i = 0; i < total; i++){
        itens[i].style.width = tamanho + 'px';
        itens[i].style.height = tamanho + 'px';
    }

}

function renderizarBarraOficiais(pontos, maiorCodigo){

    const barra = document.getElementById('barraOficiais');
    barra.innerHTML = '';

    pontos.forEach((ponto) => {

        const url = ponto.codigo === maiorCodigo
            ? ICONE_CHEGADA
            : (ICONES_NUMERADOS[ponto.codigo] || ICONES_NUMERADOS[1]);

        const item = document.createElement('div');
        item.className = 'icone-barra';

        const img = document.createElement('img');
        img.src = url;
        if(!ponto.concluido){
            img.className = 'icone-ponto-cinza';
        }

        item.appendChild(img);

        item.addEventListener('click', () => {
            parent.postMessage({ acao: 'pontoClicado', codigo: ponto.codigo }, '*');
        });

        barra.appendChild(item);

    });

    ajustarTamanhoBarra('barraOficiais');

}

// Ids de bônus com a animação de liberação em andamento — ficam
// reservados (espaço ocupado, mas invisíveis) na barra até a
// animação terminar, pra não aparecer duplicado nem "pular" no lugar.
const bonusEmCelebracao = new Set();
let ultimoPontosBonus = [];

function renderizarBarraBonus(pontosBonus){

    ultimoPontosBonus = pontosBonus;

    const barra = document.getElementById('barraBonus');
    barra.innerHTML = '';

    pontosBonus.forEach((ponto) => {

        const item = document.createElement('div');
        item.className = 'icone-barra' + (bonusEmCelebracao.has(ponto.id) ? ' invisivel' : '');
        item.setAttribute('data-bonus-id', ponto.id);
        item.style.width = TAMANHO_ICONE_BONUS + 'px';
        item.style.height = TAMANHO_ICONE_BONUS + 'px';

        const img = document.createElement('img');
        img.src = ponto.icone;
        if(!ponto.achado){
            img.className = 'icone-ponto-cinza';
        }

        item.appendChild(img);

        item.addEventListener('click', () => {
            parent.postMessage({ acao: 'pontoBonusClicado', id: ponto.id }, '*');
        });

        barra.appendChild(item);

    });

}

//==================================================
// BÔNUS LIBERADO — popup grande + animação até a barra
//==================================================

let bonusAguardando = null;

function mostrarBonusLiberado(bonus){

    bonusAguardando = bonus;

    bonusEmCelebracao.add(bonus.id);
    renderizarBarraBonus(ultimoPontosBonus);

    document.getElementById('overlayBonusTexto').textContent =
        bonus.titulo + ' liberado! Quer ir até lá?';

    document.getElementById('overlayBonus').style.display = 'flex';

    const voando = document.getElementById('iconeVoando');
    const img = document.getElementById('iconeVoandoImg');

    img.src = bonus.icone;

    // Posiciona em cima do espaço reservado dentro do overlay (que já
    // empurra o texto/botões pra baixo dele) — em vez de um chute de
    // "30% da tela", que ficava sobrepondo o texto dependendo do
    // tamanho da mensagem.
    const espaco = document.getElementById('overlayIconeEspaco').getBoundingClientRect();

    voando.style.transition = 'none';
    voando.style.opacity = '1';
    voando.style.width = espaco.width + 'px';
    voando.style.height = espaco.height + 'px';
    voando.style.top = espaco.top + 'px';
    voando.style.left = espaco.left + 'px';
    voando.style.display = 'block';

    // Força o navegador a aplicar o estado inicial antes de religar a
    // transição — senão essa primeira aparição também animaria.
    void voando.offsetWidth;
    voando.style.transition = '';

}

function fecharOverlayBonus(){

    document.getElementById('overlayBonus').style.display = 'none';

    const voando = document.getElementById('iconeVoando');
    const alvo = bonusAguardando
        ? document.querySelector('.icone-barra[data-bonus-id="' + bonusAguardando.id + '"]')
        : null;

    if(alvo){

        const rect = alvo.getBoundingClientRect();

        voando.style.top = rect.top + 'px';
        voando.style.left = rect.left + 'px';
        voando.style.width = rect.width + 'px';
        voando.style.height = rect.height + 'px';
        voando.style.opacity = '0';

    } else {

        voando.style.opacity = '0';

    }

    const idTerminando = bonusAguardando ? bonusAguardando.id : null;
    bonusAguardando = null;

    setTimeout(() => {

        voando.style.display = 'none';

        if(idTerminando){
            bonusEmCelebracao.delete(idTerminando);
            renderizarBarraBonus(ultimoPontosBonus);
        }

    }, 650);

}

document.getElementById('btnBonusSim').addEventListener('click', () => {

    if(bonusAguardando){
        parent.postMessage({ acao: 'pontoBonusClicado', id: bonusAguardando.id }, '*');
    }

    fecharOverlayBonus();

});

document.getElementById('btnBonusNao').addEventListener('click', () => {
    fecharOverlayBonus();
});

// Distância (metros) que o centro do mapa fica deslocado pra frente
// de quem está jogando — não centraliza exatamente em cima da pessoa,
// centraliza um pouco à frente. Resultado: o pontinho acaba sobrando
// mais pra baixo na tela, sobrando mais mapa visível do que vem pela
// frente (igual apps de navegação a pé).
const DESLOCAMENTO_FRENTE_M = 25;

// Calcula um ponto a uma distância/direção de outro (fórmula padrão
// de "destino a partir de origem + bearing + distância", esfera).
function deslocarPonto(lat, lng, bearingGraus, distanciaMetros){

    const R = 6371000;
    const brng = bearingGraus * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lon1 = lng * Math.PI / 180;

    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(distanciaMetros / R) +
        Math.cos(lat1) * Math.sin(distanciaMetros / R) * Math.cos(brng)
    );

    const lon2 = lon1 + Math.atan2(
        Math.sin(brng) * Math.sin(distanciaMetros / R) * Math.cos(lat1),
        Math.cos(distanciaMetros / R) - Math.sin(lat1) * Math.sin(lat2)
    );

    return [lat2 * 180 / Math.PI, lon2 * 180 / Math.PI];

}

// Direção (bearing, 0°=Norte, sentido horário) de um ponto até outro
// — mesma fórmula que a seta antiga usava.
function calcularBearing(lat1, lon1, lat2, lon2){

    const toRad = g => g * Math.PI / 180;
    const toGrau = r => r * 180 / Math.PI;

    const dLon = toRad(lon2 - lon1);

    const y = Math.sin(dLon) * Math.cos(toRad(lat2));

    const x =
        Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

    return (toGrau(Math.atan2(y, x)) + 360) % 360;

}

const ICONE_EU_PARADO = "https://static.wixstatic.com/media/f02643_337efeb8f7ca4565aecb4b2f8b8b0ea4~mv2.png";
const ICONE_EU_PERNA_DIREITA = "https://static.wixstatic.com/media/f02643_8152aaff69a2439cb5ada2737a8c6f1f~mv2.png";
const ICONE_EU_PERNA_ESQUERDA = "https://static.wixstatic.com/media/f02643_f5c1463acdc04d85978f56dbab851628~mv2.png";

function iconeEuSvg(){
    return '<div class="icone-eu-seta"><img id="imgEuAtual" src="' + ICONE_EU_PARADO + '">' +
        '<div id="linhasMovimento" class="linhas-movimento"><span></span><span></span><span></span></div>' +
        '</div>';
}

// Distância (metros) entre dois pontos — fórmula padrão de haversine.
function calcularDistanciaSimples(lat1, lon1, lat2, lon2){

    const R = 6371000;
    const toRad = g => g * Math.PI / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

}

// Anima a troca de perna só quando a família realmente andou entre
// uma leitura de GPS e outra (não fica "andando parado" — o mapa
// recentraliza em saltos a cada 5s, não desliza suave, então a
// animação só faz sentido nos momentos em que sabemos que houve
// deslocamento de verdade). Um "pulsinho" de passos, depois volta pro
// parado sozinha.
const DISTANCIA_MINIMA_CAMINHADA_M = 3;
let timeoutsCaminhada = [];

function simularCaminhada(){

    timeoutsCaminhada.forEach(id => clearTimeout(id));
    timeoutsCaminhada = [];

    if(!marcadorEu) return;

    const el = marcadorEu.getElement();
    if(!el) return;

    const img = el.querySelector('#imgEuAtual');
    if(!img) return;

    const linhas = el.querySelector('#linhasMovimento');

    const passos = [
        ICONE_EU_PERNA_DIREITA,
        ICONE_EU_PERNA_ESQUERDA,
        ICONE_EU_PERNA_DIREITA,
        ICONE_EU_PERNA_ESQUERDA,
        ICONE_EU_PARADO
    ];

    if(linhas) linhas.classList.add('ativo');

    passos.forEach((src, i) => {
        timeoutsCaminhada.push(setTimeout(() => { img.src = src; }, i * 200));
    });

    timeoutsCaminhada.push(setTimeout(() => {
        if(linhas) linhas.classList.remove('ativo');
    }, passos.length * 200));

}

let minhaLatAtual = null;
let minhaLngAtual = null;
let alvoLat = null;
let alvoLng = null;

// Gira o pontinho (que agora é a seta) pra apontar pro alvo. Só
// precisa do bearing puro (sem descontar o heading) — o desconto já
// acontece uma vez só, no giro do mapa inteiro (#mapGiro); como o
// pontinho gira JUNTO com o mapa, o resultado na tela já sai certo.
function atualizarSetaEu(){

    if(!marcadorEu) return;

    const el = marcadorEu.getElement();
    if(!el) return;

    const seta = el.querySelector('.icone-eu-seta');
    if(!seta) return;

    let angulo = 0;

    if(minhaLatAtual !== null && minhaLngAtual !== null && alvoLat !== null && alvoLng !== null){
        angulo = calcularBearing(minhaLatAtual, minhaLngAtual, alvoLat, alvoLng);
    }

    seta.style.transform = 'rotate(' + angulo + 'deg)';

}

// Marca onde a família está e recentraliza o mapa (deslocado pra
// frente) nela, sempre — modo foco: mapa segue a pessoa em vez dela
// precisar arrastar.
function atualizarMinhaLocalizacao(lat, lng){

    // Compara com a posição anterior ANTES de sobrescrever — só assim
    // dá pra saber se a família andou de verdade desde a última
    // leitura (uns 5s atrás) e vale a pena animar os passos.
    if(minhaLatAtual !== null && minhaLngAtual !== null){
        const distanciaAndada = calcularDistanciaSimples(minhaLatAtual, minhaLngAtual, lat, lng);
        if(distanciaAndada >= DISTANCIA_MINIMA_CAMINHADA_M){
            simularCaminhada();
        }
    }

    minhaLatAtual = lat;
    minhaLngAtual = lng;

    if(!marcadorEu){
        marcadorEu = L.marker([lat,lng], {
            icon: L.divIcon({ className:'icone-eu-wrapper', html: iconeEuSvg(), iconSize:[68,68], iconAnchor:[34,34] }),
            zIndexOffset: 1000,
            // Não precisa ser clicável — só indica onde a família
            // está. Sem isso, ele (que fica sempre por cima e ficou
            // maior recentemente) bloqueia o toque em qualquer ponto
            // que esteja embaixo dele quando a família chega perto.
            interactive: false
        }).addTo(mapa);
    } else {
        marcadorEu.setLatLng([lat,lng]);
    }

    atualizarSetaEu();

    const [latCentro, lngCentro] = deslocarPonto(lat, lng, anguloAtual, DESLOCAMENTO_FRENTE_M);

    // Sem animação — a cada 5s isso recentraliza o mapa; a transição
    // suave (animate:true) deixa o Leaflet num estado de "andamento"
    // que pode suprimir clique em marcadores próximos do centro
    // (onde a família está) durante a janela da animação.
    mapa.setView([latCentro, lngCentro], ZOOM_FOCO, { animate: false });

}

// Gira o mapa inteiro (#mapGiro) pro sentido oposto do heading da
// bússola — assim "pra cima na tela" sempre é "pra frente de quem
// está segurando o celular", igual ao modo bússola do Google Maps.
// Cada marcador tem seu próprio contra-giro (.giro-marcador) pra não
// ficar de cabeça pra baixo.
let anguloAtual = 0;

function girarMapa(heading){

    if(typeof heading !== 'number' || isNaN(heading)) return;

    anguloAtual = heading;

    const giro = document.getElementById('mapGiro');
    if(giro){
        giro.style.transform = 'rotate(' + (-heading) + 'deg)';
    }

    aplicarContraGiro();

}

function aplicarContraGiro(){

    document.querySelectorAll('.giro-marcador').forEach((el) => {
        el.style.transform = 'rotate(' + anguloAtual + 'deg)';
    });

}

// A geolocalização não é pega aqui dentro do iframe (costuma ser
// bloqueada por política de segurança) — vem de fora, via postMessage,
// usando a mesma wixWindow.getCurrentGeolocation() que a página já usa
// pra conferir os pontos.
window.onmessage = function(event){

    const dados = event.data || {};

    if(dados.acao === 'pontos'){
        desenharPontos(dados.pontos || []);
    }

    if(dados.acao === 'perimetro'){
        desenharPerimetro(dados.coordenadas || []);
    }

    if(dados.acao === 'largada'){
        desenharLargada(dados.latitude, dados.longitude);
    }

    if(dados.acao === 'pontosBonus'){
        desenharPontosBonus(dados.pontos || []);
    }

    if(dados.acao === 'minhaLocalizacao'){
        atualizarMinhaLocalizacao(dados.lat, dados.lng);
    }

    if(dados.acao === 'heading'){
        girarMapa(dados.valor);
    }

    if(dados.acao === 'alvoAtual'){
        alvoLat = dados.latitude;
        alvoLng = dados.longitude;
        atualizarSetaEu();
    }

    if(dados.acao === 'bonusLiberado' && dados.bonus){
        mostrarBonusLiberado(dados.bonus);
    }

};

parent.postMessage({ acao: 'mapaPronto' }, '*');

</script>

</body>
</html>`;
