$w.onReady(function () {
  $w('#slideshowEtapas').onChange(() => {
    const index = $w('#slideshowEtapas').currentIndex;

    // Oculta todos os containers
    $w('#containerTresCoroas').hide();
    $w('#containerGravatai').hide();

    // Mostra apenas o container correspondente ao slide atual
    if (index === 0) {
      $w('#containerTresCoroas').show();
    } else if (index === 1) {
      $w('#containerGravatai').show();
    }
  });
});

