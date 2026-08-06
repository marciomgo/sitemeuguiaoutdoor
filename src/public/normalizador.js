//==================================================
// NORMALIZADOR MGO
//==================================================

export function normalizar(texto) {

    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

}

//==================================================
// VALIDAR RESPOSTA
//==================================================

export function respostaCorreta(resposta, respostasAceitas) {

    const respostaNormalizada = normalizar(resposta);

    const lista = String(respostasAceitas || "")
    .split(/[;,]/)
    .map(item => normalizar(item))
    .filter(item => item);

    return lista.includes(respostaNormalizada);

}