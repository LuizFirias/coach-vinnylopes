'use client';

import { Trophy } from '@phosphor-icons/react';
import MuscleChart from './muscle-chart';

type CardTheme = 'dark' | 'light' | 'transparent' | 'muscle-dark' | 'muscle-light' | 'muscle-transparent';

interface CompletionCardProps {
  theme: CardTheme;
  nomeRotina: string;
  duracao: number;
  volume: number;
  sets: number;
  exercicios: Array<{ nome: string; grupo_muscular?: string; series: Array<{ completado: boolean }> }>;
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
    statBorder: 'rgba(255,255,255,0.12)',
  },
  light: {
    bg: '#FFFFFF',
    text: '#000000',
    textSecondary: '#666666',
    accentBlue: '#4A9FFF',
    accentYellow: '#FFD700',
    statBorder: 'rgba(0,0,0,0.10)',
  },
  transparent: {
    bg: 'transparent',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    accentBlue: '#4A9FFF',
    accentYellow: '#FFD700',
    statBorder: 'rgba(255,255,255,0.15)',
  },
  'muscle-dark': {
    bg: '#0F1419',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    accentBlue: '#7DC1FF',
    accentYellow: '#F4B400',
    statBorder: 'rgba(255,255,255,0.12)',
  },
  'muscle-light': {
    bg: '#F3F4F6',
    text: '#111827',
    textSecondary: '#6B7280',
    accentBlue: '#1D8CE0',
    accentYellow: '#F4B400',
    statBorder: 'rgba(0,0,0,0.10)',
  },
  'muscle-transparent': {
    bg: 'transparent',
    text: '#FFFFFF',
    textSecondary: '#D1D5DB',
    accentBlue: '#7DC1FF',
    accentYellow: '#F4B400',
    statBorder: 'rgba(255,255,255,0.15)',
  },
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m${secs > 0 ? secs + 's' : ''}`;
};

const formatVolume = (kg: number): string => {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${kg.toFixed(1)}kg`;
};

