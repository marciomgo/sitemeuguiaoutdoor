import wixData from 'wix-data';
import { local } from 'wix-storage';

let parceiroAtual;
let resgateAtual;

$w.onReady(function () {

    $w("#boxCheckin").collapse();
    $w("#boxResultado").collapse();
    $w("#txtErroPin").collapse();
    $w("#txtErroCodigo").collapse();
    $w("#txtConfirmacao").collapse();

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

            return wixData.insert("ResgatesParceiros", {
                resgate: resgateAtual._id,
                parceiro: parceiroAtual._id,
                usado: true,
                valorConsumido: valorConsumido,
                dataUso: new Date()
            })
            .then(() => {
                $w("#txtConfirmacao").text = "✅ Resgate confirmado!";
                $w("#txtConfirmacao").expand();
            });

        })
        .catch((err) => {
            console.error(err);
            $w("#txtConfirmacao").text = "Erro ao confirmar. Tenta de novo.";
            $w("#txtConfirmacao").expand();
        });

}
