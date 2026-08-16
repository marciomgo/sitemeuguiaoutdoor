import wixData from 'wix-data';

$w.onReady(function () {

    $w("#dynamicDataset").onReady(() => {

        const resgate = $w("#dynamicDataset").getCurrentItem();

        console.log("Resgate carregado no Tesouro:", resgate);

        $w("#txtCodigo").text = resgate.codigo || "";
        $w("#txtNomeFamilia").text = resgate.nomeFamilia || "";

        carregarParceiros(resgate.missao);
        mostrarPrazoFinal(resgate.dataConclusao);
        conectarPesquisa(resgate._id);

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
// PESQUISA RÁPIDA (antes do PIX)
//==================================================
// Duas perguntas, só de marcação (nada de digitar): nota de 1-5 e
// se topariam fazer outra missão. Um botão Enviar confirma as duas.

function conectarPesquisa(resgateId) {

    try {

        $w("#btnPesquisaEnviar").onClick(() => {

            // Ratings Input nativo do Wix — .value vem null se a
            // família não tocou em nenhuma estrela.
            let notaSelecionada = null;
            try {
                notaSelecionada = $w("#avaliacao").value || null;
            } catch (err) {
                console.log("#avaliacao não encontrado na página.");
            }

            // Radio Buttons nativo do Wix — .value vem "" se a
            // família não marcou nenhuma opção.
            let respostaPesquisaSelecionada = null;
            try {
                const valor = $w("#grupoJogariaNovamente").value;
                if (valor) {
                    respostaPesquisaSelecionada = (valor === "Sim");
                }
            } catch (err) {
                console.log("#grupoJogariaNovamente não encontrado na página.");
            }

            if (notaSelecionada === null && respostaPesquisaSelecionada === null) {
                return;
            }

            responderPesquisa(resgateId, notaSelecionada, respostaPesquisaSelecionada);

        });

    } catch (err) {
        console.log("#btnPesquisaEnviar não encontrado na página.");
    }

}

function responderPesquisa(resgateId, notaSatisfacao, jogariaOutraMissao) {

    wixData.insert("PesquisasSatisfacao", {
        resgate: resgateId,
        notaSatisfacao: notaSatisfacao,
        jogariaOutraMissao: jogariaOutraMissao,
        data: new Date()
    })
    .then(() => {

        try {
            $w("#boxPesquisa").collapse();
        } catch (err) {}

        try {
            $w("#txtPesquisaObrigado").text = "Obrigado pela resposta! 🙏";
            $w("#txtPesquisaObrigado").expand();
        } catch (err) {}

    })
    .catch((err) => {
        console.error("Erro ao salvar pesquisa:", err);
    });

}
