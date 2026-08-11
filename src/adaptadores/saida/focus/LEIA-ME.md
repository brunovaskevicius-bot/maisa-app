# `saida/focus/` — Focus NFe (NFS-e municipal)

Cumpre a porta `EmissorFiscal`. **⚠️ Só servidor** — o token nunca chega ao navegador.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `emissor-focus.ts` | **A fachada.** Implementa a porta e traduz o vocabulário da prefeitura para o nosso. É onde `"processando_autorizacao"` vira `"processando"` e `"erro_autorizacao"` vira `"erro"`. |
| `config.ts` | Dados fiscais do prestador lidos de env (CNPJ, inscrição municipal, código IBGE do município, item da lista de serviço, alíquota, ambiente). |
| `focus.ts` | Cliente HTTP puro da API `/v2/nfse`: emitir, consultar, cancelar. Auth é HTTP Basic com o token no lugar do usuário. |

## Os três modos

| Situação | Resultado | Por quê |
|---|---|---|
| sem `FOCUS_NFE_TOKEN` | `simulado` | O fluxo inteiro roda — inclusive o polling — sem emitir nada. É como se testa localmente. |
| token, mas faltando dado fiscal | lança `NaoConfigurado` → `config_incompleta` com a lista | Não arrisca emitir errado. A tela mostra exatamente quais variáveis faltam. |
| token + dados completos | emissão real | Ambiente conforme `FOCUS_NFE_AMBIENTE` (padrão: homologação). |

## Coisas da vida real que estão codificadas aqui

- **`clean()` na config.** A Vercel guarda o valor cru da variável, e é comum colar com
  aspas (`"producao"`) ou espaço. Sem limpar, a comparação falha e o texto inválido vai
  para a prefeitura.
- **`agoraSP()` na data de emissão.** `toISOString()` seria UTC e, depois das 21h em São
  Paulo, já estaria no dia seguinte — a prefeitura rejeita "emissão superior à data de
  hoje". (A conta mora em `nucleo/dominio/tempo.ts`, um lugar só.)
- **Emissão é assíncrona.** A prefeitura devolve "processando" e o número sai depois.
  Por isso são três casos de uso e não um: quem pede acompanha por `consultar`.
- **A rejeição fiscal chega no STATUS, não na emissão.** "Código de Serviço inexistente"
  aparece no polling. É por isso que o log de erro está no `consultar`.
- **CPF de teste precisa ser real.** A prefeitura valida a existência do documento;
  CPF inventado é rejeitado antes de a integração ser exercitada.
