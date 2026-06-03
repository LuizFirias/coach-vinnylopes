import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { iconConfig } from '@/lib/iconConfig';

interface AppIconProps {
  icon: PhosphorIcon;
  size?: number;
  active?: boolean;
  className?: string;
}

export default function AppIcon({ icon: Icon, size = iconConfig.size, active = false, className }: AppIconProps) {
  return (
    <Icon
      size={size}
      weight={active ? iconConfig.activeWeight : iconConfig.weight}
      className={className ?? (active ? 'text-brand' : 'text-text-tertiary')}
    />
  );
}
