
import wixData from 'wix-data';
import wixUsers from 'wix-users';
import { timeline } from 'wix-animations';
import wixLocation from 'wix-location';

// Variável global para evitar que a última submeta ativada persista após recarregar a página
let ultimaSubmetaAtivada = null;

function carregarImagens() {
    let user = wixUsers.currentUser;
    if (!user.loggedIn) {
        console.log("❌ Usuário não está logado!");
        return;
    }

    wixData.query("imagens")
        .eq("userId", user.id) // 🔹 Filtra apenas imagens do usuário logado
        .find()
        .then((res) => {
            let imagens = res.items.map(item => ({
                type: "image", 
                src: item.imagem 
            }));

            // ✅ Garante que a galeria não duplica imagens
            $w("#galeriaImagens").items = []; // Primeiro, limpa os itens antigos
            setTimeout(() => {
                $w("#galeriaImagens").items = imagens; // Depois, adiciona os novos itens corretamente
            }, 50); // 🔄 Pequeno delay para evitar bugs visuais

            console.log("✅ Imagens carregadas corretamente para este usuário.");
        })
        .catch(err => console.error("❌ Erro ao carregar imagens:", err));
}


let audioPlayers = ["#audioPlayer1", "#audioPlayer2", "#audioPlayer3"];
let audioIndex = 0; // Controla qual player será usado

const soundURLs = {
    "EnvioDistancia": "https://static.wixstatic.com/mp3/f02643_69056c1cdee74553b5d9d70a0535f6db.wav",
    "Submeta": "https://static.wixstatic.com/mp3/f02643_1a9e1d73661f43db805ab2f98d1673bc.wav",
    "MetaFinal": "https://static.wixstatic.com/mp3/f02643_f33fd9d6fee14b76932226eff650ed75.wav",
    "ApagarDistancia": "https://static.wixstatic.com/mp3/f02643_8ea60fd3505a440284db6d3ebc530f14.wav",
    "UploadImagem": "https://static.wixstatic.com/mp3/f02643_c0be2b3318f048a4a14c572f4034c6fe.wav"
};

function tocarSom(evento) {
    let playerId = audioPlayers[audioIndex]; 
    let player = $w(playerId);

    if (!player) {
        console.error(`❌ Player de áudio '${playerId}' não encontrado.`);
        return;
    }

    if (!soundURLs[evento]) {
        console.error(`❌ URL de som não encontrada para '${evento}'`);
        return;
    }

    if (player.src !== soundURLs[evento]) {
        player.src = soundURLs[evento];
        console.log(`🎵 Definindo som: ${soundURLs[evento]}`);
    }

    // ✅ Delay menor para evitar lentidão
    setTimeout(() => {
        player.play()
            .then(() => console.log(`🔊 Som tocando: ${evento}`))
            .catch(err => console.error(`❌ Erro ao tocar som '${evento}':`, err));
    }, 20);

    // ✅ Alterna para o próximo player
    audioIndex = (audioIndex + 1) % audioPlayers.length;
}

$w("#calendarioEmbed").onMessage((event) => {
    let mensagem = event.data;
    if (!mensagem) return;

    if (mensagem.tipo === "marcarDia") {
        let dataSelecionada = mensagem.dataSelecionada;
        console.log("📌 Mensagem recebida no Wix:", dataSelecionada);
        marcarDia(dataSelecionada);
    } else if (mensagem.tipo === "mudarMes") {
        if (mensagem.direcao === "anterior") {
            mesSelecionado--;
            if (mesSelecionado < 0) {
                mesSelecionado = 11;
                anoSelecionado--;
            }
        } else if (mensagem.direcao === "proximo") {
            mesSelecionado++;
            if (mesSelecionado > 11) {
                mesSelecionado = 0;
                anoSelecionado++;
            }
        }
        atualizarCalendarioVisual();
    }
});


function calcularPercentualAtingido() {
    let user = wixUsers.currentUser;
    if (!user.loggedIn) return Promise.resolve(0); // ✅ Sempre retorna uma Promise

    return wixData.query("familias")
        .eq("userId", user.id)
        .find()
        .then((resFamilia) => {
            if (resFamilia.items.length === 0) return 0;
            let metaDistancia = resFamilia.items[0].metaDistancia;

            return wixData.query("distancias")
                .eq("userId", user.id)
                .descending("data")
                .find()
                .then((res) => {
                    let totalDistancia = res.items
                        .filter(item => item.distancia !== undefined && !item.percentualAtingido)
                        .reduce((acc, item) => acc + (item.distancia || 0), 0);

                    return (metaDistancia > 0) ? Math.min((totalDistancia / metaDistancia) * 100, 100) : 0;
                });
        })
        .catch(err => {
            console.error("Erro ao calcular percentual atingido:", err);
            return 0;
        });
}

