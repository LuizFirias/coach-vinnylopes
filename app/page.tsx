"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./components/AuthProvider";
import DumbbellLoader from "./components/DumbbellLoader";

export default function RootPage() {
  const router = useRouter();
  const { user, userRole, loading } = useAuth();

  useEffect(() => {
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