// ─── Constantes do card ────────────────────────────────────────────────────────
const CARD_W = 1080;
const CARD_H = 1080;
const PAD_X = 64;   // padding horizontal
const PAD_Y = 56;   // padding vertical top/bottom
const INNER_W = CARD_W - PAD_X * 2; // 952px disponíveis

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
  const isMuscle = theme.startsWith('muscle-');

  // Colunas e limite de exercícios visíveis
  // Sem boneco: 1 única coluna vertical de até 10 exercícios
  // Com boneco: lista vertical na esquerda de até 8 exercícios (boneco do lado direito)
  const maxEx = isMuscle ? 8 : 10;
  const visibleEx = exercicios.slice(0, maxEx);
  const hiddenCount = exercicios.length - visibleEx.length;

  return (
    <div
      style={{
        width: `${CARD_W}px`,
        height: `${CARD_H}px`,
        backgroundColor: config.bg,
        color: config.text,
        display: 'flex',
        flexDirection: 'column',
        padding: `${PAD_Y}px ${PAD_X}px`,
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* ── Título ── */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '20px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: '56px',
            fontWeight: 800,
            letterSpacing: '-1.5px',
            lineHeight: '76px', 
            color: config.text,
            textAlign: 'center',
            maxWidth: `${INNER_W}px`,
            margin: '0 auto 6px',
          }}
        >
          {nomeRotina}
        </div>
        <div
          style={{
            fontSize: '18px',
            color: config.textSecondary,
            letterSpacing: '3px',
            textTransform: 'uppercase',
          }}
        >
          Treino Concluído
        </div>
      </div>

      {/* ── Stats ─ Distância reduzida (width: 600px) para alinhar bem os blocos perto do centro ── */}
      <table
        style={{
          width: '600px', // Aproximou ainda mais os ícones/stats
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          margin: '0 auto 20px', 
          flexShrink: 0,
        }}
      >
        <tbody>
          <tr>
            {[
              { label: 'Duração', value: formatDuration(duracao) },
              { label: 'Volume', value: formatVolume(volume) },
              { label: 'Séries', value: String(sets) },
              ...(prsCount > 0
                ? [{ label: 'Records', value: String(prsCount), trophy: true }]
                : []),
            ].map((stat) => (
              <td
                key={stat.label}
                style={{
                  textAlign: 'center',
                  verticalAlign: 'top',
                }}
              >
                <div
                  style={{
                    fontSize: '48px',
                    fontWeight: 800,
                    margin: 0,
                    lineHeight: '64px',
                    color: config.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {stat.value}
                  {stat.trophy && (
                    <Trophy size={36} weight="fill" color={config.accentYellow} style={{ verticalAlign: 'middle' }} />
                  )}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    color: config.textSecondary,
                    marginTop: '4px',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    lineHeight: '20px',
                  }}
                >
                  {stat.label}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* ── Conteúdo Principal (Exercícios em lista de coluna única para ambos os tipos de card) ── */}
      {isMuscle ? (
        <table
          style={{
            width: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'collapse',
            flex: 1,
            marginTop: '8px',
          }}
        >
          <tbody>
            <tr>
              {/* Coluna Esquerda: Lista vertical de Exercícios (um embaixo do outro) */}
              <td
                style={{
                  width: '52%',
                  verticalAlign: 'top',
                  paddingRight: '24px',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    color: config.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    marginBottom: '12px',
                    lineHeight: '20px',
                  }}
                >
                  Exercícios
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {visibleEx.map((ex, idx) => {
                    const setsFeitos =
                      ex.series.filter((s) => s.completado).length || ex.series.length;
                    return (
                      <div key={idx} style={{ whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            color: config.accentBlue,
                            fontWeight: 700,
                            fontSize: '22px',
                            marginRight: '8px',
                            display: 'inline-block',
                            verticalAlign: 'middle',
                            lineHeight: '32px',
                          }}
                        >
                          {setsFeitos}x
                        </span>
                        <span
                          style={{
                            fontWeight: 500,
                            fontSize: '22px',
                            color: config.text,
                            display: 'inline-block',
                            verticalAlign: 'middle',
                            lineHeight: '32px',
                          }}
                        >
                          {ex.nome}
                        </span>
                      </div>
                    );
                  })}
                  {hiddenCount > 0 && (
                    <div
                      style={{
                        fontSize: '18px',
                        color: config.textSecondary,
                        marginTop: '8px',
                        lineHeight: '24px',
                      }}
                    >
                      +{hiddenCount} exercícios
                    </div>
                  )}
                </div>
              </td>

              {/* Coluna Direita: Boneco preenchendo os músculos */}
              <td
                style={{
                  width: '48%',
                  verticalAlign: 'top',
                  textAlign: 'center',
                  paddingTop: '6px',
                }}
              >
                <div style={{ width: '100%', height: '340px', display: 'inline-block' }}>
                  <MuscleChart exercicios={exercicios} dualView forExport />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        /* Sem boneco: Também em lista de coluna única vertical, alinhada à esquerda */
        <div style={{ flex: 1, marginTop: '8px' }}>
          <div
            style={{
              fontSize: '14px',
              color: config.textSecondary,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '12px',
              lineHeight: '20px',
            }}
          >
            Exercícios
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {visibleEx.map((ex, idx) => {
              const setsFeitos =
                ex.series.filter((s) => s.completado).length || ex.series.length;
              return (
                <div key={idx} style={{ whiteSpace: 'nowrap' }}>
                  <span
                    style={{
                      color: config.accentBlue,
                      fontWeight: 700,
                      fontSize: '22px',
                      marginRight: '8px',
                      display: 'inline-block',
                      verticalAlign: 'middle',
                      lineHeight: '32px',
                    }}
                  >
                    {setsFeitos}x
                  </span>
                  <span
                    style={{
                      fontWeight: 500,
                      fontSize: '22px',
                      color: config.text,
                      display: 'inline-block',
                      verticalAlign: 'middle',
                      lineHeight: '32px',
                    }}
                  >
                    {ex.nome}
                  </span>
                </div>
              );
            })}
          </div>

          {hiddenCount > 0 && (
            <div
              style={{
                fontSize: '18px',
                color: config.textSecondary,
                marginTop: '8px',
                lineHeight: '24px',
              }}
            >
              +{hiddenCount} exercícios
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: `1.5px solid ${config.statBorder}`,
          paddingTop: '18px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: '30px',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            lineHeight: '36px',
          }}
        >
          COACH VINNY
        </div>
        <div style={{ fontSize: '24px', color: config.textSecondary, lineHeight: '30px' }}>
          @{coachUsername || 'vinnyloppes'}
        </div>
      </div>
    </div>
  );
}