$w.onReady(async function () {
    let user = wixUsers.currentUser;

    // 🔐 VERIFICA LOGIN ANTES DE TUDO
    if (!user.loggedIn) {
        console.log("🔐 Usuário não está logado! Redirecionando para login...");
        wixUsers.promptLogin().then(() => {
            if (wixUsers.currentUser.loggedIn) {
                verificarCadastroFamilia();
            } else {
                wixLocation.to("/"); // 🔄 Redireciona para a página inicial se o login for cancelado
            }
        });
        return; // ❗ Impede carregamento do resto do código antes do login
    }

    verificarUltimaSubmeta(user.id);

    // ✅ Se estiver logado, verifica o cadastro da família antes de exibir o dashboard
    verificarCadastroFamilia();  // 🔄 Agora a função não tem .then()
    carregarProgresso();  // ✅ Carrega o progresso logo após verificar o cadastro

    // 🔄 Oculta elementos visuais no carregamento
    $w("#dashboard").collapse();
    $w("#popupSubmeta").hide();
    $w("#popupMedalha").hide();
    $w("#loadingIcon").hide(); // Ícone de loading do envio de distância
    $w("#loadingUpload").hide(); // Ícone de loading do upload de imagens

    // 🏁 Inicializa funcionalidades do site
    iniciarCountdown();
    carregarImagens();
    carregarCalendario();
    calcularDistanciaDiaria();

    submetasAtivadas = {}; // 🔄 Reseta a lista ao carregar a página

    // 🎯 Configurar eventos de botões
    $w("#btnRegistrar").onClick(() => {
        tocarSom("EnvioDistancia");
        btnRegistrar_click();
    });

    $w("#btnSalvarFamilia").onClick(() => salvarCadastroFamilia());
    $w("#btnDesfazerUltimaDistancia").onClick(() => {
        tocarSom("ApagarDistancia");
        desfazerUltimaDistancia();
    });

    $w("#btnEnviarImagem").onClick(() => {
        tocarSom("UploadImagem");
        salvarImagem();
    });

    // 📸 Configura evento para upload de imagens
    $w("#btnEnviarImagem").onClick(() => {
        if ($w("#uploadImagem").value.length > 0) {
            salvarImagem();
        } else {
            console.log("❌ Nenhuma imagem selecionada!");
        }
    });

    // 🔄 Pré-carrega os sons atribuindo uma URL diferente para cada player de áudio
    audioPlayers.forEach((playerId, index) => {
        let player = $w(playerId);
        if (player) {
            let evento = Object.keys(soundURLs)[index % Object.keys(soundURLs).length]; // Alterna entre os sons
            player.src = soundURLs[evento]; // Define a URL do som correspondente
            console.log(`🎵 Player ${index + 1} pré-carregado com: ${soundURLs[evento]}`);
        }
    });

    setTimeout(() => {
        calcularDistanciaDiaria();
    }, 1000); // 🔄 Aguarda 1 segundo antes de chamar o cálculo

    console.log("✅ Página carregada!");
});




let diasPlanejados = [];
let mesSelecionado = new Date().getMonth(); // Mês atual
let anoSelecionado = new Date().getFullYear(); // Ano atual
let distanciaRegistradaTemp = 0; // Armazena a distância temporária antes do banco de dados
let distanciaTotalTemp = 0; // Armazena a distância total antes do banco





function carregarCalendario() {
    let user = wixUsers.currentUser;
    if (!user.loggedIn) return;

    // Buscar os dias planejados no banco de dados
    wixData.query("familias")
        .eq("userId", user.id)
        .find()
        .then((res) => {
            if (res.items.length > 0 && res.items[0].diasPlanejados) {
                diasPlanejados = res.items[0].diasPlanejados;
            }
            atualizarCalendarioVisual();
            atualizarCalculoDistancia(); // ✅ Agora o cálculo é atualizado automaticamente
        })
        .catch(err => console.error("❌ Erro ao carregar dias planejados:", err));
}

function marcarDia(dataSelecionada) {
    let user = wixUsers.currentUser;
    if (!user.loggedIn) return;

    let index = diasPlanejados.indexOf(dataSelecionada);

    if (index === -1) {
        diasPlanejados.push(dataSelecionada);
    } else {
        diasPlanejados.splice(index, 1);
    }

    console.log("📌 Dias planejados atualizados localmente:", diasPlanejados);

    atualizarCalendarioVisual(); // Atualiza o calendário imediatamente

    wixData.query("familias")
        .eq("userId", user.id)
        .find()
        .then((res) => {
            if (res.items.length > 0) {
                let familia = res.items[0];
                familia.diasPlanejados = diasPlanejados;
                return wixData.update("familias", familia);
            }
        })
        .then(() => {
            console.log(`✅ Dia ${dataSelecionada} atualizado no banco de dados.`);
            setTimeout(() => {
                calcularDistanciaDiaria(); // 🔄 Espera o banco ser atualizado antes de calcular
            }, 500); // 🔄 Pequeno delay para evitar leituras inconsistentes
        })
        .catch(err => console.error("❌ Erro ao atualizar dias planejados:", err));
}






let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();

function atualizarCalendarioVisual() {
    let nomeMeses = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    let primeiroDia = new Date(anoSelecionado, mesSelecionado, 1).getDay();
    let ultimoDia = new Date(anoSelecionado, mesSelecionado + 1, 0).getDate();

    let calendarioHTML = `
    <style>
        .calendario-container {
            text-align: center;
            font-family: Arial, sans-serif;
            max-width: 250px; /* 🔽 Reduzindo o tamanho total */
            margin: auto;
        }
        .calendario-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
        }
        .calendario-titulo {
            font-size: 14px; /* 🔽 Reduzindo o tamanho do título */
            font-weight: bold;
        }
        .botao-navegacao {
            cursor: pointer;
            font-size: 14px; /* 🔽 Reduzindo os botões de navegação */
            font-weight: bold;
            background: none;
            border: none;
            color: black;
        }
        .dias-semana {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            font-weight: bold;
            background-color: #ddd;
            padding: 3px; /* 🔽 Reduzindo padding */
            border-radius: 3px;
            font-size: 12px; /* 🔽 Reduzindo tamanho da fonte */
        }
        .calendario-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 3px; /* 🔽 Diminuindo espaçamento */
        }
        .dia {
            width: 30px; /* 🔽 Reduzindo tamanho do dia */
            height: 30px; /* 🔽 Reduzindo tamanho do dia */
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: white;
            border: 1px solid #ccc;
            cursor: pointer;
            font-weight: bold;
            border-radius: 3px;
            transition: background 0.3s;
            user-select: none;
            font-size: 12px; /* 🔽 Reduzindo tamanho do número */
        }
        .dia:hover {
            background-color: #f0f0f0;
        }
        .planejado {
            background-color: black !important;
            color: white;
        }
        .vazio {
            background: none;
            border: none;
        }

        /* 🔽 Ajuste para telas menores */
        @media screen and (max-width: 600px) {
            .calendario-container {
                max-width: 200px; /* 🔽 Reduzindo mais para celulares */
            }
            .dia {
                width: 25px; /* 🔽 Reduzindo mais */
                height: 25px; /* 🔽 Reduzindo mais */
                font-size: 10px; /* 🔽 Reduzindo fonte */
            }
            .calendario-titulo {
                font-size: 12px; /* 🔽 Ajustando título */
            }
        }
    </style>

    <div class="calendario-container">
        <div class="calendario-header">
            <button class="botao-navegacao" onclick="window.parent.postMessage({ tipo: 'mudarMes', direcao: 'anterior' }, '*')">◀</button>
            <div class="calendario-titulo">${nomeMeses[mesSelecionado]} ${anoSelecionado}</div>
            <button class="botao-navegacao" onclick="window.parent.postMessage({ tipo: 'mudarMes', direcao: 'proximo' }, '*')">▶</button>
        </div>
        <div class="dias-semana">
            <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
        </div>
        <div class="calendario-grid">
    `;

    let diaAtual = 1;

    for (let semana = 0; semana < 6; semana++) {
        for (let diaSemana = 0; diaSemana < 7; diaSemana++) {
            if ((semana === 0 && diaSemana < primeiroDia) || diaAtual > ultimoDia) {
                calendarioHTML += `<div class="dia vazio"></div>`;
            } else {
                let dataFormatada = `${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, '0')}-${String(diaAtual).padStart(2, '0')}`;
                let classeDia = "dia";

                if (diasPlanejados.includes(dataFormatada)) {
                    classeDia += " planejado"; // Dia marcado fica preto
                }

                calendarioHTML += `<div class="${classeDia}" data-data="${dataFormatada}" onclick="window.parent.postMessage({ tipo: 'marcarDia', dataSelecionada: '${dataFormatada}' }, '*')">${diaAtual}</div>`;
                diaAtual++;
            }
        }
        if (diaAtual > ultimoDia) break;
    }

    calendarioHTML += "</div></div>"; // Fecha as divs

    $w("#calendarioEmbed").src = `data:text/html;charset=utf-8,${encodeURIComponent(calendarioHTML)}`;
}



