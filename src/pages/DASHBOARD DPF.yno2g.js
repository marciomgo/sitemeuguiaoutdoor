
import wixData from 'wix-data';
import wixUsers from 'wix-users';
import { timeline } from 'wix-animations';

$w.onReady(function () {
    $w("#dashboard").collapse(); // 🔹 Sempre esconder o dashboard no início sem ocupar espaço
    $w("#subMeta1").hide();
    $w("#subMeta2").hide();
    $w("#subMeta3").hide();
    verificarCadastroFamilia(); // 🔹 Verificar se a família já está cadastrada
    $w("#btnRegistrar").onClick(() => btnRegistrar_click());
    $w("#btnSalvarFamilia").onClick(() => salvarCadastroFamilia()); // Botão para salvar o cadastro inicial
});

// 📌 Função para verificar cadastro da família
function verificarCadastroFamilia() {
    let user = wixUsers.currentUser;
    if (!user.loggedIn) {
        console.log("Usuário não está logado.");
        return;
    }
    wixData.query("familias")
        .eq("userId", user.id)
        .find()
        .then((res) => {
            if (res.items.length > 0) {
                let nomeFamilia = res.items[0].nomeFamilia;
                let metaDistancia = res.items[0].metaDistancia;
                $w("#nomeFamiliaTexto").text = `Família: ${nomeFamilia}`;
                $w("#metaFinal").text = `Meta final: ${metaDistancia} km`;
                $w("#formularioCadastro").collapse();
                $w("#dashboard").expand();
                carregarProgresso();
            } else {
                $w("#formularioCadastro").expand();
                $w("#dashboard").collapse();
            }
        })
        .catch(err => console.error("Erro ao verificar cadastro da família:", err));
}

// 📌 Função para salvar cadastro da família
function salvarCadastroFamilia() {
    let user = wixUsers.currentUser;
    let nomeFamilia = $w("#inputNomeFamilia").value;
    let metaDistancia = Number($w("#inputMetaDistancia").value);
    if (!nomeFamilia || !metaDistancia) {
        console.log("Preencha todos os campos!");
        return;
    }
    let novoRegistro = { userId: user.id, nomeFamilia: nomeFamilia, metaDistancia: metaDistancia };
    wixData.insert("familias", novoRegistro)
        .then(() => verificarCadastroFamilia())
        .catch(err => console.error("Erro ao salvar cadastro da família:", err));
}

// 📌 Função para registrar distância
function btnRegistrar_click() {
    let user = wixUsers.currentUser;
    let distancia = Number($w("#inputDistancia").value);

    console.log("Botão de registro de distância clicado!");
    console.log("Distância digitada:", distancia);

    if (!distancia || distancia <= 0) {
        console.error("Erro: Distância inválida! O valor deve ser maior que zero.");
        return;
    }

    if (!user.loggedIn) {
        console.log("Usuário não está logado. Solicitando login...");
        wixUsers.promptLogin().then(() => {
            console.log("Usuário fez login. Salvando distância...");
            salvarDistancia(user.id, distancia);
        });
    } else {
        console.log("Usuário já está logado. Buscando cadastro da família...");
        wixData.query("familias")
            .eq("userId", user.id)
            .find()
            .then((res) => {
                if (res.items.length > 0) {
                    let nomeFamilia = res.items[0].nomeFamilia;
                    console.log("Família encontrada:", nomeFamilia);
                    salvarDistancia(user.id, distancia, nomeFamilia);
                } else {
                    console.error("Erro: Nenhuma família cadastrada para este usuário!");
                }
            })
            .catch((err) => console.error("Erro ao buscar cadastro da família:", err));
    }
}

// 📌 Função para salvar a distância no banco de dados
function salvarDistancia(userId, distancia, nomeFamilia) {
    console.log(`Salvando distância ${distancia} km para ${nomeFamilia}...`);

    let dataISO = new Date().toISOString();
    let dataFormatada = new Date().toLocaleDateString('pt-BR');

    let registro = {
        userId: userId,
        distancia: distancia,
        data: dataISO,
        dataFormatada: dataFormatada,
        nomeFamilia: nomeFamilia
    };

    wixData.insert("distancias", registro)
        .then(() => {
            console.log("Distância salva com sucesso!");
            carregarProgresso();
        })
        .catch((err) => console.error("Erro ao salvar distância:", err));
}

// 📌 Função para carregar progresso e atualizar a interface
function carregarProgresso() {
    let user = wixUsers.currentUser;
    if (!user.loggedIn) return;
    wixData.query("familias")
        .eq("userId", user.id)
        .find()
        .then((resFamilia) => {
            if (resFamilia.items.length === 0) return;
            let metaDistancia = resFamilia.items[0].metaDistancia;
            let barraLargura = 230;
            wixData.query("distancias")
                .eq("userId", user.id)
                .descending("data")
                .find()
                .then((res) => {
                    let totalDistancia = res.items.reduce((acc, item) => acc + item.distancia, 0);
                    let percentual = Math.min((totalDistancia / metaDistancia) * 100, 100);
                    let posicaoFinal = (percentual / 100) * barraLargura;

                    $w("#progressBarWix").value = percentual;
                    $w("#totalDistancia").text = `${totalDistancia} km`;
                    $w("#percentualDistancia").text = `${percentual.toFixed(1)}%`;
                    $w("#metaFinal").text = `Meta final: ${metaDistancia} km`;

                    let tl = timeline();
                    tl.add($w("#mascote"), { x: posicaoFinal, duration: 1000, easing: "easeInOutQuad" });
                    tl.add($w("#totalDistancia"), { x: posicaoFinal, duration: 1000, easing: "easeInOutQuad" });
                    tl.add($w("#percentualDistancia"), { x: posicaoFinal, duration: 1000, easing: "easeInOutQuad" });
                    tl.play();

                    if (percentual >= 25) $w("#subMeta1").show();
                    if (percentual >= 50) $w("#subMeta2").show();
                    if (percentual >= 75) $w("#subMeta3").show();

                    let historicoTexto = res.items.map(item => `${item.distancia} km  - ${item.dataFormatada} `).join("\n");
                    $w("#listaHistorico").text = historicoTexto;
                })
                .catch(err => console.error("Erro ao carregar progresso:", err));
        })
        .catch(err => console.error("Erro ao buscar meta de distância:", err));
}
