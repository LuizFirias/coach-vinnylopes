'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Instagram, Calculator, FileText, Ruler, User, ChevronRight, ArrowLeft, Printer, Trash2, Save, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import { getTodayBrazil } from '@/lib/dateUtils';

// --- Tipagens ---
type Sex = 'male' | 'female';

interface FormData {
  studentName: string;
  sex: Sex;
  age: string;
  weight: string;
  height: string;
  neck: string;
  waist: string;
  hip: string;
}

interface Results {
  bodyFat: number | null;
  fatMass: number | null;
  leanMass: number | null;
  classification: string;
}

// --- Funções Auxiliares ---
const parseNumber = (value: string) => {
  if (!value) return 0;
  return Number(value.toString().replace(',', '.'));
};

const formatPercent = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const formatKg = (value: number) =>
  `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;

function classifyBodyFat(percent: number, sex: Sex) {
  if (sex === 'female') {
    if (percent < 10) return "Abaixo da gordura essencial";
    if (percent <= 13) return "Gordura essencial";
    if (percent <= 20) return "Atletas";
    if (percent <= 24) return "Fitness";
    if (percent <= 31) return "Média";
    return "Obeso";
  }
  if (percent < 2) return "Abaixo da gordura essencial";
  if (percent <= 5) return "Gordura essencial";
  if (percent <= 13) return "Atletas";
  if (percent <= 17) return "Fitness";
  if (percent <= 24) return "Média";
  return "Obeso";
}

function calculateBodyFat(data: { sex: Sex; height: number; neck: number; waist: number; hip: number }) {
  const { sex, height, neck, waist, hip } = data;
  const log10 = Math.log10;

  if (sex === "female") {
    const circumference = waist + hip - neck;
    if (circumference <= 0) return null;
    return 495 / (1.29579 - 0.35004 * log10(circumference) + 0.221 * log10(height)) - 450;
  }

  const circumference = waist - neck;
  if (circumference <= 0) return null;
  return 495 / (1.0324 - 0.19077 * log10(circumference) + 0.15456 * log10(height)) - 450;
}

export default function CalculatorPage() {
  const [session, setSession] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    studentName: '',
    sex: 'male',
    age: '',
    weight: '',
    height: '',
    neck: '',
    waist: '',
    hip: ''
  });

  const [results, setResults] = useState<Results>({
    bodyFat: null,
    fatMass: null,
    leanMass: null,
    classification: '--'
  });

  const [error, setError] = useState('');

  // Verificar sessão ao carregar
  useEffect(() => {
    async function checkSession() {
      const s = await getSafeSession();
      setSession(s);
      
      // Se tiver sessão, preenche o nome automaticamente se estiver vazio
      if (s?.user?.user_metadata?.full_name && !formData.studentName) {
        setFormData(prev => ({ ...prev, studentName: s.user.user_metadata.full_name }));
      }
    }
    checkSession();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSexChange = (sex: Sex) => {
    setFormData(prev => ({ ...prev, sex }));
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaveSuccess(false);

    const data = {
      name: formData.studentName.trim(),
      sex: formData.sex,
      age: parseNumber(formData.age),
      weight: parseNumber(formData.weight),
      height: parseNumber(formData.height),
      neck: parseNumber(formData.neck),
      waist: parseNumber(formData.waist),
      hip: parseNumber(formData.hip),
    };

    const requiredValues = [data.age, data.weight, data.height, data.neck, data.waist];
    if (data.sex === 'female') requiredValues.push(data.hip);

    if (!data.name || requiredValues.some(v => !Number.isFinite(v) || v <= 0)) {
      setError('Preencha todos os campos obrigatórios com valores válidos.');
      return;
    }

    const bodyFat = calculateBodyFat(data);

    if (bodyFat === null || !Number.isFinite(bodyFat) || bodyFat <= 0 || bodyFat > 75) {
      setError('Confira as medidas informadas. A fórmula não gerou um resultado plausível.');
      return;
    }

    const fatMass = data.weight * (bodyFat / 100);
    const leanMass = data.weight - fatMass;

    setResults({
      bodyFat,
      fatMass,
      leanMass,
      classification: classifyBodyFat(bodyFat, data.sex)
    });
  };

  const handleSaveToHistory = async () => {
    if (!session?.user?.id || !results.bodyFat) return;
    
    setSaving(true);
    setError('');
    
    try {
      const payload = {
        aluno_id: session.user.id,
        data_medicao: getTodayBrazil(),
        peso: parseNumber(formData.weight),
        altura: parseNumber(formData.height),
        gordura_corporal: parseFloat(results.bodyFat.toFixed(1)),
        massa_magra: parseFloat(results.leanMass?.toFixed(1) || '0'),
        pescoco: parseNumber(formData.neck),
        cintura: parseNumber(formData.waist),
        quadril: formData.sex === 'female' ? parseNumber(formData.hip) : null,
      };

      const { error: saveError } = await supabaseClient
        .from('medidas_aluno')
        .insert(payload);

      if (saveError) throw saveError;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      console.error('[CALCULADORA] Erro ao salvar:', err);
      setError('Erro ao salvar no histórico. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setFormData({
      studentName: session?.user?.user_metadata?.full_name || '',
      sex: 'male',
      age: '',
      weight: '',
      height: '',
      neck: '',
      waist: '',
      hip: ''
    });
    setResults({
      bodyFat: null,
      fatMass: null,
      leanMass: null,
      classification: '--'
    });
    setError('');
    setSaveSuccess(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="min-h-screen bg-[#050505] text-[#f6f0e4] font-sans selection:bg-[#d6ac56]/30">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none opacity-20" 
           style={{ 
             backgroundImage: 'linear-gradient(90deg, rgba(214, 172, 86, 0.05) 1px, transparent 1px), linear-gradient(180deg, rgba(214, 172, 86, 0.04) 1px, transparent 1px)',
             backgroundSize: '42px 42px'
           }} 
      />
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-[#d6ac56]/10 blur-[120px] rounded-full" />
        <div className="absolute top-[10%] right-[0%] w-[40%] h-[40%] bg-[#f0cf7a]/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-[1180px] mx-auto px-4 py-10 md:py-16">
        {/* Header */}
        <header className="mb-12 print:hidden">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative w-20 h-20 md:w-24 md:h-24 border border-[#f0cf7a]/40 rounded-xl overflow-hidden shadow-2xl shadow-[#d6ac56]/20">
              <Image 
                src="/logo.png" 
                alt="Vinny Lopes Coach" 
                fill 
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-[0.7rem] md:text-[0.78rem] font-black tracking-[0.2em] uppercase text-[#f0cf7a] mb-1">Vinny Lopes Coach</p>
              <a 
                href="https://www.instagram.com/vinnyloppes" 
                target="_blank" 
                rel="noopener"
                className="text-[#f0cf7a] font-bold text-sm border-b border-[#f0cf7a]/30 hover:border-[#f0cf7a] transition-all flex items-center gap-1.5 w-fit"
              >
                <Instagram size={14} />
                @vinnyloppes
              </a>
            </div>
          </div>

          <h1 className="text-4xl md:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tight mb-6">
            Calculadora de <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d6ac56] via-[#f0cf7a] to-[#8e6a2d]">percentual de gordura</span>
          </h1>

          <p className="text-lg md:text-xl text-[#a9a194] max-w-2xl leading-relaxed mb-8">
            Estimativa pelo método <span className="text-[#f6f0e4] font-semibold">US Navy</span> com relatório profissional pronto para acompanhamento físico e evolução.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            {[
              { label: 'Metodologia', value: 'US Navy (Métrico)', icon: Calculator },
              { label: 'Classificação', value: 'Padrão ACE', icon: FileText },
              { label: 'Relatório', value: 'Exportação PDF/Print', icon: Ruler }
            ].map((stat, i) => (
              <div key={i} className="bg-[#101010]/60 border border-[#d6ac56]/20 backdrop-blur-md p-4 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#d6ac56]/10 flex items-center justify-center text-[#d6ac56]">
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className="text-[0.65rem] uppercase tracking-wider text-[#a9a194] font-bold">{stat.label}</p>
                  <p className="text-sm font-bold text-[#f6f0e4]">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr,0.75fr] gap-6 items-start">
          {/* Form Card */}
          <section className="bg-[#101010]/80 border border-[#d6ac56]/20 backdrop-blur-2xl rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden print:hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#f0cf7a]/40 to-transparent" />
            
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[#f0cf7a] font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <User size={16} />
                Dados da Avaliação
              </h2>
              <span className="text-[#a9a194] text-xs font-medium">Medidas em centímetros</span>
            </div>

            <form onSubmit={handleCalculate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[#a9a194] text-xs font-bold uppercase tracking-wider mb-2">Nome do Aluno</label>
                <input 
                  type="text" 
                  name="studentName"
                  value={formData.studentName}
                  onChange={handleInputChange}
                  placeholder="Ex: Ana Souza"
                  className="w-full bg-[#090909] border border-white/10 rounded-xl px-4 py-3.5 focus:border-[#d6ac56] focus:ring-4 focus:ring-[#d6ac56]/10 outline-none transition-all placeholder:text-[#444]"
                />
              </div>

              <div>
                <label className="block text-[#a9a194] text-xs font-bold uppercase tracking-wider mb-2">Sexo</label>
                <div className="bg-[#090909] border border-white/10 rounded-xl p-1 flex gap-1">
                  {(['male', 'female'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSexChange(s)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        formData.sex === s 
                        ? 'bg-gradient-to-br from-[#f0cf7a] to-[#d6ac56] text-[#0a0a0a]' 
                        : 'text-[#a9a194] hover:text-[#f6f0e4]'
                      }`}
                    >
                      {s === 'male' ? 'Homem' : 'Mulher'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[#a9a194] text-xs font-bold uppercase tracking-wider mb-2">Idade</label>
                <input 
                  type="number" 
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="30"
                  className="w-full bg-[#090909] border border-white/10 rounded-xl px-4 py-3.5 focus:border-[#d6ac56] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[#a9a194] text-xs font-bold uppercase tracking-wider mb-2">Peso (kg)</label>
                <input 
                  type="text" 
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  placeholder="82,5"
                  className="w-full bg-[#090909] border border-white/10 rounded-xl px-4 py-3.5 focus:border-[#d6ac56] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[#a9a194] text-xs font-bold uppercase tracking-wider mb-2">Altura (cm)</label>
                <input 
                  type="text" 
                  name="height"
                  value={formData.height}
                  onChange={handleInputChange}
                  placeholder="178"
                  className="w-full bg-[#090909] border border-white/10 rounded-xl px-4 py-3.5 focus:border-[#d6ac56] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[#a9a194] text-xs font-bold uppercase tracking-wider mb-2">Pescoço (cm)</label>
                <input 
                  type="text" 
                  name="neck"
                  value={formData.neck}
                  onChange={handleInputChange}
                  placeholder="39"
                  className="w-full bg-[#090909] border border-white/10 rounded-xl px-4 py-3.5 focus:border-[#d6ac56] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[#a9a194] text-xs font-bold uppercase tracking-wider mb-2">Cintura (cm)</label>
                <input 
                  type="text" 
                  name="waist"
                  value={formData.waist}
                  onChange={handleInputChange}
                  placeholder="88"
                  className="w-full bg-[#090909] border border-white/10 rounded-xl px-4 py-3.5 focus:border-[#d6ac56] outline-none transition-all"
                />
              </div>

              {formData.sex === 'female' && (
                <div>
                  <label className="block text-[#a9a194] text-xs font-bold uppercase tracking-wider mb-2">Quadril (cm)</label>
                  <input 
                    type="text" 
                    name="hip"
                    value={formData.hip}
                    onChange={handleInputChange}
                    placeholder="102"
                    className="w-full bg-[#090909] border border-white/10 rounded-xl px-4 py-3.5 focus:border-[#d6ac56] outline-none transition-all"
                  />
                </div>
              )}

              {error && (
                <div className="md:col-span-2 text-red-400 text-sm font-bold bg-red-400/10 border border-red-400/20 p-4 rounded-xl">
                  {error}
                </div>
              )}

              <div className="md:col-span-2 flex flex-wrap gap-3 mt-4">
                <button 
                  type="submit"
                  className="bg-gradient-to-br from-[#f0cf7a] to-[#d6ac56] text-[#0a0a0a] font-black px-8 py-4 rounded-xl flex-1 md:flex-none hover:brightness-110 transition-all shadow-xl shadow-[#d6ac56]/20 flex items-center justify-center gap-2"
                >
                  CALCULAR RESULTADO
                  <ChevronRight size={18} />
                </button>

                {/* Botão de Salvar no Histórico (Apenas para Alunos Logados) */}
                {session && results.bodyFat && (
                  <button 
                    type="button"
                    onClick={handleSaveToHistory}
                    disabled={saving || saveSuccess}
                    className={`font-bold px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-2 flex-1 md:flex-none ${
                      saveSuccess 
                      ? 'bg-green-500/20 border border-green-500/40 text-green-400' 
                      : 'bg-[#d6ac56]/10 border border-[#d6ac56]/30 text-[#f0cf7a] hover:bg-[#d6ac56]/20'
                    }`}
                  >
                    {saving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : saveSuccess ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <Save size={18} />
                    )}
                    {saveSuccess ? 'SALVO COM SUCESSO!' : 'SALVAR NO MEU PERFIL'}
                  </button>
                )}

                <button 
                  type="button"
                  onClick={handleClear}
                  className="bg-white/5 border border-white/10 text-[#f6f0e4] font-bold px-6 py-4 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  LIMPAR
                </button>
                <button 
                  type="button"
                  onClick={handlePrint}
                  className="bg-white/5 border border-white/10 text-[#f6f0e4] font-bold px-6 py-4 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={18} />
                  PDF / IMPRIMIR
                </button>
              </div>
            </form>
          </section>

          {/* Result Card */}
          <section className="bg-gradient-to-b from-[#151515] to-[#0a0a0a] border border-[#d6ac56]/30 backdrop-blur-2xl rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden sticky top-6 print:static print:min-h-screen print:border-none print:p-0 print:bg-transparent">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#f0cf7a]/60 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(214,172,86,0.15),transparent_70%)] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#d6ac56]/20">
                <div className="relative w-16 h-16 border border-[#f0cf7a]/30 rounded-lg overflow-hidden shrink-0">
                  <Image src="/logo.png" alt="Vinny Lopes Coach" fill className="object-cover" />
                </div>
                <div>
                  <p className="text-sm font-black text-[#f6f0e4]">Vinny Lopes Coach</p>
                  <p className="text-[#f0cf7a] font-bold text-xs">@vinnyloppes</p>
                </div>
              </div>

              <div className="flex justify-between items-end mb-8">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-widest text-[#a9a194] font-black mb-1">RELATÓRIO PARA</p>
                  <h3 className="text-2xl font-black text-[#f0cf7a]">{formData.studentName || 'ALUNO'}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[0.65rem] uppercase tracking-widest text-[#a9a194] font-black mb-1">DATA</p>
                  <p className="text-sm font-bold">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="bg-[#090909] border border-[#d6ac56]/30 rounded-2xl p-8 mb-6 relative group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(214,172,86,0.1),transparent_70%)]" />
                <div className="relative z-10 flex flex-col items-center">
                  <p className="text-[0.7rem] uppercase tracking-[0.3em] text-[#a9a194] font-black mb-2">PERCENTUAL DE GORDURA</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-6xl md:text-8xl font-black text-[#f6f0e4] drop-shadow-2xl">
                      {results.bodyFat ? formatPercent(results.bodyFat) : '--'}
                    </span>
                    <span className="text-2xl font-black text-[#d6ac56]">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 border border-white/5 rounded-xl p-5">
                  <p className="text-[0.6rem] uppercase tracking-widest text-[#a9a194] font-black mb-2">MASSA GORDA</p>
                  <p className="text-xl font-black text-[#f0cf7a]">{results.fatMass ? formatKg(results.fatMass) : '--'}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-5">
                  <p className="text-[0.6rem] uppercase tracking-widest text-[#a9a194] font-black mb-2">MASSA MAGRA</p>
                  <p className="text-xl font-black text-[#f0cf7a]">{results.leanMass ? formatKg(results.leanMass) : '--'}</p>
                </div>
                <div className="col-span-2 bg-white/5 border border-white/5 rounded-xl p-5">
                  <p className="text-[0.6rem] uppercase tracking-widest text-[#a9a194] font-black mb-2">CLASSIFICAÇÃO ACE</p>
                  <p className="text-xl font-black text-[#f0cf7a]">{results.classification}</p>
                </div>
              </div>

              <p className="text-[0.75rem] text-[#a9a194] leading-relaxed mb-8 italic text-center px-4">
                "Este resultado é uma estimativa baseada em fórmulas matemáticas e deve ser utilizado para acompanhamento de evolução física."
              </p>

              <div className="pt-6 border-t border-[#d6ac56]/20 text-center">
                <p className="text-xs font-bold mb-4">Acompanhe mais resultados no Instagram:</p>
                <a href="https://www.instagram.com/vinnyloppes" target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-[#f0cf7a] font-black text-sm hover:scale-105 transition-transform">
                  <Instagram size={18} />
                  @vinnyloppes
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Reference Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 print:hidden">
          <article className="bg-[#101010]/60 border border-white/5 backdrop-blur-md p-8 rounded-2xl">
            <h2 className="text-lg font-black text-[#f0cf7a] uppercase tracking-widest mb-6 flex items-center gap-3">
              <FileText size={20} />
              Classificação ACE
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[#a9a194] border-b border-white/10">
                    <th className="pb-4 font-black">DESCRIÇÃO</th>
                    <th className="pb-4 font-black">MULHERES</th>
                    <th className="pb-4 font-black">HOMENS</th>
                  </tr>
                </thead>
                <tbody className="text-[#f6f0e4]">
                  {[
                    ['Gordura essencial', '10-13%', '2-5%'],
                    ['Atletas', '14-20%', '6-13%'],
                    ['Fitness', '21-24%', '14-17%'],
                    ['Média', '25-31%', '18-24%'],
                    ['Obeso', '32% ou mais', '25% ou mais']
                  ].map(([label, female, male], i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-4 font-medium">{label}</td>
                      <td className="py-4 text-[#a9a194] font-bold">{female}</td>
                      <td className="py-4 text-[#a9a194] font-bold">{male}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="bg-[#101010]/60 border border-white/5 backdrop-blur-md p-8 rounded-2xl">
            <h2 className="text-lg font-black text-[#f0cf7a] uppercase tracking-widest mb-6 flex items-center gap-3">
              <Ruler size={20} />
              Protocolo de Medição
            </h2>
            <div className="space-y-4 text-[#a9a194] leading-relaxed text-sm">
              <p>
                <strong className="text-[#f6f0e4]">Cintura:</strong> Meça na altura do umbigo sem contrair o abdômen. Use uma fita métrica flexível.
              </p>
              <p>
                <strong className="text-[#f6f0e4]">Pescoço:</strong> Meça logo abaixo da laringe (pomo de Adão), com a fita levemente inclinada para frente.
              </p>
              <p>
                <strong className="text-[#f6f0e4]">Quadril (Mulheres):</strong> Meça na maior circunferência horizontal da região glútea.
              </p>
              <p className="bg-[#d6ac56]/5 border-l-4 border-[#d6ac56] p-4 text-[#f6f0e4] font-medium rounded-r-lg mt-6">
                Para resultados consistentes, realize as medidas sempre no mesmo horário, preferencialmente ao acordar em jejum.
              </p>
            </div>
          </article>
        </section>

        {/* Footer */}
        <footer className="mt-20 pt-10 border-t border-white/5 text-center print:hidden">
          <Link href="/" className="inline-flex items-center gap-2 text-[#a9a194] hover:text-[#f0cf7a] transition-all font-bold text-sm">
            <ArrowLeft size={16} />
            Voltar para o App
          </Link>
          <p className="mt-6 text-[0.65rem] text-[#444] uppercase tracking-[0.3em] font-black">
            © 2026 VINNY LOPES COACH • HIGH PERFORMANCE SYSTEM
          </p>
        </footer>
      </div>
    </main>
  );
}
