'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { OutlierWarningDialog } from '@/components/medidas/OutlierWarningDialog';
import { MeasurementsView } from '@/app/components/measurements/MeasurementsView';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import type { MeasurementMetricId, MedicaoRecord } from '@/lib/measurements/types';
import { MEASUREMENT_METRICS } from '@/lib/measurements/types';
import { mapMetricaToFormKey } from '@/lib/measurements/formKeys';

type FormKey =
  | 'peso'
  | 'gordura_corporal'
  | 'peitoral'
  | 'cintura'
  | 'braco_esq'
  | 'braco_dir'
  | 'coxa_esq'
  | 'coxa_dir'
  | 'panturrilha';

const HARD_LIMITS: Record<FormKey, number> = {
  peso: 300,
  gordura_corporal: 100,
  peitoral: 200,
  cintura: 200,
  braco_esq: 80,
  braco_dir: 80,
  coxa_esq: 100,
  coxa_dir: 100,
  panturrilha: 70,
};

const METRIC_LABELS: Record<FormKey, string> = {
  peso: 'Peso',
  gordura_corporal: 'Gordura corporal',
  peitoral: 'Tórax',
  cintura: 'Cintura',
  braco_esq: 'Braço esq',
  braco_dir: 'Braço dir',
  coxa_esq: 'Coxa esq',
  coxa_dir: 'Coxa dir',
  panturrilha: 'Panturrilha',
};

function outOfRange(key: FormKey, val: number): boolean {
  return val > HARD_LIMITS[key] || val <= 0;
}

function isOutlier(val: number, last: number | null): boolean {
  if (!last || last === 0) return false;
  return Math.abs(val - last) / last > 0.25;
}

export default function MedidasPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [medicoes, setMedicoes] = useState<MedicaoRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [dataRegistro, setDataRegistro] = useState(new Date().toISOString().slice(0, 10));
  const [outlierPending, setOutlierPending] = useState<{
    campo: string;
    novoValor: number;
    ultimoValor: number;
    unidade: string;
    onConfirmar: () => void;
  } | null>(null);

  const fetchData = useCallback(async () => {
    const session = await getSafeSession();
    const user = session?.user;
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const { data } = await supabaseClient
      .from('medidas_aluno')
      .select('*')
      .eq('aluno_id', user.id)
      .order('data_medicao', { ascending: false });

    setMedicoes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getLastVal = (key: FormKey): number | null => {
    if (medicoes.length === 0) return null;
    const m = medicoes[0];
    const map: Record<FormKey, number | null> = {
      peso: m.peso,
      gordura_corporal: m.gordura_corporal,
      peitoral: m.peitoral,
      cintura: m.cintura,
      braco_esq: m.braco_esquerdo,
      braco_dir: m.braco_direito,
      coxa_esq: m.coxa_esquerda,
      coxa_dir: m.coxa_direita,
      panturrilha: m.panturrilha_direita,
    };
    return map[key];
  };

  const buildPayloadForMetric = (metricId: MeasurementMetricId, value: number) => {
    const formKey = mapMetricaToFormKey(metricId);
    const base = {
      aluno_id: userId!,
      data_medicao: new Date(`${dataRegistro}T12:00:00`).toISOString(),
      peso: null as number | null,
      gordura_corporal: null as number | null,
      peitoral: null as number | null,
      cintura: null as number | null,
      braco_esquerdo: null as number | null,
      braco_direito: null as number | null,
      coxa_esquerda: null as number | null,
      coxa_direita: null as number | null,
      panturrilha_direita: null as number | null,
      panturrilha_esquerda: null as number | null,
    };

    const fieldMap: Record<FormKey, keyof typeof base> = {
      peso: 'peso',
      gordura_corporal: 'gordura_corporal',
      peitoral: 'peitoral',
      cintura: 'cintura',
      braco_esq: 'braco_esquerdo',
      braco_dir: 'braco_direito',
      coxa_esq: 'coxa_esquerda',
      coxa_dir: 'coxa_direita',
      panturrilha: 'panturrilha_direita',
    };

    const dbKey = fieldMap[formKey];

    return {
      ...base,
      [dbKey]: value,
      ...(formKey === 'panturrilha' ? { panturrilha_esquerda: value } : {}),
    };
  };

  const doSave = async (metricId: MeasurementMetricId, value: number) => {
    setSubmitting(true);
    setInputError(null);
    try {
      const payload = buildPayloadForMetric(metricId, value);
      const { error } = await supabaseClient.from('medidas_aluno').insert(payload);
      if (error) throw error;

      await fetchData();
      setSuccessMsg('Medida salva!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setInputError('Não foi possível salvar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitValue = (metricId: MeasurementMetricId, value: number) => {
    const formKey = mapMetricaToFormKey(metricId);
    const metric = MEASUREMENT_METRICS.find((m) => m.id === metricId)!;

    if (outOfRange(formKey, value)) {
      setInputError(`Valor inválido (máx. ${HARD_LIMITS[formKey]})`);
      return;
    }

    const last = getLastVal(formKey);
    if (last !== null && isOutlier(value, last)) {
      setOutlierPending({
        campo: METRIC_LABELS[formKey],
        novoValor: value,
        ultimoValor: last,
        unidade: metric.unit,
        onConfirmar: () => {
          setOutlierPending(null);
          doSave(metricId, value);
        },
      });
      return;
    }

    doSave(metricId, value);
  };

  const handleDeleteMedida = async (id: string) => {
    if (!confirm('Deseja realmente excluir este registro?')) return;
    try {
      const { error } = await supabaseClient.from('medidas_aluno').delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Erro ao excluir medida:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center mobile-page-bg">
        <DumbbellLoader text="Carregando medidas..." />
      </div>
    );
  }

  return (
    <>
      <MeasurementsView
        medicoes={medicoes}
        backHref="/aluno/dashboard"
        submitting={submitting}
        inputError={inputError}
        successMessage={successMsg}
        dataRegistro={dataRegistro}
        onDataRegistroChange={setDataRegistro}
        onSubmitValue={handleSubmitValue}
        onDeleteEntry={handleDeleteMedida}
        getPlaceholder={(id) => {
          const last = getLastVal(mapMetricaToFormKey(id));
          return last !== null ? String(last) : '0';
        }}
      />

      {outlierPending && (
        <OutlierWarningDialog
          campo={outlierPending.campo}
          novoValor={outlierPending.novoValor}
          ultimoValor={outlierPending.ultimoValor}
          unidade={outlierPending.unidade}
          onConfirmar={outlierPending.onConfirmar}
          onEditar={() => setOutlierPending(null)}
        />
      )}
    </>
  );
}
