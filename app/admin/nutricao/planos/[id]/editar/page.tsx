'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DumbbellLoader from '@/app/components/DumbbellLoader';

interface EditarPlanoPageProps {
  params: Promise<{ id: string }>;
}

/** Edição agora é inline em /planos/[id] — redireciona preservando o fluxo. */
export default function EditarPlanoPage({ params }: EditarPlanoPageProps) {
  const { id } = use(params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/admin/nutricao/planos/${id}?edit=1`);
  }, [id, router]);

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center">
      <DumbbellLoader />
    </div>
  );
}
