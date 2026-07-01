"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "./components/AuthProvider";
import { 
  Barbell, 
  ChartLine, 
  FilePdf, 
  Bell, 
  ChatCircle, 
  User, 
  Ruler, 
  Play, 
  ArrowRight, 
  WhatsappLogo, 
  Envelope, 
  ShieldCheck,
  InstagramLogo,
  LinkedinLogo,
  YoutubeLogo,
  TwitterLogo,
  Handshake,
  BookOpen,
  ArrowUpRight
} from "@phosphor-icons/react";

export default function RootPage() {
  const { user, userRole, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getDashboardRoute = () => {
    if (userRole === "coach" || userRole === "super_admin") {
      return "/admin/dashboard";
    }
    return "/aluno/dashboard";
  };

  return (
    <div className="min-h-screen bg-surface-0 text-[#FAFAFA] font-sans antialiased selection:bg-[#2563EB]/30 selection:text-white">
      
      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-50 h-[72px] transition-all duration-300 flex items-center ${
        scrolled 
          ? "bg-surface-1/95 backdrop-blur-md border-b border-border-subtle shadow-lg shadow-black/20" 
          : "bg-transparent"
      }`}>
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/favicon-96x96.png"
              alt="Logo Auronfit"
              width={32}
              height={32}
              className="w-8 h-8 object-contain rounded-lg group-hover:scale-105 transition-transform"
            />
            <span className="font-display font-bold text-lg tracking-widest uppercase text-white group-hover:text-[#10B981] transition-colors">
              AURONFIT
            </span>
          </Link>

          {/* Menu Items (Desktop) */}
          <div className="hidden lg:flex items-center gap-8">
            <a href="#diferenciais" className="text-sm font-medium text-text-secondary hover:text-white transition-colors">
              Diferenciais
            </a>
            <a href="#funcionalidades" className="text-sm font-medium text-text-secondary hover:text-white transition-colors">
              Funcionalidades
            </a>
            <a href="#depoimentos" className="text-sm font-medium text-text-secondary hover:text-white transition-colors">
              Depoimentos
            </a>
            <a href="#sobre" className="text-sm font-medium text-text-secondary hover:text-white transition-colors">
              Como Funciona
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : user ? (
              <Link 
                href={getDashboardRoute()}
                className="flex items-center gap-1.5 bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] hover:from-[#3b82f6] hover:to-[#2563EB] text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-md shadow-[#2563EB]/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
              >
                Acessar Painel
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link 
                  href="/login"
                  className="text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-white transition-colors px-3 py-2"
                >
                  Entrar
                </Link>
                <Link 
                  href="/signup"
                  className="bg-gradient-to-r from-[#2563EB] to-[#1d4ed8] hover:from-[#3b82f6] hover:to-[#2563EB] text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg shadow-md shadow-[#2563EB]/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Começar Grátis
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* SECTION 1: HERO SECTION */}
      <section className="relative min-h-screen pt-[72px] flex items-center bg-gradient-to-b from-surface-1 via-surface-1 to-surface-0 overflow-hidden">
        
        {/* Glows decorativos */}
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#2563EB]/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#10B981]/5 rounded-full blur-[150px] pointer-events-none" />

        {/* Decorative Lines pattern on right edge */}
        <div className="absolute top-0 right-0 w-[120px] h-full opacity-10 pointer-events-none hidden xl:block select-none">
          <svg className="w-full h-full text-[#10B981]" fill="none" viewBox="0 0 100 1000" preserveAspectRatio="none">
            <path d="M10 0 L10 1000 M30 0 L30 1000 M50 0 L50 1000 M70 0 L70 1000 M90 0 L90 1000" stroke="currentColor" strokeWidth="2" strokeDasharray="10 15" />
          </svg>
        </div>

        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-24 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Hero Text */}
          <div className="space-y-8 max-w-xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2563EB]/15 border border-[#2563EB]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
              <span className="text-[11px] font-semibold text-[#3b82f6] uppercase tracking-wider">Consultoria Esportiva Inteligente</span>
            </div>
            
            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.08] not-italic">
              Seu treino,<br />
              seus dados<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] via-[#2563EB] to-[#10B981]">em foco.</span>
            </h1>
            
            <p className="font-sans text-base sm:text-lg text-text-secondary leading-relaxed max-w-lg">
              Auronfit conecta quem prescreve com quem evolui. Gestão inteligente de composição corporal, treinos digitais e métricas de aderência em tempo real.
            </p>

            <div className="space-y-3 pt-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link 
                  href="/signup"
                  className="bg-[#2563EB] hover:bg-[#3b82f6] text-white text-sm font-semibold px-8 py-4 rounded-xl shadow-lg shadow-[#2563EB]/30 transition-all duration-300 text-center hover:-translate-y-1 hover:shadow-xl active:translate-y-0"
                >
                  Comece Agora Grátis
                </Link>
                <a 
                  href="#diferenciais"
                  className="border border-border-subtle bg-surface-1/40 hover:bg-surface-1/80 text-white text-sm font-semibold px-8 py-4 rounded-xl transition-all duration-300 text-center hover:-translate-y-0.5"
                >
                  Conhecer Recursos
                </a>
              </div>
              <p className="text-xs text-text-tertiary flex items-center gap-2 justify-start pl-2">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" weight="fill" />
                Teste grátis por 7 dias. Sem necessidade de cartão de crédito.
              </p>
            </div>
          </div>

          {/* Hero Phone Mockups - Left slot only as requested */}
          <div className="relative flex justify-center items-center h-[580px] lg:h-[620px] w-full select-none">
            {/* Background geometric aura */}
            <div className="absolute w-[400px] h-[400px] bg-gradient-to-tr from-[#2563EB]/20 to-[#10B981]/20 rounded-full blur-[80px] -z-10" />

            {/* Mockup Container Coach (Left rotated) */}
            <div className="absolute left-[5%] md:left-[15%] lg:left-[8%] top-[10%] transform -rotate-[6deg] hover:rotate-0 hover:scale-102 hover:z-20 transition-all duration-500">
              <div className="w-[240px] sm:w-[270px] h-[480px] sm:h-[540px] border-[10px] border-zinc-800 bg-zinc-950 rounded-[36px] shadow-2xl relative flex flex-col justify-center items-center text-center p-4">
                {/* Speaker pill */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-zinc-800 rounded-full" />
                <div className="absolute top-3 right-8 w-2 h-2 bg-[#10B981]/80 rounded-full animate-pulse" />
                {/* Mockup area */}
                <div className="flex-1 w-full h-full flex flex-col justify-center items-center text-[#71717A] px-2">
                  <div className="w-10 h-10 rounded-full bg-[#2563EB]/10 border border-[#2563EB]/30 flex items-center justify-center mb-3">
                    <User className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest text-[#2563EB] uppercase mb-1">Painel do Personal</span>
                  <p className="text-[9px] text-[#52525B] leading-relaxed max-w-[160px]">
                    Área do Mockup Coach. As imagens do painel serão inseridas manualmente aqui.
                  </p>
                </div>
                {/* Home indicator */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-zinc-800 rounded-full" />
              </div>
            </div>

            {/* Mockup Container Student (Right rotated, overlapping) */}
            <div className="absolute right-[5%] md:right-[15%] lg:right-[8%] top-[15%] transform rotate-[6deg] hover:rotate-0 hover:scale-102 hover:z-20 transition-all duration-500 z-10">
              <div className="w-[240px] sm:w-[270px] h-[480px] sm:h-[540px] border-[10px] border-zinc-800 bg-zinc-950 rounded-[36px] shadow-2xl relative flex flex-col justify-center items-center text-center p-4">
                {/* Speaker pill */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-zinc-800 rounded-full" />
                <div className="absolute top-3 right-8 w-2 h-2 bg-[#2563EB]/80 rounded-full" />
                {/* Mockup area */}
                <div className="flex-1 w-full h-full flex flex-col justify-center items-center text-[#71717A] px-2">
                  <div className="w-10 h-10 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center mb-3">
                    <Barbell className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest text-[#10B981] uppercase mb-1">App do Aluno</span>
                  <p className="text-[9px] text-[#52525B] leading-relaxed max-w-[160px]">
                    Área do Mockup Aluno. As imagens do aplicativo móvel serão inseridas manualmente aqui.
                  </p>
                </div>
                {/* Home indicator */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-zinc-800 rounded-full" />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION 2: FEATURES (Coach vs. Aluno) */}
      <section id="diferenciais" className="py-24 bg-surface-0 relative overflow-hidden border-t border-border-subtle">
        
        {/* SVG background grid lines (subtle) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 items-center">
          
          {/* Column LEFT: Para o Coach */}
          <div className="space-y-6 text-left">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#10B981]">Para o Coach</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight leading-tight">
              Prescrição de treinos fácil e rápida
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-[#10B981] to-transparent rounded-full" />
            <p className="text-sm text-text-secondary leading-relaxed">
              Otimize sua rotina administrativa e foque no que realmente importa: gerar resultados excelentes e fidelizar seus alunos com inteligência de dados.
            </p>
            
            <ul className="space-y-4 pt-4">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                </div>
                <div className="text-sm text-text-secondary">
                  <span className="font-semibold text-white">Biblioteca robusta:</span> Prescreva com facilidade utilizando centenas de exercícios com vídeos integrados.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                </div>
                <div className="text-sm text-text-secondary">
                  <span className="font-semibold text-white">Envio em PDF ou Link:</span> Disponibilize as fichas de treino por PDF customizado ou link interativo de forma automatizada.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                </div>
                <div className="text-sm text-text-secondary">
                  <span className="font-semibold text-white">Composição corporal:</span> Módulo completo para antropometria, gráficos de evolução e avaliação física.
                </div>
              </li>
            </ul>
          </div>

          {/* Column CENTER: Image Mockup Placeholder */}
          <div className="flex justify-center items-center lg:py-6">
            <div className="w-full max-w-[360px] aspect-[4/5] bg-gradient-to-b from-surface-2 to-surface-1 border border-border-subtle rounded-2xl p-6 shadow-2xl relative flex flex-col justify-between overflow-hidden group">
              <div className="absolute inset-0 bg-[#2563EB]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Auronfit Studio</span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              </div>
              <div className="my-auto text-center flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center mb-4">
                  <Handshake className="w-6 h-6 text-[#2563EB]" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider mb-2">Conexão Coach-Aluno</span>
                <p className="text-[11px] text-text-secondary leading-relaxed max-w-[200px] mx-auto">
                  Área do Mockup. Foto profissional ou mockup funcional do painel integrado será inserido manualmente aqui.
                </p>
              </div>
              <div className="w-full h-8 border border-dashed border-border-subtle rounded-lg flex items-center justify-center">
                <span className="text-[9px] text-[#52525B] uppercase font-bold tracking-wider">Espaço Reservado</span>
              </div>
            </div>
          </div>

          {/* Column RIGHT: Para o Aluno */}
          <div className="space-y-6 text-left">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#2563EB]">Para o Aluno</span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight leading-tight">
              Treinos intuitivos com vídeo
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-[#2563EB] to-transparent rounded-full" />
            <p className="text-sm text-text-secondary leading-relaxed">
              Forneça uma experiência digital moderna aos seus alunos. Execuções perfeitamente ilustradas, acompanhamento de progresso e feedbacks de carga instantâneos.
            </p>

            <ul className="space-y-4 pt-4">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#2563EB]/15 border border-[#2563EB]/30 flex items-center justify-center mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                </div>
                <div className="text-sm text-text-secondary">
                  <span className="font-semibold text-white">Execução guiada:</span> Cronômetros de descanso inteligentes e vídeos explicativos em alta definição.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#2563EB]/15 border border-[#2563EB]/30 flex items-center justify-center mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                </div>
                <div className="text-sm text-text-secondary">
                  <span className="font-semibold text-white">Histórico de Carga:</span> Aluno registra o peso utilizado a cada série, gerando progressão automática.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#2563EB]/15 border border-[#2563EB]/30 flex items-center justify-center mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                </div>
                <div className="text-sm text-text-secondary">
                  <span className="font-semibold text-white">Nutrição Integrada:</span> Acesso prático ao plano alimentar com substituições recomendadas pelo coach.
                </div>
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* SECTION 3: FEATURES GRID (2x3 Cards) */}
      <section id="funcionalidades" className="py-24 bg-surface-1 relative border-t border-border-subtle">
        
        {/* Glow de fundo */}
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[30%] bg-[#10B981]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-[-10%] w-[30%] h-[30%] bg-[#2563EB]/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 text-center relative z-10">
          <div className="max-w-2xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#10B981]">Recursos Premium</span>
            <h2 className="font-display font-black text-3xl md:text-4xl text-white tracking-tight leading-tight">
              Tudo o que sua consultoria precisa para se destacar no mercado
            </h2>
            <p className="text-sm text-text-secondary">
              A evolução das planilhas de excel para um ecossistema digital inteligente, otimizando o tempo do coach e engajando o aluno.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            
            {/* Card 1: Icon (Medidas & Composição) */}
            <div className="bg-surface-2 border border-border-subtle rounded-xl p-8 hover:-translate-y-2 hover:border-[#2563EB] hover:shadow-xl hover:shadow-[#2563EB]/5 transition-all duration-300 flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] mb-6">
                  <Ruler className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-lg text-white mb-3">Medidas & Composição</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Controle de medidas corporais, dobras cutâneas e percentual de gordura. Avaliação antropométrica detalhada com visualização imediata do progresso.
                </p>
              </div>
              <div className="pt-4 border-t border-border-subtle flex items-center gap-1.5 text-[11px] font-bold text-[#10B981] uppercase tracking-wider">
                Módulo Coach + Aluno
              </div>
            </div>

            {/* Card 2: Photo Mockup (Progresso em foco) */}
            <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden hover:-translate-y-2 hover:border-[#2563EB] hover:shadow-xl hover:shadow-[#2563EB]/5 transition-all duration-300 flex flex-col min-h-[280px]">
              {/* Photo Area placeholder */}
              <div className="h-[140px] bg-gradient-to-br from-surface-1 to-surface-0 border-b border-border-subtle relative flex items-center justify-center text-center p-4">
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center mx-auto text-[#2563EB]">
                    <ChartLine className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-text-disabled uppercase font-bold tracking-widest block">Espaço para Foto / Gráfico</span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-semibold text-lg text-white mb-2">Progresso em Foco</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Comparativo visual de evolução com fotos padronizadas e gráficos dinâmicos de bioimpedância e peso.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">Métrica de Fotos</span>
              </div>
            </div>

            {/* Card 3: Icon (Relatórios PDF) */}
            <div className="bg-surface-2 border border-border-subtle rounded-xl p-8 hover:-translate-y-2 hover:border-[#2563EB] hover:shadow-xl hover:shadow-[#2563EB]/5 transition-all duration-300 flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] mb-6">
                  <FilePdf className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-lg text-white mb-3">Relatórios PDF</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Gere relatórios completos em PDF com a sua marca e envie direto para seus alunos. PDFs de treinos e planos alimentares altamente profissionais.
                </p>
              </div>
              <div className="pt-4 border-t border-border-subtle flex items-center gap-1.5 text-[11px] font-bold text-[#10B981] uppercase tracking-wider">
                Prescrição de Alta Classe
              </div>
            </div>

            {/* Card 4: Photo Mockup (Tudo sincronizado) */}
            <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden hover:-translate-y-2 hover:border-[#2563EB] hover:shadow-xl hover:shadow-[#2563EB]/5 transition-all duration-300 flex flex-col min-h-[280px]">
              {/* Photo Area placeholder */}
              <div className="h-[140px] bg-gradient-to-br from-surface-1 to-surface-0 border-b border-border-subtle relative flex items-center justify-center text-center p-4">
                <div className="space-y-1.5">
                  <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center mx-auto text-[#2563EB]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-text-disabled uppercase font-bold tracking-widest block">Espaço para Foto Sincronizada</span>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-semibold text-lg text-white mb-2">Tudo Sincronizado</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Aplicativo integrado em tempo real. O aluno conclui o treino e o coach visualiza o progresso instantaneamente.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">Atualizações em Tempo Real</span>
              </div>
            </div>

            {/* Card 5: Icon (Notificações inteligentes) */}
            <div className="bg-surface-2 border border-border-subtle rounded-xl p-8 hover:-translate-y-2 hover:border-[#2563EB] hover:shadow-xl hover:shadow-[#2563EB]/5 transition-all duration-300 flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] mb-6">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-lg text-white mb-3">Notificações Inteligentes</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Receba alertas automáticos sobre check-ins de treino dos seus alunos e relatórios de dor no painel de controle do coach.
                </p>
              </div>
              <div className="pt-4 border-t border-border-subtle flex items-center gap-1.5 text-[11px] font-bold text-[#10B981] uppercase tracking-wider">
                Fidelização Otimizada
              </div>
            </div>

            {/* Card 6: Icon (Suporte dedicado) */}
            <div className="bg-surface-2 border border-border-subtle rounded-xl p-8 hover:-translate-y-2 hover:border-[#2563EB] hover:shadow-xl hover:shadow-[#2563EB]/5 transition-all duration-300 flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] mb-6">
                  <ChatCircle className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-lg text-white mb-3">Suporte Dedicado</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Não fique na mão. Conte com suporte técnico próximo via WhatsApp para você e para os seus alunos, além de guias rápidos e tutoriais passo-a-passo.
                </p>
              </div>
              <div className="pt-4 border-t border-border-subtle flex items-center gap-1.5 text-[11px] font-bold text-[#10B981] uppercase tracking-wider">
                WhatsApp + Ajuda Online
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 4: TESTIMONIALS */}
      <section id="depoimentos" className="py-24 bg-surface-0 relative overflow-hidden border-t border-border-subtle">
        
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16">
            <div className="text-left space-y-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#2563EB]">Social Proof</span>
              <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight leading-tight">
                Veja o que dizem sobre o AURON
              </h2>
            </div>
            <a 
              href="https://wa.me/556781232717" 
              target="_blank"
              rel="noopener noreferrer"
              className="group text-sm font-semibold text-[#2563EB] hover:text-[#3b82f6] transition-colors flex items-center gap-1.5 underline underline-offset-4"
            >
              Falar com nossa comunidade
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>

          {/* Testimonial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16 text-left">
            
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-xl flex flex-col justify-between text-[#1F2937] border border-gray-100 hover:scale-[1.01] transition-transform duration-300">
              <div>
                {/* Dumbbell Icon in quote area */}
                <div className="w-10 h-10 rounded-full bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] mb-6">
                  <ShieldCheck className="w-5 h-5" weight="fill" />
                </div>
                <p className="font-sans text-sm leading-relaxed text-[#4B5563] mb-6 not-italic">
                  &quot;O Auronfit revolucionou a gestão da minha consultoria esportiva. Consigo acompanhar a composição corporal e o progresso de carga de mais de 100 alunos sem me perder em planilhas ou PDFs avulsos.&quot;
                </p>
              </div>
              <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
                <div className="w-11 h-11 rounded-full bg-[#2563EB] text-white font-bold flex items-center justify-center text-sm shadow-md">
                  CS
                </div>
                <div>
                  <h4 className="font-sans font-bold text-sm text-[#111827]">Dr. Carlos Silva</h4>
                  <p className="text-[11px] text-[#6B7280]">Personal Trainer & Coach</p>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-xl flex flex-col justify-between text-[#1F2937] border border-gray-100 hover:scale-[1.01] transition-transform duration-300">
              <div>
                <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center text-[#10B981] mb-6">
                  <Barbell className="w-5 h-5" weight="fill" />
                </div>
                <p className="font-sans text-sm leading-relaxed text-[#4B5563] mb-6 not-italic">
                  &quot;Treinar usando o aplicativo é infinitamente melhor do que ficar lendo PDF de treino no WhatsApp. Eu consigo registrar minhas cargas facilmente de forma rápida e ver meu progresso físico nos gráficos.&quot;
                </p>
              </div>
              <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
                <div className="w-11 h-11 rounded-full bg-[#10B981] text-white font-bold flex items-center justify-center text-sm shadow-md">
                  ML
                </div>
                <div>
                  <h4 className="font-sans font-bold text-sm text-[#111827]">Mariana Lima</h4>
                  <p className="text-[11px] text-[#6B7280]">Aluna de Consultoria Online</p>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-xl flex flex-col justify-between text-[#1F2937] border border-gray-100 hover:scale-[1.01] transition-transform duration-300">
              <div>
                <div className="w-10 h-10 rounded-full bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] mb-6">
                  <Ruler className="w-5 h-5" weight="fill" />
                </div>
                <p className="font-sans text-sm leading-relaxed text-[#4B5563] mb-6 not-italic">
                  &quot;A funcionalidade de gerar relatórios em PDF com a minha própria identidade visual me ajudou a valorizar o meu trabalho e, consequentemente, aumentar a retenção dos meus alunos de alta performance.&quot;
                </p>
              </div>
              <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
                <div className="w-11 h-11 rounded-full bg-[#2563EB] text-white font-bold flex items-center justify-center text-sm shadow-md">
                  AS
                </div>
                <div>
                  <h4 className="font-sans font-bold text-sm text-[#111827]">Amanda Souza</h4>
                  <p className="text-[11px] text-[#6B7280]">Coach & Nutricionista</p>
                </div>
              </div>
            </div>

          </div>

          {/* Center professional photo mockup - Slot only */}
          <div className="flex justify-center my-12">
            <div className="w-full max-w-2xl h-[300px] bg-gradient-to-br from-surface-2 to-surface-1 border border-border-subtle rounded-2xl flex flex-col items-center justify-center text-center p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-[#10B981]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="w-12 h-12 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] mb-4">
                <User className="w-6 h-6" />
              </div>
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2">Comunidade de Resultados</h3>
              <p className="text-xs text-text-secondary max-w-[400px] leading-relaxed mb-4">
                Área do Mockup Central. Uma fotografia profissional representando coaches e alunos treinando ou usando a plataforma será inserida manualmente aqui.
              </p>
              <div className="border border-dashed border-border-subtle rounded-lg px-4 py-1 text-[9px] text-text-disabled uppercase font-bold tracking-widest">
                Espaço Reservado para Imagem da Comunidade
              </div>
            </div>
          </div>

          {/* Headline quote below photo */}
          <div className="text-center py-6">
            <h3 className="font-display font-bold text-2xl md:text-3xl text-[#2563EB] leading-relaxed not-italic">
              &quot;O App que simplifica a prescrição de treinos e potencializa seus resultados de evolução.&quot;
            </h3>
          </div>

        </div>
      </section>

      {/* SECTION 5: VIDEO + CTA */}
      <section id="sobre" className="py-24 bg-surface-0 relative overflow-hidden border-t border-border-subtle">
        
        {/* Glow */}
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-[#2563EB]/5 rounded-full blur-[180px] pointer-events-none" />

        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10 text-center space-y-16">
          
          {/* Header */}
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="font-display font-black text-4xl md:text-5xl text-white tracking-tight leading-tight">
              A AURON quer movimentar seus resultados
            </h2>
            <p className="font-sans text-base md:text-lg text-text-secondary leading-relaxed max-w-xl mx-auto">
              Otimizamos a sua rotina de prescrição para que você fidelize mais alunos, ganhe autoridade e aumente seu faturamento como personal de sucesso.
            </p>
          </div>

          {/* Video Player Mockup Slot */}
          <div className="relative flex justify-center items-center py-6">
            {/* Decorative lines left/right of video */}
            <div className="absolute left-[2%] w-[12%] h-[150px] opacity-10 pointer-events-none hidden xl:block">
              <svg className="w-full h-full text-[#10B981]" fill="none" viewBox="0 0 100 100">
                <line x1="0" y1="10" x2="100" y2="10" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
                <line x1="0" y1="90" x2="100" y2="90" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
              </svg>
            </div>
            <div className="absolute right-[2%] w-[12%] h-[150px] opacity-10 pointer-events-none hidden xl:block">
              <svg className="w-full h-full text-[#10B981]" fill="none" viewBox="0 0 100 100">
                <line x1="0" y1="10" x2="100" y2="10" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
                <line x1="0" y1="90" x2="100" y2="90" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
              </svg>
            </div>

            <div className="w-full max-w-[800px] aspect-video bg-gradient-to-tr from-surface-0 to-surface-2 border border-border-subtle rounded-2xl flex flex-col justify-center items-center relative overflow-hidden group shadow-2xl">
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300" />
              {/* Play button overlay */}
              <button 
                type="button"
                className="w-16 sm:w-20 h-16 sm:h-20 rounded-full bg-[#2563EB] hover:bg-[#3b82f6] text-white flex items-center justify-center shadow-lg shadow-[#2563EB]/40 group-hover:scale-105 active:scale-95 transition-all duration-300 relative z-10"
                aria-label="Assistir Vídeo Demonstrativo"
              >
                <Play className="w-8 h-8 fill-current ml-1" />
              </button>
              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center z-10">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Vídeo Demonstrativo Auronfit</span>
                <span className="text-[10px] text-text-disabled uppercase font-bold tracking-widest border border-dashed border-border-subtle px-2 py-0.5 rounded">Área do Mockup Vídeo</span>
              </div>
            </div>
          </div>

          <div className="pt-8">
            <h3 className="font-display font-black text-2xl md:text-3xl text-white tracking-tight leading-tight mb-12">
              Pronto para elevar o nível da sua consultoria?
            </h3>
            
            {/* Bottom 2 columns: phone image slot | CTA card */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-4xl mx-auto items-center text-left">
              
              {/* Left Column: Phone mockup slot */}
              <div className="flex justify-center">
                <div className="w-[260px] h-[520px] border-[10px] border-zinc-800 bg-zinc-950 rounded-[36px] shadow-2xl relative flex flex-col justify-center items-center text-center p-4">
                  {/* Speaker pill */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-zinc-800 rounded-full" />
                  {/* Mockup area */}
                  <div className="flex-1 w-full h-full flex flex-col justify-center items-center text-[#71717A] px-2">
                    <div className="w-10 h-10 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center mb-3">
                      <Barbell className="w-5 h-5 text-[#10B981]" />
                    </div>
                    <span className="text-[10px] font-bold tracking-widest text-[#10B981] uppercase mb-1">Mockup Smartphone</span>
                    <p className="text-[9px] text-[#52525B] leading-relaxed max-w-[150px]">
                      Espaço reservado para o screenshot do aplicativo do aluno na execução de treino.
                    </p>
                  </div>
                  {/* Home indicator */}
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-zinc-800 rounded-full" />
                </div>
              </div>

              {/* Right Column: CTA card */}
              <div className="bg-surface-2 border border-border-subtle rounded-2xl p-8 sm:p-10 shadow-2xl space-y-6 flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="font-display font-bold text-2xl text-white">Comece sua jornada</h4>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Experimente gratuitamente todas as funcionalidades por 7 dias. Se preferir agendar uma conversa com nosso time para tirar dúvidas, estamos à disposição no WhatsApp.
                  </p>
                </div>
                
                <div className="space-y-4 pt-4">
                  <Link 
                    href="/signup"
                    className="w-full bg-[#2563EB] hover:bg-[#3b82f6] text-white text-sm font-semibold py-3.5 rounded-xl shadow-lg shadow-[#2563EB]/20 transition-all duration-300 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                  >
                    Iniciar Teste Grátis
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a 
                    href="https://wa.me/556781232717"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full border border-border-subtle bg-surface-1/40 hover:bg-surface-1/80 text-[#10B981] text-sm font-semibold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <WhatsappLogo className="w-5 h-5 fill-current" />
                    Agendar Conversa Comercial
                  </a>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* SECTION 6: FOOTER */}
      <footer className="bg-surface-1 border-t-4 border-[#10B981] relative overflow-hidden select-none">
        
        {/* Resource area */}
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 pt-20 pb-12">
          
          <div className="text-center space-y-4 mb-16">
            <h2 className="font-display font-black text-3xl md:text-4xl text-white tracking-tight">
              Te ajudamos a crescer, personal
            </h2>
            <p className="text-sm text-text-secondary max-w-md mx-auto">
              Nossa comunidade de personal trainers oferece recursos exclusivos para acelerar a sua carreira e negócios de consultoria.
            </p>
          </div>

          {/* Resources cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-border-subtle pb-16 text-left">
            {/* Card 1 */}
            <div className="group cursor-pointer space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition-all duration-300">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="font-sans font-bold text-sm text-white group-hover:text-[#10B981] transition-colors">
                Blog do Personal Trainer
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Acesse ideias de posts, frases inspiracionais, marketing para personal e estratégias de captação de alunos.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group cursor-pointer space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#10B981] group-hover:bg-[#10B981] group-hover:text-white transition-all duration-300">
                <FilePdf className="w-5 h-5" />
              </div>
              <h4 className="font-sans font-bold text-sm text-white group-hover:text-[#10B981] transition-colors">
                Guias & Templates de Prescrição
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Baixe modelos prontos de anamnese, templates de treino e e-books sobre antropometria e fisiologia aplicadas.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group cursor-pointer space-y-3">
              <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition-all duration-300">
                <ChatCircle className="w-5 h-5" />
              </div>
              <h4 className="font-sans font-bold text-sm text-white group-hover:text-[#10B981] transition-colors">
                Central de Ajuda & FAQ
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Tutoriais completos em vídeo mostrando como configurar sua conta, importar alunos e extrair relatórios da plataforma.
              </p>
            </div>
          </div>

          {/* Social and download buttons */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 py-10 border-b border-border-subtle">
            {/* Social */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Acompanhe a AURON</span>
              <div className="flex items-center gap-3">
                <a href="#" className="w-8 h-8 rounded-lg bg-[#142033] border border-[#2d3f52] flex items-center justify-center text-text-secondary hover:text-[#10B981] hover:border-[#10B981] transition-all">
                  <InstagramLogo className="w-4 h-4" />
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-[#142033] border border-[#2d3f52] flex items-center justify-center text-text-secondary hover:text-[#10B981] hover:border-[#10B981] transition-all">
                  <LinkedinLogo className="w-4 h-4" />
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-[#142033] border border-[#2d3f52] flex items-center justify-center text-text-secondary hover:text-[#10B981] hover:border-[#10B981] transition-all">
                  <TwitterLogo className="w-4 h-4" />
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-[#142033] border border-[#2d3f52] flex items-center justify-center text-text-secondary hover:text-[#10B981] hover:border-[#10B981] transition-all">
                  <YoutubeLogo className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Store buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Baixe o aplicativo</span>
              <div className="flex items-center gap-3">
                {/* Mockup App Store badge */}
                <div className="h-10 px-4 rounded-lg bg-surface-0 border border-border-subtle flex items-center gap-2 text-white hover:scale-102 transition-transform cursor-pointer">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-[9px] font-bold">A</span>
                  </div>
                  <div className="text-left leading-none">
                    <span className="text-[7px] text-text-disabled uppercase block">Download on the</span>
                    <span className="text-[10px] font-bold block">App Store</span>
                  </div>
                </div>
                {/* Mockup Play Store badge */}
                <div className="h-10 px-4 rounded-lg bg-surface-0 border border-border-subtle flex items-center gap-2 text-white hover:scale-102 transition-transform cursor-pointer">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-[9px] font-bold">G</span>
                  </div>
                  <div className="text-left leading-none">
                    <span className="text-[7px] text-text-disabled uppercase block">GET IT ON</span>
                    <span className="text-[10px] font-bold block">Google Play</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legal */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-10 text-center sm:text-left text-xs text-text-disabled">
            <span>AURON © 2026 | Todos os direitos reservados.</span>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors flex items-center gap-1">
                <Envelope className="w-3.5 h-3.5" />
                suporte@auronfit.com.br
              </a>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
