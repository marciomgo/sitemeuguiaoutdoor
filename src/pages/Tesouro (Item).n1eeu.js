import wixData from 'wix-data';

// Código PIX "copia e cola" (valor aberto — o valor sugerido
// aparece só como texto na tela, não trava no código).
const CODIGO_PIX = "00020126840014BR.GOV.BCB.PIX0136561c6f5a-ada8-488e-b053-fa88735aa22e0222Valor sugerido R$14,905204000053039865802BR5923Marcio de Avila Palermo6009SAO PAULO62140510GjEUg98dMD6304E376";

// Segundo caminho: a chave PIX (celular) visível na tela, pra quem
// preferir digitar/colar ela direto em vez do código copia e cola.
const CHAVE_PIX = "SUBSTITUIR_NUMERO_CELULAR";

$w.onReady(function () {

    $w("#dynamicDataset").onReady(() => {

        const resgate = $w("#dynamicDataset").getCurrentItem();

        console.log("Resgate carregado no Tesouro:", resgate);

        $w("#txtCodigo").text = resgate.codigo || "";
        $w("#txtNomeFamilia").text = resgate.nomeFamilia || "";

        carregarParceiros(resgate.missao);
        mostrarPrazoFinal(resgate.dataConclusao);
        carregarPix();

    });

});

//==================================================
// PARCEIROS DA MISSÃO
//==================================================

function carregarParceiros(missaoId) {

    console.log("Buscando parceiros pra missaoId:", missaoId);

    wixData.query("Parceiros")
        .eq("missao", missaoId)
        .eq("ativo", true)
        .find()
        .then((resultado) => {

            console.log("Parceiros encontrados:", resultado.items);

            $w("#repeaterParceiros").data = resultado.items;

            $w("#repeaterParceiros").onItemReady(($item, itemData) => {
                $item("#txtNomeParceiro").text = itemData.nome || "";
                $item("#txtValorParceiro").text = itemData.valor ? "R$" + itemData.valor : "";
                $item("#txtDescricaoParceiro").text = itemData.descricao || "";
                $item("#txtEnderecoParceiro").text = itemData.endereco || "";

                if (itemData.linkMaps) {
                    $item("#txtLinkMaps").html =
                        `<a href="${itemData.linkMaps}" target="_blank">📍 Ver no mapa</a>`;
                } else {
                    $item("#txtLinkMaps").text = "";
                }

                $item("#imgParceiro").src = itemData.image;
            });

        })
        .catch((err) => console.error(err));

}

//==================================================
// PRAZO FINAL DE VALIDADE (7 DIAS)
//==================================================

function mostrarPrazoFinal(dataConclusao) {

    const prazo = new Date(dataConclusao);
    prazo.setDate(prazo.getDate() + 14);

    $w("#txtCronometro").text = prazo.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });

}

//==================================================
// PIX
//==================================================

// Tenta copiar via navigator.clipboard (pode falhar silenciosamente
// em navegadores de app tipo Instagram/WhatsApp) — sempre chama
// aoSucesso ou aoFalhar, nunca finge que deu certo sem ter dado.
function copiarTexto(texto, aoSucesso, aoFalhar) {

    const temClipboard = navigator.clipboard && navigator.clipboard.writeText;

    const promessa = temClipboard
        ? navigator.clipboard.writeText(texto)
        : Promise.reject(new Error("Clipboard indisponível"));

    promessa
        .then(aoSucesso)
        .catch((err) => {
            console.error("Erro ao copiar:", err);
            if (aoFalhar) aoFalhar(err);
        });

}

function carregarPix() {

    // Caminho 1: botão do código "copia e cola" completo.
    $w("#btnCopiarPix").onClick(() => {

        copiarTexto(CODIGO_PIX,

            () => {
                $w("#btnCopiarPix").label = "Copiado!";
                setTimeout(() => {
                    $w("#btnCopiarPix").label = "Copiar código PIX";
                }, 2500);
            },

            () => {
                $w("#btnCopiarPix").label = "Erro — use a chave abaixo";
                setTimeout(() => {
                    $w("#btnCopiarPix").label = "Copiar código PIX";
                }, 2500);
            }

        );

    });

    // Caminho 2: botão com a chave PIX (celular) visível no rótulo.
    try {

        $w("#btnChavePix").label = CHAVE_PIX;

        $w("#btnChavePix").onClick(() => {

            copiarTexto(CHAVE_PIX,

                () => {
                    $w("#btnChavePix").label = "Copiado!";
                    setTimeout(() => {
                        $w("#btnChavePix").label = CHAVE_PIX;
                    }, 1500);
                },

                () => {}

            );

        });

    } catch (err) {
        console.log("#btnChavePix não encontrado na página.");
    }

}
