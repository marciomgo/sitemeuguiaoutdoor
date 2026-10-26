// Leitor de bússola + GPS — Wix Custom Element.
//
// Ao contrário do iframe (usado no mapa e nos popups), um Custom
// Element roda dentro do DOM de verdade da página publicada — sem
// isolamento de janela. É por isso que dá pra usar esse formato aqui:
// o pedido de permissão de bússola do iOS (DeviceOrientationEvent.
// requestPermission) só funciona quando o toque no botão acontece no
// contexto de navegação principal, e um iframe (mesmo de outra
// origem) conta como isolado — o iOS bloqueia sem nem perguntar.
// Custom Element não tem esse problema.
//
// O mesmo bloqueio acontece com geolocalização dentro do código de
// página da própria Wix (Velo) — confirmado testando: lá dentro,
// "navigator.geolocation" nem existe. Aqui, sendo DOM real, dá pra
// usar watchPosition() (rastreamento contínuo de verdade, o sistema
// vai refinando a estimativa com o tempo — bem mais estável que
// pedir uma leitura nova do zero a cada segundo, que era o que a
// página fazia antes). Repassa pra página via evento
// "localizacaoAtualizada"; se não vier nada em alguns segundos, a
// própria página cai sozinha pro jeito antigo (ver Missão 1).
//
// Importante: no Editor/Preview do Wix, custom elements SEMPRE
// aparecem dentro de um iframe (limitação do próprio editor) — só no
// site publicado de verdade que ele roda solto. Testar bússola/GPS
// tem que ser sempre no site publicado, nunca no preview.
//
// Esse widget não desenha seta nenhuma — quem aponta pro alvo agora é
// o próprio pontinho da família no mapa (ver mapaGpsHtml.js), que já
// gira sozinho junto com o mapa. Aqui só existe pra pedir as
// permissões (uma vez, com um botão grande centralizado, fundo
// escurecido) e depois ficar invisível, só repassando heading e
// localização pra página.

class LeitorBussola extends HTMLElement {

    constructor() {

        super();

        const shadow = this.attachShadow({ mode: 'open' });

        shadow.innerHTML = `
            <style>
                /* pointer-events:none no host — o tamanho/posição que
                   ele tem no Editor não importa pro overlay (que usa
                   position:fixed e escapa dessa caixinha), mas sem
                   isso o próprio host, mesmo com o conteúdo escondido,
                   continuava "sólido" pro navegador — bloqueava toque
                   em cima do mapa, bem onde foi posicionado. */
                :host{ display:block; pointer-events:none; }
                #overlay{
                    position:fixed;
                    inset:0;
                    background:rgba(0,0,0,0.75);
                    display:flex;
                    flex-direction:column;
                    align-items:center;
                    justify-content:center;
                    gap:14px;
                    z-index:99999;
                    /* Reativa o toque só aqui, enquanto o pedido de
                       permissão está visível. */
                    pointer-events:auto;
                }
                button{
                    padding:24px 30px;
                    font-size:20px;
                    font-weight:bold;
                    font-family:Arial,Helvetica,sans-serif;
                    border:none;
                    border-radius:18px;
                    background:#e8a33d;
                    color:#4a2e05;
                    cursor:pointer;
                    max-width:80vw;
                    text-align:center;
                    box-shadow:0 6px 24px rgba(0,0,0,0.5);
                }
                #dicaAtivar{
                    font-size:13px;
                    font-family:Arial,Helvetica,sans-serif;
                    color:#fff;
                    text-align:center;
                    max-width:75vw;
                    line-height:1.4;
                }
            </style>
            <div id="overlay">
                <button id="btnAtivar">🧭 Toque para ativar a bússola</button>
                <p id="dicaAtivar">Vai aparecer uma pergunta do celular — toquem em "Permitir"</p>
            </div>
        `;

        this.overlay = shadow.getElementById('overlay');
        this.btnAtivar = shadow.getElementById('btnAtivar');

        this.aoReceberOrientacao = this.aoReceberOrientacao.bind(this);
        this.btnAtivar.addEventListener('click', () => this.ativarBussola());

    }

    aoReceberOrientacao(evento) {

        // O sensor dispara isso muitas vezes por segundo (30-60x),
        // bem mais rápido do que dá pra perceber visualmente (o mapa
        // só anima a cada 0.15s de qualquer jeito) — repassar cada
        // leitura sobrecarrega o processamento à toa (o mapa
        // reprocessa todos os ícones a cada aviso). Limita a no
        // máximo ~8 vezes por segundo.
        const agora = Date.now();
        if (this.ultimoEnvio && (agora - this.ultimoEnvio) < 120) {
            return;
        }
        this.ultimoEnvio = agora;

        let heading;

        if (typeof evento.webkitCompassHeading === 'number') {

            // iOS — já vem absoluto (0° = Norte).
            heading = evento.webkitCompassHeading;

        } else if (typeof evento.alpha === 'number') {

            // Android — "alpha" cresce sentido anti-horário a partir
            // do Norte, o oposto de heading de bússola.
            heading = (360 - evento.alpha) % 360;

        } else {
            return;
        }

        // Avisa a página (Velo) do novo heading, pra ela repassar pro
        // mapa girar junto — modo "bússola" de navegação, igual ao
        // Google Maps/Waze no modo pedestre.
        this.dispatchEvent(new CustomEvent('headingAtualizado', { detail: heading }));

    }

