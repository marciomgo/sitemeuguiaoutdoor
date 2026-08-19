// Leitor de bússola — Wix Custom Element.
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
// Importante: no Editor/Preview do Wix, custom elements SEMPRE
// aparecem dentro de um iframe (limitação do próprio editor) — só no
// site publicado de verdade que ele roda solto. Testar a bússola tem
// que ser sempre no site publicado, nunca no preview.
//
// Esse widget não desenha seta nenhuma — quem aponta pro alvo agora é
// o próprio pontinho da família no mapa (ver mapaGpsHtml.js), que já
// gira sozinho junto com o mapa. Aqui só existe pra pedir a permissão
// (uma vez, com um botão grande centralizado, fundo escurecido) e
// depois ficar invisível, só repassando o heading pra página (evento
// "headingAtualizado") — a página repassa esse número pro mapa.

class LeitorBussola extends HTMLElement {

    constructor() {

        super();

        const shadow = this.attachShadow({ mode: 'open' });

        shadow.innerHTML = `
            <style>
                :host{ display:block; }
                #overlay{
                    position:fixed;
                    inset:0;
                    background:rgba(0,0,0,0.75);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    z-index:99999;
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
            </style>
            <div id="overlay">
                <button id="btnAtivar">🧭 Toque para ativar a bússola</button>
            </div>
        `;

        this.overlay = shadow.getElementById('overlay');
        this.btnAtivar = shadow.getElementById('btnAtivar');

        this.aoReceberOrientacao = this.aoReceberOrientacao.bind(this);
        this.btnAtivar.addEventListener('click', () => this.ativarBussola());

    }

    aoReceberOrientacao(evento) {

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
