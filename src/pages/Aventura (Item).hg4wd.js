import wixWindow from 'wix-window';
import wixLocation from 'wix-location';
import wixData from 'wix-data';
import { local } from 'wix-storage';

import {
    calcularDistancia,
    raioPermitido
} from 'public/gps';

let missao;

//==================================================
// INICIALIZAÇÃO
//==================================================

$w.onReady(function () {

    $w("#dataset1").onReady(() => {

        missao = $w("#dataset1").getCurrentItem();

        console.log("Dataset carregado.");
        console.log("Aventura carregada:");
        console.log(missao);

        $w("#btnIniciar").collapse();

        $w("#txtGPS").text =
            "📍 Confirme sua localização para iniciar.";

        conectarEventos();

    });

});

//==================================================
// EVENTOS
//==================================================

function conectarEventos() {

    console.log("Conectando eventos...");

    $w("#btnConfirmarGPS").onClick(() => {

        console.log("Clique no botão GPS");

        confirmarGPS();

    });

    $w("#btnIniciar").onClick(() => {

        console.log("Clique no botão Iniciar");

        iniciarAventura();

    });

}

//==================================================
// CONFIRMAR GPS
//==================================================

async function confirmarGPS() {

    $w("#txtGPS").text = "🛰️ Buscando localização...";

    try {

        const posicao =
            await wixWindow.getCurrentGeolocation();

        const distancia =
            calcularDistancia(

                posicao.coords.latitude,
                posicao.coords.longitude,

                missao.latitudeInicio,
                missao.longitudeInicio

            );

        const raio =
            raioPermitido(
                posicao.coords.accuracy
            );

        if (distancia <= raio) {

            $w("#txtGPS").text =
                "✅ Local confirmado!";

            $w("#btnIniciar").expand();

        } else {

            $w("#txtGPS").text =
                `📍 Você ainda está a ${Math.round(distancia)} metros do ponto de largada.`;

        }

    } catch (erro) {

        console.error(erro);

        $w("#txtGPS").text =
            "❌ Não foi possível obter sua localização.";

    }

}

//==================================================
// INICIAR AVENTURA
//==================================================

function iniciarAventura() {

    const nomeFamilia = ($w("#nomeFamilia").value || "").trim();

    if (!nomeFamilia) {

        $w("#txtGPS").text =
            "✏️ Escreva o nome da família antes de começar.";

        return;

    }

    // Opcional — não trava o cadastro se ficar em branco.
    let composicaoFamilia = "";
    try {
        composicaoFamilia = ($w("#composicaoFamilia").value || "").trim();
    } catch (err) {
        console.log("#composicaoFamilia não encontrado na página.");
    }

    const configMissao = {

        desafio: $w("#switchDesafio").checked,

        inicio: Date.now()

    };

    local.setItem(

        "configMissao",

        JSON.stringify(configMissao)

    );

    local.setItem(
    "resultadoDesafio",
    "true"
    );

    local.removeItem("missaoFinalizada");

    // Um novo cadastro precisa de um código novo — sem isso, um
    // código antigo (de um resgate anterior nesse navegador) ficaria
    // "preso" e a atualização do código do resgate atual seria pulada.
    local.removeItem(`codigoResgate_${missao.slug}`);

    local.setItem("nomeFamilia", nomeFamilia);

    const dataCadastro = new Date();

    local.setItem("dataCadastro", dataCadastro.toISOString());

    console.log(configMissao);

    $w("#btnIniciar").disable();

    // O insert() nessa coleção não está gravando os campos extras
    // (só cria a linha vazia, mesmo passando os dados) — então cria
    // vazio e preenche na sequência com update(), que sempre funciona.
    wixData.insert("Resgates", {})

    .then((item) => {

        return wixData.update("Resgates", {

            _id: item._id,
            nomeFamilia: nomeFamilia,
            composicaoFamilia: composicaoFamilia,
            missao: missao._id,
            dataCadastro: dataCadastro

        });

    })

    .then((item) => {

        console.log("Resgate criado com sucesso:", item);

        local.setItem("resgateId", item._id);

        wixLocation.to("/" + missao.paginaMissao);

    })

    .catch((err) => {

        console.error("Erro ao criar resgate:", err);

        // Mesmo se o cadastro do resgate falhar, não trava a família
        // de jogar — só não vai ter tesouro/código no final.
        wixLocation.to("/" + missao.paginaMissao);

    });

}