// Trava do botão VOLTAR do navegador — Wix Custom Element (tag: trava-voltar).
//
// Por que um Custom Element e não o HTML do jogo: as telas do MGO em HTML
// (mapa, escolha de tema, ranking, organizador) rodam dentro de um iframe com
// endereço "data:", e o Safari do iPhone não deixa um iframe desses mexer no
// histórico do navegador — a trava que fica lá dentro não funciona no iPhone.
// O Custom Element roda no DOM de verdade da página publicada (mesma razão do
// elemento da bússola, ver seta-elemento.js), então a trava funciona.
//
// Como funciona: depois do PRIMEIRO TOQUE na tela (o navegador só aceita antes
// disso nada), põe uma entrada extra no histórico; a cada "voltar" repõe a
// entrada, então o voltar nunca sai da página. Ao sair da página (o elemento
// some), a trava é desfeita.
//
// Uso no Editor: Adicionar > Código embutido > Elemento personalizado, tag
// "trava-voltar", e colar nele o endereço deste arquivo. Pode ficar minúsculo e
// invisível (ele não desenha nada). Colocar em cada página do app (evento,
// organização, Explorar...). A página Jogar já tem a trava dentro do elemento
// da bússola (seta-elemento.js).

class TravaVoltar extends HTMLElement {

    constructor() {
        super();
        this.desfazer = null;
    }

    connectedCallback() {

        this.style.display = 'none';

        if (this.desfazer) return;

        let armado = false;
        let urlTrava = '';

        // Várias entradas de reserva (não uma só): no iPhone, dois "voltar" rápidos
        // podiam andar antes de a trava repor a entrada, e o segundo escapava. Com
        // PROFUNDIDADE entradas, os voltar seguidos são absorvidos e a trava repõe
        // até completar de novo a cada voltar.
        const PROFUNDIDADE = 4;

        const empilhar = (de) => {
            for (let i = de; i <= PROFUNDIDADE; i++) {
                try { history.pushState({ mgoTrava: i }, '', urlTrava); } catch (e) { break; }
            }
        };

        const armar = () => {
            if (armado) return;
            armado = true;
            urlTrava = location.href;
            empilhar(1);
        };

        const aoVoltar = () => {
            if (!armado) return;
            const estado = history.state;
            const atual = (estado && typeof estado.mgoTrava === 'number') ? estado.mgoTrava : 0;
            empilhar(atual + 1);
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

        this.desfazer = () => {
            eventos.forEach((e) => window.removeEventListener(e, armar, true));
            window.removeEventListener('blur', aoFocoNoQuadro, true);
            window.removeEventListener('popstate', aoVoltar, true);
        };

    }

    disconnectedCallback() {
        if (this.desfazer) {
            this.desfazer();
            this.desfazer = null;
        }
    }

}

customElements.define('trava-voltar', TravaVoltar);
