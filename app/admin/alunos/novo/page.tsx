"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { BackButton } from "@/app/components/ui/BackButton";
import { getBootstrapProfile } from "@/lib/auth/bootstrapProfile";
import { readReturnUrl } from "@/lib/utils/adminNav";
import { NovoAlunoForm } from "@/app/components/admin/alunos/NovoAlunoForm";

export default function NovoAlunoPage() {
  const router = useRouter();
  const goBack = () => {
    router.push(readReturnUrl(window.location.search, "/admin/alunos"));
  };
  const [checkingRole, setCheckingRole] = useState(true);
  const [isCoach, setIsCoach] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const boot = await getBootstrapProfile();
        if (!boot) {
          router.replace("/login");
          return;
        }
        if (boot.role !== "coach" && boot.role !== "super_admin") {
          router.replace("/aluno/dashboard");
          return;
        }
        setIsCoach(true);
      } finally {
        setCheckingRole(false);
      }
    };
    void checkRole();
  }, [router]);

  if (checkingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0">
        <DumbbellLoader />
      </div>
    );
  }

  if (!isCoach) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0 p-6">
        <div className="w-full max-w-2xl rounded-xl bg-surface-1 p-12 text-center text-sm uppercase tracking-caps text-text-secondary">
          Acesso restrito para coach.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-24">
      <div className="flex w-full justify-center px-4 pb-8 pt-4 sm:px-8 sm:pb-10 sm:pt-6">
        <div className="w-full max-w-xl">
          <div className="mb-4 flex items-center gap-2.5">
            <BackButton onClick={goBack} />
            <p className="text-xl font-semibold leading-tight text-text-primary">
              Adicionar aluno
            </p>
          </div>
          <div className="rounded-2xl bg-surface-1 px-5 py-5 sm:px-6">
            <NovoAlunoForm layout="page" onCancel={goBack} />
          </div>
        </div>
      </div>
    </div>
  );
}