function atualizarCalculadora() {
    let metaDistancia = parseFloat($w("#metaFinal").text.replace("Meta ", "").replace(" km", ""));
    let totalDias = diasPlanejados.length;

    if (totalDias > 0) {
        let distanciaDiaria = (metaDistancia / totalDias).toFixed(2);
        $w("#resultadoCalculo").text = `Para os ${totalDias} dias selecionados, será necessário percorrer ${distanciaDiaria} km por dia.`;
    } else {
        $w("#resultadoCalculo").text = "Selecione pelo menos um dia no calendário para calcular.";
    }
}

let mensagensOrdenadas = [
    "🔥 Família unida! +{distancia} km de pura garra!",
    "💪 Pais e filhos juntos! +{distancia} km rumo à meta!",
    "🚀 Esse time não para! Mais {distancia} km conquistados!",
    "🏃‍♂️ Energia total! +{distancia} km superando limites!",
    "🎯 Cada passo conta! +{distancia} km com muita determinação!",
    "💥 Força de equipe! +{distancia} km vencidos lado a lado!",
    "🏆 Incrível! Família somando +{distancia} km na jornada!",
    "🌟 Grandes conquistas começam assim! +{distancia} km hoje!",
    "🔥 O desafio avança! +{distancia} km registrados com sucesso!",
    "🚴‍♂️ Foco total! Família pedalando +{distancia} km juntos!",
    "💯 Persistência pura! +{distancia} km para a conta!",
    "🎉 Distância inserida! +{distancia} km no caminho da vitória!",
    "🔝 Cada metro importa! +{distancia} km com muita determinação!",
    "⚡ Esse time não tem freio! +{distancia} km somados!",
    "🏁 Linha de chegada cada vez mais perto! +{distancia} km hoje!",
    "👏 Vocês são imparáveis! +{distancia} km concluídos!",
    "🎯 Meta mais próxima! +{distancia} km conquistados em família!",
    "🚀 Progresso incrível! +{distancia} km de pura dedicação!",
    "🏅 Medalha chegando! +{distancia} km na conta da família!",
    "🔥 Cada esforço vale a pena! +{distancia} km no caminho certo!"
];

let indiceMensagem = 0; // 🔄 Controla qual mensagem será exibida

function exibirMensagemIncentivo(distancia) {
    if (!$w("#mensagemIncentivo")) {
        console.error("❌ O elemento #mensagemIncentivo não existe na página!");
        return;
    }

    // Obtém a próxima mensagem e insere a distância corretamente
    let mensagem = mensagensOrdenadas[indiceMensagem].replace("{distancia}", distancia);

    // Define a mensagem e exibe o texto
    $w("#mensagemIncentivo").text = mensagem;
    $w("#mensagemIncentivo").show();

    console.log(`📣 Mensagem de incentivo: ${mensagem}`);

    // Atualiza o índice para a próxima mensagem
    indiceMensagem++;
    if (indiceMensagem >= mensagensOrdenadas.length) {
        indiceMensagem = 0; // 🔄 Reinicia quando todas forem usadas
        console.log("🔄 Reiniciando mensagens de incentivo.");
    }

    // Oculta a mensagem automaticamente após 5 segundos
    setTimeout(() => {
        $w("#mensagemIncentivo").hide();
    }, 5000);
}

// Atualiza os dados do usuário ao entrar na página
async function carregarDadosUsuario(userId) {
    try {
        let resultado = await wixData.query("ProgressoDesafio")
            .eq("_id", userId)
            .find();

        if (resultado.items.length > 0) {
            let dados = resultado.items[0];

            // Verificar a última submeta desbloqueada salva no banco de dados
            let ultimaSubmetaDesbloqueada = dados.ultimaSubmeta || null;

            // Se for diferente da última ativada, atualizar interface corretamente
            if (ultimaSubmetaAtivada !== ultimaSubmetaDesbloqueada) {
                ultimaSubmetaAtivada = ultimaSubmetaDesbloqueada;
            }

            // Atualiza interface com progresso e histórico
            carregarProgresso();
        }
    } catch (erro) {
        console.error("Erro ao carregar progresso:", erro);
    }
}



