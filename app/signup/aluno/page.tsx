"use client";

import React, { useState, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { loginComGoogle } from "@/lib/auth/googleOAuth";
import { GoogleSignInButton } from "@/app/components/auth/GoogleSignInButton";
import { 
  ArrowLeft, 
  ArrowRight, 
  WarningCircle, 
  ShieldCheck, 
  Eye, 
  EyeSlash,
  X
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";

export default function AlunoSignup() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [goal, setGoal] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) strength++;
    return strength;
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState && e.getModifierState("CapsLock")) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setError(null);
    const err = await loginComGoogle("signup-aluno");
    if (err) {
      setError(err);
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Por favor, insira seu nome completo.");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Por favor, insira um e-mail válido.");
      return;
    }

    if (email.toLowerCase() !== confirmEmail.toLowerCase()) {
      setError("Os e-mails inseridos não são iguais.");
      return;
    }

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (!goal) {
      setError("Por favor, selecione seu objetivo principal.");
      return;
    }

    if (!termsAccepted) {
      setError("Você precisa aceitar os Termos de Uso e Políticas de Privacidade.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup-aluno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          fullName: fullName.trim(),
          goal
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Erro ao criar conta. Tente novamente.");
        setLoading(false);
        return;
      }

      // Auto login
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        console.warn("Auto login failed after student signup:", signInError.message);
        router.push(`/login?email=${encodeURIComponent(email.trim().toLowerCase())}&novo=true`);
        return;
      }

      router.push("/aluno/onboarding");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Erro inesperado";
      setError(`Erro inesperado ao realizar cadastro: ${errMsg}. Tente novamente.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col lg:flex-row antialiased overflow-hidden selection:bg-brand/35 selection:text-white">
      
      {/* Lado Esquerdo - Hero Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-[50%] lg:h-auto flex-col justify-between p-12 bg-surface-1 border-r border-border-subtle relative overflow-hidden select-none">
        
        {/* Fundo com Imagem e Gradientes */}
        <div 
          className="absolute inset-0 bg-cover bg-center" 
          style={{ 
            backgroundImage: `url('/images/auth/auron-login-hero.webp')`,
            backgroundColor: 'var(--color-surface-0)'
          }} 
        />
        
        {/* Gradiente Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/60 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-surface-0/50 lg:to-surface-0" />

        {/* Brand/Logo no canto superior */}
        <div className="relative z-10 flex items-center gap-3">
          <Image 
            src="/favicon-96x96.png" 
            alt="Logo Auronfit" 
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg object-contain"
          />
          <span className="font-display font-bold text-base tracking-widest text-white">
            AURONFIT
          </span>
        </div>

        {/* Mensagem e download badges no rodapé */}
        <div className="relative z-10 mt-auto pt-12 lg:pt-0">
          <h2 className="font-display font-bold text-2xl text-white max-w-sm leading-tight mb-2">
            Alcance sua melhor versão física
          </h2>
          <p className="text-xs text-text-secondary max-w-xs mb-6">
            Acompanhe suas rotinas de treino prescritas pelo seu personal, registre suas cargas, controle suas refeições diárias e envie feedback em tempo real.
          </p>

          {/* Badges de Lojas fictícias */}
          <div className="flex items-center gap-3">
            <div className="h-9 px-3 rounded-lg bg-surface-0/50 border border-border-subtle backdrop-blur-sm flex items-center gap-2 text-white hover:bg-surface-0/80 transition-all cursor-pointer">
              <span className="text-[8px] font-bold">A</span>
              <div className="text-left leading-none">
                <span className="text-[6px] text-text-disabled uppercase block">Download on the</span>
                <span className="text-[9px] font-bold block">App Store</span>
              </div>
            </div>
            <div className="h-9 px-3 rounded-lg bg-surface-0/50 border border-border-subtle backdrop-blur-sm flex items-center gap-2 text-white hover:bg-surface-0/80 transition-all cursor-pointer">
              <span className="text-[8px] font-bold">G</span>
              <div className="text-left leading-none">
                <span className="text-[6px] text-text-disabled uppercase block">GET IT ON</span>
                <span className="text-[9px] font-bold block">Google Play</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Lado Direito - Signup Form Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 lg:p-16 relative z-10 w-full max-w-lg lg:max-w-none mx-auto overflow-y-auto">
        
        {/* Back button link */}
        <div className="absolute top-6 left-6 lg:left-12">
          <Link 
            href="/signup" 
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-[380px] space-y-4 pt-14 lg:pt-8 pb-6">
          {/* Logo */}
          <div className="flex flex-col items-center text-center">
            {!logoFailed ? (
              <Image
                src="/images/logo-auron-nome-roxo.svg"
                alt="Auronfit"
                width={200}
                height={40}
                priority
                onError={() => setLogoFailed(true)}
                className="w-40 lg:w-44 h-auto object-contain drop-shadow-2xl animate-fade-in"
              />
            ) : (
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-brand w-6 h-6" />
                <h1 className="text-lg lg:text-xl font-bold text-text-primary tracking-widest uppercase font-display">AURONFIT</h1>
              </div>
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mt-[-4px] block">
              Aluno
            </span>
          </div>

          {/* Error alert */}
          {error && (
            <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg text-xs flex items-start gap-2.5 relative overflow-hidden animate-fade-in">
              <WarningCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 pr-4">
                <p className="font-bold text-danger">Erro no Cadastro</p>
                <p className="text-danger/80 mt-0.5">{error}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setError(null)}
                className="text-danger hover:text-danger/60 transition-colors p-0.5 absolute right-2 top-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <GoogleSignInButton
            loading={googleLoading}
            disabled={loading}
            label="Cadastrar com Google"
            onClick={() => { void handleGoogleSignup(); }}
          />

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-disabled">ou</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                disabled={loading}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome Completo"
                className="w-full h-11 bg-surface-1 border border-border-subtle text-text-primary px-3.5 rounded-lg text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20 transition-all duration-200 disabled:opacity-50"
              />
            </div>

            {/* Email */}
            <div>
              <input
                id="email"
                type="email"
                required
                value={email}
                disabled={loading}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="E-mail"
                className="w-full h-11 bg-surface-1 border border-border-subtle text-text-primary px-3.5 rounded-lg text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20 transition-all duration-200 disabled:opacity-50"
              />
              {email && (
                <div className={cn(
                  "flex items-center gap-1.5 mt-1.5 text-[10px] font-bold uppercase tracking-wider",
                  isValidEmail(email) ? "text-success" : "text-danger"
                )}>
                  {isValidEmail(email) ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" weight="fill" />
                      <span>E-mail válido</span>
                    </>
                  ) : (
                    <>
                      <WarningCircle className="w-3.5 h-3.5 flex-shrink-0" weight="fill" />
                      <span>E-mail inválido</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Email */}
            <div>
              <input
                id="confirmEmail"
                type="email"
                required
                value={confirmEmail}
                disabled={loading}
                onChange={(e) => { setConfirmEmail(e.target.value); setError(null); }}
                placeholder="Confirmar E-mail"
                className="w-full h-11 bg-surface-1 border border-border-subtle text-text-primary px-3.5 rounded-lg text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20 transition-all duration-200 disabled:opacity-50"
              />
              {confirmEmail && email.toLowerCase() !== confirmEmail.toLowerCase() && (
                <div className="flex items-center gap-1 mt-1 text-[10px] font-bold uppercase tracking-wider text-danger">
                  <WarningCircle className="w-3.5 h-3.5 flex-shrink-0" weight="fill" />
                  <span>Os e-mails não coincidem</span>
                </div>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  disabled={loading}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  onKeyUp={handlePasswordKeyDown}
                  onKeyDown={handlePasswordKeyDown}
                  placeholder="Senha Nova"
                  className="w-full h-11 bg-surface-1 border border-border-subtle text-text-primary px-3.5 pr-10 rounded-lg text-xs placeholder:text-text-disabled focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20 transition-all duration-200 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors p-1"
                >
                  {showPassword ? <EyeSlash className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Password strength meter */}
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    <div className={cn("flex-1 h-1 rounded-full transition-colors duration-300", getPasswordStrength(password) >= 1 ? (getPasswordStrength(password) === 1 ? 'bg-danger' : getPasswordStrength(password) === 2 ? 'bg-warning' : 'bg-success') : 'bg-surface-3')} />
                    <div className={cn("flex-1 h-1 rounded-full transition-colors duration-300", getPasswordStrength(password) >= 2 ? (getPasswordStrength(password) === 2 ? 'bg-warning' : 'bg-success') : 'bg-surface-3')} />
                    <div className={cn("flex-1 h-1 rounded-full transition-colors duration-300", getPasswordStrength(password) >= 3 ? 'bg-success' : 'bg-surface-3')} />
                  </div>
                  <p className={cn(
                    "text-[9px] font-bold uppercase tracking-wider",
                    getPasswordStrength(password) === 1 ? 'text-danger' :
                    getPasswordStrength(password) === 2 ? 'text-warning' :
                    getPasswordStrength(password) === 3 ? 'text-success' :
                    'text-text-disabled'
                  )}>
                    Força: {getPasswordStrength(password) === 1 ? "Fraca" : getPasswordStrength(password) === 2 ? "Média" : getPasswordStrength(password) === 3 ? "Forte" : "Mínimo 8 caracteres"}
                  </p>
                </div>
              )}

              {/* Caps Lock warning */}
              {capsLockActive && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-warning">
                  <WarningCircle className="w-3.5 h-3.5 flex-shrink-0" weight="fill" />
                  <span>Caps Lock está ativado</span>
                </div>
              )}
            </div>

            {/* Goal Selector */}
            <div>
              <select
                id="goal"
                required
                value={goal}
                disabled={loading}
                onChange={(e) => setGoal(e.target.value)}
                className={cn(
                  "w-full h-11 bg-surface-1 border border-border-subtle px-3.5 rounded-lg text-xs focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/20 transition-all duration-200 disabled:opacity-50",
                  goal === "" ? "text-text-disabled" : "text-text-primary"
                )}
              >
                <option value="" disabled className="text-text-disabled">Objetivo Principal</option>
                <option value="cutting" className="text-text-primary bg-surface-1">Emagrecimento (Definição / Cutting)</option>
                <option value="bulking" className="text-text-primary bg-surface-1">Ganho de Massa (Hipertrofia / Bulking)</option>
                <option value="manutencao" className="text-text-primary bg-surface-1">Manutenção de Peso / Performance</option>
                <option value="recomposicao" className="text-text-primary bg-surface-1">Recomposição Corporal (Perder gordura & Ganhar músculo)</option>
              </select>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-2.5 py-1 select-none">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                disabled={loading}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-border-default bg-surface-2 text-brand focus:ring-2 focus:ring-brand/40 cursor-pointer disabled:opacity-50"
              />
              <label htmlFor="terms" className="text-xs text-text-secondary leading-normal cursor-pointer hover:text-text-primary transition-colors">
                Aceito os{" "}
                <a href="#" className="text-brand hover:underline font-semibold">Termos de Uso</a>
                {" "}e as{" "}
                <a href="#" className="text-brand hover:underline font-semibold">Políticas de Privacidade</a>.
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !termsAccepted}
              className="w-full h-11 bg-brand text-text-on-brand rounded-lg text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-text-on-brand/20 border-t-text-on-brand rounded-full animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <span>Criar Conta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-text-secondary pt-2">
            Já tem uma conta?{" "}
            <Link href="/" className="text-brand font-bold hover:underline">
              Fazer login
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
