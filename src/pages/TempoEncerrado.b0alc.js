import wixWindow from 'wix-window';

$w.onReady(function () {

    $w("#txtTitulo").text = "🏁 Tempo Encerrado";

    $w("#txtMensagem").text =
`O tempo do Modo Desafio chegou ao fim.

Vocês podem continuar explorando normalmente até concluir a aventura.

Boa sorte!`;

    $w("#btnContinuar").onClick(() => {

        wixWindow.lightbox.close();

    });

});