function calcularDistanciaDiaria() {
    let user = wixUsers.currentUser;
    if (!user.loggedIn) return;

    wixData.query("distancias")
        .eq("userId", user.id)
        .find()
        .then((res) => {
            let distanciaTotalTemp = res.items.reduce((acc, item) => acc + (item.distancia || 0), 0);
            console.log("📌 Distância total recuperada do banco:", distanciaTotalTemp);
        
            // 🔄 Agora que distanciaTotalTemp está correto, podemos calcular a média diária
            atualizarCalculoDistancia();
        })
        .catch(err => console.error("❌ Erro ao recuperar distâncias do banco:", err));

    wixData.query("familias")
        .eq("userId", user.id)
        .find()
        .then((res) => {
            if (res.items.length > 0) {
                let familia = res.items[0];

                let metaDistanciaTexto = $w("#metaFinal").text.replace(/[^\d,.]/g, '').trim();
                console.log(`🔎 Texto original de metaFinal: "${$w("#metaFinal").text}"`);

                let metaDistancia = parseFloat(metaDistanciaTexto.replace(',', '.')) || 0;
                let diasSelecionados = familia.diasPlanejados ? familia.diasPlanejados.length : 0;

                let distanciaRestante = Math.max(metaDistancia - distanciaTotalTemp, 0); // 🔄 Agora usa a variável local

                console.log(`🔎 Meta Distância: ${metaDistancia}`);
                console.log(`🔎 Distância registrada localmente: ${distanciaTotalTemp}`);
                console.log(`🔎 Distância restante: ${distanciaRestante}`);
                console.log(`🔎 Dias Selecionados: ${diasSelecionados}`);

                if (diasSelecionados > 0 && distanciaRestante > 0) {
                    let distanciaPorDia = (distanciaRestante / diasSelecionados).toFixed(2);
                    console.log(`📊 Recalculando: ${diasSelecionados} dias, ${distanciaPorDia} km/dia`);
                    $w("#resultadoCalculo").text = `📅 Para os ${diasSelecionados} dias, ainda é necessário percorrer ${distanciaPorDia} km por dia.`;
                } else {
                    console.log("⚠️ Nenhum dia selecionado ou meta inválida.");
                    $w("#resultadoCalculo").text = "⚠️ Selecione todos os dias planejados para o desafio.";
                }
            }
        })
        .catch(err => console.error("❌ Erro ao calcular distância diária:", err));
}


function atualizarCalculoDistancia() {
    let hoje = new Date().toISOString().split("T")[0]; // 🔹 Obtém a data de hoje no formato YYYY-MM-DD
    let diasFuturos = diasPlanejados.filter(dia => dia >= hoje); // 🔹 Filtra apenas os dias a partir de hoje

    let metaDistanciaTexto = $w("#metaFinal").text.replace(/[^\d,.]/g, '').trim();
    let metaDistancia = parseFloat(metaDistanciaTexto.replace(',', '.')) || 0;
    let diasSelecionados = diasFuturos.length;

    let distanciaRestante = Math.max(metaDistancia - distanciaTotalTemp, 0); 

    console.log(`📌 Hoje é: ${hoje}`);
    console.log("🔎 Dias futuros considerados no cálculo:", diasFuturos);
    console.log(`🔎 Distância restante: ${distanciaRestante}`);
    console.log(`🔎 Dias Selecionados para o cálculo: ${diasSelecionados}`);

    let percentual = (metaDistancia > 0) ? Math.min((distanciaTotalTemp / metaDistancia) * 100, 100) : 0;

    // 🔥 NOVA VERIFICAÇÃO: Se a meta foi concluída, exibe a mensagem de parabéns
    if (percentual >= 100) { 
        console.log("🎉 Meta concluída! Exibindo mensagem de parabéns.");
        $w("#resultadoCalculo").text = "🎉 Parabéns! Você concluiu a meta!";
    } else if (diasSelecionados > 0 && distanciaRestante > 0) {
        let distanciaPorDia = (distanciaRestante / diasSelecionados).toFixed(2);
        console.log(`📊 Recalculando: ${diasSelecionados} dias, ${distanciaPorDia} km/dia`);
        $w("#resultadoCalculo").text = `📅 Para os ${diasSelecionados} dias restantes, ainda é necessário percorrer ${distanciaPorDia} km por dia.`;
    } else {
        console.log("⚠️ Nenhum dia válido selecionado ou meta inválida.");
        $w("#resultadoCalculo").text = "⚠️ Selecione todos os dias planejados para o desafio.";
    }
}

function desfazerUltimaDistancia() {
    let user = wixUsers.currentUser;
    if (!user.loggedIn) {
        console.log("❌ Usuário não está logado!");
        return;
    }

    console.log("🔄 Botão de apagar clicado!");

    // 🔍 Buscar a última distância registrada
    wixData.query("distancias")
        .eq("userId", user.id)
        .descending("data") // Busca a mais recente primeiro
        .limit(1) // Garante que só pega a última entrada
        .find()
        .then((res) => {
            if (res.items.length === 0) {
                console.log("❌ Nenhuma distância encontrada para excluir.");
                return;
            }

            let ultimaDistancia = res.items[0]; // Como garantimos que tem apenas 1 item, pegamos direto

            console.log(`📌 Última distância encontrada: ${ultimaDistancia.distancia} km`);

            // 🔥 Removendo do banco de dados
            wixData.remove("distancias", ultimaDistancia._id)
                .then(() => {
                    console.log(`✅ Distância removida com sucesso: ${ultimaDistancia.distancia} km`);

                    // 🔄 Atualiza a variável local
                    distanciaTotalTemp = Math.max(distanciaTotalTemp - ultimaDistancia.distancia, 0);
                    console.log(`📌 Nova distância total local: ${distanciaTotalTemp} km`);

                    // 🔄 Atualiza a interface corretamente
                    setTimeout(() => {
                        carregarProgresso(); // Atualiza a barra de progresso
                        atualizarCalculoDistancia();
                    }, 500);
                })
                .catch(err => console.error("❌ Erro ao remover a distância:", err));
        })
        .catch(err => console.error("❌ Erro ao buscar a última distância:", err));
}




