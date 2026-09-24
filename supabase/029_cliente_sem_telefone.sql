/* ─────────────────────────────────────────────────────────────────────────────
 * 029 — CLIENTE PODE EXISTIR SEM TELEFONE.
 *
 * `clientes.telefone` nasceu `not null` porque todo cliente nascia pelo WhatsApp, e o
 * telefone era a identidade dele. Em 24/09/2026 entrou o botão "Novo cliente", e com ele
 * outro jeito de chegar: o dono cadastra à mão alguém de quem só tem nome e CPF — que é
 * exatamente o que o recibo da Rebots pede. Exigir telefone ali seria inventar um dado
 * para passar no `check`.
 *
 * O `check` continua valendo para quem TEM telefone: 8 caracteres no mínimo. Telefone
 * nulo não gera `telefone_chave` (a coluna gerada vira nula junto), então esse cliente
 * nunca é reconhecido pelo agente — o que é o certo: ele não fala com a MAISA.
 *
 * Aditivo e reexecutável. O código publicado antes desta migração só falha no caso novo
 * (cadastro sem telefone), com uma frase que aponta para este arquivo.
 * ────────────────────────────────────────────────────────────────────────────── */

alter table public.clientes alter column telefone drop not null;

alter table public.clientes drop constraint if exists clientes_telefone_check;
alter table public.clientes add constraint clientes_telefone_check
  check (telefone is null or length(btrim(telefone)) >= 8);
