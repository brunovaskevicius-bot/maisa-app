/* ─────────────────────────────────────────────────────────────────────────────
 * CLIENTES — quem é atendido.
 *
 * O `telefone` vai ganhar peso: é por ele que o agente de WhatsApp vai reconhecer
 * quem está falando ("+55 11 98123-4567" → cl1) antes de mexer na agenda. Hoje
 * ninguém depende disso, mas é o motivo de o campo ser obrigatório.
 * ────────────────────────────────────────────────────────────────────────────── */

export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cpf: string;
  canal: "Online" | "Presencial";
  ativo: boolean;
  desde: string;
  servicoId: string;
  /** Atendimentos fechados na competência corrente. */
  atendimentos: number;
  /** Valor fechado na competência — base da nota fiscal. */
  valor: number;
  /**
   * Cliente que existe só para validar a integração fiscal em produção.
   * A NFS-e só autoriza de verdade em produção, então testar exige emitir uma
   * nota real — e uma nota real de teste não pode ficar de pé. Marcar `teste`
   * faz o store cancelar automaticamente logo após a autorização, de forma que
   * nunca sobra nota órfã.
   */
  teste?: boolean;
};

/** Só dígitos, do jeito que o WhatsApp e a prefeitura gostam. */
export const soDigitos = (v?: string | null) => (v ?? "").replace(/\D/g, "");

/**
 * O caminho de volta: dígitos → "(11) 98123-4567".
 *
 * Existe por causa de quem manda mensagem e não está no cadastro. Uma conversa de WhatsApp
 * de número desconhecido tem que aparecer na lista com ALGUMA coisa no lugar do nome, e o
 * telefone cru ("5511981234567") é a única informação verdadeira que temos dela — mas escrito
 * assim é uma senha, não um contato. Nome inventado ("Cliente #4") seria pior: some a única
 * pista que o dono tem de quem é a pessoa.
 *
 * O DDI 55 é retirado da exibição por ser ruído: todo mundo aqui tem o mesmo. Número que não
 * tem cara de brasileiro volta como veio — melhor um formato feio que um recorte errado.
 */
/**
 * O CPF fecha na conta do dígito verificador?
 *
 * ★ ESTA FUNÇÃO NASCEU DE UM ERRO REAL DA RECEITA, em 21/08/2026. O primeiro arquivo do
 * Receita Saúde levado ao "Analisar Arquivo" do e-CAC voltou com:
 *
 *     CPF Titular Pagamento — "Titular do pagamento inválido."
 *     CPF Beneficiário ..... — "Beneficiário do serviço inválido."
 *
 * Os dois eram CPFs de teste inventados (111.222.333-44), que têm 11 dígitos e não fecham no
 * módulo 11. Ou seja: a checagem de TAMANHO que existia deixava passar, e o erro só aparecia
 * depois — no portal da Receita, com a pessoa já achando que o arquivo estava pronto.
 *
 * ⚠️ ISTO NÃO DIZ QUE O CPF EXISTE. Diz que ele não é digitação errada. Existência só a
 * Receita sabe, e é ela quem recusa na análise — que continua sendo o juiz.
 *
 * Rejeita os onze dígitos repetidos (111.111.111-11 e companhia) porque eles PASSAM no módulo
 * 11 e não são CPF de ninguém: é o placeholder que todo formulário do país recebe.
 */
export function cpfValido(v?: string | null): boolean {
  const d = soDigitos(v);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const digito = (ate: number): number => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };

  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export function telefoneBonito(v?: string | null): string {
  const d = soDigitos(v);
  const nacional = d.length > 11 && d.startsWith("55") ? d.slice(2) : d;
  if (nacional.length === 11) return `(${nacional.slice(0, 2)}) ${nacional.slice(2, 7)}-${nacional.slice(7)}`;
  if (nacional.length === 10) return `(${nacional.slice(0, 2)}) ${nacional.slice(2, 6)}-${nacional.slice(6)}`;
  // 8 dígitos é a `telefone_chave`: sem DDD, então nada de parênteses vazios.
  if (nacional.length === 8 || nacional.length === 9) {
    return `${nacional.slice(0, nacional.length - 4)}-${nacional.slice(-4)}`;
  }
  return d;
}
