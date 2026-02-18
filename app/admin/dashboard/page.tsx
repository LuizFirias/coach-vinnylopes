"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/alunos");
  }, [router]);

  return (
    <div className="min-h-screen bg-coach-black p-8 pt-8">
      <div className="max-w-3xl mx-auto card-glass text-center text-gray-300">
        Redirecionando...
      </div>
    </div>
  );
}
