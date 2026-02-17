'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface Medicao {
  id: string;
  peso: number;
  torax: number;
  cintura: number;
  braco_esq: number;
  braco_dir: number;
  coxa_esq: number;
  coxa_dir: number;
  panturrilha: number;
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

  // Buscar dados ao montar
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

        // Buscar medições do usuário
        const { data: medicoesData, error: medicoesError } = await supabaseClient
          .from('medidas')
          .select('*')
          .eq('user_id', authData.user.id)
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

    // Validar que todos os campos estão preenchidos
    if (Object.values(formData).some((val) => !val || val === '')) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setSubmitting(true);

    try {
      const { error: insertError } = await supabaseClient
        .from('medidas')
        .insert({
          user_id: userId,
          peso: parseFloat(formData.peso),
          torax: parseFloat(formData.torax),
          cintura: parseFloat(formData.cintura),
          braco_esq: parseFloat(formData.braco_esq),
          braco_dir: parseFloat(formData.braco_dir),
          coxa_esq: parseFloat(formData.coxa_esq),
          coxa_dir: parseFloat(formData.coxa_dir),
          panturrilha: parseFloat(formData.panturrilha),
          data_medicao: new Date().toISOString(),
        });

      if (insertError) {
        setError('Erro ao salvar medições: ' + insertError.message);
        setSubmitting(false);
        return;
      }

      setSuccess('Medições salvas com sucesso!');

      // Limpar formulário
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

      // Recarregar medições
      const { data: novasMedicoes, error: fetchError } = await supabaseClient
        .from('medidas')
        .select('*')
        .eq('user_id', userId)
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

  // Preparar dados para o gráfico
  const dadosGrafico = medicoes
    .slice()
    .reverse()
    .map((med) => ({
      data: formatarData(med.data_medicao),
      peso: med.peso,
      dataCompleta: med.data_medicao,
    }));

  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const onResize = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const ticksToShow = isMobile ? 4 : 8;
  const tickInterval = dadosGrafico.length > 0 ? Math.max(0, Math.floor(dadosGrafico.length / ticksToShow)) : 0;

  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null;
    const peso = payload[0]?.value;
    return (
      <div style={{ background: '#0b0b0b', border: '1px solid #D4AF37', padding: 8, borderRadius: 8, color: '#fff', fontSize: 13 }}>
        <div style={{ fontWeight: 700, color: '#D4AF37', marginBottom: 4 }}>{label}</div>
        <div>{peso?.toFixed ? `${peso.toFixed(1)} kg` : `${peso} kg`}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coach-black p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Minhas Medidas</h1>
          <p className="text-gray-400">Acompanhe sua evolução corporal</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <svg className="w-12 h-12 animate-spin text-coach-gold mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-gray-400">Carregando...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded-lg text-green-400">
            ✓ {success}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Form Container */}
            <div className="card-glass mb-12">
              <h2 className="text-2xl font-semibold text-white mb-8">Registrar Medições</h2>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Peso */}
                <div>
                  <label htmlFor="peso" className="block text-sm font-medium text-gray-300 mb-2">
                    <span className="flex items-center gap-2">
                      <span>⚖️</span>
                      Peso (kg)
                    </span>
                  </label>
                  <input
                    id="peso"
                    type="number"
                    name="peso"
                    step="0.1"
                    value={formData.peso}
                    onChange={handleInputChange}
                    placeholder="70.5"
                    disabled={submitting}
                    className="w-full px-4 py-3 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:ring-1 focus:ring-coach-gold transition disabled:opacity-50"
                    required
                  />
                </div>

                {/* Grid com 2 colunas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tórax */}
                  <div>
                    <label htmlFor="torax" className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <span>💪</span>
                        Tórax (cm)
                      </span>
                    </label>
                    <input
                      id="torax"
                      type="number"
                      name="torax"
                      step="0.1"
                      value={formData.torax}
                      onChange={handleInputChange}
                      placeholder="95.0"
                      disabled={submitting}
                      className="w-full px-4 py-3 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:ring-1 focus:ring-coach-gold transition disabled:opacity-50"
                      required
                    />
                  </div>

                  {/* Cintura */}
                  <div>
                    <label htmlFor="cintura" className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <span>📏</span>
                        Cintura (cm)
                      </span>
                    </label>
                    <input
                      id="cintura"
                      type="number"
                      name="cintura"
                      step="0.1"
                      value={formData.cintura}
                      onChange={handleInputChange}
                      placeholder="80.0"
                      disabled={submitting}
                      className="w-full px-4 py-3 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:ring-1 focus:ring-coach-gold transition disabled:opacity-50"
                      required
                    />
                  </div>

                  {/* Braço Esquerdo */}
                  <div>
                    <label htmlFor="braco_esq" className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <span>🦾</span>
                        Braço Esq. (cm)
                      </span>
                    </label>
                    <input
                      id="braco_esq"
                      type="number"
                      name="braco_esq"
                      step="0.1"
                      value={formData.braco_esq}
                      onChange={handleInputChange}
                      placeholder="32.0"
                      disabled={submitting}
                      className="w-full px-4 py-3 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:ring-1 focus:ring-coach-gold transition disabled:opacity-50"
                      required
                    />
                  </div>

                  {/* Braço Direito */}
                  <div>
                    <label htmlFor="braco_dir" className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <span>💪</span>
                        Braço Dir. (cm)
                      </span>
                    </label>
                    <input
                      id="braco_dir"
                      type="number"
                      name="braco_dir"
                      step="0.1"
                      value={formData.braco_dir}
                      onChange={handleInputChange}
                      placeholder="32.5"
                      disabled={submitting}
                      className="w-full px-4 py-3 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:ring-1 focus:ring-coach-gold transition disabled:opacity-50"
                      required
                    />
                  </div>

                  {/* Coxa Esquerda */}
                  <div>
                    <label htmlFor="coxa_esq" className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <span>🦵</span>
                        Coxa Esq. (cm)
                      </span>
                    </label>
                    <input
                      id="coxa_esq"
                      type="number"
                      name="coxa_esq"
                      step="0.1"
                      value={formData.coxa_esq}
                      onChange={handleInputChange}
                      placeholder="55.0"
                      disabled={submitting}
                      className="w-full px-4 py-3 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:ring-1 focus:ring-coach-gold transition disabled:opacity-50"
                      required
                    />
                  </div>

                  {/* Coxa Direita */}
                  <div>
                    <label htmlFor="coxa_dir" className="block text-sm font-medium text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <span>🦵</span>
                        Coxa Dir. (cm)
                      </span>
                    </label>
                    <input
                      id="coxa_dir"
                      type="number"
                      name="coxa_dir"
                      step="0.1"
                      value={formData.coxa_dir}
                      onChange={handleInputChange}
                      placeholder="55.5"
                      disabled={submitting}
                      className="w-full px-4 py-3 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:ring-1 focus:ring-coach-gold transition disabled:opacity-50"
                      required
                    />
                  </div>
                </div>

                {/* Panturrilha */}
                <div>
                  <label htmlFor="panturrilha" className="block text-sm font-medium text-gray-300 mb-2">
                    <span className="flex items-center gap-2">
                      <span>🦶</span>
                      Panturrilha (cm)
                    </span>
                  </label>
                  <input
                    id="panturrilha"
                    type="number"
                    name="panturrilha"
                    step="0.1"
                    value={formData.panturrilha}
                    onChange={handleInputChange}
                    placeholder="38.0"
                    disabled={submitting}
                    className="w-full px-4 py-3 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:ring-1 focus:ring-coach-gold transition disabled:opacity-50"
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 font-semibold text-black rounded bg-linear-to-r from-coach-gold to-coach-gold-dark hover:from-coach-gold-dark hover:to-coach-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Salvando...
                    </span>
                  ) : (
                    'Salvar Medições'
                  )}
                </button>
              </form>
            </div>

            {/* Gráfico - Aparece apenas se houver mais de uma medição */}
            {medicoes.length > 1 && (
              <div className="card-glass">
                <h2 className="text-2xl font-semibold text-white mb-8">Evolução do Peso</h2>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dadosGrafico} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradPeso" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.18} />
                          <stop offset="60%" stopColor="#D4AF37" stopOpacity={0.06} />
                          <stop offset="100%" stopColor="#D4AF37" stopOpacity={0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.03} />

                      <XAxis
                        dataKey="data"
                        stroke="#BDBDBD"
                        tick={{ fontSize: isMobile ? 10 : 12, fill: '#BDBDBD' }}
                        interval={tickInterval}
                        minTickGap={8}
                      />

                      <YAxis
                        stroke="#BDBDBD"
                        tick={{ fontSize: isMobile ? 10 : 12, fill: '#BDBDBD' }}
                        domain={["dataMin - 2", "dataMax + 2"]}
                        allowDataOverflow={false}
                      />

                      <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />

                      <Area
                        type="monotone"
                        dataKey="peso"
                        stroke="#D4AF37"
                        strokeWidth={2}
                        fill="url(#gradPeso)"
                        dot={{ fill: '#D4AF37', r: isMobile ? 3 : 4 }}
                        activeDot={{ r: isMobile ? 5 : 6 }}
                        isAnimationActive={true}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Última Medição Info */}
            {medicoes.length > 0 && (
              <div className="mt-8 card-glass">
                <p className="text-gray-300">
                  <span className="text-coach-gold font-semibold">Última medição:</span>{' '}
                  {formatarData(medicoes[0].data_medicao)} • Peso: {medicoes[0].peso} kg
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
