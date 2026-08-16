"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBootstrapProfile } from "@/lib/auth/bootstrapProfile";
import { BackButton } from "@/app/components/ui/BackButton";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { CoachPlanosManager } from "@/app/components/coach-profile/CoachPlanosManager";

export default function CoachPlanosPage() {
  const router = useRouter();
  const [coachId, setCoachId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const boot = await getBootstrapProfile();
      if (!boot) {
        router.replace("/login");
        return;
      }
      if (boot.role !== "coach" && boot.role !== "super_admin") {
        router.replace("/aluno/dashboard");
        return;
      }
      setCoachId(boot.userId);
    })();
  }, [router]);

  if (!coachId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-0 lg:pl-8">
        <DumbbellLoader />
      </div>
    );
  }

  return (
    <div className="auron-settings-page min-h-screen p-4 pb-24 font-sans text-text-primary md:p-8 lg:p-10 lg:pl-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <BackButton href="/admin/perfil?sec=config" aria-label="Voltar ao perfil" />
          <h1 className="text-xl font-extrabold tracking-tight text-text-primary">
            Planos de venda
          </h1>
        </div>
        <section className="auron-widget-card p-5 sm:p-7">
          <CoachPlanosManager coachId={coachId} />
        </section>
      </div>
    </div>
  );
}
