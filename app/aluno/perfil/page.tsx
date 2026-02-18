'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { LogOut, Mail, Settings, AlertCircle, User } from 'lucide-react';

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

        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('full_name')
          .eq('id', authData.user.id)
          .single();

        const displayName = profileData?.full_name || userEmail.split('@')[0] || 'Usuário';

        setUserData({
          name: displayName,
          email: userEmail,
        });
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
      // Clear server session cookie
      try {
        await fetch('/api/session', { method: 'DELETE' });
      } catch (err) {
        console.warn('Failed clearing server session cookie', err);
      }
      router.push('/login');
    } catch (err) {
      setError('Erro ao fazer logout');
      console.error(err);
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-coach-black via-coach-black/95 to-coach-black/90 flex items-center justify-center pt-16 lg:pt-0 px-4">
        <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-coach-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-coach-black via-coach-black/95 to-coach-black/90 px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-coach-gold/20 border border-coach-gold/40 flex items-center justify-center">
              <User className="w-6 h-6 text-coach-gold" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-[0.02em] text-white">
              Meu Perfil
            </h1>
          </div>
          <p className="text-gray-400 text-sm sm:text-base tracking-wide ml-13">
            Gerencie suas informações de conta
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-500/10 backdrop-blur-md border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-500/90 text-sm">{error}</p>
          </div>
        )}

        {/* Main Cards Container */}
        {userData && (
          <div className="space-y-6">
            {/* Email Card */}
            <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 hover:bg-white/8 hover:border-white/40 transition-all duration-300 group">
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-coach-gold/10 border border-coach-gold/30 group-hover:bg-coach-gold/20 transition-colors">
                    <Mail className="w-6 h-6 text-coach-gold" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                    E-mail
                  </h2>
                  <p className="text-base sm:text-lg text-white break-all font-medium">
                    {userData.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Account Settings Card */}
            <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 sm:p-8 hover:bg-white/8 hover:border-white/40 transition-all duration-300 group">
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-coach-gold/10 border border-coach-gold/30 group-hover:bg-coach-gold/20 transition-colors">
                    <Settings className="w-6 h-6 text-coach-gold" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                    Configurações de Conta
                  </h2>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Gerencie suas preferências e configurações de segurança da sua conta.
                    </p>
                    <ul className="text-xs text-gray-400 space-y-2 mt-4 pl-2">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-coach-gold/60"></span>
                        Notificações e Alertas
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-coach-gold/60"></span>
                        Privacidade e Dados
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-coach-gold/60"></span>
                        Segurança e Autenticação
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-coach-gold/60"></span>
                        Preferências de Atividade
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Sign Out Button */}
            <div className="pt-4">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-red-600/50 disabled:to-red-700/50 disabled:cursor-not-allowed rounded-xl px-6 py-4 text-sm font-semibold uppercase tracking-[0.08em] text-white transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg hover:shadow-red-600/20"
              >
                <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-1 group-disabled:group-hover:translate-x-0" />
                {signingOut ? 'Saindo...' : 'SAIR DA CONTA'}
              </button>
              <p className="text-xs text-gray-500 text-center mt-3 tracking-wide">
                Você será desconectado e redirecionado para o login
              </p>
            </div>

            {/* Footer Info */}
            <div className="mt-12 text-center">
              <p className="text-xs text-gray-600 tracking-widest uppercase">
                © Coach Vinny - Premium Training System
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
