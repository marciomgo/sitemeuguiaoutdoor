import wixData from 'wix-data';
import { local } from 'wix-storage';

console.log("VERSAO_PARCEIRO_marca_18h20");

let parceiroAtual;
let resgateAtual;

$w.onReady(function () {

    $w("#boxCheckin").collapse();
    $w("#boxResultado").collapse();
    $w("#txtErroPin").collapse();
    $w("#txtErroCodigo").collapse();
    $w("#txtConfirmacao").collapse();

    try {
        console.log("TESTE txtTotalFamilias:", $w("#txtTotalFamilias"), "texto atual:", $w("#txtTotalFamilias").text);
    } catch (err) {
        console.error("TESTE txtTotalFamilias FALHOU:", err);
    }

    try {
        console.log("TESTE txtTotalValor:", $w("#txtTotalValor"), "texto atual:", $w("#txtTotalValor").text);
    } catch (err) {
        console.error("TESTE txtTotalValor FALHOU:", err);
    }

    try {
        console.log("TESTE repeaterHistorico:", $w("#repeaterHistorico"));
    } catch (err) {
        console.error("TESTE repeaterHistorico FALHOU:", err);
    }

    conectarEventos();

    const pinSalvo = local.getItem("pinParceiro");

    if (pinSalvo) {
        entrarComPin(pinSalvo);
    }

});

function conectarEventos() {

    $w("#btnEntrarPin").onClick(() => {
        entrarComPin($w("#inputPin").value);
    });

    $w("#btnBuscarCodigo").onClick(() => {
        buscarCodigo();
    });

    $w("#btnConfirmarResgate").onClick(() => {
        confirmarResgate();
    });

}

//==================================================
// LOGIN POR PIN
//==================================================

function entrarComPin(pin) {

    if (!pin) return;

    wixData.query("Parceiros")
        .eq("pin", pin)
        .eq("ativo", true)
        .limit(1)
        .find()
        .then((resultado) => {

            if (resultado.items.length === 0) {
                $w("#txtErroPin").text = "PIN incorreto.";
                $w("#txtErroPin").expand();
                return;
            }

            parceiroAtual = resultado.items[0];

            local.setItem("pinParceiro", pin);

            $w("#txtErroPin").collapse();
            $w("#boxLogin").collapse();
            $w("#boxCheckin").expand();

            carregarHistorico();

        })
        .catch((err) => {
            console.error(err);
            $w("#txtErroPin").text = "Erro ao verificar o PIN.";
            $w("#txtErroPin").expand();
        });

}

//==================================================
// BUSCAR CÓDIGO
//==================================================

function buscarCodigo() {

    const codigo = ($w("#inputCodigo").value || "").trim().toUpperCase();

    if (!codigo) return;

    $w("#boxResultado").collapse();
    $w("#txtErroCodigo").collapse();
    $w("#txtConfirmacao").collapse();

    wixData.query("Resgates")
        .eq("codigo", codigo)
        .limit(1)
        .find()
        .then((resultado) => {

            if (resultado.items.length === 0) {
                $w("#txtErroCodigo").text = "Código não encontrado.";
                $w("#txtErroCodigo").expand();
                return;
            }

            const resgate = resultado.items[0];

            if (resgate.missao !== parceiroAtual.missao) {
                $w("#txtErroCodigo").text = "Esse código não pertence a uma missão sua.";
                $w("#txtErroCodigo").expand();
                return;
            }

            resgateAtual = resgate;
            mostrarResultado(resgate);

        })
        .catch((err) => {
            console.error(err);
            $w("#txtErroCodigo").text = "Erro ao buscar o código.";
            $w("#txtErroCodigo").expand();
        });

}

function mostrarResultado(resgate) {

    $w("#txtNomeFamilia").text = resgate.nomeFamilia || "";

    const prazo = new Date(resgate.dataConclusao);
    prazo.setDate(prazo.getDate() + 7);

    const hoje = new Date();

    $w("#txtStatusPrazo").text = hoje <= prazo
        ? "✅ Dentro do prazo (até " + prazo.toLocaleDateString("pt-BR") + ")"
        : "⚠️ Vencido em " + prazo.toLocaleDateString("pt-BR") + " (pode dar o tesouro se quiser)";

    $w("#inputValorConsumido").value = "";

    $w("#boxResultado").expand();

}

//==================================================
// CONFIRMAR RESGATE
//==================================================

function confirmarResgate() {

    const valorConsumido = Number($w("#inputValorConsumido").value) || 0;

    wixData.query("ResgatesParceiros")
        .eq("resgate", resgateAtual._id)
        .eq("parceiro", parceiroAtual._id)
        .limit(1)
        .find()
        .then((resultado) => {

            if (resultado.items.length > 0) {
                $w("#txtConfirmacao").text = "⚠️ Esse código já foi confirmado aqui antes.";
                $w("#txtConfirmacao").expand();
                return;
            }

            // Mesma pegadinha da coleção "Resgates": o insert() aqui
            // não grava os campos extras de forma confiável — cria
            // vazio e preenche com update() na sequência.
            return wixData.insert("ResgatesParceiros", {})
                .then((item) => wixData.update("ResgatesParceiros", {
                    _id: item._id,
                    resgate: resgateAtual._id,
                    parceiro: parceiroAtual._id,
                    usado: true,
                    valorConsumido: valorConsumido,
                    dataUso: new Date()
                }))
                .then(() => {
                    $w("#txtConfirmacao").text = "✅ Resgate confirmado!";
                    $w("#txtConfirmacao").expand();
                    carregarHistorico();
                });

        })
        .catch((err) => {
            console.error(err);
            $w("#txtConfirmacao").text = "Erro ao confirmar. Tenta de novo.";
            $w("#txtConfirmacao").expand();
        });

}

//==================================================
// HISTÓRICO DE VALIDAÇÕES
//==================================================

function carregarHistorico() {

    console.log("Carregando histórico pro parceiro:", parceiroAtual._id);

    wixData.query("ResgatesParceiros")
        .eq("parceiro", parceiroAtual._id)
        .include("resgate")
        .descending("dataUso")
        .find()
        .then((resultado) => {

            console.log("Histórico encontrado:", resultado.items);

            const itens = resultado.items;

            const totalValor = itens.reduce(
                (soma, item) => soma + (item.valorConsumido || 0),
                0
            );

            $w("#txtTotalFamilias").text = String(itens.length);
            $w("#txtTotalValor").text = "R$" + totalValor.toFixed(2).replace(".", ",");

            $w("#repeaterHistorico").data = itens;

            $w("#repeaterHistorico").onItemReady(($item, itemData) => {

                $item("#txtNomeFamiliaHistorico").text =
                    (itemData.resgate && itemData.resgate.nomeFamilia) || "";

                $item("#txtDataHistorico").text = itemData.dataUso
                    ? new Date(itemData.dataUso).toLocaleDateString("pt-BR")
                    : "";

                $item("#txtValorHistorico").text =
                    "R$" + (itemData.valorConsumido || 0).toFixed(2).replace(".", ",");

            });

        })
        .catch((err) => {

            console.error("Erro ao carregar histórico:", err);

        });

}
