export interface WorkoutPlan {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  aluno_email?: string | null;
  aluno_avatar_url?: string | null;
  aluno_sexo?: string | null;
  nome_rotina: string;
  ativo: boolean;
  criado_em: string;
  tipo: "digital" | "pdf";
  exercicios_count: number;
  /** Nomes para preview estilo Hevy (lista truncada no card). */
  exercicio_nomes?: string[];
  pdf_url?: string;
  ultima_execucao?: string | null;
  configuracao?: { exercicios?: unknown[] } | null;
}

export interface WorkoutGroup {
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  avatarUrl: string | null;
  avatarColor: string;
  sexo?: string | null;
  plans: WorkoutPlan[];
}

export interface AlunoSemFicha {
  id: string;
  coaching_reference: string | null;
  full_name: string | null;
  email: string | null;
}
