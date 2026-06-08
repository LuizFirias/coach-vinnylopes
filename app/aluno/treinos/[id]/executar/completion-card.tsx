'use client';

import { Trophy } from '@phosphor-icons/react';

type CardTheme = 'dark' | 'light' | 'transparent';

interface CompletionCardProps {
  theme: CardTheme;
  nomeRotina: string;
  duracao: number;
  volume: number;
  sets: number;
  exercicios: Array<{ nome: string }>;
  prsCount: number;
  coachUsername: string;
}

const themeConfig = {
  dark: {
    bg: '#0F1419',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    accentBlue: '#4A9FFF',
    accentYellow: '#FFD700',
  },
  light: {
    bg: '#FFFFFF',
    text: '#000000',
    textSecondary: '#666666',
    accentBlue: '#4A9FFF',
    accentYellow: '#FFD700',
  },
  transparent: {
    bg: 'transparent',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    accentBlue: '#4A9FFF',
    accentYellow: '#FFD700',
  },
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m${secs > 0 ? secs + 's' : ''}`;
};

const formatVolume = (kg: number): string => {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)} ton`;
  }
  return `${kg.toFixed(1)} kg`;
};

export default function CompletionCard({
  theme,
  nomeRotina,
  duracao,
  volume,
  sets,
  exercicios,
  prsCount,
  coachUsername,
}: CompletionCardProps) {
  const config = themeConfig[theme];

  return (
    <div
      style={{
        width: '1080px',
        height: '1920px',
        backgroundColor: config.bg,
        color: config.text,
        display: 'flex',
        flexDirection: 'column',
        padding: '60px',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        gap: '40px',
        justifyContent: 'space-between',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '64px',
            fontWeight: 'bold',
            margin: '0 0 20px 0',
            letterSpacing: '-1px',
          }}
        >
          {nomeRotina}
        </h1>
        <div
          style={{
            fontSize: '24px',
            color: config.textSecondary,
            margin: 0,
          }}
        >
          Treino Concluído
        </div>
      </div>

      {/* Main Metrics */}
      <div style={{ textAlign: 'center', gap: '40px', display: 'flex', flexDirection: 'column' }}>
        {/* Duration */}
        <div>
          <div style={{ fontSize: '56px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
            {formatDuration(duracao)}
          </div>
          <div style={{ fontSize: '20px', color: config.textSecondary, margin: 0 }}>
            Duration
          </div>
        </div>

        {/* Volume */}
        <div>
          <div style={{ fontSize: '56px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
            {formatVolume(volume)}
          </div>
          <div style={{ fontSize: '20px', color: config.textSecondary, margin: 0 }}>
            Total Volume
          </div>
        </div>

        {/* Records */}
        {prsCount > 0 && (
          <div>
            <div
              style={{
                fontSize: '56px',
                fontWeight: 'bold',
                margin: '0 0 10px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              {prsCount}
              <Trophy size={48} weight="fill" color={config.accentYellow} />
            </div>
            <div style={{ fontSize: '20px', color: config.textSecondary, margin: 0 }}>
              Personal Records
            </div>
          </div>
        )}

        {/* Sets */}
        <div>
          <div style={{ fontSize: '56px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
            {sets}
          </div>
          <div style={{ fontSize: '20px', color: config.textSecondary, margin: 0 }}>
            Sets Completed
          </div>
        </div>
      </div>

      {/* Exercises List */}
      <div style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '18px', color: config.textSecondary, textTransform: 'uppercase', letterSpacing: '1px' }}>
          Exercícios
        </div>
        {exercicios.slice(0, 6).map((ex, idx) => (
          <div
            key={idx}
            style={{
              fontSize: '20px',
              color: config.accentBlue,
              margin: '4px 0',
            }}
          >
            • {ex.nome}
          </div>
        ))}
        {exercicios.length > 6 && (
          <div style={{ fontSize: '18px', color: config.textSecondary }}>
            ...and {exercicios.length - 6} more
          </div>
        )}
      </div>

      {/* Footer - Branding */}
      <div
        style={{
          textAlign: 'center',
          paddingTop: '20px',
          borderTop: `1px solid ${config.textSecondary}40`,
        }}
      >
        <div style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
          COACH VINNY
        </div>
        <div style={{ fontSize: '20px', color: config.textSecondary, margin: 0 }}>
          @{coachUsername}
        </div>
      </div>
    </div>
  );
}
