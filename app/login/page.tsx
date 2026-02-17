'use client';

import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { supabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { AlertCircle, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null);
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(null);
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('Credenciais inválidas');
        setLoading(false);
        return;
      }

      if (data.session) {
        router.push('/aluno/treinos');
      }
    } catch (err) {
      setError('Credenciais inválidas');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-coach-black via-coach-black/95 to-coach-black/90 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-12 text-center">
          {!logoFailed ? (
            <Image
              src="/logo.png"
              alt="Coach Logo"
              width={200}
              height={80}
              priority
              onError={() => setLogoFailed(true)}
              className="h-20 w-auto mx-auto mb-6"
            />
          ) : (
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 tracking-tight">VINNY LOPES</h1>
              <p className="text-lg sm:text-2xl tracking-[0.08em] text-coach-gold font-semibold">COACH</p>
            </div>
          )}
          <p className="text-gray-400 text-sm tracking-widest mt-6 uppercase">Plataforma Premium de Coaching</p>
        </div>

        {/* Form Container - Glass Effect */}
        <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl hover:border-white/30 transition-all duration-300">
          <h2 className="text-2xl font-bold text-white mb-2 text-center tracking-tight">
            Entrar na Plataforma
          </h2>
          <p className="text-gray-400 text-sm text-center mb-8 tracking-wide">
            Acesse sua consultoria exclusiva
          </p>

          {/* Error Message - Discrete Red Alert */}
          {error && (
            <div className="mb-6 bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-500/90 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.08em] text-gray-300 mb-2">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:bg-white/10 transition-all duration-200"
                required
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-[0.08em] text-gray-300 mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:bg-white/10 transition-all duration-200"
                required
                disabled={loading}
              />
            </div>

            {/* Login Button - Golden Gradient */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-6 font-semibold text-sm uppercase tracking-[0.08em] text-black rounded-lg bg-linear-to-r from-coach-gold to-coach-gold-dark hover:from-coach-gold-dark hover:to-coach-gold disabled:from-coach-gold/50 disabled:to-coach-gold-dark/50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-coach-gold/30 flex items-center justify-center gap-2 group"
            >
              <LogIn className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-disabled:opacity-50" />
              {loading ? 'Entrando...' : 'ENTRAR'}
            </button>
          </form>

          {/* Footer Text */}
          <p className="text-center text-gray-500 text-xs tracking-widest mt-8 uppercase">
            © 2026 Coach Vinny - Sistema Exclusivo
          </p>
        </div>

        {/* Support Info */}
        <p className="text-center text-gray-600 text-xs mt-8 tracking-wide">
          Para acesso, entre em contato com o coach
        </p>
      </div>
    </div>
  );
}
