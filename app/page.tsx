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

    if (userRole === "coach" || userRole === "super_admin") {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/aluno/dashboard");
    }
  }, [loading, user, userRole, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <DumbbellLoader />
    </div>
  );
}
