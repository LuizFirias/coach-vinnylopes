'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { Select } from '@/components/ui/Select';
import { StudentAvatar } from '@/app/components/profile/StudentAvatar';
import { OverviewPanel } from './OverviewPanel';

type UpdateTipo = 'treino' | 'nutricao' | 'medida' | 'foto' | 'pagamento';

interface UpdateEvent {
  id: string;
  tipo: UpdateTipo;
  label: string;
  data: string; // ISO
}

/** Nota: não existe fonte separada de "hábitos" no banco — nutrition_meal_checkins
 *  cobre nutrição/hábitos alimentares num único filtro "Nutrição". */
const FILTROS: { key: 'todos' | UpdateTipo; label: string }[] = [
  { key: 'todos', label: 'Tudo' },
  { key: 'treino', label: 'Treinos' },
  { key: 'nutricao', label: 'Nutrição' },
  { key: 'medida', label: 'Medidas' },
  { key: 'foto', label: 'Fotos' },
  { key: 'pagamento', label: 'Pagamento' },
];

/** 6 linhas visíveis, o resto rola — igual ao Everfit — e a altura do card
 *  não muda com o filtro/conteúdo (mesmo vazio, o corpo ocupa esse espaço). */
const ROW_H = 44;
const VISIBLE_ROWS = 6;
const BODY_HEIGHT = ROW_H * VISIBLE_ROWS;

function relativeLabel(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return '1d';
  if (dias < 30) return `${dias}d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

interface UpdatesFeedCardProps {
  alunoId: string;
  alunoNome: string;
  alunoAvatarUrl: string | null;
  alunoSexo?: 'masculino' | 'feminino' | 'outro' | null;
  historicoTreinos: { data_conclusao?: string | null; dados_sessao?: { nome_rotina?: string } | null }[];
  medidas: { id: string; data_medicao: string }[];
  fotos: { id: string; data_upload: string }[];
  historicoFinanceiro: {
    id: string;
    data_pagamento?: string | null;
    registrado_em: string;
    valor_plano: number;
    status_pagamento: string;
  }[];
}

export function UpdatesFeedCard({
  alunoId,
  alunoNome,
  alunoAvatarUrl,
  alunoSexo,
  historicoTreinos,
  medidas,
  fotos,
  historicoFinanceiro,
}: UpdatesFeedCardProps) {
  const [checkins, setCheckins] = useState<{ id: string; checkin_date: string }[]>([]);
  const [filtro, setFiltro] = useState<'todos' | UpdateTipo>('todos');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabaseClient
        .from('nutrition_meal_checkins')
        .select('id, checkin_date')
        .eq('student_id', alunoId)
        .in('status', ['done', 'substituted'])
        .order('checkin_date', { ascending: false })
        .limit(30);
      if (!cancelled && !error) setCheckins((data || []) as { id: string; checkin_date: string }[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [alunoId]);

  const eventos = useMemo(() => {
    const list: UpdateEvent[] = [];

    historicoTreinos.forEach((h, i) => {
      if (!h.data_conclusao) return;
      list.push({
        id: `treino-${h.data_conclusao}-${i}`,
        tipo: 'treino',
        label: `concluiu o treino${h.dados_sessao?.nome_rotina ? `: ${h.dados_sessao.nome_rotina}` : ''}`,
        data: h.data_conclusao,
      });
    });
    for (const c of checkins) {
      list.push({
        id: `nutricao-${c.id}`,
        tipo: 'nutricao',
        label: `registrou uma refeição em ${new Date(c.checkin_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
        data: c.checkin_date,
      });
    }
    for (const m of medidas) {
      list.push({ id: `medida-${m.id}`, tipo: 'medida', label: 'registrou uma medição', data: m.data_medicao });
    }
    for (const f of fotos) {
      list.push({ id: `foto-${f.id}`, tipo: 'foto', label: 'adicionou uma foto de evolução', data: f.data_upload });
    }
    for (const p of historicoFinanceiro) {
      if (p.status_pagamento !== 'pago') continue;
      const data = p.data_pagamento || p.registrado_em;
      list.push({
        id: `pagamento-${p.id}`,
        tipo: 'pagamento',
        label: `pagamento de ${p.valor_plano.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
        data,
      });
    }

    return list
      .filter((e) => !!e.data)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 60);
  }, [historicoTreinos, checkins, medidas, fotos, historicoFinanceiro]);

  const filtrados = filtro === 'todos' ? eventos : eventos.filter((e) => e.tipo === filtro);

  return (
    <OverviewPanel
      title="Atualizações"
      action={
        <Select
          value={filtro}
          onChange={(v) => setFiltro(v as typeof filtro)}
          options={FILTROS.map((f) => ({ value: f.key, label: f.label }))}
          size="sm"
          className="w-[150px]"
        />
      }
      bodyClassName="p-0"
    >
      <div style={{ height: BODY_HEIGHT }} className="overflow-y-auto scrollbar-brand-thin px-3">
        {filtrados.length === 0 ? (
          <div style={{ height: BODY_HEIGHT }} className="flex items-center justify-center">
            <p className="text-[11px] text-text-tertiary">Nenhuma atividade ainda.</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-[color:var(--list-row-divider)]">
            {filtrados.map((e) => (
              <li
                key={e.id}
                style={{ height: ROW_H }}
                className="flex items-center gap-2.5"
              >
                <StudentAvatar
                  name={alunoNome}
                  avatarUrl={alunoAvatarUrl}
                  sexo={alunoSexo}
                  sizeClassName="h-6 w-6 shrink-0"
                  className="rounded-full"
                />
                <p className="min-w-0 flex-1 truncate text-[12px] text-text-primary">
                  <span className="font-semibold">{alunoNome}</span> {e.label}
                </p>
                <span className="shrink-0 text-[10px] text-text-tertiary">{relativeLabel(e.data)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </OverviewPanel>
  );
}
