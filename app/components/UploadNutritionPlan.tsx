"use client";

import React, { useState, useEffect } from "react";
import { X, Upload, FileText, Loader2 } from "lucide-react";
import { supabaseClient } from "@/lib/supabaseClient";

interface UploadNutritionPlanProps {
  isOpen: boolean;
  onClose: () => void;
  alunoId: string;
  alunoName: string;
  onUploadSuccess: () => void;
}

export default function UploadNutritionPlan({
  isOpen,
  onClose,
  alunoId,
  alunoName,
  onUploadSuccess,
}: UploadNutritionPlanProps) {
  const [file, setFile] = useState<File | null>(null);
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: authData } = await supabaseClient.auth.getUser();
      if (authData.user) {
        setUserId(authData.user.id);

        // Get coach_id if user is student, or use their own id if coach
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("coach_id, role")
          .eq("id", authData.user.id)
          .single();

        if (profile?.role === "coach") {
          setCoachId(authData.user.id);
        } else if (profile?.coach_id) {
          setCoachId(profile.coach_id);
        }
      }
    };

    if (isOpen) {
      fetchUser();
    }
  }, [isOpen]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const selectedFile = files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
      } else {
        alert("Por favor, selecione um arquivo PDF");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
      } else {
        alert("Por favor, selecione um arquivo PDF");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !userId || !coachId) {
      alert("Preencha todos os campos");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 10MB");
      return;
    }

    setLoading(true);

    try {
      // Upload file to storage
      const fileName = `${alunoId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from("plano-alimentar")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: signedUrl } = await supabaseClient.storage
        .from("plano-alimentar")
        .createSignedUrl(uploadData.path, 365 * 24 * 60 * 60); // 1 year

      // Save to database
      const { error: dbError } = await supabaseClient
        .from("plano_alimentar_pdf")
        .insert({
          aluno_id: alunoId,
          coach_id: coachId,
          nome_arquivo: file.name,
          url_pdf: signedUrl?.signedUrl || uploadData.path,
          descricao: descricao || null,
        });

      if (dbError) throw dbError;

      // Reset form
      setFile(null);
      setDescricao("");
      onUploadSuccess();
      onClose();
      alert("Plano alimentar enviado com sucesso!");
    } catch (err: any) {
      console.error("Erro ao enviar plano:", err);
      alert(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#0a0a0a] rounded-2xl border border-[#D4AF37]/20 shadow-[0_0_50px_rgba(212,175,55,0.1)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/40">
          <h2 className="text-lg font-black text-white uppercase tracking-tight">
            Plano Alimentar
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Student Info */}
          <div className="text-center">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
              Para o aluno
            </p>
            <p className="text-sm font-black text-[#D4AF37]">{alunoName}</p>
          </div>

          {/* File Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
              dragActive
                ? "border-[#D4AF37] bg-[#D4AF37]/5"
                : "border-zinc-700 hover:border-[#D4AF37]/50 bg-zinc-900/30"
            }`}
          >
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer block">
              <FileText size={32} className="mx-auto mb-3 text-zinc-600" />
              <p className="text-sm font-black text-white mb-1">
                {file ? file.name : "Selecione ou arraste o PDF"}
              </p>
              <p className="text-[9px] text-zinc-500">
                Máximo 10MB • Apenas PDF
              </p>
            </label>
          </div>

          {/* File Info */}
          {file && (
            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-[#D4AF37]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Arquivo
                  </p>
                  <p className="text-sm font-bold text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-[9px] text-zinc-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 block">
              Descrição (opcional)
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Plano para ganho de massa | Orientações especiais..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-[#D4AF37] transition-colors text-sm resize-none h-20"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!file || loading}
            className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-black font-black text-sm uppercase tracking-tight py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload size={18} />
                Enviar Plano
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
