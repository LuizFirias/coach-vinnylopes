export const DADOS_PREVIEW_ALUNO = {
  nome: "Aluno Exemplo",
  fichaAtiva: {
    nomeRotina: "Upper A",
    exercicios: [
      { nome: "Supino reto", series: 4, reps: 10, tecnica: "FS" },
      { nome: "Crucifixo", series: 3, reps: 12, tecnica: null as string | null },
      { nome: "Desenvolvimento", series: 4, reps: 10, tecnica: null as string | null },
      { nome: "Elevação lateral", series: 3, reps: 15, tecnica: null as string | null },
    ],
  },
  historicoSemana: [
    { dia: "SEG", treinou: true },
    { dia: "TER", treinou: false },
    { dia: "QUA", treinou: true },
    { dia: "QUI", treinou: false },
    { dia: "SEX", treinou: true },
    { dia: "SAB", treinou: false },
    { dia: "DOM", treinou: false },
  ],
  pontos: 240,
  sequencia: 3,
  notaPersonal:
    "Foque na cadência controlada no supino. Na elevação lateral, priorize amplitude sem subir o trapézio.",
};
