import wixData from 'wix-data';


export async function carregarMissao(slug) {

    // Busca a missão
    const resultadoMissao = await wixData.query("Missoes")
        .eq("slug", slug)
        .eq("ativo", true)
        .limit(1)
        .find();

    if (resultadoMissao.items.length === 0) {
        throw new Error(`Missão "${slug}" não encontrada.`);
    }

    const registroMissao = resultadoMissao.items[0];

    // Busca os pontos da missão
    const resultadoPontos = await wixData.query("Pontos")
        .eq("missao", registroMissao._id)
        .eq("ativo", true)
        .ascending("ordem")
        .find();

    // Monta objeto da missão
    const missao = {

        id: registroMissao._id,

        titulo: registroMissao.titulo,

        subtitulo: registroMissao.subtitulo,

        slug: registroMissao.slug,

        descricao: registroMissao.descricao,

        capa: registroMissao.capa,

        totalPontos: registroMissao.totalPontos,

        pontos: []

    };

    resultadoPontos.items.forEach(item => {

        missao.pontos.push({

            codigo: Number(item.codigo),

            ordem: item.ordem,

            latitude: item.latitude,

            longitude: item.longitude,

            conteudo: {

                tipo: item.tipo,

                titulo: item.titulo,

                mensagem: item.mensagem,

                valor: item.valor

            }

        });

    });

    return missao;

}/************
.web.js file
************

Backend '.web.js' files contain functions that run on the server side and can be called from page code.

Learn more at https://dev.wix.com/docs/develop-websites/articles/coding-with-velo/backend-code/web-modules/calling-backend-code-from-the-frontend

****/

/**** Call the sample multiply function below by pasting the following into your page code:

import { multiply } from 'backend/new-module.web';

$w.onReady(async function () {
   console.log(await multiply(4,5));
});

****/

import { Permissions, webMethod } from "wix-web-module";

export const multiply = webMethod(
  Permissions.Anyone, 
  (factor1, factor2) => { 
    return factor1 * factor2 
  }
);
