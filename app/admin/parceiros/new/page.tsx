"use client";

import { useMemo, useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Check, WarningCircle, ShoppingBag, Globe, Tag, Image } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/layout/ScreenHeader";

export default function NovoParceiroPage() {
  const router = useRouter();
  const [nomeProduto, setNomeProduto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cupom, setCupom] = useState("");
  const [linkDesconto, setLinkDesconto] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const imagePreviews = useMemo(
    () => imageFiles.map((file) => URL.createObjectURL(file)),
    [imageFiles]
  );

  useEffect(() => {
    return () => { imagePreviews.forEach((url) => URL.revokeObjectURL(url)); };
  }, [imagePreviews]);

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) { setError("Selecione no máximo 5 imagens"); return; }
    for (const file of files) {
      if (!file.type.startsWith("image/")) { setError("Envie apenas imagens"); return; }
      if (file.size > 5 * 1024 * 1024) { setError("Cada imagem deve ter no máximo 5MB"); return; }
    }
    setError(null);
    setImageFiles(files);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!nomeProduto.trim() || !descricao.trim() || !cupom.trim() || !linkDesconto.trim()) {
      setError("Preencha todos os campos"); return;
    }
    if (imageFiles.length === 0) {
      setError("Envie pelo menos 1 imagem (logo ou banner)"); return;
    }

    setLoading(true);
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) { setError("Sessão inválida. Faça login novamente."); setLoading(false); return; }

      const uploadedPaths: string[] = [];
      for (const file of imageFiles) {
        const fileName = `${coachId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabaseClient.storage
          .from("parceiros-logos").upload(fileName, file, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        uploadedPaths.push(fileName);
      }

      const { error: dbError } = await supabaseClient.from("parceiros").insert({
        nome_marca: nomeProduto.trim(),
        descricao: descricao.trim(),
        cupom: cupom.trim(),
        link_desconto: linkDesconto.trim(),
        logo_url: uploadedPaths[0] || null,
        imagens: uploadedPaths,
        coach_id: coachId,
      });

      if (dbError) throw dbError;

      setSuccess("Parceiro cadastrado com sucesso!");
      setNomeProduto(""); setDescricao(""); setCupom(""); setLinkDesconto(""); setImageFiles([]);

      setTimeout(() => { router.push("/admin/parceiros"); }, 2000);
    } catch (err: any) {
      setError(err?.message || "Erro ao processar a solicitação");
    } finally {
      setLoading(false);
    }
  };

  const fieldCls = "w-full px-4 py-3 bg-surface-3 border border-border-default rounded-xl text-text-primary text-sm placeholder:text-text-disabled focus:outline-none focus:border-danger/40 transition-all disabled:opacity-50";

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-28">
      <ScreenHeader
        title="Novo Parceiro"
        subtitle="Cadastre marcas e cupons exclusivos para seus atletas"
      />

      <div className="px-4 max-w-2xl flex flex-col gap-4">

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger-subtle border border-danger-border text-danger text-sm">
            <WarningCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-success-subtle border border-success-border text-success text-sm">
            <Check size={16} className="shrink-0" />
            {success}
          </div>
        )}

        <Card className="rounded-2xl shadow-elev-1">
          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-divider">
            <div className="w-10 h-10 rounded-xl bg-danger-subtle border border-danger-border flex items-center justify-center text-danger">
              <ShoppingBag size={18} />
            </div>
            <div>
              <p className="font-semibold text-text-primary">Expansão de Benefícios</p>
              <p className="text-xs text-text-tertiary mt-0.5">Novas parcerias para seus atletas</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              label="Marca / Produto"
              name="nomeProduto"
              type="text"
              value={nomeProduto}
              onChange={(e) => setNomeProduto(e.target.value)}
              placeholder="Ex: Integral Médica"
              disabled={loading}
            />

            <div className="flex flex-col gap-2">
              <label className="text-2xs uppercase tracking-caps text-text-tertiary ml-1">Descrição da Oferta</label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva as vantagens para os alunos..."
                disabled={loading}
                rows={3}
                className="w-full px-4 py-3 bg-surface-3 border border-border-default rounded-xl text-text-primary text-sm placeholder:text-text-disabled focus:outline-none focus:border-danger/40 transition-all resize-none disabled:opacity-50"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-2xs uppercase tracking-caps text-text-tertiary ml-1">Código do Cupom</label>
                <div className="relative">
                  <Tag size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled" />
                  <input
                    type="text"
                    value={cupom}
                    onChange={(e) => setCupom(e.target.value)}
                    placeholder="AURONFIT15"
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 bg-surface-3 border border-border-default rounded-xl text-text-primary text-sm placeholder:text-text-disabled focus:outline-none focus:border-danger/40 transition-all disabled:opacity-50"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-2xs uppercase tracking-caps text-text-tertiary ml-1">Link da Loja</label>
                <div className="relative">
                  <Globe size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled" />
                  <input
                    type="url"
                    value={linkDesconto}
                    onChange={(e) => setLinkDesconto(e.target.value)}
                    placeholder="https://..."
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 bg-surface-3 border border-border-default rounded-xl text-text-primary text-sm placeholder:text-text-disabled focus:outline-none focus:border-danger/40 transition-all disabled:opacity-50"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Galeria */}
            <div className="flex flex-col gap-3">
              <label className="text-2xs uppercase tracking-caps text-text-tertiary ml-1">Galeria de Imagens (máx 5)</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="aspect-square rounded-xl overflow-hidden border border-border-default relative group/img">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-surface-0/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <Image className="text-text-primary w-5 h-5" />
                    </div>
                  </div>
                ))}
                {imageFiles.length < 5 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-card flex flex-col items-center justify-center cursor-pointer hover:border-danger/30 hover:bg-danger-subtle transition-all group/add">
                    <Plus size={20} className="text-text-disabled group-hover/add:text-danger transition-colors" />
                    <span className="text-2xs text-text-disabled mt-1">Adicionar</span>
                    <input type="file" multiple accept="image/*" onChange={handleImagesChange} className="hidden" disabled={loading} />
                  </label>
                )}
              </div>
            </div>

            <Button
              type="submit"
              variant="danger"
              loading={loading}
              fullWidth
            >
              Publicar Parceiro
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
