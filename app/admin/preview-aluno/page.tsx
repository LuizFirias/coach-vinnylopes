"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "@phosphor-icons/react";
import { useAuth } from "@/app/components/AuthProvider";
import { concluirPasso } from "@/lib/onboarding/concluirPasso";
import { AlunoDashboardPreview } from "@/app/components/onboarding/AlunoDashboardPreview";

export default function PreviewAlunoPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user?.id) {
      router.replace("/login");
      return;
    }
    void concluirPasso(user.id, "ver-como-aluno");
  }, [user?.id, loading, router]);

  const sair = () => {
    if (user?.id) void concluirPasso(user.id, "ver-como-aluno");
    router.push("/admin/dashboard");
  };

  return (
    <div className="min-h-screen bg-surface-0">
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-warning/20 bg-warning/10 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Eye size={16} weight="fill" className="shrink-0 text-warning" />
          <span className="truncate text-sm font-medium text-warning">
            Preview — dashboard do aluno (João · dados de exemplo)
          </span>
        </div>
        <button
          type="button"
          onClick={sair}
          className="min-h-8 shrink-0 touch-manipulation text-xs font-semibold text-warning underline"
        >
          Sair do preview
        </button>
      </div>

      <AlunoDashboardPreview />
    </div>
  );
}
