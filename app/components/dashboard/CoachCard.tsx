'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Chat, ChartLineUp } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

interface CoachCardProps {
  coachNome: string;
  coachAvatar: string | null;
  mensagensPendentes?: number;
  feedbacksPendentes?: number;
}

export function CoachCard({
  coachNome,
  coachAvatar,
  mensagensPendentes = 0,
  feedbacksPendentes = 0,
}: CoachCardProps) {
  return (
    <div className="bg-surface-1 border border-card rounded-2xl p-4 shadow-elev-1">
      <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-3">
        Seu coach
      </p>

      <div className="flex items-center gap-3 mb-4">
        {coachAvatar ? (
          <Image
            src={coachAvatar}
            alt={coachNome}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover border border-card"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-brand-subtle border border-brand-border flex items-center justify-center text-brand font-bold">
            {coachNome.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{coachNome}</p>
          <p className="text-xs text-text-tertiary">Acompanhamento individualizado</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/aluno/mensagens"
          className={cn(
            'flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all',
            'bg-surface-2 border-card hover:border-brand/30',
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {mensagensPendentes > 0 ? (
              <Chat weight="fill" className="w-4 h-4 text-brand flex-shrink-0" />
            ) : (
              <Chat className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            )}
            <span className="text-xs font-medium text-text-primary">Mensagens</span>
          </div>
          {mensagensPendentes > 0 && (
            <span className="bg-brand text-text-on-brand text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {mensagensPendentes}
            </span>
          )}
        </Link>

        <Link
          href="/aluno/feedbacks"
          className={cn(
            'flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all',
            'bg-surface-2 border-card hover:border-brand/30',
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <ChartLineUp className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            <span className="text-xs font-medium text-text-primary">Feedbacks</span>
          </div>
          {feedbacksPendentes > 0 && (
            <span className="bg-brand text-text-on-brand text-2xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {feedbacksPendentes}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
