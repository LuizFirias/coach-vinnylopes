'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getPublicStorageUrl } from '@/lib/storageUrls';
import {
  Plus, Tag, ArrowSquareOut, Image, X, WarningCircle, ShoppingBag, PencilSimple, Trash, CircleNotch,
} from '@phosphor-icons/react';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { cn } from '@/lib/utils/cn';

interface Parceiro {
  id: string;
  nome_marca: string;
  descricao: string;
  cupom: string;
  link_desconto: string;
  logo_url?: string | null;
  imagens?: string[] | null;
}

// ─── Shared form fields ───────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary ml-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full h-12 bg-surface-0 border border-border-subtle text-text-primary px-4 rounded-xl text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors";
const textareaCls = "w-full bg-surface-0 border border-border-subtle text-text-primary px-4 py-3 rounded-xl text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand/40 transition-colors resize-none";

// ─── Modal component ──────────────────────────────────────────────────────────

function ParceiroModal({
  title,
  subtitle,
  onClose,
  onSubmit,
  saving,
  formError,
  nomeProduto, setNomeProduto,
  descricao, setDescricao,
  cupom, setCupom,
  linkDesconto, setLinkDesconto,
  imageFiles, setImageFiles,
  imagePreviews,
  multipleImages = true,
  cancelLabel = 'Cancelar',
  submitLabel = 'Salvar',
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  formError: string | null;
  nomeProduto: string; setNomeProduto: (v: string) => void;
  descricao: string; setDescricao: (v: string) => void;
  cupom: string; setCupom: (v: string) => void;
  linkDesconto: string; setLinkDesconto: (v: string) => void;
  imageFiles: File[]; setImageFiles: (f: File[]) => void;
  imagePreviews: string[];
  multipleImages?: boolean;
  cancelLabel?: string;
  submitLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-surface-1 border border-border-subtle rounded-2xl shadow-elev-2 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-text-primary">{title}</h2>
            <p className="text-xs text-text-tertiary">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-surface-3 text-text-tertiary hover:text-danger rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {formError && (
            <div className="mb-5 p-3 bg-danger/10 border border-danger/20 rounded-xl text-danger flex items-center gap-3 text-sm">
              <WarningCircle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </div>
          )}

          <form id="parceiro-form" onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField label="Nome da Marca">
                <input
                  type="text"
                  value={nomeProduto}
                  onChange={(e) => setNomeProduto(e.target.value)}
                  className={inputCls}
                  placeholder="Ex: Growth Supplements"
                  required
                />
              </FormField>

              <FormField label="Código do Cupom">
                <div className="relative">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    value={cupom}
                    onChange={(e) => setCupom(e.target.value)}
                    className={cn(inputCls, 'pl-10')}
                    placeholder="AURONFIT"
                    required
                  />
                </div>
              </FormField>
            </div>

            <FormField label="Descrição Curta">
              <textarea
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className={textareaCls}
                placeholder="Explique o benefício em poucas palavras..."
                required
              />
            </FormField>

            <FormField label="Link de Desconto">
              <div className="relative">
                <ArrowSquareOut className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="url"
                  value={linkDesconto}
                  onChange={(e) => setLinkDesconto(e.target.value)}
                  className={cn(inputCls, 'pl-10')}
                  placeholder="https://loja.com/auronfit"
                  required
                />
              </div>
            </FormField>

            <FormField label={multipleImages ? "Imagens (máx 5)" : "Nova Imagem (opcional)"}>
              <div className="space-y-2">
                <div className="relative flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border-subtle rounded-xl bg-surface-2/50 hover:bg-brand/5 hover:border-brand/30 transition-all cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    multiple={multipleImages}
                    onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Image className="w-5 h-5 text-text-disabled mb-1 group-hover:text-brand transition-colors" />
                  <p className="text-xs text-text-tertiary">Clique para selecionar</p>
                </div>

                <div className="flex items-start gap-1 p-1.5 bg-surface-2 border border-border-subtle rounded-lg">
                  <WarningCircle className="w-2.5 h-2.5 text-brand flex-shrink-0 mt-0.5" />
                  <p className="text-[9px] text-text-tertiary leading-tight">
                    Ideal: <span className="text-brand font-mono">1200×675px</span> (16:9) ou <span className="text-brand font-mono">800×600px</span> (4:3)
                  </p>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="shrink-0 w-16 h-16 rounded-xl border border-border-subtle overflow-hidden bg-surface-2">
                        <img src={src} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormField>
          </form>
        </div>

        {/* Modal footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border-subtle flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 bg-surface-3 border border-border-subtle text-text-secondary rounded-xl text-xs font-semibold hover:text-text-primary transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            form="parceiro-form"
            disabled={saving}
            className="flex-1 h-11 bg-brand text-text-on-brand rounded-xl text-xs font-semibold uppercase tracking-caps shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <><CircleNotch className="w-4 h-4 animate-spin" /> Processando...</>
            ) : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ParceirosAdminPage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parceiroEditando, setParceiroEditando] = useState<Parceiro | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);

  const [nomeProduto, setNomeProduto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cupom, setCupom] = useState("");
  const [linkDesconto, setLinkDesconto] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const imagePreviews = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles]
  );

  useEffect(() => {
    const init = async () => {
      const { data: authData } = await supabaseClient.auth.getUser();
      const currentCoachId = authData?.user?.id || null;
      setCoachId(currentCoachId);
      if (currentCoachId) fetchParceiros(currentCoachId);
    };
    init();
  }, []);

  const fetchParceiros = async (currentCoachId?: string) => {
    const idToUse = currentCoachId || coachId;
    if (!idToUse) { setError('Coach não identificado'); setLoading(false); return; }

    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('parceiros')
        .select('*')
        .eq('coach_id', idToUse)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setParceiros(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const uploadedPaths: string[] = [];
      for (const file of imageFiles) {
        const fileName = `${coachId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabaseClient.storage
          .from('parceiros-logos')
          .upload(fileName, file);
        if (uploadError) throw uploadError;
        uploadedPaths.push(fileName);
      }
      const { error: dbError } = await supabaseClient.from('parceiros').insert({
        nome_marca: nomeProduto, descricao, cupom,
        link_desconto: linkDesconto,
        logo_url: uploadedPaths[0] || null,
        imagens: uploadedPaths,
        coach_id: coachId,
      });
      if (dbError) throw dbError;
      setModalOpen(false);
      resetForm();
      fetchParceiros();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setNomeProduto(""); setDescricao(""); setCupom(""); setLinkDesconto("");
    setImageFiles([]); setFormError(null);
  };

  const abrirEditarParceiro = (parceiro: Parceiro) => {
    setParceiroEditando(parceiro);
    setNomeProduto(parceiro.nome_marca);
    setDescricao(parceiro.descricao);
    setCupom(parceiro.cupom);
    setLinkDesconto(parceiro.link_desconto);
    setImageFiles([]);
    setFormError(null);
    setModalEditOpen(true);
  };

  const handleEditarParceiro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parceiroEditando) return;
    setSaving(true);
    setFormError(null);
    try {
      const uploadedPaths: string[] = [];
      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const fileName = `${coachId}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabaseClient.storage
            .from("parceiros-logos").upload(fileName, file);
          if (uploadError) throw uploadError;
          uploadedPaths.push(fileName);
        }
      }
      const updateData: any = { nome_marca: nomeProduto, descricao, cupom, link_desconto: linkDesconto };
      if (uploadedPaths.length > 0) { updateData.logo_url = uploadedPaths[0]; updateData.imagens = uploadedPaths; }

      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('Sessão inválida');

      const response = await fetch("/api/admin/parceiros", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ id: parceiroEditando.id, ...updateData }),
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || "Erro ao atualizar parceiro"); }

      setModalEditOpen(false);
      setParceiroEditando(null);
      resetForm();
      fetchParceiros();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletarParceiro = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este parceiro?")) return;
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('Sessão inválida');
      const response = await fetch(`/api/admin/parceiros?id=${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || "Erro ao deletar parceiro"); }
      fetchParceiros();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-24">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight mb-1">
              Gestão de <span className="text-brand">Parceiros</span>
            </h1>
            <p className="text-sm text-text-tertiary">Configure benefícios e cupons exclusivos para seus alunos</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 h-11 bg-brand text-text-on-brand rounded-2xl text-xs font-semibold uppercase tracking-caps shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Adicionar Parceiro
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-2xl text-danger flex items-center gap-3 text-sm">
            <WarningCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <DumbbellLoader text="Carregando rede..." />
          </div>
        ) : parceiros.length === 0 ? (
          <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-disabled mb-6">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-text-primary mb-2">Nenhum parceiro ativo</h2>
            <p className="text-sm text-text-tertiary max-w-sm">Cadastre marcas parceiras para que seus alunos tenham acesso a descontos exclusivos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parceiros.map((parceiro) => (
              <div key={parceiro.id} className="bg-surface-1 border border-border-subtle shadow-elev-1 hover:shadow-elev-2 hover:border-brand/20 rounded-2xl p-5 transition-all">
                {/* Logo */}
                <div className="w-14 h-14 bg-surface-2 border border-border-subtle rounded-xl overflow-hidden flex items-center justify-center mb-4">
                  {parceiro.logo_url ? (
                    <img
                      src={getPublicStorageUrl('parceiros-logos', parceiro.logo_url) || ''}
                      alt={parceiro.nome_marca}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <Image className="w-6 h-6 text-text-disabled" />
                  )}
                </div>

                <h3 className="text-sm font-bold text-text-primary mb-1">{parceiro.nome_marca}</h3>
                <p className="text-xs text-text-tertiary leading-relaxed mb-4 line-clamp-2 min-h-[2.5rem]">{parceiro.descricao}</p>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-3 py-2.5 bg-brand-subtle border border-brand-border rounded-xl">
                    <span className="text-2xs font-semibold uppercase tracking-caps text-brand/60">Cupom</span>
                    <span className="text-brand font-mono text-sm tracking-wider">{parceiro.cupom}</span>
                  </div>

                  <a
                    href={parceiro.link_desconto}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 h-9 text-xs font-semibold uppercase tracking-caps text-text-secondary bg-surface-2 border border-border-subtle hover:border-brand/20 hover:text-brand rounded-xl transition-colors"
                  >
                    <ArrowSquareOut className="w-3.5 h-3.5" />
                    Acessar Loja
                  </a>

                  <div className="flex gap-2">
                    <button
                      onClick={() => abrirEditarParceiro(parceiro)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-semibold text-brand bg-brand-subtle border border-brand-border hover:opacity-80 rounded-xl transition-opacity"
                    >
                      <PencilSimple className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => handleDeletarParceiro(parceiro.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-semibold text-danger bg-danger/10 border border-danger/20 hover:opacity-80 rounded-xl transition-opacity"
                    >
                      <Trash className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Criar */}
      {modalOpen && (
        <ParceiroModal
          title="Novo Parceiro"
          subtitle="Preencha os dados da marca parceira"
          onClose={() => { setModalOpen(false); resetForm(); }}
          onSubmit={handleCreate}
          saving={saving}
          formError={formError}
          nomeProduto={nomeProduto} setNomeProduto={setNomeProduto}
          descricao={descricao} setDescricao={setDescricao}
          cupom={cupom} setCupom={setCupom}
          linkDesconto={linkDesconto} setLinkDesconto={setLinkDesconto}
          imageFiles={imageFiles} setImageFiles={setImageFiles}
          imagePreviews={imagePreviews}
          multipleImages
          submitLabel="Cadastrar Parceiro"
        />
      )}

      {/* Modal Editar */}
      {modalEditOpen && parceiroEditando && (
        <ParceiroModal
          title={`Editar ${parceiroEditando.nome_marca}`}
          subtitle="Atualize os dados da marca parceira"
          onClose={() => { setModalEditOpen(false); setParceiroEditando(null); resetForm(); }}
          onSubmit={handleEditarParceiro}
          saving={saving}
          formError={formError}
          nomeProduto={nomeProduto} setNomeProduto={setNomeProduto}
          descricao={descricao} setDescricao={setDescricao}
          cupom={cupom} setCupom={setCupom}
          linkDesconto={linkDesconto} setLinkDesconto={setLinkDesconto}
          imageFiles={imageFiles} setImageFiles={setImageFiles}
          imagePreviews={imagePreviews}
          multipleImages={false}
          submitLabel="Salvar Mudanças"
        />
      )}
    </div>
  );
}
