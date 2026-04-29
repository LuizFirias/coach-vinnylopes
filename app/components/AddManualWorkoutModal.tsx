"use client";

import React, { useState, useEffect } from"react";
import { X, Plus, Clock } from"lucide-react";
import { supabaseClient } from"@/lib/supabaseClient";
import { getTodayBrazil, getTodayBrazilDate, toBrazilDateString } from '@/lib/dateUtils';

interface AddManualWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  onWorkoutAdded: () => void;
}

type WorkoutType ="musculacao" |"cardio" | null;

const WORKOUT_POINTS = {
  musculacao: 20,
  cardio: {"10-19": 10,"20-49": 20,"50+": 30,
  },
};

export default function AddManualWorkoutModal({
  isOpen,
  onClose,
  date,
  onWorkoutAdded,
}: AddManualWorkoutModalProps) {
  const [workoutType, setWorkoutType] = useState<WorkoutType>(null);
  const [duration, setDuration] = useState("00:00");
  const [descricao, setDescricao] = useState("");
  const [concluido, setConcluido] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [estimatedPoints, setEstimatedPoints] = useState<number>(0);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: authData } = await supabaseClient.auth.getUser();
      if (authData.user) {
        setUserId(authData.user.id);
        
        // Get coach_id from profiles
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("coach_id")
          .eq("id", authData.user.id)
          .single();
        
        if (profile?.coach_id) {
          setCoachId(profile.coach_id);
        }
      }
    };

    if (isOpen) {
      fetchUser();
    }
  }, [isOpen]);

  // Calculate estimated points based on selection
  useEffect(() => {
    if (!concluido) {
      setEstimatedPoints(0);
      return;
    }

    if (workoutType ==="musculacao") {
      setEstimatedPoints(WORKOUT_POINTS.musculacao);
    } else if (workoutType ==="cardio" && duration) {
      const [hours, minutes] = duration.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes;

      if (totalMinutes >= 10 && totalMinutes <= 19) {
        setEstimatedPoints(10);
      } else if (totalMinutes >= 20 && totalMinutes <= 49) {
        setEstimatedPoints(20);
      } else if (totalMinutes >= 50) {
        setEstimatedPoints(30);
      } else {
        setEstimatedPoints(0);
      }
    }
  }, [workoutType, duration, concluido]);

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g,"");

    if (value.length <= 2) {
      setDuration(value.padEnd(2,"0") +":00");
    } else if (value.length <= 4) {
      const hours = value.slice(0, 2);
      const minutes = value.slice(2, 4);
      setDuration(`${hours}:${minutes}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workoutType || !userId) {
      alert("Preencha o tipo de treino");
      return;
    }

    if (workoutType ==="cardio" && !duration) {
      alert("Defina a duração do cardio");
      return;
    }

    // Validate date: cannot add workouts for future dates
    const today = getTodayBrazilDate();
    const workoutDate = new Date(date);
    workoutDate.setHours(0, 0, 0, 0);

    if (workoutDate > today) {
      alert("Você só pode adicionar treinos da data atual ou passada. Nenhuma trapaça! 💪");
      return;
    }

    setLoading(true);

    try {
      // Convert duration to minutes if cardio
      let durationMinutes = null;
      if (workoutType ==="cardio") {
        const [hours, minutes] = duration.split(":").map(Number);
        durationMinutes = hours * 60 + minutes;
      }

      const { error } = await supabaseClient.from("treinos_manuais").insert({
        aluno_id: userId,
        coach_id: coachId,
        tipo_treino: workoutType,
        duracao_minutos: durationMinutes,
        descricao: descricao || null,
        data_treino: toBrazilDateString(date),
        concluido: concluido,
      });

      if (error) throw error;

      // Reset form
      setWorkoutType(null);
      setDuration("00:00");
      setDescricao("");
      setConcluido(false);
      onWorkoutAdded();
      onClose();
    } catch (err: any) {
      console.error("Erro ao adicionar treino:", err);
      alert(`Erro ao adicionar treino: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#0a0a0a] rounded-2xl border border-iron-gold/20 shadow-[0_0_50px_rgba(212,175,55,0.1)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/40">
          <h2 className="text-lg text-white uppercase tracking-tight">
            Novo Treino
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Date Display */}
          <div className="text-center">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
              Data do Treino
            </p>
            <p className="text-sm text-iron-gold">
              {date.toLocaleDateString("pt-BR", {
                weekday:"long",
                day:"2-digit",
                month:"2-digit",
                year:"numeric",
              })}
            </p>
          </div>

          {/* Workout Type Selection */}
          <div>
            <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-3 block">
              Tipo de Treino
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setWorkoutType("musculacao");
                  setDuration("00:00");
                }}
                className={`p-4 rounded-xl text-sm uppercase tracking-tight transition-all ${
                  workoutType ==="musculacao"
                    ?"bg-iron-gold text-black ring-2 ring-iron-gold/50"
                    :"bg-zinc-800 text-white hover:bg-zinc-700"
                }`}
              >
                💪 Musculação
              </button>
              <button
                type="button"
                onClick={() => setWorkoutType("cardio")}
                className={`p-4 rounded-xl text-sm uppercase tracking-tight transition-all ${
                  workoutType ==="cardio"
                    ?"bg-iron-gold text-black ring-2 ring-iron-gold/50"
                    :"bg-zinc-800 text-white hover:bg-zinc-700"
                }`}
              >
                🏃 Cardio
              </button>
            </div>
          </div>

          {/* Duration Input for Cardio */}
          {workoutType ==="cardio" && (
            <div>
              <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-3 block">
                Duração (HH:MM)
              </label>
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-zinc-500" />
                <input
                  type="text"
                  value={duration}
                  onChange={handleDurationChange}
                  placeholder="00:00"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white font-mono text-lg placeholder-zinc-600 focus:outline-none focus:border-iron-gold transition-colors"
                  maxLength={5}
                />
              </div>
              <p className="text-[9px] text-zinc-500 mt-2">
                Insira no formato HH:MM (exemplo: 01:30)
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-[10px] text-zinc-400 uppercase tracking-widest mb-3 block">
              Descrição (opcional)
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Treino de perna, séries de agachamento...
Ex: Corrida no parque..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-iron-gold transition-colors text-sm resize-none h-24"
            />
          </div>

          {/* Completion Checkbox */}
          <div className="flex items-center gap-3 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
            <input
              type="checkbox"
              id="concluido"
              checked={concluido}
              onChange={(e) => setConcluido(e.target.checked)}
              className="w-5 h-5 cursor-pointer accent-iron-gold"
            />
            <label htmlFor="concluido" className="text-sm text-white cursor-pointer flex-1">
              Marcar como concluído
            </label>
          </div>

          {/* Points Info */}
          {workoutType && (
            <div className="bg-iron-gold/10 border border-iron-gold/30 rounded-lg p-4">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-2">
                Pontuação
              </p>
              <div className="space-y-1">
                {workoutType ==="musculacao" ? (
                  <p className="text-sm text-white">
                    Musculação = <span className="text-iron-gold">20 pts</span>
                  </p>
                ) : (
                  <>
                    <p className="text-[9px] text-zinc-400">Cardio:</p>
                    <p className="text-[9px] text-zinc-300">
                      10-19 min = <span className="text-iron-gold">10 pts</span>
                    </p>
                    <p className="text-[9px] text-zinc-300">
                      20-49 min = <span className="text-iron-gold">20 pts</span>
                    </p>
                    <p className="text-[9px] text-zinc-300">
                      50+ min = <span className="text-iron-gold">30 pts</span>
                    </p>
                  </>
                )}
              </div>
              {concluido && estimatedPoints > 0 && (
                <div className="mt-3 pt-3 border-t border-iron-gold/20">
                  <p className="text-sm text-iron-gold">
                    ✓ +{estimatedPoints} pontos no ranking
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Past Date Warning */}
          {(() => {
            const today = getTodayBrazilDate();
            const workoutDate = new Date(date);
            workoutDate.setHours(0, 0, 0, 0);
            const isPastDate = workoutDate < today;

            return isPastDate ? (
              <div className="bg-yellow-950/30 border border-yellow-700/50 rounded-lg p-4">
                <p className="text-[10px] text-yellow-600 uppercase tracking-widest mb-1">
                  ⚠️ Data Retroativa
                </p>
                <p className="text-[9px] text-yellow-600/80">
                  Você está adicionando um treino de {date.toLocaleDateString("pt-BR")}. Certifique-se de relatar apenas treinos que realmente aconteceram.
                </p>
              </div>
            ) : null;
          })()}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!workoutType || loading}
            className="w-full bg-iron-gold hover:bg-iron-gold/90 disabled:bg-zinc-700 disabled:cursor-not-allowed text-black text-sm uppercase tracking-tight py-3 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Plus size={18} />
                Adicionar Treino
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
