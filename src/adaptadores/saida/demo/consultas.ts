/* Buscas por id dentro dos fixtures.
 *
 * São SÍNCRONAS e sem contexto de inquilino porque só a UI as usa, e a UI já está
 * dentro do único negócio que existe. O núcleo nunca chama daqui: ele passa pelo
 * `RepositorioNegocio` (ver ./repositorio.ts), que é assíncrono e recebe o tenant. */

import { EQUIPE } from "./equipe";
import { SERVICOS } from "./catalogo";
import { CLIENTES } from "./clientes";

export const profissional = (id: string) => EQUIPE.find((p) => p.id === id);
export const servico = (id: string) => SERVICOS.find((s) => s.id === id);
export const cliente = (id: string) => CLIENTES.find((c) => c.id === id);
/* `conversa(id)` morava aqui. Saiu com os fixtures de conversa: conversa não tem como ser uma
 * busca SÍNCRONA num array de módulo — ela vem do servidor. Quem precisa usa `st.conversaDe(id)`,
 * que varre a lista carregada. */

export const nomeProfissional = (id: string) => profissional(id)?.nome ?? "—";
export const nomeCliente = (id: string) => cliente(id)?.nome ?? "—";

/* Só o catálogo DE PARTIDA — não enxerga o que o usuário renomeou. Quem tem o store à
 * mão usa `st.nomeServico`; isto aqui é para quem não tem. */
export const nomeServico = (id: string) => servico(id)?.nome ?? "—";
