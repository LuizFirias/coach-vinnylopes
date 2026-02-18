"use client";

import { useMemo, useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Check, AlertCircle, ShoppingBag, Globe, Tag, Image as ImageIcon } from "lucide-react";

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
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      setError("Selecione no máximo 5 imagens");
      return;
    }

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setError("Envie apenas imagens");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Cada imagem deve ter no máximo 5MB");
        return;
      }
    }

    setError(null);
    setImageFiles(files);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!nomeProduto.trim() || !descricao.trim() || !cupom.trim() || !linkDesconto.trim()) {
      setError("Preencha todos os campos");
      return;
    }

    if (imageFiles.length === 0) {
      setError("Envie pelo menos 1 imagem (logo ou banner)");
      return;
    }

    setLoading(true);

    try {
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const fileName = `${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabaseClient.storage
          .from("parceiros-logos")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabaseClient
          .storage
          .from("parceiros-logos")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrlData.publicUrl);
      }

      const logoUrl = uploadedUrls[0] || null;

      const { error: dbError } = await supabaseClient
        .from("parceiros")
        .insert({
          nome_marca: nomeProduto.trim(),
          descricao: descricao.trim(),
          cupom: cupom.trim(),
          link_desconto: linkDesconto.trim(),
          logo_url: logoUrl,
          imagens: uploadedUrls,
        });

      if (dbError) {
        throw dbError;
      }

      setSuccess("Parceiro cadastrado com sucesso!");
      setNomeProduto("");
      setDescricao("");
      setCupom("");
      setLinkDesconto("");
      setImageFiles([]);

      setTimeout(() => {
        router.push("/admin/parceiros");
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Erro ao processar a solicitação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-iron-black p-4 md:p-6 lg:p-12 lg:pl-28">
      <div className="max-w-3xl mx-auto">
        
        <header className="mb-8 md:mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors group px-4 py-2 bg-iron-gray rounded-xl border border-white/5 w-fit"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Painel Anterior</span>
          </button>
        </header>

        <div className="mb-8 md:mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-iron-gray rounded-full shadow-sm mb-4 md:mb-6 border border-white/5">
              <ShoppingBag className="w-4 h-4 text-iron-red" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Expansão de Benefícios</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3 uppercase">Novo <span className="text-iron-red">Parceiro</span></h1>
            <p className="text-zinc-500 text-sm font-medium">Cadastre novas marcas e cupons exclusivos para seus atletas.</p>
        </div>

        {error && (
          <div className="mb-6 md:mb-8 p-4 md:p-6 bg-iron-red/10 border border-iron-red/20 text-iron-red rounded-xl text-xs font-bold animate-in fade-in slide-in-from-top-4 flex items-center gap-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 md:mb-8 p-4 md:p-6 bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 rounded-xl text-xs font-bold animate-in fade-in slide-in-from-top-4 flex items-center gap-4">
            <Check className="w-5 h-5 shrink-0" />
            {success}
          </div>
        )}

        <div className="bg-iron-gray rounded-3xl p-6 md:p-10 lg:p-14 relative overflow-hidden shadow-2xl border border-white/5 group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-iron-red/5 rounded-bl-[120px] pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
          
          <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 relative">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-2 md:mb-3 ml-2">Marca / Produto</label>
              <input
                type="text"
                value={nomeProduto}
                onChange={(e) => setNomeProduto(e.target.value)}
                placeholder="Ex: Integral Médica"
                disabled={loading}
                className="w-full px-5 md:px-7 py-4 md:py-5 bg-black/40 border border-white/5 rounded-2xl text-white font-medium text-sm focus:ring-2 focus:ring-iron-red focus:border-iron-red transition-all placeholder:text-zinc-800"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-2 md:mb-3 ml-2">Descrição da Oferta</label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva as vantagens para os alunos..."
                disabled={loading}
                rows={3}
                className="w-full px-5 md:px-7 py-4 md:py-5 bg-black/40 border border-white/5 rounded-2xl text-white font-medium text-sm focus:ring-2 focus:ring-iron-red focus:border-iron-red transition-all placeholder:text-zinc-800 resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-2 md:mb-3 ml-2">Código do Cupom</label>
                <div className="relative group">
                  <Tag className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-focus-within:text-iron-red transition-colors" />
                  <input
                    type="text"
                    value={cupom}
                    onChange={(e) => setCupom(e.target.value)}
                    placeholder="COACHVINNY15"
                    disabled={loading}
                    className="w-full pl-12 md:pl-14 pr-5 md:pr-7 py-4 md:py-5 bg-black/40 border border-white/5 rounded-2xl text-white font-medium text-sm focus:ring-2 focus:ring-iron-red focus:border-iron-red transition-all placeholder:text-zinc-800"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-2 md:mb-3 ml-2">Link da Loja</label>
                <div className="relative group">
                  <Globe className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 group-focus-within:text-iron-red transition-colors" />
                  <input
                    type="url"
                    value={linkDesconto}
                    onChange={(e) => setLinkDesconto(e.target.value)}
                    placeholder="https://..."
                    disabled={loading}
                    className="w-full pl-12 md:pl-14 pr-5 md:pr-7 py-4 md:py-5 bg-black/40 border border-white/5 rounded-2xl text-white font-medium text-sm focus:ring-2 focus:ring-iron-red focus:border-iron-red transition-all placeholder:text-zinc-800"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-4 ml-2">Galeria de Imagens (Máx 5)</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-lg relative group/img">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                       <ImageIcon className="text-white w-6 h-6" />
                    </div>
                  </div>
                ))}
                {imageFiles.length < 5 && (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center cursor-pointer hover:border-iron-red/30 hover:bg-white/5 transition-all group/add">
                    <Plus className="text-zinc-700 group-hover:text-iron-red transition-colors" size={24} />
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mt-2 group-hover:text-white">Adicionar</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImagesChange}
                      className="hidden"
                      disabled={loading}
                    />
                  </label>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 md:py-6 bg-iron-red text-white text-xs font-black uppercase tracking-[0.4em] rounded-2xl shadow-neon-red hover:bg-red-600 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-4"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  REGISTRANDO...
                </>
              ) : (
                "PUBLICAR PARCEIRO"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
