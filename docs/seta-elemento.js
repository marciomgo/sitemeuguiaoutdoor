// Seta de navegação — Wix Custom Element.
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
// Comunicação com o Velo: a página manda a localização atual e o
// próximo ponto via atributos (lat/lng/alvo-lat/alvo-lng), sem
// precisar de postMessage.

class SetaNavegacao extends HTMLElement {

    static get observedAttributes() {
        return ['lat', 'lng', 'alvo-lat', 'alvo-lng'];
    }

    constructor() {

        super();

        this.minhaLat = null;
        this.minhaLng = null;
        this.alvoLat = null;
        this.alvoLng = null;
        this.heading = null;

        const shadow = this.attachShadow({ mode: 'open' });

        shadow.innerHTML = `
            <style>
                :host{ display:block; width:100%; height:100%; }
                #container{
                    width:100%;height:100%;
                    display:flex;align-items:center;justify-content:center;
                    font-family:Arial,Helvetica,sans-serif;
                }
                #seta{
                    width:100%;height:100%;
                    display:flex;align-items:center;justify-content:center;
                    transition: transform 0.15s linear;
                    transform: rotate(0deg);
                }
                #seta svg{ width:80%;height:80%; }
                button{
                    padding:10px 14px;
                    font-size:12px;
                    font-weight:bold;
                    border:none;
                    border-radius:10px;
                    background:#2b6ef2;
                    color:#fff;
                    cursor:pointer;
                }
            </style>
            <div id="container">
                <button id="btnAtivar">🧭 Ativar bússola</button>
                <div id="seta" style="display:none;">
                    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="50,6 78,88 50,68 22,88" fill="#2b6ef2" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
        `;

        this.btnAtivar = shadow.getElementById('btnAtivar');
        this.setaEl = shadow.getElementById('seta');

        this.aoReceberOrientacao = this.aoReceberOrientacao.bind(this);
        this.btnAtivar.addEventListener('click', () => this.ativarBussola());

    }

    attributeChangedCallback(nome, valorAntigo, valorNovo) {

        const numero = (valorNovo === null || valorNovo === '') ? null : Number(valorNovo);

        if (nome === 'lat') this.minhaLat = numero;
        if (nome === 'lng') this.minhaLng = numero;
        if (nome === 'alvo-lat') this.alvoLat = numero;
        if (nome === 'alvo-lng') this.alvoLng = numero;

        this.atualizarRotacao();

    }

    calcularBearing(lat1, lon1, lat2, lon2) {

        const toRad = g => g * Math.PI / 180;
        const toGrau = r => r * 180 / Math.PI;

        const dLon = toRad(lon2 - lon1);

        const y = Math.sin(dLon) * Math.cos(toRad(lat2));

        const x =
            Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

        return (toGrau(Math.atan2(y, x)) + 360) % 360;

    }

    atualizarRotacao() {

        if (this.minhaLat === null || this.minhaLng === null ||
            this.alvoLat === null || this.alvoLng === null ||
            this.heading === null) {
            return;
        }

        const bearing = this.calcularBearing(this.minhaLat, this.minhaLng, this.alvoLat, this.alvoLng);
        const angulo = (bearing - this.heading + 360) % 360;

        this.setaEl.style.transform = 'rotate(' + angulo + 'deg)';

    }

    aoReceberOrientacao(evento) {

        if (typeof evento.webkitCompassHeading === 'number') {

            // iOS — já vem absoluto (0° = Norte).
            this.heading = evento.webkitCompassHeading;

        } else if (typeof evento.alpha === 'number') {

            // Android — "alpha" cresce sentido anti-horário a partir
            // do Norte, o oposto de heading de bússola.
            this.heading = (360 - evento.alpha) % 360;

        } else {
            return;
        }

        this.atualizarRotacao();

    }

    iniciarEscuta() {

        this.btnAtivar.style.display = 'none';
        this.setaEl.style.display = 'flex';

        if ('ondeviceorientationabsolute' in window) {
            window.addEventListener('deviceorientationabsolute', this.aoReceberOrientacao);
        } else {
            window.addEventListener('deviceorientation', this.aoReceberOrientacao);
        }

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

customElements.define('seta-navegacao', SetaNavegacao);
