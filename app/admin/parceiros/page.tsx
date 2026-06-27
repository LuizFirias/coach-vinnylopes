'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getPublicStorageUrl } from '@/lib/storageUrls';
import {
  Plus, Tag, ArrowSquareOut, Image, X, WarningCircle, ShoppingBag, PencilSimple, Trash, CircleNotch,
} from '@phosphor-icons/react';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { Card } from '@/components/ui/Card';
import PageHeader from '@/app/components/PageHeader';
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
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary ml-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full h-11 bg-surface-3 border border-border-default text-text-primary px-4 rounded-[6px] text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand transition-colors";
const textareaCls = "w-full bg-surface-3 border border-border-default text-text-primary px-4 py-2.5 rounded-[6px] text-sm placeholder:text-text-disabled focus:outline-none focus:border-brand transition-colors resize-none";

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
      <div className="relative w-full max-w-xl bg-surface-1 border border-border-default rounded-[12px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-text-primary">{title}</h2>
            <p className="text-xs text-text-tertiary">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-surface-3 text-text-tertiary hover:text-danger rounded-[8px] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {formError && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-[6px] text-danger flex items-center gap-3 text-sm">
              <WarningCircle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </div>
          )}

          <form id="parceiro-form" onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="COACHVINNY"
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
                  placeholder="https://loja.com/alunovinny"
                  required
                />
              </div>
            </FormField>

            <FormField label={multipleImages ? "Imagens (máx 5)" : "Nova Imagem (opcional)"}>
              <div className="space-y-2">
                <div className="relative flex flex-col items-center justify-center w-full h-24 border border-dashed border-border-default rounded-[6px] bg-surface-2 hover:bg-brand-subtle hover:border-brand-border transition-all cursor-pointer group">
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

                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="shrink-0 w-14 h-14 rounded-[6px] border border-border-subtle overflow-hidden bg-surface-2">
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
        <div className="flex gap-3 px-6 py-4 border-t border-border-subtle flex-shrink-0 bg-surface-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 bg-surface-3 border border-border-subtle text-text-secondary rounded-[8px] text-xs font-semibold hover:text-text-primary transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            form="parceiro-form"
            disabled={saving}
            className="flex-1 h-10 bg-brand text-text-on-brand rounded-[8px] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
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
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-16 xl:pl-[240px]">
      <div className="max-w-[1440px] px-6 md:px-10 py-8 mx-auto w-full flex flex-col gap-6 animate-fade-in">
        
        {/* Header */}
        <PageHeader
          title="Gestão de Parceiros"
          subtitle="Configure benefícios e cupons exclusivos para seus atletas"
          breadcrumbs={[
            { label: "Atletas", href: "/admin/alunos" },
            { label: "Parceiros" }
          ]}
          actions={
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-4 h-10 bg-brand text-text-on-brand rounded-[8px] text-xs font-bold uppercase tracking-wider shadow-sm hover:opacity-95 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Adicionar Parceiro
            </button>
          }
        />

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[6px] bg-danger-subtle border border-danger-border text-danger text-sm">
            <WarningCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <DumbbellLoader text="Carregando rede..." />
          </div>
        ) : parceiros.length === 0 ? (
          <div className="bg-surface-1 border border-border-subtle shadow-sm rounded-[10px] p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-surface-2 border border-border-subtle flex items-center justify-center text-text-disabled mb-6">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-text-primary mb-2">Nenhum parceiro ativo</h2>
            <p className="text-xs text-text-tertiary max-w-sm mb-6">Cadastre marcas parceiras para que seus alunos tenham acesso a descontos exclusivos.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-5 h-10 bg-brand text-text-on-brand rounded-[8px] text-xs font-bold uppercase tracking-wider hover:opacity-95 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Primeiro Parceiro
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {parceiros.map((parceiro) => (
              <Card key={parceiro.id} className="bg-surface-1 border border-border-subtle shadow-sm hover:shadow-md hover:border-brand/20 rounded-[10px] p-4 transition-all flex flex-col justify-between">
                <div>
                  {/* Logo */}
                  <div className="w-12 h-12 bg-surface-2 border border-border-subtle rounded-[6px] overflow-hidden flex items-center justify-center mb-4">
                    {parceiro.logo_url ? (
                      <img
                        src={getPublicStorageUrl('parceiros-logos', parceiro.logo_url) || ''}
                        alt={parceiro.nome_marca}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <Image className="w-5 h-5 text-text-disabled" />
                    )}
                  </div>

                  <h3 className="text-xs font-bold text-text-primary mb-1 uppercase tracking-wider">{parceiro.nome_marca}</h3>
                  <p className="text-xs text-text-secondary leading-relaxed mb-4 line-clamp-2 min-h-[2.5rem]">{parceiro.descricao}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-3 py-2 bg-brand-subtle border border-brand-border rounded-[6px]">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand/80">Cupom</span>
                    <span
                      className="text-brand font-mono text-xs font-bold tracking-wider truncate max-w-[120px]"
                      title={parceiro.cupom}
                    >
                      {parceiro.cupom}
                    </span>
                  </div>

                  <a
                    href={parceiro.link_desconto}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 h-8.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary bg-surface-2 border border-border-subtle hover:border-brand/20 hover:text-brand rounded-[8px] transition-colors"
                  >
                    <ArrowSquareOut className="w-3.5 h-3.5" />
                    Acessar Loja
                  </a>

                  <div className="flex gap-2">
                    <button
                      onClick={() => abrirEditarParceiro(parceiro)}
                      className="flex-1 flex items-center justify-center gap-1 h-8 text-[11px] font-bold text-brand bg-brand-subtle border border-brand-border hover:opacity-85 rounded-[6px] transition-opacity"
                    >
                      <PencilSimple className="w-3 h-3" /> Editar
                    </button>
                    <button
                      onClick={() => handleDeletarParceiro(parceiro.id)}
                      className="flex-1 flex items-center justify-center gap-1 h-8 text-[11px] font-bold text-danger bg-danger/10 border border-danger/20 hover:opacity-85 rounded-[6px] transition-opacity"
                    >
                      <Trash className="w-3 h-3" /> Excluir
                    </button>
                  </div>
                </div>
              </Card>
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
