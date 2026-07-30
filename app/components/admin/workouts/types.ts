export interface WorkoutPlan {
  id: string;
  aluno_id: string;
  aluno_nome: string;
  aluno_email?: string | null;
  aluno_avatar_url?: string | null;
  nome_rotina: string;
  ativo: boolean;
  criado_em: string;
  tipo: "digital" | "pdf";
  exercicios_count: number;
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
  plans: WorkoutPlan[];
}

export interface AlunoSemFicha {
  id: string;
  coaching_reference: string | null;
  full_name: string | null;
  email: string | null;
}
