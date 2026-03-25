"use client";

import { useEffect } from 'react';

/**
 * Remove attributes injected by Chrome extensions that cause hydration warnings
 */
export default function ChromeExtensionFix() {
  useEffect(() => {
    // Remove Chrome extension attributes from all elements
    const removeExtensionAttributes = () => {
      const elements = document.querySelectorAll('[__gchrome_uniqueid], [__gchrome_remoteframetoken]');
      elements.forEach((element) => {
        element.removeAttribute('__gchrome_uniqueid');
        element.removeAttribute('__gchrome_remoteframetoken');
      });
    };

    // Run immediately
    removeExtensionAttributes();

    // Set up observer to catch future injections
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement;
          if (target.hasAttribute('__gchrome_uniqueid') || 
              target.hasAttribute('__gchrome_remoteframetoken')) {
            target.removeAttribute('__gchrome_uniqueid');
            target.removeAttribute('__gchrome_remoteframetoken');
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ['__gchrome_uniqueid', '__gchrome_remoteframetoken']
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
