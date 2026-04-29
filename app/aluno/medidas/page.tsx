'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Ruler, Activity, TrendingUp, Calendar, Save, Trash2, ArrowLeft, Loader2, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Medicao {
  id: string;
  peso: number;
  peitoral: number;
  cintura: number;
  braco_esquerdo: number;
  braco_direito: number;
  coxa_esquerda: number;
  coxa_direita: number;
  panturrilha_direita: number;
  data_medicao: string;
}

interface FormData {
  peso: string;
  torax: string;
  cintura: string;
  braco_esq: string;
  braco_dir: string;
  coxa_esq: string;
  coxa_dir: string;
  panturrilha: string;
}

export default function MedidasPage() {
  const [formData, setFormData] = useState<FormData>({
    peso: '',
    torax: '',
    cintura: '',
    braco_esq: '',
    braco_dir: '',
    coxa_esq: '',
    coxa_dir: '',
    panturrilha: '',
  });

  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !authData.user) {
          setError('Você precisa estar logado');
          setLoading(false);
          return;
        }

        setUserId(authData.user.id);

        const { data: medicoesData, error: medicoesError } = await supabaseClient
          .from('medidas_aluno')
          .select('*')
          .eq('aluno_id', authData.user.id)
          .order('data_medicao', { ascending: false });

        if (medicoesError) {
          setError('Erro ao carregar medições: ' + medicoesError.message);
          setLoading(false);
          return;
        }

        setMedicoes(medicoesData || []);
        setLoading(false);
      } catch (err) {
        setError('Erro ao conectar com o servidor');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!userId) {
      setError('Usuário não identificado');
      return;
    }

    if (Object.values(formData).some((val) => !val || val === '')) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setSubmitting(true);

    try {
      const { error: insertError } = await supabaseClient
        .from('medidas_aluno')
        .insert({
          aluno_id: userId,
          peso: parseFloat(formData.peso),
          peitoral: parseFloat(formData.torax),
          cintura: parseFloat(formData.cintura),
          braco_esquerdo: parseFloat(formData.braco_esq),
          braco_direito: parseFloat(formData.braco_dir),
          coxa_esquerda: parseFloat(formData.coxa_esq),
          coxa_direita: parseFloat(formData.coxa_dir),
          panturrilha_direita: parseFloat(formData.panturrilha),
          data_medicao: new Date().toISOString(),
        });

      if (insertError) {
        setError('Erro ao salvar medições: ' + insertError.message);
        setSubmitting(false);
        return;
      }

      setSuccess('Medições salvas com sucesso!');

      setFormData({
        peso: '',
        torax: '',
        cintura: '',
        braco_esq: '',
        braco_dir: '',
        coxa_esq: '',
        coxa_dir: '',
        panturrilha: '',
      });

      const { data: novasMedicoes, error: fetchError } = await supabaseClient
        .from('medidas_aluno')
        .select('*')
        .eq('aluno_id', userId)
        .order('data_medicao', { ascending: false });

      if (!fetchError && novasMedicoes) {
        setMedicoes(novasMedicoes);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao processar a solicitação');
    } finally {
      setSubmitting(false);
    }
  };

  const formatarData = (dataString: string) => {
    try {
      const data = new Date(dataString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(data);
    } catch {
      return dataString;
    }
  };

  const dadosGrafico = medicoes
    .slice()
    .reverse()
    .map((med) => ({
      data: formatarData(med.data_medicao),
      peso: med.peso,
    }));

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center p-6 gap-4">
        <Loader2 className="w-12 h-12 text-gold-light animate-spin" />
        <p className="text-[10px] text-text-secondary uppercase tracking-widest">Carregando evolução...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base p-4 md:p-6 lg:p-10 lg:pl-28 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div>
            <Link href="/aluno/dashboard" className="inline-flex items-center gap-2 text-gold-light text-[9px] md:text-[10px] uppercase tracking-widest mb-3 md:mb-4 hover:ml-1 transition-all">
              <ArrowLeft size={12} /> Painel de Controle
            </Link>
            <h1 className="text-3xl md:text-4xl text-text-primary tracking-tight mb-2">
              <span className="label-small">MEDIDAS</span><br/>
              Meu <span className="text-gold-light">Progresso</span>
            </h1>
            <p className="text-text-secondary font-medium text-sm">Seus números não mentem: acompanhe sua evolução real.</p>
          </div>

          {!loading && medicoes.length > 0 && (
            <div className="bg-bg-card px-5 md:px-8 py-4 md:py-5 rounded-2xl md:rounded-[32px] border border-border-subtle shadow-xl shadow-gold-default/10 flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gold-bg flex items-center justify-center text-gold-light">
                <TrendingUp size={20} />
              </div>
              <div>
                <span className="block text-[10px] text-text-secondary uppercase tracking-widest">Peso Atual</span>
                <span className="text-xl md:text-2xl text-text-primary">{medicoes[0].peso} kg</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
          
          {/* Form Side */}
          <div className="lg:col-span-1">
            <div className="bg-bg-card rounded-2xl md:rounded-[40px] shadow-2xl shadow-gold-default/5 p-8 md:p-12 border border-border-subtle sticky top-24 overflow-hidden">
              <h2 className="text-lg md:text-xl text-text-primary mb-6 md:mb-8 flex items-center gap-3">
                <Ruler className="text-gold-light w-5 h-5 md:w-6 md:h-6" /> Nova Medição
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-text-secondary uppercase tracking-widest ml-1">Peso (kg)</label>
                    <input
                      name="peso"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.peso}
                      onChange={handleInputChange}
                      className="input-field"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-text-secondary uppercase tracking-widest ml-1">Tórax (cm)</label>
                      <input
                        name="torax"
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={formData.torax}
                        onChange={handleInputChange}
                        className="input-field"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-text-secondary uppercase tracking-widest ml-1">Cintura (cm)</label>
                      <input
                        name="cintura"
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={formData.cintura}
                        onChange={handleInputChange}
                        className="input-field"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-text-secondary uppercase tracking-widest ml-1">Braco Esq (cm)</label>
                      <input
                        name="braco_esq"
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={formData.braco_esq}
                        onChange={handleInputChange}
                        className="input-field"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-text-secondary uppercase tracking-widest ml-1">Braco Dir (cm)</label>
                      <input
                        name="braco_dir"
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={formData.braco_dir}
                        onChange={handleInputChange}
                        className="input-field"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-text-secondary uppercase tracking-widest ml-1">Coxa Esq (cm)</label>
                      <input
                        name="coxa_esq"
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={formData.coxa_esq}
                        onChange={handleInputChange}
                        className="input-field"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-text-secondary uppercase tracking-widest ml-1">Coxa Dir (cm)</label>
                      <input
                        name="coxa_dir"
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={formData.coxa_dir}
                        onChange={handleInputChange}
                        className="input-field"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-text-secondary uppercase tracking-widest ml-1">Panturrilha (cm)</label>
                    <input
                      name="panturrilha"
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={formData.panturrilha}
                      onChange={handleInputChange}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="alert alert-danger flex items-center gap-3 text-xs uppercase tracking-tight">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                {success && (
                  <div className="alert alert-success flex items-center gap-3 text-xs uppercase tracking-tight">
                    <CheckCircle2 size={16} /> {success}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-primary flex items-center justify-center gap-3 px-6 py-3 md:py-4"
                >
                  {submitting ? <Loader2 className="animate-spin flex-shrink-0" size={18} /> : <Save size={18} className="flex-shrink-0" />}
                  <span>Salvar Resultados</span>
                </button>
              </form>
            </div>
          </div>

          {/* Records Side */}
          <div className="lg:col-span-2 space-y-12">
            {medicoes.length === 0 ? (
               <div className="bg-bg-card rounded-[40px] p-24 border border-border-subtle flex flex-col items-center justify-center text-center shadow-xl shadow-gold-default/5">
                  <div className="w-24 h-24 rounded-full bg-gold-default/10 flex items-center justify-center text-gold-light mb-8 border border-border-subtle shadow-inner">
                    <Ruler size={48} />
                  </div>
                  <h2 className="text-2xl text-text-primary mb-2">Sem histórico</h2>
                  <p className="text-text-secondary max-w-sm">Registre sua primeira medição ao lado para ver sua evolução aqui.</p>
               </div>
            ) : (
              medicoes.map((med, idx) => (
                <div key={med.id} className="bg-bg-card rounded-[40px] shadow-xl shadow-gold-default/5 border border-border-subtle overflow-hidden hover:border-gold-light/20 transition-colors">
                  <div className="px-10 py-6 border-b border-border-subtle bg-bg-elevated/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-bg-card border border-border-subtle flex items-center justify-center text-gold-light shadow-sm">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <span className="block text-sm text-text-primary">{formatarData(med.data_medicao)}</span>
                        <span className="text-[10px] text-text-secondary uppercase tracking-widest">{idx === 0 ?"ÚLTIMA ATUALIZAÇÃO" :"REGISTRO ANTERIOR"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-8">
                      <div className="space-y-2">
                        <span className="text-[9px] text-text-secondary uppercase tracking-[0.2em] block">Peso Corporal</span>
                        <div className="flex items-baseline gap-1">
                           <span className="text-4xl text-text-primary tracking-tight">{med.peso}</span>
                           <span className="text-xs text-text-secondary uppercase">kg</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] text-text-secondary uppercase tracking-[0.2em] block">Tórax</span>
                        <div className="flex items-baseline gap-1">
                           <span className="text-4xl text-text-primary tracking-tight">{med.peitoral}</span>
                           <span className="text-xs text-text-secondary uppercase">cm</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] text-text-secondary uppercase tracking-[0.2em] block">Cintura</span>
                        <div className="flex items-baseline gap-1">
                           <span className="text-4xl text-text-primary tracking-tight">{med.cintura}</span>
                           <span className="text-xs text-text-secondary uppercase">cm</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] text-text-secondary uppercase tracking-[0.2em] block">Panturrilha</span>
                        <div className="flex items-baseline gap-1">
                           <span className="text-4xl text-text-primary tracking-tight">{med.panturrilha_direita}</span>
                           <span className="text-xs text-text-secondary uppercase">cm</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] text-gold-light uppercase tracking-[0.2em] block">Braço (E / D)</span>
                        <div className="flex items-baseline gap-2">
                           <span className="text-2xl text-text-primary tracking-tight">{med.braco_esquerdo}</span>
                           <span className="text-sm text-text-disabled">/</span>
                           <span className="text-2xl text-text-primary tracking-tight">{med.braco_direito}</span>
                           <span className="text-xs text-text-secondary uppercase">cm</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[9px] text-gold-light uppercase tracking-[0.2em] block">Coxa (E / D)</span>
                        <div className="flex items-baseline gap-2">
                           <span className="text-2xl text-text-primary tracking-tight">{med.coxa_esquerda}</span>
                           <span className="text-sm text-text-disabled">/</span>
                           <span className="text-2xl text-text-primary tracking-tight">{med.coxa_direita}</span>
                           <span className="text-xs text-text-secondary uppercase">cm</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
