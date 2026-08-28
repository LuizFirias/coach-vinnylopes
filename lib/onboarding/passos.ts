export interface PassoOnboarding {
  id: string;
  titulo: string;
  descricao: string;
  cta: string;
  href: string;
  /** Nome do ícone Phosphor (PascalCase) */
  icone: string;
}

export const ALUNOS_ATUAIS_OPTIONS = [
  { value: "0", label: "Ainda não tenho alunos" },
  { value: "1-5", label: "1 a 5 alunos" },
  { value: "6-15", label: "6 a 15 alunos" },
  { value: "16-30", label: "16 a 30 alunos" },
  { value: "30+", label: "Mais de 30 alunos" },
] as const;

export type AlunosAtuaisFaixa = (typeof ALUNOS_ATUAIS_OPTIONS)[number]["value"];

export const PASSOS_ONBOARDING: PassoOnboarding[] = [
  // Ao adicionar um passo novo (funcionalidade nova), use um `id` inédito.
  // Coaches que já concluíram o guia voltam a ver só o(s) passo(s) novo(s).
  {
    id: "cadastrar-aluno",
    titulo: "Cadastre seu primeiro aluno",
    descricao: "Adicione o perfil e convide o aluno para acessar o app.",
    cta: "Cadastrar aluno",
    href: "/admin/alunos/novo",
    icone: "UserPlus",
  },
  {
    id: "montar-ficha",
    titulo: "Monte uma ficha de treino",
    descricao: "Crie exercícios, séries e técnicas para o aluno.",
    cta: "Criar ficha",
    href: "/admin/treinos/nova-ficha",
    icone: "Barbell",
  },
  {
    id: "criar-nutricao",
    titulo: "Prescreva um plano alimentar",
    descricao: "Monte as refeições com macros do dia para o aluno.",
    cta: "Criar plano",
    href: "/admin/nutricao",
    icone: "ForkKnife",
  },
  {
    id: "ver-como-aluno",
    titulo: "Veja como o aluno enxerga o app",
    descricao: "Simule a experiência do aluno antes de convidar alguém.",
    cta: "Ver preview",
    href: "/admin/preview-aluno",
    icone: "Eye",
  },
];

export const PASSOS_ONBOARDING_IDS = PASSOS_ONBOARDING.map((p) => p.id);
