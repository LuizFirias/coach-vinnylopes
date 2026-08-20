export type PriorityAction = {
  id: string;
  aluno_id: string;
  nome: string;
  tipo: 'danger' | 'warning' | 'info' | 'success';
  descricao: string;
  acao: string;
  link: string;
  /** Default: navigate via link. cobrar_checkin / solicitar_fotos enviam notificação ao aluno. */
  kind?: 'navigate' | 'cobrar_checkin' | 'solicitar_fotos';
  avatar_url?: string | null;
  sexo?: string | null;
};

export type AlunoComAcoes = {
  alunoId: string;
  alunoNome: string;
  acoes: PriorityAction[];
  /** Derivado do pior tipo entre as ações do aluno. */
  urgenciaMax: 'alta' | 'media';
  avatarUrl?: string | null;
  sexo?: string | null;
};

function urgenciaFromTipo(tipo: PriorityAction['tipo']): 'alta' | 'media' {
  return tipo === 'danger' ? 'alta' : 'media';
}

/** Agrupa PriorityAction por aluno_id (1 linha no dashboard). */
export function agruparAcoesPorAluno(acoes: PriorityAction[]): AlunoComAcoes[] {
  const map = new Map<string, AlunoComAcoes>();

  for (const acao of acoes) {
    let entry = map.get(acao.aluno_id);
    if (!entry) {
      entry = {
        alunoId: acao.aluno_id,
        alunoNome: acao.nome,
        acoes: [],
        urgenciaMax: 'media',
        avatarUrl: acao.avatar_url ?? null,
        sexo: acao.sexo ?? null,
      };
      map.set(acao.aluno_id, entry);
    }
    entry.acoes.push(acao);
    if (urgenciaFromTipo(acao.tipo) === 'alta') {
      entry.urgenciaMax = 'alta';
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.urgenciaMax === b.urgenciaMax) {
      return a.alunoNome.localeCompare(b.alunoNome, 'pt-BR');
    }
    return a.urgenciaMax === 'alta' ? -1 : 1;
  });
}
