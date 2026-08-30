'use client';

import Body from 'react-muscle-highlighter';
import type { BodyGender } from '@/lib/utils/bodyGender';

interface MuscleBodyFigureProps {
  data: Array<{ slug: string; color: string }>;
  side: 'front' | 'back';
  gender?: BodyGender;
  scale?: number;
  defaultFill?: string;
  defaultStroke?: string;
  defaultStrokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function MuscleBodyFigure({
  data,
  side,
  gender = 'male',
  scale = 0.85,
  defaultFill = '#27272a',
  defaultStroke = '#3f3f46',
  defaultStrokeWidth = 1,
  className,
  style,
}: MuscleBodyFigureProps) {
  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      <Body
        data={data as any}
        side={side}
        gender={gender}
        scale={scale}
        defaultFill={defaultFill}
        defaultStroke={defaultStroke}
        defaultStrokeWidth={defaultStrokeWidth}
      />
    </div>
  );
}

interface MuscleBodyPairProps {
  data: Array<{ slug: string; color: string }>;
  gender?: BodyGender;
  scale?: number;
  defaultFill?: string;
  defaultStroke?: string;
  defaultStrokeWidth?: number;
  gap?: number;
  minHeight?: number;
  maxHeight?: number;
}

export function MuscleBodyPair({
  data,
  gender = 'male',
  scale = 0.85,
  defaultFill = '#27272a',
  defaultStroke = '#3f3f46',
  defaultStrokeWidth = 1,
  gap = 0,
  minHeight = 260,
  maxHeight = 300,
}: MuscleBodyPairProps) {
  return (
    <div
      className="flex w-full items-center justify-center"
      style={{ gap, minHeight, maxHeight }}
    >
      <div className="flex h-full w-1/2 items-center justify-center overflow-hidden">
        <MuscleBodyFigure
          data={data}
          side="front"
          gender={gender}
          scale={scale}
          defaultFill={defaultFill}
          defaultStroke={defaultStroke}
          defaultStrokeWidth={defaultStrokeWidth}
        />
      </div>
      <div className="flex h-full w-1/2 items-center justify-center overflow-hidden">
        <MuscleBodyFigure
          data={data}
          side="back"
          gender={gender}
          scale={scale}
          defaultFill={defaultFill}
          defaultStroke={defaultStroke}
          defaultStrokeWidth={defaultStrokeWidth}
        />
      </div>
    </div>
  );
}
