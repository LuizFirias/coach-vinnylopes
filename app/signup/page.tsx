"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ShieldCheck, Trophy, Barbell } from "@phosphor-icons/react";

export default function SignupTypeSelector() {
  const [logoFailed, setLogoFailed] = useState(false);

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
            Gestão profissional para consultoria
          </h2>
          <p className="text-xs text-text-secondary max-w-xs mb-6">
            Prescreva treinos de forma rápida, avalie a composição corporal de seus alunos e tenha um canal de comunicação de alto nível.
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

      {/* Lado Direito - Selector Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 lg:p-16 relative z-10 w-full max-w-lg lg:max-w-none mx-auto overflow-y-auto">
        
        {/* Back button link */}
        <div className="absolute top-6 left-6 lg:left-12">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao login
          </Link>
        </div>

        {/* Selector Container */}
        <div className="w-full max-w-[400px] space-y-6 pt-14 lg:pt-8 pb-6">
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
              Cadastro
            </span>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-lg font-bold text-text-primary tracking-tight">Você é Coach ou Aluno?</h2>
            <p className="text-xs text-text-secondary">Escolha a opção que corresponde à sua atividade no Auronfit.</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Coach option card */}
            <Link 
              href="/signup/coach"
              className="p-5 bg-surface-1 border border-border-subtle hover:border-brand/50 rounded-xl flex items-center gap-4 group cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="w-12 h-12 bg-brand/10 text-brand rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-brand group-hover:text-text-on-brand transition-colors">
                <Trophy className="w-6 h-6" weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                  Coach / Personal
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
                </h3>
                <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                  Prescreva treinos, gerencie alunos, avalie evolução física e envie feedback.
                </p>
              </div>
            </Link>

            {/* Student option card */}
            <Link 
              href="/signup/aluno"
              className="p-5 bg-surface-1 border border-border-subtle hover:border-brand/50 rounded-xl flex items-center gap-4 group cursor-pointer transition-all hover:scale-[1.01]"
            >
              <div className="w-12 h-12 bg-success/10 text-success rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-success group-hover:text-white transition-colors">
                <Barbell className="w-6 h-6" weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                  Aluno / Atleta
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5" />
                </h3>
                <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                  Consulte sua ficha de treino, registre cargas e acompanhe sua dieta e evolução.
                </p>
              </div>
            </Link>
          </div>

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
