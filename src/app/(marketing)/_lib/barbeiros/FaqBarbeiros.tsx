"use client";
import React from "react";
import { Icon } from "@/lib/ui";
import { Section } from "../primitives";
import { SectionHead } from "./_internals";
import "./barbeiros.css";

/* ----------------------------------------------------------------------------
 * FaqBarbeiros — perguntas frequentes com <details>/<summary> nativo: zero JS,
 * acessível por padrão (teclado, leitores de tela). Variante "objecoes" (base,
 * quebra objeções de compra) e "duvidas" (meio, dúvidas sobre o funcionamento).
 * O "+" gira 45° e vira "x" ao abrir (via barbeiros.css).
 * -------------------------------------------------------------------------- */

interface QA {
  q: string;
  a: React.ReactNode;
}

const OBJECOES: QA[] = [
  {
    q: "Preciso instalar algum aplicativo?",
    a: "Não. A MAISA trabalha no seu próprio WhatsApp. Você escaneia um QR Code e pronto — o cliente continua falando com o mesmo número de sempre.",
  },
  {
    q: "E se o cliente preferir falar com uma pessoa?",
    a: "A qualquer momento você entra na conversa e assume. A MAISA passa o bastão sem o cliente perceber a troca.",
  },
  {
    q: "Vou perder o controle da minha agenda?",
    a: "Ao contrário. Você vê tudo num painel e ajusta quando quiser. A MAISA tira o trabalho manual; a decisão continua sua.",
  },
  {
    q: "Funciona pra barbearia com vários profissionais?",
    a: "Sim. Cada cadeira tem a sua agenda, e a MAISA distribui os horários entre a equipe automaticamente.",
  },
  {
    q: "Quanto tempo pra colocar no ar?",
    a: "Cerca de 30 minutos: você conecta o WhatsApp, cadastra os serviços e a MAISA já começa a confirmar cliente.",
  },
  {
    q: "E se não der certo pra mim?",
    a: "Se a MAISA não se pagar no primeiro mês, a gente devolve. Sem fidelidade e sem multa pra cancelar.",
  },
];

const DUVIDAS: QA[] = [
  {
    q: "A MAISA responde no meu tom?",
    a: "Sim. Você define o jeito de falar e as respostas das perguntas mais comuns; ela mantém a sua identidade em cada conversa.",
  },
  {
    q: "Ela agenda sozinha?",
    a: "Sim: oferece os melhores horários, confirma com o cliente e coloca na sua agenda — tudo sem você tocar no celular.",
  },
  {
    q: "Como ela recupera cliente sumido?",
    a: "Ela identifica quem não volta há um tempo e dispara uma mensagem com a sua oferta, no momento certo pra trazer de volta.",
  },
  {
    q: "Preciso entender de tecnologia?",
    a: "Não. Se você usa WhatsApp, você usa a MAISA. O setup é guiado e leva cerca de 30 minutos, uma vez só.",
  },
];

export interface FaqBarbeirosProps {
  variant?: "objecoes" | "duvidas";
  id?: string;
}

export function FaqBarbeiros({ variant = "objecoes", id }: FaqBarbeirosProps) {
  const objecoes = variant === "objecoes";
  const itens = objecoes ? OBJECOES : DUVIDAS;

  return (
    <Section id={id} width="default">
      <div style={{ maxWidth: "52ch", marginBottom: "clamp(1.75rem, 4vw, 2.75rem)" }}>
        <SectionHead
          title={objecoes ? "As dúvidas que travam a decisão." : "As perguntas que todo barbeiro faz."}
          lead={
            objecoes
              ? "Se ficou alguma pulga atrás da orelha, provavelmente está aqui embaixo."
              : "Antes de ativar, é bom saber exatamente como a MAISA trabalha por você."
          }
        />
      </div>

      <div style={{ maxWidth: "760px" }}>
        {itens.map((item) => (
          <details key={item.q} className="bb-faq">
            <summary>
              <span>{item.q}</span>
              <span className="bb-faq-icon">
                <Icon name="plus" size={22} sw={2.2} />
              </span>
            </summary>
            <div className="bb-faq-body mk-pretty">{item.a}</div>
          </details>
        ))}
      </div>
    </Section>
  );
}
