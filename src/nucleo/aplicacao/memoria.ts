/* ─────────────────────────────────────────────────────────────────────────────
 * CASOS DE USO — reconhecer o cliente e lembrar dele.
 *
 * Curtos porque a parte difícil (a inferência de preferência) é pura e mora em
 * `dominio/memoria.ts`. O que sobra aqui é a costura: casar telefone com cadastro,
 * semear a memória de quem já era cliente antes de a MAISA existir, e garantir que
 * o único jeito de gravar preferência seja gravando um FATO.
 * ────────────────────────────────────────────────────────────────────────────── */

import type { AnotarFato, LembrarCliente } from "../portas/entrada/casos-de-uso";
import type { RepositorioMemoria } from "../portas/saida/memoria-cliente";
import type { RepositorioNegocio } from "../portas/saida/repositorio-negocio";
import { comFato, memoriaNova, type MemoriaCliente } from "../dominio/memoria";
import { DadoInvalido } from "../dominio/erros";
import { soDigitos } from "../dominio/clientes";
import { agoraSP } from "../dominio/tempo";

export type Dependencias = {
  negocio: RepositorioNegocio;
  memoria: RepositorioMemoria;
  /** Para congelar o tempo em teste — `atualizadoEm` é o único campo não determinístico. */
  relogio?: () => string;
};

/** Um telefone com menos de 8 dígitos não é telefone. Recusar aqui evita criar uma
 *  linha de memória por lixo que chegue no webhook. */
function exigirTelefone(telefone: string): string {
  const limpo = soDigitos(telefone);
  if (limpo.length < 8) throw new DadoInvalido("Telefone inválido.", "telefone");
  return limpo;
}

export function criarLembrarCliente({ negocio, memoria, relogio = agoraSP }: Dependencias): LembrarCliente {
  return async (t, telefone) => {
    const chave = exigirTelefone(telefone);

    const [cliente, guardada] = await Promise.all([
      negocio.clientePorTelefone(t, chave),
      memoria.ler(t, chave),
    ]);

    let m: MemoriaCliente = guardada ?? memoriaNova(chave, relogio());

    /* Semear a partir do CADASTRO na primeira vez.
     *
     * Quem já é cliente há dois anos não tem histórico na MAISA — ela acabou de
     * nascer — mas o cadastro já sabe o nome dele e o `servicoId` que ele costuma
     * fazer. Sem esta semeadura, o cliente mais antigo do negócio seria tratado como
     * desconhecido na primeira mensagem, que é exatamente o cliente para quem isso
     * soa pior.
     *
     * Só o NOME e o clienteId vêm do cadastro. O serviço habitual não é injetado como
     * favorito: favorito é inferido de histórico, e inventar três escolhas falsas para
     * fabricar um favorito corromperia a inferência de todas as próximas. Ele entra
     * como contexto no prompt, não como conclusão na memória. */
    if (cliente && !m.clienteId) {
      m = comFato(m, { nome: cliente.nome, clienteId: cliente.id }, relogio());
      await memoria.gravar(t, m);
    }

    return {
      telefone: chave,
      clienteId: cliente?.id ?? null,
      nome: m.nome ?? cliente?.nome ?? null,
      memoria: m,
    };
  };
}

export function criarAnotarFato({ memoria, relogio = agoraSP }: Dependencias): AnotarFato {
  return async (t, p) => {
    const chave = exigirTelefone(p.telefone);

    // Nada a gravar? Devolve o que já existe em vez de tocar `atualizadoEm`. Um
    // agente chamando a ferramenta sem argumento útil não deve produzir escrita.
    const atual = (await memoria.ler(t, chave)) ?? memoriaNova(chave, relogio());
    if (!p.nome && !p.escolha) return atual;

    const nova = comFato(atual, { nome: p.nome, escolha: p.escolha }, relogio());
    await memoria.gravar(t, nova);
    return nova;
  };
}
