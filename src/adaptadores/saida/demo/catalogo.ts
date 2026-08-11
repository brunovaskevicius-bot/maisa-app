/* O que o negócio de demonstração vende. */

import type { Servico } from "@/nucleo/dominio/catalogo";

/* Todo serviço aponta para pr1 — sv4, sv5 e sv6 eram exclusivos de pr2/pr3/pr4.
 * Deixá-los sem ninguém não era só cosmético: a gaveta do serviço monta "Quem faz" a
 * partir do primeiro profissionalId, e abrir sv4 dava tela branca. */
export const SERVICOS: Servico[] = [
  { id: "sv1", nome: "Atendimento padrão", categoria: "Recorrente", preco: 100, duracao: 40, profissionalIds: ["pr1"], ativo: true },
  { id: "sv2", nome: "Atendimento rápido", categoria: "Recorrente", preco: 60, duracao: 30, profissionalIds: ["pr1"], ativo: true },
  { id: "sv3", nome: "Pacote completo", categoria: "Pacote", preco: 180, duracao: 60, profissionalIds: ["pr1"], ativo: true },
  { id: "sv4", nome: "Atendimento premium", categoria: "Pacote", preco: 150, duracao: 45, profissionalIds: ["pr1"], ativo: true },
  { id: "sv5", nome: "Serviço adicional", categoria: "Extra", preco: 80, duracao: 40, profissionalIds: ["pr1"], ativo: true },
  { id: "sv6", nome: "Atendimento avulso", categoria: "Extra", preco: 70, duracao: 30, profissionalIds: ["pr1"], ativo: true },
  { id: "sv7", nome: "Consulta inicial", categoria: "Extra", preco: 90, duracao: 30, profissionalIds: ["pr1"], ativo: false },
];
