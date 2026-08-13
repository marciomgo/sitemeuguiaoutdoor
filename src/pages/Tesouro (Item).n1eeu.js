import wixData from 'wix-data';

// Código PIX único, com valor sugerido de R$14,90 já pré-preenchido
// (a pessoa pode alterar no app do banco antes de confirmar).
const CODIGO_PIX = "00020126920014BR.GOV.BCB.PIX0136561c6f5a-ada8-488e-b053-fa88735aa22e0230Pode alterar o valor se quiser520400005303986540514.905802BR5923Marcio de Avila Palermo6009SAO PAULO62140510jIW8O5sRJ763047E47";

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
                $item("#txtValorParceiro").text = "R$" + itemData.valor;
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

function carregarPix() {

    $w("#btnCopiarPix").onClick(() => {

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(CODIGO_PIX);
        }

        $w("#btnCopiarPix").label = "Copiado!";

        setTimeout(() => {
            $w("#btnCopiarPix").label = "Copiar código PIX";
        }, 2000);

    });

}
