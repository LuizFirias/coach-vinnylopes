'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface UserProfile {
  name: string;
  email: string;
}

export default function PerfilPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !authData.user) {
          setError('Você precisa estar logado');
          setLoading(false);
          router.push('/login');
          return;
        }

        const userEmail = authData.user.email || '';

        // Buscar nome do perfil
        const { data: profileData, error: profileError } = await supabaseClient
          .from('profiles')
          .select('nome')
          .eq('id', authData.user.id)
          .single();

        if (!profileError && profileData) {
          setUserData({
            name: profileData.nome || 'Usuário',
            email: userEmail,
          });
        } else {
          setUserData({
            name: 'Usuário',
            email: userEmail,
          });
        }
      } catch (err) {
        setError('Erro ao carregar dados do perfil');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabaseClient.auth.signOut();
      router.push('/login');
    } catch (err) {
      setError('Erro ao fazer logout');
      console.error(err);
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-coach-black flex items-center justify-center pt-16 lg:pt-0">
        <div className="text-center">
          <svg className="w-12 h-12 animate-spin text-coach-gold mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-400">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coach-black p-8 pt-24 lg:pt-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Perfil</h1>
          <p className="text-gray-400">Gerencie suas informações pessoais</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Profile Card */}
        {userData && (
          <div className="card-glass mb-8">
            <div className="mb-8">
              <div className="mb-6">
                <label className="text-xs uppercase tracking-widest text-gray-400 font-semibold block mb-2">
                  Nome
                </label>
                <div className="py-3 px-4 rounded-lg bg-black/40 border border-white/10">
                  <p className="text-white text-lg">{userData.name}</p>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-gray-400 font-semibold block mb-2">
                  E-mail
                </label>
                <div className="py-3 px-4 rounded-lg bg-black/40 border border-white/10">
                  <p className="text-white text-lg break-all">{userData.email}</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 my-8" />

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full py-3 px-4 rounded-lg border border-red-500/40 bg-red-950/20 hover:bg-red-950/40 text-red-400 font-semibold uppercase tracking-widest text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <LogOut size={18} />
              {signingOut ? 'Encerrando...' : 'Encerrar Sessão'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
