'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    setSuccess(null);

    try {
      const { data, error: authError } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message || 'Erro ao fazer login');
        setLoading(false);
        return;
      }

      if (data.user) {
        setSuccess('Login realizado com sucesso! Redirecionando...');
        setTimeout(() => {
          router.push('/');
        }, 1500);
      }
    } catch (err) {
      setError('Erro na autenticação. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-coach-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-white mb-2">VINNY LOPES</h1>
          <p className="text-2xl tracking-widest text-coach-gold">COACH</p>
        </div>

        {/* Form Container */}
        <div className="bg-coach-gray rounded-lg p-8 border border-gray-800">
          <h2 className="text-2xl font-semibold text-white mb-8 text-center">
            Entrar na Plataforma
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-900/20 border border-green-700 rounded text-green-400 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:ring-1 focus:ring-coach-gold transition"
                required
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-coach-black border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-coach-gold focus:ring-1 focus:ring-coach-gold transition"
                required
                disabled={loading}
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-8 font-semibold text-black rounded bg-linear-to-r from-coach-gold to-coach-gold-dark hover:from-coach-gold-dark hover:to-coach-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Footer Text */}
          <p className="text-center text-gray-400 text-sm mt-6">
            Plataforma Premium de Coaching
          </p>
        </div>
      </div>
    </div>
  );
}
