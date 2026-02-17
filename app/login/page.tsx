'use client';

import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { supabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
    setSuccess(null);
    try {
      const vercelHost = process.env.NEXT_PUBLIC_VERCEL_URL;
      const redirectTo = vercelHost ? `https://${vercelHost}` : typeof window !== 'undefined' ? window.location.origin : undefined;

      const { data, error: authError } = await supabaseClient.auth.signInWithOtp({
        email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });

      if (authError) {
        setError(authError.message || 'Erro ao enviar link de acesso');
        setLoading(false);
        return;
      }

      setSuccess('Verifique seu e-mail para acessar sua consultoria');
      setLoading(false);
    } catch (err) {
      setError('Erro ao processar solicitação. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-coach-black flex items-center justify-center px-4">
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
              className="h-20 w-auto mx-auto mb-4"
            />
          ) : (
            <div>
              <h1 className="text-5xl font-bold text-white mb-2">VINNY LOPES</h1>
              <p className="text-2xl tracking-widest text-coach-gold">COACH</p>
            </div>
          )}
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
            {/* Email Input (glass) */}
            <div className="card-glass p-3">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 bg-transparent border-0 rounded text-white placeholder-gray-400 focus:outline-none"
                required
                disabled={loading}
              />
            </div>

            {/* Magic Link Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 font-semibold text-black rounded bg-linear-to-r from-coach-gold to-coach-gold-dark hover:from-coach-gold-dark hover:to-coach-gold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Enviando...' : 'Enviar Link de Acesso'}
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
