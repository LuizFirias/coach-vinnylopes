'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { getTodayBrazil } from '@/lib/dateUtils';
import { Check, ChevronRight, Dumbbell } from 'lucide-react';
import Link from 'next/link';

interface DayStatus {
  date: Date;
  status: 'completed' | 'current' | 'future' | 'missed';
  label: string; // Ex: 'Seg', 'Ter'
  dayNumber: number;
}

interface GamifiedTrackProps {
  historicoValido: string[]; // array de datas (YYYY-MM-DD) com treino concluído na semana
  treinoHojeStatus: 'pendente' | 'concluido' | 'off' | 'sem-plano';
}

export function GamifiedTrack({ historicoValido, treinoHojeStatus }: GamifiedTrackProps) {
  const trackDays = useMemo(() => {
    const today = new Date(getTodayBrazil() + 'T00:00:00');
    const todayNum = today.getDay(); // 0 = Domingo, 1 = Segunda
    
    // Ajustar para segunda-feira como início da semana (0 = Segunda, 6 = Domingo)
    const diffToMonday = todayNum === 0 ? 6 : todayNum - 1;
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - diffToMonday);

    const days: DayStatus[] = [];
    const labels = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      const dateStr = currentDate.toISOString().slice(0, 10);
      
      let status: DayStatus['status'] = 'future';
      
      const isPast = currentDate < today;
      const isToday = currentDate.getTime() === today.getTime();
      const isCompleted = historicoValido.includes(dateStr);

      if (isCompleted) {
        status = 'completed';
      } else if (isToday) {
        status = 'current';
      } else if (isPast) {
        status = 'missed';
      }

      days.push({
        date: currentDate,
        status,
        label: labels[i],
        dayNumber: currentDate.getDate(),
      });
    }

    return days;
  }, [historicoValido]);

  return (
    <div className="relative py-4 pl-2 font-sans bg-[#050505]">
      <div className="flex flex-col gap-8 relative">
        {trackDays.map((day, index) => {
          const isLast = index === trackDays.length - 1;
          const lineIsGold = day.status === 'completed';

          return (
            <div key={day.date.toISOString()} className="relative flex items-center gap-6 group">
              {/* Linha vertical conectando os nós */}
              {!isLast && (
                <div 
                  className={cn(
                    "absolute left-[15px] top-[32px] w-0.5 h-10 transition-colors duration-500",
                    lineIsGold ? "bg-[#d6ac56] shadow-[0_0_8px_rgba(214,172,86,0.6)]" : "bg-[#1f1f1f]"
                  )} 
                />
              )}

              {/* Nó Circular */}
              <div className="relative z-10 shrink-0">
                <div 
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 font-inter",
                    day.status === 'completed' && "bg-[#d6ac56] shadow-[0_0_15px_rgba(214,172,86,0.4)] text-black",
                    day.status === 'current' && "bg-[#050505] border-2 border-[#d6ac56] shadow-[inset_0_0_10px_rgba(214,172,86,0.3)] animate-pulse text-[#d6ac56]",
                    day.status === 'future' && "bg-[#050505] border-2 border-[#1f1f1f] text-[#444444]",
                    day.status === 'missed' && "bg-[#151515] border border-[#1f1f1f] text-[#555555]"
                  )}
                >
                  {day.status === 'completed' ? (
                    <Check size={16} strokeWidth={4} />
                  ) : (
                    <span className="text-[11px] font-black">{day.dayNumber}</span>
                  )}
                </div>
              </div>

              {/* Conteúdo à direita do nó */}
              <div className="flex-1 flex items-center justify-between min-w-0 pr-4">
                <div className="flex flex-col font-inter">
                  <span className={cn(
                    "text-sm font-black uppercase tracking-widest",
                    day.status === 'completed' ? "text-[#f0cf7a]" :
                    day.status === 'current' ? "text-white" :
                    day.status === 'future' ? "text-[#555555]" : "text-[#666666]"
                  )}>
                    {day.label}
                  </span>
                  {day.status === 'current' && (
                    <span className="text-[10px] text-[#d6ac56] uppercase tracking-[0.2em] font-bold mt-0.5 opacity-80">Hoje</span>
                  )}
                </div>

                {/* Botão de Ação Flutuante para o Dia Atual */}
                {day.status === 'current' && (
                  <Link 
                    href="/aluno/treinos"
                    className={cn(
                      "flex items-center gap-2 px-5 py-3 rounded-full font-inter font-black text-[11px] uppercase tracking-widest transition-all",
                      treinoHojeStatus === 'concluido' || treinoHojeStatus === 'off' 
                        ? "bg-[#151515] text-[#888888] border border-[#222222]" 
                        : "bg-gradient-to-r from-[#d6ac56] to-[#f0cf7a] text-black shadow-[0_0_20px_rgba(214,172,86,0.3)] hover:scale-105 active:scale-95"
                    )}
                  >
                    {treinoHojeStatus === 'concluido' ? 'Concluído' : 
                     treinoHojeStatus === 'off' ? 'Descanso' : 
                     <><Dumbbell size={14} /> Treinar</>}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}