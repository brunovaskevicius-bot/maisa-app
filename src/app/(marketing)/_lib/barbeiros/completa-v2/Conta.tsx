import { Button, Section } from "../../primitives";
import { ICPS } from "../../icp";
import { Maisa } from "../completa/Maisa";
import { OFERTA } from "./dados";

/* ----------------------------------------------------------------------------
 * O FECHAMENTO — a faixa dourada, e o ÚNICO momento dourado da página inteira.
 *
 * `className="lp-band"` não é decorativo: dentro da faixa o substrato inverte
 * (dourado sólido), e a regra `.lp-band` em marketing.css troca --mk-wordmark
 * por --mk-band-ink. Sem ela o wordmark fica ouro-sobre-ouro a 1,02:1 — ou seja,
 * a marca DESAPARECE no ponto de maior intenção da página. Isso já aconteceu
 * duas vezes neste projeto; é o motivo de a classe existir. Com ela: 9,78:1.
 *
 * ─────────────────── a hierarquia está invertida DE PROPÓSITO ───────────────
 *
 * O reflexo de LP de SaaS é dar o maior corpo tipográfico ao PREÇO. Duas razões
 * para não fazer isso aqui:
 *
 * a) Um número gigante com rótulo miúdo embaixo é literalmente o "hero-metric
 *    template" — o mesmo molde que a v2 existe para matar. Uma tese anterior
 *    propôs `clamp(5rem, 22vw, 13rem)` para o preço, ~208px, e o crime é o mesmo
 *    dos "+38% agenda mais cheia" que foram deletados de dados.ts: número grande
 *    fingindo ser argumento.
 * b) Preço não é o que trava a compra. O que trava é o risco. Quem lê já sabe
 *    que R$ 97 é barato para uma barbearia; o que ele não sabe é o que acontece
 *    se não funcionar. Então quem ganha o maior corpo NÃO-NUMÉRICO da página é a
 *    GARANTIA, que na v1 vivia a 0,95rem no pé da faixa, junto do resto do
 *    miudinho — a frase mais valiosa da oferta tratada como nota de rodapé.
 *
 * O preço vem logo abaixo, em tamanho honesto (máx. ~34px contra os ~51px da
 * garantia), e o "a partir de" está na MESMA linha de leitura, no MESMO corpo,
 * dentro da MESMA frase. Não é um asterisco ao lado de um número — porque existe
 * plano de R$ 197 no catálogo e um "97" sozinho em outdoor é isca.
 *
 * Nenhum texto daqui é digitado à mão: tudo sai de OFERTA, que é a fonte única.
 * -------------------------------------------------------------------------- */

/* Escala fluida, quatro degraus, ratio >= 1,25 em todo ponto do clamp:
 *   garantia  1,85 → 3,20rem
 *   preço     1,40 → 2,10rem   (1,32 no mínimo · 1,52 no máximo)
 *   apoio     1,08 → 1,28rem   (1,30 · 1,64)
 *   operadora 0,85 → 0,95rem   (1,27 · 1,35)
 * O menor degrau não desce de 0,85rem: o pecado da v1 era escrever o que importa
 * pequeno, e encolher para 0,8rem só para fechar planilha de ratio repetiria ele. */
const FS = {
  garantia: "clamp(1.85rem, 4.5vw, 3.2rem)",
  preco: "clamp(1.4rem, 2.6vw, 2.1rem)",
  apoio: "clamp(1.08rem, 1.45vw, 1.28rem)",
  operadora: "clamp(0.85rem, 1.1vw, 0.95rem)",
} as const;

