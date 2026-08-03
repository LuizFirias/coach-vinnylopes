// components/ui/icons/AuronAIcon.tsx
import { iconConfig } from '@/lib/iconConfig';

interface AuronAIconProps {
  size?: number;
  active?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Compatibilidade com Phosphor — sem efeito visual */
  weight?: string;
}

export function AuronAIcon({
  size = iconConfig.size,
  active = false,
  className,
  style,
  weight: _weight,
}: AuronAIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="auron-a-grad" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc"/>
          <stop offset="100%" stopColor="#751BB4"/>
        </linearGradient>
      </defs>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22 20.6523H18.2178L17.3877 19.1992L15.2471 17.9443L8.16211 20.7119L9.89648 17.7227L2 20.6748L11.9814 3L22 20.6523ZM7.9043 16.6895L12.3691 16.0625L16.6445 17.8525L11.9814 9.5498L7.9043 16.6895Z"
        fill={active ? 'url(#auron-a-grad)' : 'currentColor'}
      />
      <path
        d="M15.2472 17.9445L12.369 16.081L16.631 17.8338L17.3875 19.1991L15.2472 17.9445Z"
        fill={active ? 'rgba(255,255,255,0.15)' : 'currentColor'}
      />
    </svg>
  );
}