import wixWindow from 'wix-window';
import wixLocation from 'wix-location';
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

    console.log(configMissao);

    wixLocation.to("/" + missao.paginaMissao);

}