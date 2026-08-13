import wixData from 'wix-data';

// Códigos PIX "copia e cola" — 3 valores fixos + 1 livre (chave sem
// valor embutido, a pessoa digita quanto quiser no banco dela).
const OPCOES_PIX = [
    { label: "R$5",  codigo: "00020101021126360014br.gov.bcb.pix0114+555199999301252040000530398654045.005802BR5923MARCIO DE AVILA PALERMO6009SAO PAULO622905251KZSFN9KSC90KK0G6KWYNAK8N63046075" },
    { label: "R$10", codigo: "00020101021126360014br.gov.bcb.pix0114+5551999993012520400005303986540510.005802BR5923MARCIO DE AVILA PALERMO6009SAO PAULO622905251KZSFR1NJC7SCJXAYV85293206304FE0F" },
    { label: "R$20", codigo: "00020101021126360014br.gov.bcb.pix0114+5551999993012520400005303986540520.005802BR5923MARCIO DE AVILA PALERMO6009SAO PAULO622905251KZSFSHH8MPYT7PZZDWVMXJ6K6304ED47" },
    { label: "Outro valor", codigo: "00020101021126360014br.gov.bcb.pix0114+55519999930125204000053039865802BR5923MARCIO DE AVILA PALERMO6009SAO PAULO622905251KZSFTAA59NQQ83AFXP5VY51J63045708" }
];

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
    prazo.setDate(prazo.getDate() + 7);

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

    $w("#repeaterPix").data = OPCOES_PIX.map((item, indice) => ({ _id: String(indice), ...item }));

    $w("#repeaterPix").onItemReady(($item, itemData) => {

        $item("#txtValorPix").text = itemData.label;

        $item("#btnCopiarPix").onClick(() => {

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(itemData.codigo);
            }

            $item("#btnCopiarPix").label = "Copiado!";

            setTimeout(() => {
                $item("#btnCopiarPix").label = "Copiar código PIX";
            }, 2000);

        });

    });

}
