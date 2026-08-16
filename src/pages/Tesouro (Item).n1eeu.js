import wixData from 'wix-data';

// Chave PIX (celular), mostrada como texto simples — a família toca
// e segura pra selecionar e copiar pelo próprio celular. Sem botão,
// sem tentar copiar via código: isso depende de permissão de
// navegador que trava sozinha depois de um tempo e não dá pra
// pedir que a família vá resetar configuração nenhuma.
const CHAVE_PIX = "51999993012";

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

// Só texto simples com a chave — a família toca e segura pra
// selecionar e copiar pelo próprio celular. Sem botão, sem tentar
// copiar via código.
function carregarPix() {

    try {
        $w("#txtChavePix").text = CHAVE_PIX;
    } catch (err) {
        console.log("#txtChavePix não encontrado na página.");
    }

}