function removerBancoDistancia(distancia) {
    let user = wixUsers.currentUser;
    if (!user.loggedIn) return;

    wixData.query("familias")
        .eq("userId", user.id)
        .find()
        .then((res) => {
            if (res.items.length > 0) {
                let familia = res.items[0];
                familia.totalDistancia = Math.max((familia.totalDistancia || 0) - distancia, 0);
                return wixData.update("familias", familia);
            }
        })
        .then(() => {
            console.log(`✅ Distância ${distancia} km removida no banco.`);
        })
        .catch(err => console.error("❌ Erro ao remover distância:", err));
}

function calcularDistanciaRestanteTemp() {
    let metaDistancia = parseFloat($w("#metaFinal").text.replace("Meta ", "").replace(" km", "")) || 0;
    let diasRestantes = diasPlanejados.length;
    let distanciaRestante = Math.max(metaDistancia - distanciaRegistradaTemp, 0);

    if (diasRestantes > 0 && distanciaRestante > 0) {
        let mediaDiaria = (distanciaRestante / diasRestantes).toFixed(2);
        console.log(`📊 Distância restante: ${distanciaRestante} km, Média diária: ${mediaDiaria} km/dia`);

        let mensagens = [
            `🏃‍♂️ Bora lá! Você precisa de ${mediaDiaria} km/dia para atingir a meta!`,
            `🔥 Foco total! Faça ${mediaDiaria} km/dia e você vai chegar lá!`,
            `💪 Você está no caminho! Só ${mediaDiaria} km/dia para completar o desafio!`
        ];
        let mensagemCoach = mensagens[Math.floor(Math.random() * mensagens.length)];
        $w("#resultadoCalculo").text = mensagemCoach;
    } else {
        console.log("⚠️ Nenhum dia selecionado ou meta inválida.");

        // 🔹 Mantém a última mensagem visível em vez de sumir imediatamente
        if (diasRestantes === 0) {
            $w("#resultadoCalculo").text = "⚠️ Selecione dias no calendário para calcular.";
        }
    }
}

function salvarCadastroFamilia() {
    let user = wixUsers.currentUser;
    let nomeFamilia = $w("#inputNomeFamilia").value.trim();
    let metaDistancia = Number($w("#inputMetaDistancia").value);

    if (!nomeFamilia || !metaDistancia) {
        console.log("❌ Erro: Campos obrigatórios não preenchidos!");
        return;
    }

    console.log(`✅ Iniciando salvamento: Nome da família = ${nomeFamilia}, Meta = ${metaDistancia}`);

    // 🔹 VERIFICA SE O USUÁRIO JÁ TEM UM CADASTRO
    wixData.query("familias")
        .eq("userId", user.id)
        .find()
        .then((res) => {
            if (res.items.length > 0) {
                // 🔄 ATUALIZA O CADASTRO EXISTENTE
                let familiaExistente = res.items[0];
                familiaExistente.nomeFamilia = nomeFamilia;
                familiaExistente.metaDistancia = metaDistancia;

                wixData.update("familias", familiaExistente)
                    .then(() => {
                        console.log("✅ Cadastro atualizado com sucesso!");
                        atualizarInterfaceCadastro(nomeFamilia, metaDistancia);
                    })
                    .catch(err => console.error("❌ Erro ao atualizar cadastro:", err));
            } else {
                // 🆕 INSERE NOVO CADASTRO CASO NÃO EXISTA
                let novoRegistro = {
                    userId: user.id,
                    nomeFamilia: nomeFamilia,
                    metaDistancia: metaDistancia
                };

                wixData.insert("familias", novoRegistro)
                    .then(() => {
                        console.log("✅ Novo cadastro criado!");
                        atualizarInterfaceCadastro(nomeFamilia, metaDistancia);
                    })
                    .catch(err => console.error("❌ Erro ao criar novo cadastro:", err));
            }
        })
        .catch(err => console.error("❌ Erro ao verificar existência do cadastro:", err));
}



// 🔹 FUNÇÃO PARA ATUALIZAR A INTERFACE APÓS O CADASTRO
function atualizarInterfaceCadastro(nomeFamilia, metaDistancia) {
    $w("#nomeFamiliaTexto").text = `Time ${nomeFamilia}`;
    $w("#metaFinal").text = `Meta ${metaDistancia} km`;
    $w("#formularioCadastro").collapse();
    $w("#dashboard").expand();
}

function verificarCadastroFamilia() {
    let user = wixUsers.currentUser;
    if (!user.loggedIn) return;

    // 🔄 Mostra um ícone de carregamento enquanto verifica o cadastro
    $w("#dashboard").collapse();
    $w("#formularioCadastro").collapse();
    $w("#loadingIcon").show();

    wixData.query("familias")
        .eq("userId", user.id)
        .find()
        .then((res) => {
            if (res.items.length > 0) {
                // ✅ Usuário já cadastrou família, pode acessar o dashboard
                let nomeFamilia = res.items[0].nomeFamilia;
                let metaDistancia = res.items[0].metaDistancia;

                $w("#nomeFamiliaTexto").text = `Time ${nomeFamilia}`;
                $w("#metaFinal").text = `Meta ${metaDistancia} km`;

                $w("#formularioCadastro").collapse();
                $w("#dashboard").expand();
            } else {
                // 🔄 Usuário precisa preencher o pré-cadastro
                console.log("🔎 Nenhum cadastro encontrado. Exibindo formulário.");
                $w("#formularioCadastro").expand();
                $w("#dashboard").collapse();
            }
        })
        .catch(err => console.error("❌ Erro ao verificar cadastro:", err))
        .finally(() => {
            $w("#loadingIcon").hide(); // ✅ Esconde o carregamento após a verificação
        });
}

let bloqueioEnvio = false; // Variável para evitar envios duplos

