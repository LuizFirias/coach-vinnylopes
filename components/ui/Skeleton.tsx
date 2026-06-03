import { cn } from '@/lib/utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md',
        'bg-gradient-to-r from-surface-1 via-surface-2 to-surface-1',
        'bg-[length:200%_100%] animate-shimmer',
        className
      )}
      aria-hidden="true"
    />
  );
}
