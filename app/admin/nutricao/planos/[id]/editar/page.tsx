'use client';

import { useEffect, useState, use } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import NutritionPlanBuilder from '@/app/components/nutrition/NutritionPlanBuilder';
import DumbbellLoader from '@/app/components/DumbbellLoader';

interface EditarPlanoPageProps {
  params: Promise<{ id: string }>;
}

export default function EditarPlanoPage({ params }: EditarPlanoPageProps) {
  const { id } = use(params);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlan() {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
          setError('Sessão expirada. Faça login novamente.');
          return;
        }

        const res = await fetch(`/api/admin/nutricao/plans/${id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar plano');
        setPlan(data.plan);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Erro ao carregar dados do plano');
      } finally {
        setLoading(false);
      }
    }
    loadPlan();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4">
        <div className="p-4 bg-danger-subtle border border-danger-border text-danger text-xs font-semibold rounded-lg max-w-md text-center">
          {error || 'Plano alimentar não encontrado.'}
        </div>
      </div>
    );
  }

  return <NutritionPlanBuilder initialPlanData={plan} />;
}
