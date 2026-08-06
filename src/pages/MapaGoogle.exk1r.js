import wixWindow from 'wix-window';

$w.onReady(function () {

    $w("#btnFechar").onClick(() => {

        wixWindow.lightbox.close();

    });

});