    // Trava do botão VOLTAR do navegador (a página Jogar já tem este elemento,
    // então a trava vem junto — o mesmo código está em trava-voltar-elemento.js,
    // que vai nas outras páginas). Roda no DOM de verdade da página, onde o
    // Safari do iPhone aceita; dentro do iframe do mapa ele não aceita.
    // Depois do primeiro toque põe uma entrada extra no histórico e a repõe a
    // cada "voltar". Desfeita quando o elemento sai da página.
    connectedCallback() {

        if (this.desfazerTrava) return;

        let armado = false;
        let urlTrava = '';

        const armar = () => {
            if (armado) return;
            armado = true;
            urlTrava = location.href;
            try { history.pushState({ mgoTrava: 1 }, '', urlTrava); } catch (e) {}
        };

        const aoVoltar = () => {
            if (!armado) return;
            try { history.pushState({ mgoTrava: 1 }, '', urlTrava); } catch (e) {}
        };

        // Um toque DENTRO de um quadro (iframe) — as telas do jogo — não gera toque
        // na página principal; só o foco passa pro quadro (blur). Arma por aí também.
        const aoFocoNoQuadro = () => {
            setTimeout(() => {
                const ativo = document.activeElement;
                if (ativo && ativo.tagName === 'IFRAME') armar();
            }, 0);
        };

        const eventos = ['touchend', 'pointerup', 'click', 'keydown'];

        eventos.forEach((e) => window.addEventListener(e, armar, true));
        window.addEventListener('blur', aoFocoNoQuadro, true);
        window.addEventListener('popstate', aoVoltar, true);

        this.desfazerTrava = () => {
            eventos.forEach((e) => window.removeEventListener(e, armar, true));
            window.removeEventListener('blur', aoFocoNoQuadro, true);
            window.removeEventListener('popstate', aoVoltar, true);
        };

    }

    disconnectedCallback() {

        if (this.desfazerTrava) {
            this.desfazerTrava();
            this.desfazerTrava = null;
        }

    }

    iniciarEscuta() {

        // Ativado — some por completo, nem o fundo escurecido nem o
        // espaço do botão ficam ocupando nada na tela.
        this.overlay.style.display = 'none';

        if ('ondeviceorientationabsolute' in window) {
            window.addEventListener('deviceorientationabsolute', this.aoReceberOrientacao);
        } else {
            window.addEventListener('deviceorientation', this.aoReceberOrientacao);
        }

        // Avisa a página uma única vez que a bússola foi ativada de
        // verdade — usado pra só começar a contar o tempo do Modo
        // Desafio a partir daqui, não desde o cadastro (senão o tempo
        // gasto lendo as regras/ativando a bússola já contaria).
        this.dispatchEvent(new CustomEvent('bussolaAtivada'));

        this.iniciarRastreamentoGps();

    }

    iniciarRastreamentoGps() {

        if (!('geolocation' in navigator)) {
            return;
        }

        this.ultimoEnvioGps = 0;

        this.watchId = navigator.geolocation.watchPosition(

            (posicao) => {

                // watchPosition pode disparar mais rápido do que a
                // página precisa processar — limita a no máximo
                // ~2x por segundo.
                const agora = Date.now();
                if (this.ultimoEnvioGps && (agora - this.ultimoEnvioGps) < 500) {
                    return;
                }
                this.ultimoEnvioGps = agora;

                this.dispatchEvent(new CustomEvent('localizacaoAtualizada', {
                    detail: {
                        lat: posicao.coords.latitude,
                        lng: posicao.coords.longitude,
                        accuracy: posicao.coords.accuracy
                    }
                }));

            },

            (erro) => {
                console.error('watchPosition falhou:', erro);
            },

            { enableHighAccuracy: true }

        );

    }

    ativarBussola() {

        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {

            DeviceOrientationEvent.requestPermission()
                .then((resultado) => {

                    if (resultado === 'granted') {
                        this.iniciarEscuta();
                    } else {
                        this.btnAtivar.textContent = '⚠️ Permissão negada';
                    }

                })
                .catch(() => {
                    this.btnAtivar.textContent = '⚠️ Erro ao pedir permissão';
                });

        } else {

            // Android e navegadores que não exigem essa permissão.
            this.iniciarEscuta();

        }

    }

}

customElements.define('seta-navegacao', LeitorBussola);
