/* ─────────────────────────────────────────────────────────────────────────────
 * ERROS DE DOMÍNIO.
 *
 * O núcleo não conhece HTTP: ele não devolve 400 nem 409, ele LANÇA um erro que diz
 * o que aconteceu. Quem traduz para status é o adaptador de entrada — e cada adaptador
 * traduz do seu jeito: a rota HTTP vira JSON com status, e o agente de WhatsApp vai
 * virar uma frase para o cliente ("esse horário já passou, quer o das 15h?").
 *
 * Antes estes erros moravam dentro do adaptador do Google (`PrecisaReconectar` em
 * oauth.ts, `LimiteDoGoogle` em calendario.ts) e a camada de aplicação teria que
 * importar o adaptador para reconhecê-los — a seta apontando para o lado errado.
 * ────────────────────────────────────────────────────────────────────────────── */

export class ErroDeDominio extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = new.target.name;
  }
}

/** O pedido não faz sentido: data inexistente, hora fora do dia, duração absurda. */
export class DadoInvalido extends ErroDeDominio {
  constructor(readonly motivo: string, readonly campo?: string) {
    super(motivo);
  }
}

/** O que se pediu não existe neste inquilino (serviço, cliente, agenda). */
export class NaoEncontrado extends ErroDeDominio {
  constructor(readonly recurso: string) {
    super(`${recurso} não encontrado.`);
  }
}

/** Falta configuração de ambiente para a integração sequer existir. */
export class NaoConfigurado extends ErroDeDominio {
  constructor(readonly faltando: string[]) {
    super(`Integração não configurada: falta ${faltando.join(", ")}.`);
  }
}

/**
 * Só se resolve reconectando: refresh token revogado, senha trocada, 6 meses parado.
 * Merece status próprio porque a UI oferece um botão diferente ("reconectar", não
 * "tentar de novo") — e o agente de WhatsApp vai precisar avisar o dono, não o cliente.
 */
export class PrecisaReconectar extends ErroDeDominio {
  constructor(readonly motivo: string) {
    super(motivo);
  }
}

/**
 * Cota do provedor estourada — erro TRANSITÓRIO, e por isso tem tipo próprio.
 *
 * A leitura da agenda roda sozinha (troca de mês, volta o foco na aba), então ela é a
 * primeira candidata a bater no limite. Um limite não é "deu erro": é "pergunte de novo
 * daqui a pouco". Sem distinguir, a tela mostraria uma falha vermelha para uma condição
 * que se resolve sozinha em segundos.
 */
export class LimiteDoProvedor extends ErroDeDominio {
  constructor(msg = "O provedor está limitando as requisições. Tente de novo em instantes.") {
    super(msg);
  }
}

/** O serviço externo falhou de um jeito que não sabemos classificar. */
export class FalhaDoProvedor extends ErroDeDominio {
  constructor(msg: string, readonly causa?: unknown) {
    super(msg);
  }
}
