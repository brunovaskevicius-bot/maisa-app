/* ─────────────────────────────────────────────────────────────────────────────
 * ADAPTADOR DE SAÍDA — a Focus NFe cumprindo `CadastroDeEmissor`. ⚠️ SÓ SERVIDOR.
 *
 * Casca fina sobre `conta.ts`: o cliente HTTP mora lá, a tradução para o vocabulário do
 * núcleo mora aqui. A separação existe porque `conta.ts` é o único lugar que sabe montar o
 * Basic com o token da CONTA — e ele NÃO deve ser importável por quem só quer emitir.
 *
 * ⚠️ `tokenDaEmpresa` de propósito não é reexportado daqui. Ele existe em `conta.ts` e é
 * usado por `emissor-focus.ts` (mesmo adaptador, mesma pasta). Se aparecesse nesta porta,
 * a credencial de um cliente viraria valor de retorno dentro do núcleo — e o primeiro
 * `console.log` de depuração a imprimiria.
 * ────────────────────────────────────────────────────────────────────────────── */

import type {
  CadastroDeEmissor, EmpresaDoEmissor,
} from "@/nucleo/portas/saida/cadastro-de-emissor";
import type { CadastroDoCnpj } from "@/nucleo/dominio/fiscal";
import {
  consultarCnpj, consultarEmpresa, contaFaltando, criarEmpresa, regimeDe, subirCertificado,
} from "./conta";

const enxuga = (e: { id: number; certificadoValidoAte: string | null; certificadoCnpj: string | null }): EmpresaDoEmissor => ({
  id: e.id,
  certificadoValidoAte: e.certificadoValidoAte,
  certificadoCnpj: e.certificadoCnpj,
});

export const cadastroFocus: CadastroDeEmissor = {
  async consultarCnpj(cnpj): Promise<CadastroDoCnpj | null> {
    return consultarCnpj(cnpj);
  },

  async criarEmpresa(_t, p): Promise<EmpresaDoEmissor> {
    return enxuga(
      await criarEmpresa({
        cnpj: p.cnpj,
        nome: p.nome,
        regimeTributario: regimeDe({ optanteMei: p.optanteMei, optanteSimples: p.optanteSimples }),
        email: p.email,
        municipio: p.municipio,
        uf: p.uf,
        nacional: p.nacional,
      }),
    );
  },

  async estadoDaEmpresa(_t, empresaId): Promise<EmpresaDoEmissor | null> {
    const e = await consultarEmpresa(empresaId);
    return e ? enxuga(e) : null;
  },

  async enviarCertificado(_t, empresaId, p): Promise<EmpresaDoEmissor> {
    return enxuga(await subirCertificado(empresaId, p));
  },

  faltando: contaFaltando,
};
