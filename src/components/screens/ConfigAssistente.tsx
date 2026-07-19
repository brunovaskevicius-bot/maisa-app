"use client";

import { useEffect, useRef, useState } from "react";
import {
  s,
  Icon,
  Card,
  Btn,
  Badge,
  Input,
  Textarea,
  Toggle,
  Monogram,
  Screen,
} from "@/lib/ui";
import { useAdmin } from "@/lib/adminConfig";

type Tom = "amigável" | "profissional" | "descontraído";
type HorarioState = { dia: string; aberto: boolean; de: string; ate: string };

const TONS: { id: Tom; label: string; icon: string }[] = [
  { id: "amigável", label: "Amigável", icon: "sparkle" },
  { id: "profissional", label: "Profissional", icon: "user" },
  { id: "descontraído", label: "Descontraído", icon: "chat" },
];

export default function ConfigAssistente() {
  const { data } = useAdmin();

  // ---- estado da config ----
  const [nome] = useState(data.assistant.nome);
  const [tom, setTom] = useState<Tom>(data.assistant.tom);
  const [saudacao, setSaudacao] = useState(data.assistant.saudacao);
  const [ativo, setAtivoAssistente] = useState(data.assistant.ativo);
  const [hs, setHs] = useState<HorarioState[]>(
    data.horarios.map((h) => ({ dia: h.dia, aberto: h.aberto, de: h.de, ate: h.ate }))
  );
  const [confirmar, setConfirmar] = useState(true);
  const [lembrete, setLembrete] = useState(true);
  const [remarcar, setRemarcar] = useState(true);
  const [encaminhar, setEncaminhar] = useState(true);
  const [salvo, setSalvo] = useState(false);

  // ---- seção ativa (dirige o preview do celular) ----
  const [secAtiva, setSecAtiva] = useState<string>(data.configSecoes[0].id);
  const secRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const ratios: Record<string, number> = {};
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.sec;
          if (id) ratios[id] = e.isIntersecting ? e.intersectionRatio : 0;
        }
        let best = "";
        let max = -1;
        for (const k in ratios) {
          if (ratios[k] > max) {
            max = ratios[k];
            best = k;
          }
        }
        if (best && max > 0) setSecAtiva(best);
      },
      { rootMargin: "-12% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    Object.values(secRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const salvar = () => {
    setSalvo(true);
    window.setTimeout(() => setSalvo(false), 2200);
  };

  const setHorario = (i: number, patch: Partial<HorarioState>) =>
    setHs((prev) => prev.map((h, j) => (j === i ? { ...h, ...patch } : h)));

  const secAtual =
    data.configSecoes.find((c) => c.id === secAtiva) || data.configSecoes[0];

  return (
    <Screen style={s("padding:20px 28px 28px")}>
      <div
        style={s(
          "display:grid;grid-template-columns:minmax(0,1fr) 404px;gap:26px;align-items:start"
        )}
      >
        {/* ============ COLUNA ESQUERDA — seções que rolam ============ */}
        <div style={s("display:flex;flex-direction:column;gap:20px")}>
          {/* --- Personalidade --- */}
          <Secao
            id="personalidade"
            titulo="Personalidade"
            sub="Como a MAISA fala e se apresenta"
            icon="sparkle"
            ativa={secAtiva === "personalidade"}
            onFoco={() => setSecAtiva("personalidade")}
            innerRef={(el) => (secRefs.current["personalidade"] = el)}
            idx={0}
          >
            <Campo label="Nome do assistente" delay={90}>
              <Input value={nome} readOnly />
            </Campo>

            <Campo label="Tom de voz" delay={150}>
              <div style={s("display:flex;gap:9px;flex-wrap:wrap")}>
                {TONS.map((t) => {
                  const on = tom === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTom(t.id)}
                      className={on ? "" : "m-hov-bg"}
                      style={s(
                        `display:inline-flex;align-items:center;gap:7px;padding:8px 15px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;transition:background-color .16s var(--ease-out),border-color .16s var(--ease-out),color .16s var(--ease-out);border:1px solid ${
                          on ? "var(--primary)" : "var(--border)"
                        };background:${
                          on ? "var(--primary-soft)" : "var(--surface)"
                        };color:${on ? "var(--primary-dark)" : "var(--muted)"}`
                      )}
                    >
                      <Icon name={t.icon} size={15} sw={2} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </Campo>

            <Campo label="Mensagem de saudação" delay={210}>
              <Textarea
                value={saudacao}
                onChange={(e) => setSaudacao(e.target.value)}
                rows={3}
              />
            </Campo>

            <LinhaToggle
              titulo="Assistente ativo"
              desc="Quando ligada, a MAISA responde no WhatsApp automaticamente"
              on={ativo}
              onChange={setAtivoAssistente}
              delay={270}
            />
          </Secao>

          {/* --- Horário de atendimento --- */}
          <Secao
            id="horarios"
            titulo="Horário de atendimento"
            sub="Quando a MAISA atende e agenda pelos clientes"
            icon="clock"
            ativa={secAtiva === "horarios"}
            onFoco={() => setSecAtiva("horarios")}
            innerRef={(el) => (secRefs.current["horarios"] = el)}
            idx={1}
          >
            <div style={s("display:flex;flex-direction:column;gap:4px")}>
              {hs.map((h, i) => (
                <div
                  key={h.dia}
                  style={s(
                    `display:grid;grid-template-columns:120px auto 1fr;gap:14px;align-items:center;padding:11px 0;${
                      i < hs.length - 1 ? "border-bottom:1px solid var(--line);" : ""
                    }`
                  )}
                >
                  <span
                    style={s(
                      `font-size:14px;font-weight:700;color:${
                        h.aberto ? "var(--ink)" : "var(--muted)"
                      }`
                    )}
                  >
                    {h.dia}
                  </span>

                  <Toggle
                    on={h.aberto}
                    onChange={(v) => setHorario(i, { aberto: v })}
                  />

                  {h.aberto ? (
                    <div
                      style={s(
                        "display:flex;align-items:center;gap:8px;justify-self:end"
                      )}
                    >
                      <Input
                        value={h.de}
                        onChange={(e) => setHorario(i, { de: e.target.value })}
                        style={s(
                          "width:78px;text-align:center;font-family:var(--font-mono);padding:8px 8px"
                        )}
                      />
                      <span style={s("color:var(--muted);font-size:13px")}>às</span>
                      <Input
                        value={h.ate}
                        onChange={(e) => setHorario(i, { ate: e.target.value })}
                        style={s(
                          "width:78px;text-align:center;font-family:var(--font-mono);padding:8px 8px"
                        )}
                      />
                    </div>
                  ) : (
                    <span
                      style={s(
                        "justify-self:end;font-size:13px;color:var(--muted);font-weight:600"
                      )}
                    >
                      Fechado
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Secao>

          {/* --- Agendamentos --- */}
          <Secao
            id="agendamentos"
            titulo="Agendamentos"
            sub="O que a MAISA pode fazer com os horários"
            icon="calendar-check"
            ativa={secAtiva === "agendamentos"}
            onFoco={() => setSecAtiva("agendamentos")}
            innerRef={(el) => (secRefs.current["agendamentos"] = el)}
            idx={2}
          >
            <div style={s("display:flex;flex-direction:column;gap:2px")}>
              <LinhaToggle
                titulo="Confirmar no WhatsApp"
                desc="Envia a confirmação do horário assim que o cliente marca"
                on={confirmar}
                onChange={setConfirmar}
                divisor
              />
              <LinhaToggle
                titulo="Lembrete 3h antes"
                desc="Manda um lembrete automático 3 horas antes do atendimento"
                on={lembrete}
                onChange={setLembrete}
                divisor
              />
              <LinhaToggle
                titulo="Permitir remarcação"
                desc="Deixa o cliente remarcar sozinho pela conversa"
                on={remarcar}
                onChange={setRemarcar}
              />
            </div>
          </Secao>

          {/* --- Comportamento --- */}
          <Secao
            id="comportamento"
            titulo="Comportamento"
            sub="O que fazer quando a MAISA não tiver certeza"
            icon="bot"
            ativa={secAtiva === "comportamento"}
            onFoco={() => setSecAtiva("comportamento")}
            innerRef={(el) => (secRefs.current["comportamento"] = el)}
            idx={3}
          >
            <LinhaToggle
              titulo="Encaminhar para humano"
              desc={`Quando não souber responder, passa a conversa para o(a) ${data.shop.dono.split(" ")[0]}`}
              on={encaminhar}
              onChange={setEncaminhar}
            />
          </Secao>

          {/* --- rodapé: salvar --- */}
          <div
            style={s(
              "display:flex;align-items:center;justify-content:flex-end;gap:14px;padding-top:4px"
            )}
          >
            {salvo && (
              <span
                className="m-pop"
                style={s(
                  "display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:var(--success)"
                )}
              >
                <Icon name="check" size={16} sw={2.4} />
                Alterações salvas
              </span>
            )}
            <Btn icon={salvo ? "check" : "sparkle"} onClick={salvar}>
              {salvo ? "Salvo" : "Salvar alterações"}
            </Btn>
          </div>
        </div>

        {/* ============ COLUNA DIREITA — celular estático (sticky, ancorado no topo da sidebar) ============ */}
        <div style={s("position:sticky;top:0;height:calc(100vh - 162px);display:flex;flex-direction:column;align-items:center;justify-content:flex-start")}>
          <Phone sec={secAtual} nome={nome} tom={tom} ativo={ativo} />
        </div>
      </div>
    </Screen>
  );
}

/* ==================== helpers locais ==================== */

function Campo({
  label,
  children,
  delay,
}: {
  label: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className={delay != null ? "m-reveal" : undefined}
      style={s(
        `display:flex;flex-direction:column;gap:7px${
          delay != null ? `;animation-delay:${delay}ms` : ""
        }`
      )}
    >
      <span style={s("font-size:12.5px;font-weight:700;color:var(--muted)")}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Secao({
  id,
  titulo,
  sub,
  icon,
  ativa,
  onFoco,
  innerRef,
  idx,
  children,
}: {
  id: string;
  titulo: string;
  sub: string;
  icon: string;
  ativa: boolean;
  onFoco: () => void;
  innerRef: (el: HTMLDivElement | null) => void;
  idx: number;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={innerRef}
      data-sec={id}
      className="m-reveal"
      style={s(`animation-delay:${Math.min(idx, 9) * 80}ms`)}
    >
      <Card
        pad={0}
        radius={20}
        style={s(
          `overflow:hidden;transition:border-color .2s var(--ease-out),box-shadow .2s var(--ease-out);border:1px solid ${
            ativa ? "var(--primary)" : "var(--border)"
          };${ativa ? "box-shadow:var(--shadow-pop)" : ""}`
        )}
      >
        <button
          onClick={onFoco}
          className="m-hov-bg"
          style={s(
            "width:100%;display:flex;align-items:center;gap:13px;padding:18px 20px;background:transparent;border:none;cursor:pointer;text-align:left"
          )}
        >
          <span
            style={s(
              `width:40px;height:40px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background-color .16s var(--ease-out),border-color .16s var(--ease-out),color .16s var(--ease-out);background:${
                ativa ? "var(--primary)" : "var(--primary-soft)"
              };color:${ativa ? "#fff" : "var(--primary-dark)"}`
            )}
          >
            <Icon name={icon} size={20} />
          </span>
          <div style={s("min-width:0;flex:1")}>
            <div
              style={s(
                "font-size:15.5px;font-weight:800;letter-spacing:-.01em;color:var(--ink)"
              )}
            >
              {titulo}
            </div>
            <div style={s("font-size:12.5px;color:var(--muted);margin-top:1px")}>
              {sub}
            </div>
          </div>
          {ativa && (
            <Badge tone="primary" dot>
              No preview
            </Badge>
          )}
        </button>
        <div
          style={s(
            "padding:6px 20px 22px;display:flex;flex-direction:column;gap:18px"
          )}
        >
          {children}
        </div>
      </Card>
    </div>
  );
}

function LinhaToggle({
  titulo,
  desc,
  on,
  onChange,
  divisor,
  delay,
}: {
  titulo: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
  divisor?: boolean;
  delay?: number;
}) {
  return (
    <div
      className={delay != null ? "m-reveal" : undefined}
      style={s(
        `display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;${
          divisor ? "border-bottom:1px solid var(--line);" : ""
        }${delay != null ? `animation-delay:${delay}ms;` : ""}`
      )}
    >
      <div style={s("min-width:0")}>
        <div style={s("font-size:14px;font-weight:700;color:var(--ink)")}>
          {titulo}
        </div>
        <div
          style={s(
            "font-size:12.5px;color:var(--muted);margin-top:2px;line-height:1.45"
          )}
        >
          {desc}
        </div>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

/* ---- celular com preview do WhatsApp ---- */
function Phone({
  sec,
  nome,
  tom,
  ativo,
}: {
  sec: {
    id: string;
    titulo: string;
    thread: { de: "cliente" | "bot"; txt: string }[];
  };
  nome: string;
  tom: Tom;
  ativo: boolean;
}) {
  return (
    <div
      className="m-reveal"
      style={s(
        "animation-delay:120ms;height:100%;max-height:812px;aspect-ratio:9 / 19;max-width:100%;margin:0 auto;display:flex;flex-direction:column;border-radius:38px;padding:11px;background:linear-gradient(150deg,#2c241f,#151210);box-shadow:var(--shadow-pop),0 24px 50px oklch(30% 0.03 60 / 0.28)"
      )}
    >
      <div
        style={s(
          "border-radius:30px;overflow:hidden;background:var(--surface);display:flex;flex-direction:column;flex:1;min-height:0"
        )}
      >
        {/* header do WhatsApp — em azul, p/ manter a unidade de cor MAISA */}
        <div
          style={s(
            "display:flex;align-items:center;gap:11px;padding:14px 15px 12px;background:linear-gradient(135deg,var(--primary),var(--primary-dark))"
          )}
        >
          <Icon name="chevron-left" size={21} stroke="#fff" sw={2.2} />
          <Monogram name={nome} size={44} radius={999} />
          <div style={s("flex:1;min-width:0")}>
            <div
              style={s(
                "font-size:15px;font-weight:800;color:#fff;letter-spacing:-.01em"
              )}
            >
              {nome}
            </div>
            <div
              style={s(
                "font-size:11.5px;color:rgba(255,255,255,.85);display:flex;align-items:center;gap:5px;margin-top:1px"
              )}
            >
              <span
                style={s(
                  `width:7px;height:7px;border-radius:50%;background:${
                    ativo ? "#d9f0ff" : "rgba(255,255,255,.5)"
                  }`
                )}
              />
              {ativo ? "online" : "offline"} · tom {tom}
            </div>
          </div>
          <Icon name="phone" size={18} stroke="#fff" sw={2} />
        </div>

        {/* thread — key por seção: a cada troca de preview, as bolhas re-animam (stagger) */}
        <div
          key={sec.id}
          style={s(
            "flex:1;overflow:hidden;padding:18px 15px;display:flex;flex-direction:column;gap:11px;background:var(--surface-2)"
          )}
        >
          <div
            className="m-reveal"
            style={s(
              "align-self:center;font-size:10.5px;font-weight:700;color:var(--muted);background:var(--surface);padding:4px 12px;border-radius:999px;margin-bottom:2px"
            )}
          >
            {sec.titulo}
          </div>
          {sec.thread.map((m, i) => {
            const cliente = m.de === "cliente";
            return (
              <div
                key={i}
                className="m-reveal"
                style={{
                  ...s(
                    `max-width:80%;align-self:${
                      cliente ? "flex-start" : "flex-end"
                    };background:${
                      cliente ? "var(--surface)" : "var(--primary-soft)"
                    };color:var(--ink);font-size:14.5px;line-height:1.5;padding:11px 15px;border-radius:${
                      cliente ? "4px 15px 15px 15px" : "15px 4px 15px 15px"
                    };box-shadow:0 1px 2px oklch(30% 0.03 60 / 0.1)`
                  ),
                  animationDelay: `${90 + Math.min(i, 8) * 75}ms`,
                }}
              >
                {m.txt}
              </div>
            );
          })}
        </div>

        {/* input fake */}
        <div
          style={s(
            "display:flex;align-items:center;gap:9px;padding:11px 13px;background:var(--surface);border-top:1px solid var(--line)"
          )}
        >
          <div
            style={s(
              "flex:1;background:var(--surface-2);border-radius:999px;padding:9px 15px;font-size:13px;color:var(--muted)"
            )}
          >
            Mensagem
          </div>
          <span
            style={s(
              "width:38px;height:38px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--primary);color:#fff"
            )}
          >
            <Icon name="send" size={17} sw={2} />
          </span>
        </div>
      </div>
    </div>
  );
}
