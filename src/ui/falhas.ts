/* ─────────────────────────────────────────────────────────────────────────────
 * A FRASE DE UMA RESPOSTA QUE FALHOU.
 *
 * ★ EXISTE POR CAUSA DE UM BUG DE 21/08/2026 QUE APAGOU A INFORMAÇÃO QUE MAIS IMPORTAVA.
 *
 * O caso de uso do lote recusa dizendo exatamente quem ficou de fora — "Cliente ficou de fora
 * — falta o CPF de quem foi atendido". A rota devolve isso em `info`, porque é o que
 * `adaptadores/entrada/http/respostas.ts` faz com todo erro de domínio. A tela lia
 * `mensagem` e `erro`, campos que não existem, e mostrava **"Não consegui gerar o arquivo."**
 *
 * O prejuízo não é estético: o produto inteiro se apoia em avisar quem ficou de fora e por
 * quê, e a tela transformava isso em "deu errado". Um `??` no lugar errado desfez a feature.
 *
 * ⚠️ `info` PRIMEIRO. É o contrato de `respostas.ts` e de `http/fiscal.ts` (que usa `info`
 * para `payload_invalido`). `erros[0].mensagem` é o formato herdado da Focus, que só as rotas
 * `/api/nf/*` usam. `faltando` vira frase porque `nao_configurado` responde uma lista.
 * ────────────────────────────────────────────────────────────────────────────── */

type Resposta = {
  info?: unknown;
  faltando?: unknown;
  erros?: unknown;
  mensagem?: unknown;
};

export function mensagemDaFalha(r: Resposta | null | undefined, padrao: string): string {
  if (typeof r?.info === "string" && r.info.trim()) return r.info;

  if (Array.isArray(r?.faltando) && r.faltando.length) {
    return `Falta ${r.faltando.filter((x) => typeof x === "string").join(", ")}.`;
  }

  if (Array.isArray(r?.erros)) {
    const primeira = r.erros.find(
      (e): e is { mensagem: string } =>
        !!e && typeof (e as { mensagem?: unknown }).mensagem === "string",
    );
    if (primeira) return primeira.mensagem;
  }

  if (typeof r?.mensagem === "string" && r.mensagem.trim()) return r.mensagem;

  return padrao;
}
