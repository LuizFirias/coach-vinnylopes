'use client';

import { motion } from 'framer-motion';
import { HydrationSection } from '@/app/components/nutrition/HydrationSection';

interface HydrationCardProps {
  copos: number;
  mlPorCopo: number;
  metaCopos: number;
  saving: boolean;
  onToggleCup: (index: number) => void;
}

/** Mesmo conta-gotas da sessão de nutrição, com entrada animada da dash. */
export function HydrationCard({
  copos,
  mlPorCopo,
  metaCopos,
  saving,
  onToggleCup,
}: HydrationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, type: 'spring', stiffness: 260, damping: 24 }}
    >
      <HydrationSection
        mlCurrent={copos * mlPorCopo}
        mlTarget={metaCopos * mlPorCopo}
        cupsCurrent={copos}
        cupsTarget={metaCopos}
        saving={saving}
        onToggleCup={onToggleCup}
      />
    </motion.div>
  );
}
