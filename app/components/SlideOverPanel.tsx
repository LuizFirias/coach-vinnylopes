import React, { useEffect } from 'react';
import { X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number; // default 480
  children: React.ReactNode;
  expandUrl?: string; // Optional expansion url (Ver perfil completo)
}

export default function SlideOverPanel({
  open,
  onClose,
  title,
  width = 480,
  children,
  expandUrl,
}: SlideOverPanelProps) {
  // Prevent background scroll when slide over is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-70 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Slide-over panel container */}
      <aside
        style={{ maxWidth: width }}
        className={cn(
          "fixed top-0 right-0 h-full w-full bg-surface-1 border-l border-border-default z-70 shadow-2xl transition-transform duration-300 ease-in-out transform flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-default flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-text-primary truncate">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {expandUrl && (
              <a
                href={expandUrl}
                className="text-2xs font-extrabold text-brand uppercase tracking-caps hover:underline"
              >
                Expandir
              </a>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all border border-border-subtle"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 scrollable-area">
          {children}
        </div>
      </aside>
    </>
  );
}
