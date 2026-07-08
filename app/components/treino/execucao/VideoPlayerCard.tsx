'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play, VideoCamera } from '@phosphor-icons/react';
import { YouTubePlayer } from '@/app/components/YouTubePlayer';
import { extractYouTubeVideoId } from '@/lib/youtubeUtils';

interface VideoPlayerCardProps {
  videoUrl: string;
  exercicioNome: string;
}

export function VideoPlayerCard({
  videoUrl,
  exercicioNome,
}: VideoPlayerCardProps) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const videoId = extractYouTubeVideoId(videoUrl);

  if (!videoId) return null;

  const thumbnailUri = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <>
      <button
        type="button"
        onClick={() => setPlayerOpen(true)}
        className="mx-4 mt-4 w-[calc(100%-2rem)] overflow-hidden rounded-[14px] border border-[#1F2937] bg-[#111827] text-left transition-opacity active:opacity-90"
      >
        <div className="relative h-[180px] w-full">
          <Image
            src={thumbnailUri}
            alt={`Demonstração de ${exercicioNome}`}
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-black/38" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600/90 shadow-lg shadow-blue-600/40">
              <Play className="ml-0.5 h-5 w-5 text-white" weight="fill" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-0.5 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-500">
            <VideoCamera className="h-3.5 w-3.5" weight="fill" />
            Execução
          </p>
          <p className="text-xs text-gray-500">Toque para ver a técnica correta</p>
        </div>
      </button>

      {playerOpen && (
        <YouTubePlayer videoUrl={videoUrl} onClose={() => setPlayerOpen(false)} />
      )}
    </>
  );
}
