import * as React from "react";
import "./glass-button.css";

/* ----------------------------------------------------------------------------
 * GlassButton — o botão de vidro, portado para o que este repo realmente tem.
 *
 * A ORIGEM veio como TSX de registry: `cva` para as variantes, utilitários do
 * Tailwind para o desenho, `forwardRef` para o ref. O port mantém a API (`size`,
 * `contentClassName`, `className`, os props nativos) e a MARCAÇÃO exata — wrap >
 * button > span, com a sombra como irmã do botão —, porque é dela que o CSS
 * depende. As três divergências estão abaixo, cada uma por um motivo do projeto e
 * não por gosto:
 *
 * 1. SEM `cva` E SEM TAILWIND. Nenhum dos dois existe aqui (ver o cabeçalho do
 *    glass-button.css). As variantes viraram uma classe por tamanho.
 *
 * 2. SEM `forwardRef`. Este arquivo é Server Component — a dobra da v3 é servida
 *    inteira do servidor, e `forwardRef` não é suportado nesse lado. Pôr um
 *    "use client" só para guardar um ref que ninguém usa mandaria o botão inteiro
 *    para o bundle do cliente numa página que já carrega a StickyMobileCta de
 *    graça. Quando alguém precisar do ref, o arquivo ganha "use client" e o
 *    forwardRef de volta — e aí paga-se o custo sabendo o que se comprou.
 *
 * 3. ELE PODE SER UM <a>. O de origem é sempre <button>, e o único consumidor
 *    hoje é o CTA da dobra, que NAVEGA (`cfg.rotas.base`). Um <button> que navega
 *    perde o menu de contexto, o abrir-em-nova-aba e o anúncio de "link" do
 *    leitor de tela. Com `href`, sai <a>; sem, sai <button>.
 *
 * O QUE NÃO FOI PORTADO: `all-unset`, que estava na origem e não é utilitário do
 * Tailwind — ou seja, nunca chegou ao CSS de lá. O reset pontual está no CSS, e a
 * razão de não ser `all: unset` está anotada lá.
 * -------------------------------------------------------------------------- */

type Tamanho = "default" | "sm" | "lg" | "icon";

function cn(...partes: (string | undefined | null | false)[]): string {
  return partes.filter(Boolean).join(" ");
}

type Comuns = {
  size?: Tamanho;
  /** Classe no <span> interno — o que de fato carrega o respiro e a tipografia. */
  contentClassName?: string;
  /** Classe no WRAP, que é quem manda na escala: um `font-size` aqui redimensiona
   *  o botão inteiro, porque os respiros do CSS são em `em`. */
  className?: string;
  children?: React.ReactNode;
};

export type GlassButtonProps = Comuns &
  (
    | ({ href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children">)
    | ({ href?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">)
  );

export function GlassButton({
  className,
  children,
  size = "default",
  contentClassName,
  ...resto
}: GlassButtonProps) {
  /* `mk-focus` vem junto sempre: o anel de foco desta casa é uma classe, e um botão
     que sai daqui sem ela é um alvo de teclado invisível. O CSS devolve o raio de
     pílula que essa classe compartilhada esquadraria. */
  const classeBotao = cn("glass-button", "mk-focus");
  const miolo = (
    <span className={cn("glass-button-text", contentClassName)}>{children}</span>
  );

  /* A CLASSE DE TAMANHO VAI NO WRAP, e não no botão como no componente de origem:
     ela declara `font-size`, e no botão essa declaração venceria por herança
     qualquer escala vinda de fora — inclusive a que a dobra da v3 deriva de
     `--o-r0`. A explicação medida está no glass-button.css. */
  return (
    <div className={cn("glass-button-wrap", `glass-button--${size}`, className)}>
      {"href" in resto && resto.href !== undefined ? (
        <a className={classeBotao} {...(resto as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
          {miolo}
        </a>
      ) : (
        <button
          className={classeBotao}
          type="button"
          {...(resto as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {miolo}
        </button>
      )}
      <div className="glass-button-shadow" aria-hidden="true" />
    </div>
  );
}
