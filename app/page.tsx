"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./components/AuthProvider";
import DumbbellLoader from "./components/DumbbellLoader";

export default function RootPage() {
  const router = useRouter();
  const { user, userRole, loading } = useAuth();

  useEffect(() => {
    // Se houver parâmetros de recuperação de senha no link, redirecionar para /reset-password
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const queryParams = new URLSearchParams(window.location.search);
      const code = queryParams.get('code');

      if (hashParams.get('type') === 'recovery' && hashParams.get('access_token')) {
        router.replace(`/reset-password${window.location.hash}`);
        return;
      }
      if (code) {
        router.replace(`/reset-password?code=${code}`);
        return;
      }
    }

    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (userRole === "coach") {
      router.replace("/admin/dashboard");
    } else if (userRole === "super_admin") {
      router.replace("/super-admin");
    } else {
      router.replace("/aluno/treinos");
    }
  }, [loading, user, userRole, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <DumbbellLoader />
    </div>
  );
}
