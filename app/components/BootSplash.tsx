'use client';

import { useEffect, useState } from 'react';

/**
 * Splash CSS-only antes da hidratação.
 * Some via setState (unmount React) — NUNCA document.remove(),
 * que quebra o reconciler (insertBefore / removeChild).
 */
export default function BootSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      id="auron-boot-splash"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-0, #000000)',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      <div
        className="auron-loader-spin"
        style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle
            cx="24" cy="24" r="20"
            stroke="#D4A843"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="90 40"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
