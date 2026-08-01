'use client';

import Image from 'next/image';
import {
  Barbell,
  Drop,
  ForkKnife,
  Heartbeat,
  type Icon,
} from '@phosphor-icons/react';
import DashboardTopActions from '@/app/components/DashboardTopActions';
import { dashboardColors } from '@/lib/tokens/dashboardColors';
import { cn } from '@/lib/utils/cn';

interface HabitData {
  atual: number;
  meta: number;
}

interface HeroHeaderProps {
  userName: string;
  avatarUrl?: string | null;
  showNotificationBadge?: boolean;
  chatNaoLidas?: number;
  notificationsHref?: string;
  agua: HabitData;
  dieta: HabitData;
  treinos: HabitData;
  cardio: HabitData;
}

function CurvedDivider() {
  return (
    <div className="pointer-events-none relative z-0 -mb-7 w-full leading-[0]" aria-hidden>
      <svg viewBox="0 0 400 48" preserveAspectRatio="none" className="block h-12 w-full">
        <path
          d="M0,48 L0,24 Q200,0 400,24 L400,48 Z"
          className="fill-[var(--dash-curve)]"
        />
      </svg>
    </div>
  );
}

function HabitBar({
  agua,
  dieta,
  treinos,
  cardio,
}: Omit<HeroHeaderProps, 'userName' | 'avatarUrl' | 'showNotificationBadge' | 'chatNaoLidas' | 'notificationsHref'>) {
  const habits: { icon: Icon; label: string; value: string; done: boolean }[] = [
    {
      icon: Drop,
      label: 'Água',
      value: `${agua.atual}/${agua.meta}`,
      done: agua.meta > 0 && agua.atual >= agua.meta,
    },
    {
      icon: ForkKnife,
      label: 'Dieta',
      value: dieta.meta > 0 ? `${dieta.atual}/${dieta.meta}` : '—',
      done: dieta.meta > 0 && dieta.atual >= dieta.meta,
    },
    {
      icon: Barbell,
      label: 'Treino',
      value: `${treinos.atual}/${treinos.meta}`,
      done: treinos.meta > 0 && treinos.atual >= treinos.meta,
    },
    {
      icon: Heartbeat,
      label: 'Cardio',
      value: cardio.meta > 0 ? `${cardio.atual}/${cardio.meta}` : '—',
      done: cardio.meta > 0 && cardio.atual >= cardio.meta,
    },
  ];

  return (
    <div className="dashboard-habit-bar flex rounded-[14px] px-2 py-3">
      {habits.map((habit) => {
        const IconComponent = habit.icon;
        return (
          <div key={habit.label} className="flex flex-1 flex-col items-center gap-1">
            <IconComponent
              className="h-4 w-4"
              weight="regular"
              style={{ color: dashboardColors.accent }}
            />
            <span
              className={cn(
                'text-xs font-semibold',
                habit.done ? 'text-emerald-500' : 'dashboard-text-muted',
              )}
            >
              {habit.value}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide dashboard-text-subtle">
              {habit.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function HeroHeader({
  userName,
  avatarUrl,
  showNotificationBadge,
  chatNaoLidas,
  notificationsHref = '/aluno/chat',
  agua,
  dieta,
  treinos,
  cardio,
}: HeroHeaderProps) {
  const primeiroNome = userName.split(' ')[0];
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div>
      <div
        className="px-5 pb-2 pt-4"
        style={{
          background: 'linear-gradient(180deg, var(--dash-hero-from) 0%, var(--dash-hero-to) 100%)',
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2"
              style={{ borderColor: dashboardColors.accent }}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={primeiroNome}
                  width={44}
                  height={44}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-lg font-bold dashboard-text"
                  style={{ backgroundColor: 'var(--dash-today-bg)' }}
                >
                  {primeiroNome.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium capitalize tracking-wide dashboard-text-subtle">
                {hoje}
              </p>
              <h1 className="mt-0.5 text-xl font-bold dashboard-text">
                Olá,{' '}
                <span style={{ color: dashboardColors.accent }}>{primeiroNome}</span>
              </h1>
            </div>
          </div>
          <DashboardTopActions
            variant="hero"
            showNotificationBadge={showNotificationBadge}
            chatNaoLidas={chatNaoLidas}
            notificationsHref={notificationsHref}
          />
        </div>

        <HabitBar agua={agua} dieta={dieta} treinos={treinos} cardio={cardio} />
      </div>
      <CurvedDivider />
    </div>
  );
}
