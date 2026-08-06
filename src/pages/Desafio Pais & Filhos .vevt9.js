$w.onReady(function () {
    // Variáveis externas para armazenar o último valor selecionado de cada tag
    let lastDistanceSelected = "40"; // Valor inicial padrão
    let lastDaysSelected = "3"; // Valor inicial padrão
    let lastVelocitySelected = "8"; // Valor inicial padrão

    // Função para garantir seleção única e evitar desmarcação
    function enforceSingleSelection(tagElement, lastSelectedValueGetter, lastSelectedValueSetter) {
        tagElement.onChange(() => {
            if (tagElement.value.length === 0) {
                // Se o usuário tentar desmarcar a última seleção, restaura o valor anterior
                tagElement.value = [lastSelectedValueGetter()];
            } else if (tagElement.value.length > 1) {
                // Se mais de um item for selecionado, mantém apenas o último
                tagElement.value = [tagElement.value[tagElement.value.length - 1]];
            }
            // Atualiza a variável externa com o novo valor selecionado
            lastSelectedValueSetter(tagElement.value[0]);
            recalculate(); // Recalcula os resultados automaticamente
        });

        // Inicializa com o valor padrão do tagElement
        lastSelectedValueSetter(tagElement.value[0]);
    }

    // Aplica a lógica de seleção única para cada conjunto de tags
    enforceSingleSelection(
        $w("#distanceTags"),
        () => lastDistanceSelected,
        (newValue) => (lastDistanceSelected = newValue)
    );

    enforceSingleSelection(
        $w("#daysTags"),
        () => lastDaysSelected,
        (newValue) => (lastDaysSelected = newValue)
    );

    enforceSingleSelection(
        $w("#velocityTags"),
        () => lastVelocitySelected,
        (newValue) => (lastVelocitySelected = newValue)
    );

    // Função para recalcular os valores automaticamente
    function recalculate() {
        // Captura os valores das tags selecionadas
        const distanceSelected = $w("#distanceTags").value[0]; // Valor da tag de distância
        const daysSelected = $w("#daysTags").value[0]; // Valor da tag de dias por semana
        const velocitySelected = $w("#velocityTags").value[0]; // Valor da tag de velocidade

        // Valida se todos os valores foram selecionados
        if (!distanceSelected || !daysSelected || !velocitySelected) {
            $w("#distancePerDayText").text = "";
            $w("#timePerDayText").text = "";
            return;
        }

        // Converte os valores para números
        const distanceTotal = Number(distanceSelected); // Converte para número
        const daysPerWeek = Number(daysSelected); // Converte para número
        const velocity = Number(velocitySelected); // Converte para número

        // Calcula os resultados
        const totalTrainingDays = daysPerWeek * 4; // 4 semanas em um mês
        const distancePerDay = distanceTotal / totalTrainingDays; // Distância por dia
        const timePerDayHours = distancePerDay / velocity; // Tempo por dia em horas

        // Converte o tempo de horas para minutos
        const timePerDayMinutes = Math.round(timePerDayHours * 60);

        // Exibe os resultados
        $w("#distancePerDayText").text = `${distancePerDay.toFixed(2)} km`;
        $w("#timePerDayText").text = `${Math.floor(timePerDayMinutes / 60)}h ${timePerDayMinutes % 60}min`;
    }

    // Define valores padrão para as tags de seleção
    $w("#distanceTags").value = ["40"]; // Distância inicial: 40 km
    $w("#daysTags").value = ["3"]; // Dias de treino por semana: 3
    $w("#velocityTags").value = ["8"]; // Velocidade inicial: Corrida Leve (8 km/h)

    // Calcula os resultados ao carregar a página com os valores padrão
    recalculate();
});