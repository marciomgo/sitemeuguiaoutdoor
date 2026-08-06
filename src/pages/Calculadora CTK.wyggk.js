// Guia de API: https://www.wix.com/velo/reference/api-overview/introduction
$w.onReady(function () {
    $w('#btnCalcular').onClick(() => {
        const idade = Number($w('#inputIdade').value);

        if (!idade || idade <= 0 || idade > 120) {
            $w('#txtFCMax').text = "Insira uma idade válida (1 a 120 anos)";
            $w('#txtFCLimite').text = "";
            $w('#txtAviso').text = "";
            return;
        }

        let fcMax = 0;

        if (idade < 18) {
            fcMax = 208 - (0.7 * idade); // fórmula Tanaka para crianças
        } else {
            fcMax = 220 - idade; // fórmula clássica para adultos
        }

        const fcLimite = Math.round(fcMax * 0.8);
        fcMax = Math.round(fcMax);

        $w('#txtFCMax').text = `${fcMax} bpm`;
        $w('#txtFCLimite').text = `${fcLimite} bpm`;
        $w('#txtAviso').text = `Durante a trilha, você deve cuidar para que a FC não ultrapasse os ${fcLimite} batimentos por minuto.`;

    });
});
