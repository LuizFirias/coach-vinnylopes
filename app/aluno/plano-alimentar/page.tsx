"use client";

import SubscriptionGuard from '@/app/components/SubscriptionGuard';

export default function PlanoAlimentarPage() {
  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-coach-black p-8 pt-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-white">Plano Alimentar</h1>
            <p className="text-gray-400">Seu plano personalizado</p>
          </header>

          <div className="card-glass">
            <p className="text-gray-300">Aqui aparecerá seu plano alimentar personalizado quando sua assinatura estiver ativa.</p>
          </div>
        </div>
      </div>
    </SubscriptionGuard>
  );
}