function btnRegistrar_click() {
    if (bloqueioEnvio) {
        console.log("⏳ Envio já está em processamento. Aguarde.");
        return;
    }

    let user = wixUsers.currentUser;
    let distancia = Number($w("#inputDistancia").value);

    if (!distancia || distancia <= 0) {
        console.error("❌ Erro: Distância inválida! O valor deve ser maior que zero.");
        return;
    }

    console.log(`📌 Iniciando envio de ${distancia} km...`);

    // ✅ Atualiza a variável local antes de enviar ao banco
    distanciaTotalTemp += distancia;
    console.log("📌 Distância total registrada localmente:", distanciaTotalTemp);

    // ✅ Atualiza cálculo imediatamente
    atualizarCalculoDistancia();

    // 🔒 Bloqueia envio para evitar cliques repetidos
    bloqueioEnvio = true;
    $w("#btnRegistrar").disable();
    $w("#loadingIcon").show();

    // 🏆 Exibe mensagem de incentivo
    exibirMensagemIncentivo(distancia);

    if (!user.loggedIn) {
        wixUsers.promptLogin().then(() => {
            salvarDistancia(user.id, distancia);
        });
    } else {
        wixData.query("familias")
            .eq("userId", user.id)
            .find()
            .then((res) => {
                if (res.items.length > 0) {
                    let nomeFamilia = res.items[0].nomeFamilia;
                    salvarDistancia(user.id, distancia, nomeFamilia);
                } else {
                    console.error("❌ Erro: Nenhuma família cadastrada para este usuário!");
                    desbloquearBotaoRegistrar();
                }
            })
            .catch((err) => {
                console.error("❌ Erro ao buscar cadastro da família:", err);
                desbloquearBotaoRegistrar();
            });
    }
}






function desbloquearBotaoRegistrar() {
    console.log("🔓 Desbloqueando botão de registro...");
    bloqueioEnvio = false;
    $w("#btnRegistrar").enable();
    $w("#loadingIcon").hide();
}

// 🔹 Função para salvar a distância percorrida no banco de dados
function salvarDistancia(userId, distancia, nomeFamilia) {
    let dataISO = new Date().toISOString();
    let dataFormatada = new Date().toLocaleDateString('pt-BR');

    console.log(`⏳ Enviando ${distancia} km para o banco de dados...`);

    wixData.query("familias")
        .eq("userId", userId)
        .find()
        .then((resFamilia) => {
            if (resFamilia.items.length === 0) {
                console.error("❌ Erro: Nenhuma família cadastrada para este usuário!");
                desbloquearBotaoRegistrar();
                return;
            }

            let metaDistancia = resFamilia.items[0].metaDistancia;

            wixData.query("distancias")
                .eq("userId", userId)
                .find()
                .then((resDistancias) => {
                    let totalDistancia = resDistancias.items
                        .filter(item => item.distancia !== undefined)
                        .reduce((acc, item) => acc + (item.distancia || 0), 0);

                    let percentualAtual = (metaDistancia > 0) ? Math.min(((totalDistancia + distancia) / metaDistancia) * 100, 100) : 0;

                    console.log(`📌 Percentual atualizado: ${percentualAtual}%`);

                    let novoRegistro = {
                        userId: userId,
                        distancia: distancia,
                        data: dataISO,
                        dataFormatada: dataFormatada,
                        nomeFamilia: nomeFamilia,
                        percentualAtingido: percentualAtual // 🔹 Agora salva corretamente o percentual
                    };

                    wixData.insert("distancias", novoRegistro)
                        .then(() => {
                            console.log("✅ Distância registrada com sucesso!");

                            // 🔄 Pequeno delay para garantir que o banco atualize antes de carregar progresso
                            setTimeout(() => {
                                console.log("🔄 Recarregando progresso com delay...");
                                carregarProgresso();
                            }, 500);

                            // 🎯 Verifica se uma nova submeta foi atingida
                            verificarSubmeta(percentualAtual);

                            if (typeof carregarDesafios === "function") { 
                                setTimeout(() => {
                                    try {
                                        console.log(`📌 Atualizando desafios para ${percentualAtual}%`);
                                        carregarDesafios(percentualAtual);
                                    } catch (erro) {
                                        console.error("❌ Erro ao chamar carregarDesafios:", erro);
                                    }
                                }, 500); // 🔄 Aguarda 0.5 segundos antes de chamar
                            } else {
                                console.error("❌ Erro crítico: A função carregarDesafios() não está definida.");
                            }

                            desbloquearBotaoRegistrar();
                        })
                        .catch(err => {
                            console.error("❌ Erro ao salvar distância:", err);
                            desbloquearBotaoRegistrar();
                        });
                })
                .catch(err => {
                    console.error("❌ Erro ao buscar distâncias registradas:", err);
                    desbloquearBotaoRegistrar();
                });
        })
        .catch(err => {
            console.error("❌ Erro ao buscar meta da família:", err);
            desbloquearBotaoRegistrar();
        });
}



function atualizarInterfaceAntesDoBanco(distancia, dataFormatada, nomeFamilia) {
    console.log("📝 Atualizando interface ANTES do banco...");

    // 🔹 Verifica se os valores são válidos antes de atualizar a interface
    if (!distancia || !dataFormatada || !nomeFamilia) {
        console.warn("⚠️ Dados incompletos para atualizar o histórico. Entrada ignorada.");
        return;
    }

    // Atualiza a soma total de distâncias
    let totalAtual = parseFloat($w("#totalDistancia").text) || 0;
    let novoTotal = totalAtual + distancia;
    $w("#totalDistancia").text = `${novoTotal.toFixed(1)} km`;

    // Atualiza o percentual
    let metaDistancia = parseFloat($w("#metaFinal").text.replace("Meta ", "").replace(" km", ""));
    let novoPercentual = (novoTotal / metaDistancia) * 100;
    $w("#percentualDistancia").text = `${novoPercentual.toFixed(1)}%`;
    $w("#progressBarWix").value = novoPercentual;

    // 🔹 Atualiza o histórico **apenas se os dados forem válidos**
    if (dataFormatada && distancia && distancia > 0 && nomeFamilia) {
        let novaEntrada = `${dataFormatada} - ${distancia} km - ${nomeFamilia}`;
        // Adiciona apenas a nova entrada sem puxar dados antigos
        $w("#listaHistorico").text = novaEntrada;
    } else {
        console.warn("⚠️ Dados incompletos detectados antes da gravação no banco. Ignorando atualização do histórico.");
    }
}

function ocultarDesafios() {
    $w("#textoDesafios").hide();
}

