import { Dumbbell } from 'lucide-react';

interface DumbbellLoaderProps {
  size?: number;
  text?: string;
}

export default function DumbbellLoader({ size = 48, text }: DumbbellLoaderProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Dumbbell
        size={size}
        strokeWidth={1.5}
        className="text-iron-gold animate-spin"
      />
      {text && (
        <span className="uppercase tracking-widest text-[10px] text-zinc-500">
          {text}
        </span>
      )}
    </div>
  );
}
