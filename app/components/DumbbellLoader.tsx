import { Barbell } from '@phosphor-icons/react';

interface DumbbellLoaderProps {
  size?: number;
  text?: string;
}

export default function DumbbellLoader({ size = 48, text }: DumbbellLoaderProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Barbell
        size={size}
        className="text-brand animate-spin"
      />
      {text && (
        <span className="text-xs text-text-secondary">
          {text}
        </span>
      )}
    </div>
  );
}