function carregarDesafios(percentual) {
    let user = wixUsers.currentUser;
    if (!user.loggedIn) return;

    wixData.query("Desafios")
        .descending("percentual")
        .find()
        .then((res) => {
            console.log(`📌 Desafios encontrados no banco: ${res.items.length}`);

            let desafiosFiltrados = res.items.filter(item => item.percentual <= percentual);
            console.log(`📌 Desafios filtrados para ${percentual}%: ${desafiosFiltrados.length}`);

            // 🚨 Teste Adicional: Ver quais percentuais estão no banco
            res.items.forEach(item => {
                console.log(`🔍 Desafio: ${item.desafioTexto} | Percentual: ${item.percentual}`);
            });

            // 🚨 Teste Adicional: Ver os desafios filtrados
            desafiosFiltrados.forEach(item => {
                console.log(`✅ Desafio visível: ${item.desafioTexto} | Percentual: ${item.percentual}`);
            });

            if (desafiosFiltrados.length > 0) {
                let desafiosTexto = desafiosFiltrados.map(item => `• ${item.desafioTexto}`).join("\n");
                console.log(`📌 Desafios a serem exibidos:\n${desafiosTexto}`);

                $w("#textoDesafios").text = desafiosTexto;
                $w("#textoDesafios").expand();
            } else {
                console.log("⚠️ Nenhum desafio para exibir.");
                $w("#textoDesafios").collapse();
            }
        })
        .catch(err => console.error("❌ Erro ao carregar desafios:", err));
}





function carregarProgresso() {
    let user = wixUsers.currentUser;
    if (!user.loggedIn) return;

    console.log("📌 Carregando progresso do usuário...");

    wixData.query("familias")
        .eq("userId", user.id)
        .find()
        .then((resFamilia) => {
            if (resFamilia.items.length === 0) return;
            let metaDistancia = resFamilia.items[0].metaDistancia;
            let barraLargura = 200;

            wixData.query("distancias")
                .eq("userId", user.id)
                .ascending("data") // 🔄 Ordena para exibir do mais antigo para o mais novo
                .find()
                .then((res) => {
                    console.log("📌 Dados retornados pelo banco:", res.items); // 🔍 Verifica os dados retornados

                    let totalDistancia = res.items
                        .filter(item => item.distancia !== undefined)
                        .reduce((acc, item) => acc + (item.distancia || 0), 0);

                    let percentual = (metaDistancia > 0) ? Math.min((totalDistancia / metaDistancia) * 100, 100) : 0;

                    console.log(`📌 Atualizando progresso: ${percentual}% (${totalDistancia} km)`);

                    // 🔹 Atualiza a barra de progresso e os textos
                    $w("#progressBarWix").value = percentual;
                    $w("#totalDistancia").text = `${totalDistancia} km`;
                    $w("#percentualDistancia").text = `${percentual.toFixed(1)}%`;
                    $w("#metaFinal").text = `Meta final: ${metaDistancia} km`;

                    // 🔹 Atualiza a posição do mascote e da barra de progresso
                    let posicaoFinal = (percentual / 100) * barraLargura;
                    setTimeout(() => {
                        let tl = timeline();
                        tl.add($w("#mascote"), { x: posicaoFinal, duration: 1000, easing: "easeInOutQuad" });
                        tl.add($w("#totalDistancia"), { x: posicaoFinal, duration: 1000, easing: "easeInOutQuad" });
                        tl.add($w("#percentualDistancia"), { x: posicaoFinal, duration: 1000, easing: "easeInOutQuad" });
                        tl.play();
                    }, 500); // 🔄 Delay para evitar falhas no carregamento

                    // 🔹 Agora chama a função de submetas corretamente
                    verificarSubmeta(percentual);
                    verificarMetaFinal(percentual);

                    // ✅ CORREÇÃO: Garante que o histórico seja atualizado corretamente
                    if (res.items.length === 0) {
                        console.log("📌 Nenhuma distância registrada ainda.");
                        $w("#listaHistorico").text = "Nenhuma distância registrada ainda.";
                    } else {
                        let historicoFiltrado = res.items.filter(item => 
                            item.distancia !== undefined && item.dataFormatada && item.distancia > 0
                        );

                        if (historicoFiltrado.length === 0) {
                            console.log("📌 Banco consultado, mas sem distâncias válidas.");
                            $w("#listaHistorico").text = "Nenhuma distância registrada ainda.";
                        } else {
                            let historicoTexto = historicoFiltrado
                                .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()) // ✅ Ordena corretamente as datas
                                .map(item => `${item.dataFormatada} - ${item.distancia} km`)
                                .join("\n");

                            // 🔄 Atualiza o histórico corretamente
                            $w("#listaHistorico").text = historicoTexto;
                        }
                    }
                })
                .catch(err => console.error("❌ Erro ao carregar progresso:", err));
        })
        .catch(err => console.error("❌ Erro ao buscar meta de distância:", err));
}

// 🔹 Variáveis globais para controle das metas
let metaJaAtivada = false; // Garante que a meta só seja ativada uma vez
let submetasJaAtivadas = []; // Lista para evitar repetir submetas
let submetasAtivadas = {}; // Mantemos os dados na memória enquanto o usuário estiver na página






function verificarSubmeta(percentual) {
    console.log(`🔍 Verificando submetas com percentual ${percentual}%`);

    // 🚨 Se a meta final foi atingida, não exibir nenhum popup de submeta
    if (percentual >= 100) {
        console.log("🚫 Meta final atingida! Submetas ignoradas.");
        return;
    }

    let submetas = [25, 50, 75];
    let submetasAtingidas = submetas.filter(s => s <= percentual && !submetasAtivadas[s]);

    if (submetasAtingidas.length === 0) {
        console.log("⚠️ Nenhuma nova submeta atingida.");
        return;
    }

    // ✅ Marcar todas as submetas atingidas de uma vez
    submetasAtingidas.forEach(s => submetasAtivadas[s] = true);
    ultimaSubmetaAtivada = Math.max(...submetasAtingidas);

    // ✅ Criar um popup único caso mais de uma submeta tenha sido atingida
    let mensagem = submetasAtingidas.length === 1
        ? `🎯 Parabéns! Você atingiu a submeta de ${submetasAtingidas[0]}%.`
        : `🎯 Parabéns! Você atingiu as submetas de ${submetasAtingidas.join("%, ")}% de uma vez!`;

    mostrarPopupSubmeta(mensagem);

    // ✅ Salvar no banco de dados diretamente
    let novoRegistro = {
        userId: wixUsers.currentUser.id,
        percentualAtingido: ultimaSubmetaAtivada,
        data: new Date().toISOString(),
        distancia: 0 // Mantém a distância 0 como sinalizador da submeta
    };

    wixData.insert("distancias", novoRegistro)
        .then(() => console.log(`✅ Submeta ${ultimaSubmetaAtivada}% registrada no banco.`))
        .catch(err => console.error("❌ Erro ao registrar submeta no banco:", err));
}