export function Conta() {
  const cfg = ICPS.barbeiros;

  // `lp2-r-largo` entra JUNTO com `lp-band`: o <Section> compartilhado aplica
  // `--mk-section-y`, que é o ritmo uniforme que a v1 usava em cinco seções seguidas —
  // e o v2.css declara um sistema de ritmo por bloco exatamente para fugir disso. Esta
  // seção e a dos Furos eram as duas que não tinham chegado a consumi-lo. Largo é o
  // certo aqui: é a última coisa da página, pode ocupar.
  return (
    <Section
      className="lp-band lp2-r-largo"
      tone="brand"
      width="narrow"
      aria-label="Ativar a MAISA"
      containerStyle={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {/* ───────────────────────────── A GARANTIA ─────────────────────────────
          h2, e o maior corpo tipográfico da página depois do h1 da dobra — ~51px
          contra os ~34px do preço logo abaixo, 1,52x. Fora da dobra, nada é maior
          do que ela: é o texto que carrega o fechamento.
          `color` explícito e obrigatório: a regra
          global `.mkt-world h1..h6 { color: var(--mk-ink) }` pinta headings de
          quase-branco, e quase-branco sobre o dourado da faixa dá ~1,4:1. Aqui,
          --mk-band-ink sobre --mk-band-bg = 9,78:1.
          O "ela" não precisa de antecedente: é o quinto e último bloco de uma
          página que falou dela nos quatro anteriores. Inventar um kicker acima só
          para apresentá-la seria reintroduzir o eyebrow que a v2 baniu. */}
      <h2
        className="mk-balance"
        style={{
          margin: 0,
          fontFamily: "var(--mk-font-display)",
          fontSize: FS.garantia,
          lineHeight: 1.06,
          letterSpacing: "-0.03em",
          color: "var(--mk-band-ink)",
        }}
      >
        {OFERTA.garantia}
      </h2>

      {/* ────────────────────────────── O PREÇO ──────────────────────────────
          Uma frase, um corpo só. O wordmark é o SUJEITO dela — e é justamente
          este <Maisa /> que `.lp-band` salva de virar ouro-sobre-ouro.
          O valor recebe peso 800, não um segundo tamanho: peso distingue sem
          criar um quinto degrau de escala nem um "hero metric". */}
      <p
        className="mk-pretty"
        style={{
          marginTop: "clamp(0.85rem, 2vw, 1.35rem)",
          fontFamily: "var(--mk-font-body)",
          fontWeight: 500,
          fontSize: FS.preco,
          lineHeight: 1.35,
          letterSpacing: "-0.01em",
          color: "var(--mk-band-ink)",
        }}
      >
        A <Maisa escala="grande" /> custa a partir de{" "}
        <strong style={{ fontWeight: 800 }}>
          {OFERTA.precoDe}
          {OFERTA.precoPor}
        </strong>
        .
      </p>

      {/* ─────────────────────────────── OS CTAs ─────────────────────────────
          Primário NAVY sobre o dourado (variant="band"): 9,78:1 de superfície
          contra a faixa — passa a 1.4.11 sem borda — e --mk-band-btn-ink sobre o
          navy dá 15,87:1. O secundário é WhatsApp de DÚVIDA, não um segundo
          "ativar": dois primários seriam zero primário outra vez. */}
      <div
        style={{
          marginTop: "clamp(1.5rem, 3.2vw, 2.25rem)",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "clamp(0.75rem, 1.6vw, 0.95rem)",
        }}
      >
        <Button href={cfg.rotas.base} variant="band" size="lg">
          Ativar minha agenda
        </Button>
        {/* A borda padrão de `band-ghost` é --mk-band-ink a 40%, que medido sobre
            o dourado dá 1,56:1 — reprova o 3:1 da WCAG 1.4.11, e a borda é a
            ÚNICA coisa que delimita este controle (fundo transparente). Subida
            para 80% aqui, no próprio call site, porque o primitivo é global e
            mexer nele afetaria as outras cinco LPs: 80% = 3,54:1. */}
        <Button
          href={cfg.ctaUrl}
          external
          variant="band-ghost"
          size="lg"
          icon="whatsapp"
          style={{ border: "1px solid color-mix(in oklch, var(--mk-band-ink) 80%, transparent)" }}
        >
          Tirar uma dúvida no WhatsApp
        </Button>
      </div>

      {/* ───────────────────────────── APOIO ─────────────────────────────
          Custo de entrada e custo de saída, na ordem em que a cabeça pergunta:
          "quanto trabalho dá para ligar" e "e se eu quiser desligar".
          --mk-band-muted sobre a faixa = 6,54:1, AA com folga mesmo em corpo
          pequeno (o mínimo para texto normal é 4,5:1). */}
      <p
        style={{
          marginTop: "clamp(1.25rem, 2.6vw, 1.75rem)",
          fontFamily: "var(--mk-font-body)",
          fontWeight: 600,
          fontSize: FS.apoio,
          lineHeight: 1.5,
          color: "var(--mk-band-muted)",
        }}
      >
        {OFERTA.setup} · {OFERTA.fidelidade}
      </p>

      {/* ─────────────────────────── A OPERADORA ───────────────────────────
          A única credencial externa VERDADEIRA da página, e por isso a única que
          fecha. Minúscula inicial e menor corpo de propósito: é assinatura de
          responsável, não selo de confiança. A v1 preenchia este espaço com seis
          depoimentos fabricados reciclando as fotos do herói; uma linha real vale
          mais do que os seis. Sem hairline, sem cápsula, sem ícone de escudo — a
          moldura é que fazia a v1 parecer gerada. */}
      <p
        style={{
          marginTop: "clamp(1.5rem, 3.4vw, 2.4rem)",
          fontFamily: "var(--mk-font-body)",
          fontWeight: 500,
          fontSize: FS.operadora,
          lineHeight: 1.5,
          color: "var(--mk-band-muted)",
        }}
      >
        operada pela {OFERTA.operadora}
      </p>
    </Section>
  );
}
