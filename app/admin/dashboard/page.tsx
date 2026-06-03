"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/alunos");
  }, []);

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center">
      <p className="text-text-tertiary text-sm">Redirecionando...</p>
    </div>
  );
}