// 🔍 Função para verificar última submeta atingida no banco de dados
async function verificarUltimaSubmeta(userId) {
    try {
        let resultado = await wixData.query("distancias")
            .eq("userId", userId)
            .descending("data")
            .limit(1)
            .find();

        if (resultado.items.length > 0) {
            let ultimaSubmetaDesbloqueada = resultado.items[0].percentualAtingido || null;

            // Apenas atualiza a variável, sem chamar popup nem tocar som
            ultimaSubmetaAtivada = ultimaSubmetaDesbloqueada;
        }
    } catch (erro) {
        console.error("Erro ao verificar última submeta:", erro);
    }
}




function verificarMetaFinal(percentual) {
    console.log(`🔍 Verificando meta final com percentual: ${percentual}`);

    if (percentual >= 100 && !metaJaAtivada) {
        console.log("🏅 Parabéns! Meta final atingida! Exibindo popup...");
        mostrarPopupMedalha("🏅 Parabéns! Você concluiu o DESAFIO PAIS & FILHOS com SUCESSO! 👏🏼👏🏼👏🏼");

        metaJaAtivada = true;

        setTimeout(() => {
            let novoRegistro = {
                userId: wixUsers.currentUser.id,
                percentualAtingido: 100,
                data: new Date().toISOString()
            };

            wixData.insert("distancias", novoRegistro)
                .then(() => console.log("✅ Meta final registrada no banco."))
                .catch(err => console.error("❌ Erro ao registrar meta final:", err));
        }, 500);
    }

    if (percentual >= 100) {
        return; // ✅ 🔥 Evita que qualquer submeta seja ativada
    }
}

// 🔹 Exibe popup de submeta com som
function mostrarPopupSubmeta(mensagem) {
    console.log(`📌 Exibindo popup da submeta com mensagem: ${mensagem}`);

    // 🔹 Aguarda 1 segundo antes de exibir o popup
    setTimeout(() => {
        $w("#popupSubmeta").show();
        $w("#textoPopupSubmeta").text = mensagem;

        // 🔹 Aguarda 2,5 segundos antes de tocar o som da submeta
        setTimeout(() => {
            tocarSom("Submeta");
        }, 2500);

        setTimeout(() => {
            $w("#popupSubmeta").hide();
        }, 10000);
    }, 2500); // ✅ Delay de 2,5 segundos antes de exibir o popup
}

// 🔹 Exibe popup da medalha ao concluir o desafio
function mostrarPopupMedalha(mensagem) {
    console.log("📌 Exibindo popup da medalha!");

    // 🔹 Aguarda 1 segundo antes de exibir o popup
    setTimeout(() => {
        $w("#popupMedalhaTexto").text = mensagem;
        $w("#popupMedalha").show();

        // 🔹 Aguarda 2,5 segundos antes de tocar o som da meta final
        setTimeout(() => {
            tocarSom("MetaFinal");
        }, 2500);

        setTimeout(() => {
            console.log("Escondendo popup da medalha!");
            $w("#popupMedalha").hide();
        }, 10000);
    }, 2500); // ✅ Delay de 2,5 segundos antes de exibir o popup
}




function iniciarCountdown() {
    const dataFinal = new Date("2025-03-02T23:59:59"); // 📌 Defina a data final do DPF (Ajuste conforme necessário)
    
    function atualizarCountdown() {
        const agora = new Date();
        const diferenca = dataFinal.getTime() - agora.getTime();

        if (diferenca <= 0) {
            $w("#countdownText").text = "⏳ O desafio terminou!";
            clearInterval(countdownInterval);
            return;
        }

        const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);

        let countdownFormatado = `${dias}d ${horas}h ${minutos}m ${segundos}s`;
        $w("#countdownText").text = `Restam: ${countdownFormatado}`;
    }

    atualizarCountdown(); // Atualiza a interface imediatamente ao carregar
    let countdownInterval = setInterval(atualizarCountdown, 1000); // Atualiza a cada 1 segundo
}

// 🔹 Salva imagem no banco de dados
function salvarImagem() {
    let user = wixUsers.currentUser;
    if (!user.loggedIn) {
        console.log("❌ Usuário não está logado!");
        return;
    }

    let arquivo = $w("#uploadImagem").value[0]; // Obtém o arquivo carregado
    if (!arquivo) {
        console.log("❌ Nenhuma imagem selecionada!");
        return;
    }

    $w("#btnEnviarImagem").disable(); // 🔒 Desativa o botão para evitar múltiplos cliques
    $w("#loadingUpload").show(); // 🔄 Exibe o indicador de carregamento

    $w("#uploadImagem").uploadFiles()
        .then((arquivos) => {
            let urlImagem = arquivos[0].fileUrl; // Obtém a URL do arquivo salvo

            let novoRegistro = {
                userId: user.id,
                imagem: urlImagem
            };

            wixData.insert("imagens", novoRegistro)
                .then(() => {
                    console.log("✅ Imagem salva no banco de dados!");
                    carregarImagens(); // Atualiza a galeria
                })
                .catch(err => console.error("❌ Erro ao salvar imagem:", err));
        })
        .catch(err => console.error("❌ Erro ao fazer upload da imagem:", err))
        .finally(() => {
            $w("#btnEnviarImagem").enable(); // 🔓 Reativa o botão após upload
            $w("#loadingUpload").hide(); // 🔄 Oculta o indicador de carregamento
        });
}
