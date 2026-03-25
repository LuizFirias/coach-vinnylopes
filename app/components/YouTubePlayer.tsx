"use client";

import { X } from"lucide-react";
import { extractYouTubeVideoId, isYouTubeShort } from"@/lib/youtubeUtils";

interface YouTubePlayerProps {
  videoUrl: string;
  onClose: () => void;
}

export function YouTubePlayer({ videoUrl, onClose }: YouTubePlayerProps) {
  const videoId = extractYouTubeVideoId(videoUrl);
  const isShort = isYouTubeShort(videoUrl);
  
  if (!videoId) {
    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
        <div className="relative bg-black w-full max-w-2xl rounded-2xl border border-iron-gold/20 overflow-hidden shadow-2xl shadow-iron-gold/10 p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-black/50 text-iron-gold rounded-full flex items-center justify-center z-10 backdrop-blur-md hover:bg-iron-gold hover:text-black transition-all"
          >
            <X size={20} />
          </button>
          <p className="text-white text-center">Vídeo não disponível</p>
        </div>
      </div>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onClose}
      />
      <div className={`relative bg-black rounded-2xl border-2 border-iron-gold/30 overflow-hidden shadow-2xl shadow-iron-gold/20 ${
        isShort 
          ? 'w-full max-w-[380px] aspect-[9/16]' 
          : 'w-full max-w-4xl aspect-video'
      }`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 bg-black/50 text-iron-gold rounded-full flex items-center justify-center z-10 backdrop-blur-md hover:bg-iron-gold hover:text-black transition-all"
        >
          <X size={20} />
        </button>
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    </div>
  );
}
