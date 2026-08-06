$w.onReady(function () {
  // ELEMENTOS
  const sliderPeople = $w("#sliderPeople");   // Slider → número total de pessoas (1 a 60)

  const extraLanche = $w("#checkboxLanche"); // Checkbox → lanche por pessoa
  const extraReels  = $w("#checkboxReels");  // Checkbox → Reels
  const extraPhoto  = $w("#checkboxPhoto");  // Checkbox → Fotógrafo

  const resultText  = $w("#textResult");     // Text → total estimado

  // VALORES
  const BASE_PRICE      = 2500; // valor base até 25 pessoas
  const INCLUDED_PEOPLE = 25;   // pessoas incluídas no pacote base
  const MAX_PEOPLE      = 60;   // limite do evento
  const PRICE_PER_EXTRA = 95;   // por pessoa extra (acima de 25)

  const PRICE_LANCHE = 20;      // por pessoa (todas as pessoas)
  const PRICE_REELS  = 350;     // fixo
  const PRICE_PHOTO  = 1200;    // fixo

  // Garante número inteiro entre 1 e 60
  function snapPeople() {
    let raw = sliderPeople.value;
    let rounded = Math.min(MAX_PEOPLE, Math.max(1, Math.round(raw)));
    if (raw !== rounded) {
      sliderPeople.value = rounded;
    }
    return rounded;
  }

  // CÁLCULO
  function calcTotal() {
    const people = snapPeople();

    // Começa sempre do valor base (até 25 pessoas)
    let total = BASE_PRICE;

    // Pessoas extras acima das 25 incluídas
    const extras = Math.max(0, people - INCLUDED_PEOPLE);
    total += extras * PRICE_PER_EXTRA;

    // Extra: lanche por pessoa (para TODAS as pessoas)
    if (extraLanche.checked) {
      total += people * PRICE_LANCHE;
    }

    // Extras fixos
    if (extraReels.checked) total += PRICE_REELS;
    if (extraPhoto.checked) total += PRICE_PHOTO;

    // Exibir resultado
    resultText.text = `Total estimado: R$ ${total.toFixed(2)}`;
  }

  // EVENTOS
  sliderPeople.onChange(calcTotal);
  extraLanche.onChange(calcTotal);
  extraReels.onChange(calcTotal);
  extraPhoto.onChange(calcTotal);

  // ESTADO INICIAL — slider começa em 25
  sliderPeople.value = INCLUDED_PEOPLE; // 25
  calcTotal();
});
