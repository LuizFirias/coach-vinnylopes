'use client';

import { useEffect } from 'react';

/**
 * Remove o splash HTML estático assim que o React hidrata.
 */
export default function BootSplashRemover() {
  useEffect(() => {
    document.getElementById('auron-boot-splash')?.remove();
  }, []);
  return null;
}
