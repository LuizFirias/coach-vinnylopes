"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";

interface Profile {
  id: string;
  nome: string;
  email?: string;
  frequencia_treino?: number;
  status?: string | null;
}

interface Foto {
  id: string;
  tipo: string;
  url_foto: string;
  data_upload: string;
}

export default function AdminAlunoPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [medidas, setMedidas] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setError(null);
    try {
      const { data: prof } = await supabaseClient.from("profiles").select("*").eq("id", id).single();
      setProfile(prof as Profile);

      const { data: fotosData } = await supabaseClient
        .from("fotos_evolucao")
        .select("id, tipo, url_foto, data_upload")
        .eq("user_id", id)
        .order("data_upload", { ascending: false })
        .limit(10);
      setFotos((fotosData as Foto[]) || []);

      const { data: medidasData } = await supabaseClient
        .from("medidas")
        .select("id, peso, data_medicao")
        .eq("user_id", id)
        .order("data_medicao", { ascending: true });
      setMedidas(medidasData || []);
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPdfFile(f);
  };

  const handleUploadPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) return setError("Selecione um arquivo PDF");
    setUploading(true);
    setError(null);
    try {
      const fileName = `${id}_${Date.now()}_${pdfFile.name}`;
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from("treinos-pdf")
        .upload(fileName, pdfFile, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabaseClient.storage.from("treinos-pdf").getPublicUrl(fileName);
      const urlPdf = publicUrlData.publicUrl;

      const { error: dbError } = await supabaseClient.from("treinos_alunos").insert({
        aluno_id: id,
        url_pdf: urlPdf,
        nome_arquivo: pdfFile.name,
        data_upload: new Date().toISOString(),
      });
      if (dbError) throw dbError;

      setPdfFile(null);
      await load();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setUploading(false);
    }
  };

  const toggleStatus = async () => {
    if (!profile) return;
    const next = profile.status === "inadimplente" ? null : "inadimplente";
    try {
      const { error } = await supabaseClient.from("profiles").update({ status: next }).eq("id", id);
      if (error) throw error;
      setProfile({ ...profile, status: next });
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  };

  // Renewal modal
  const [showRenew, setShowRenew] = useState(false);
  const [renewDate, setRenewDate] = useState<string | null>(null);
  const [savingRenew, setSavingRenew] = useState(false);

  const setQuick = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const isoDate = d.toISOString().slice(0, 10);
    setRenewDate(isoDate);
  };

  const handleSaveRenew = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!renewDate) return setError('Selecione uma data de expiração');
    setSavingRenew(true);
    setError(null);
    try {
      const iso = new Date(renewDate).toISOString();
      const { error } = await supabaseClient
        .from('profiles')
        .update({ data_expiracao: iso, status_pagamento: 'pago' })
        .eq('id', id);
      if (error) throw error;
      await load();
      setShowRenew(false);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setSavingRenew(false);
    }
  };

  return (
    <div className="min-h-screen bg-coach-black p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Perfil do Aluno</h1>
            <p className="text-gray-400">Gerencie uploads, status e visualize evolução</p>
          </div>
          <button onClick={() => router.back()} className="px-4 py-2 text-white border border-gray-700 rounded">Voltar</button>
        </div>

        {/* Renewal Modal */}
        {showRenew && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setShowRenew(false)} />
            <div className="relative max-w-md w-full">
              <div className="card-glass">
                <h3 className="text-lg font-semibold text-white mb-4">Renovação de Plano</h3>
                <form onSubmit={(e) => handleSaveRenew(e)} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Data de Expiração</label>
                    <input
                      type="date"
                      value={renewDate ?? ''}
                      onChange={(e) => setRenewDate(e.target.value)}
                      className="w-full px-3 py-2 bg-coach-black border border-gray-700 rounded text-white"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setQuick(30)} className="px-3 py-2 btn-glass">Mensal (+30d)</button>
                    <button type="button" onClick={() => setQuick(90)} className="px-3 py-2 btn-glass">Trimestral (+90d)</button>
                    <button type="button" onClick={() => setQuick(365)} className="px-3 py-2 btn-glass">Anual (+365d)</button>
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button type="button" onClick={() => setShowRenew(false)} className="px-4 py-2 btn-glass">Cancelar</button>
                    <button type="submit" disabled={savingRenew} className="px-4 py-2 bg-linear-to-r from-coach-gold to-coach-gold-dark text-black font-semibold rounded">
                      {savingRenew ? 'Salvando...' : 'Salvar Renovação'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {error && <div className="mb-4 text-red-400">{error}</div>}

        {profile && (
          <div className="mb-6 card-glass">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-semibold text-lg">{profile.nome}</div>
                  <div className="text-sm text-gray-300">Frequência: <span className="text-coach-gold font-semibold">{profile.frequencia_treino ?? 0}</span></div>
                  {(
                    (profile as any).data_expiracao
                  ) && (
                    <div className="text-sm mt-1">
                      <span className="text-gray-300">Acesso VIP até:</span>{' '}
                      <span className="text-white font-semibold">{new Date((profile as any).data_expiracao).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-300">Status: <span className="text-coach-gold">{profile.status ?? 'ativo'}</span></div>
                  <button onClick={toggleStatus} className="px-4 py-2 bg-linear-to-r from-coach-gold to-coach-gold-dark text-black rounded">
                    {profile.status === 'inadimplente' ? 'Marcar Ativo' : 'Marcar Inadimplente'}
                  </button>

                  <button onClick={() => setShowRenew(true)} className="px-4 py-2 bg-linear-to-r from-coach-gold to-coach-gold-dark text-black rounded">
                    Renovar Plano
                  </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload PDF */}
        <div className="mb-8 card-glass">
          <h3 className="text-white font-semibold mb-4">Enviar PDF de Treino para este aluno</h3>
          <form onSubmit={handleUploadPdf} className="flex gap-3">
            <input type="file" accept="application/pdf" onChange={handlePdfChange} className="bg-coach-black text-white" />
            <button type="submit" disabled={uploading} className="px-4 py-2 bg-linear-to-r from-coach-gold to-coach-gold-dark text-black rounded">
              {uploading ? 'Enviando...' : 'Fazer Upload'}
            </button>
          </form>
        </div>

        {/* Fotos recentes */}
        <div className="mb-8">
          <h4 className="text-white font-semibold mb-4">Fotos Recentes</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fotos.map((f) => (
              <div key={f.id} className="card-glass overflow-hidden">
                <div className="relative aspect-video bg-black">
                  <img src={f.url_foto} alt={f.tipo} className="w-full h-full object-cover" />
                </div>
                <div className="p-3 text-gray-300 text-sm">{f.tipo} • {new Date(f.data_upload).toLocaleString('pt-BR')}</div>
              </div>
            ))}
            {fotos.length === 0 && <div className="text-gray-400">Nenhuma foto encontrada.</div>}
          </div>
        </div>

        {/* Gráfico de peso */}
        <div className="mb-8 bg-coach-gray rounded-lg p-6 border border-coach-gold/10">
          <h4 className="text-white font-semibold mb-4">Evolução de Peso</h4>
          {medidas.length > 1 ? (
            <div style={{ width: '100%', height: 300 }}>
              {/* lightweight inline chart using recharts */}
              <iframe title="chart-placeholder" style={{ width: '100%', height: 300, border: 'none', background: '#121212' }} />
            </div>
          ) : (
            <p className="text-gray-400">Mais de uma medição necessária para visualizar o gráfico.</p>
          )}
        </div>
      </div>
    </div>
  );
}
