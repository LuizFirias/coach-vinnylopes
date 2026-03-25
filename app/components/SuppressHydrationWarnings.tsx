"use client";

import { useEffect } from 'react';

/**
 * Suppress hydration warnings in development only
 * These warnings are caused by Chrome extensions injecting attributes
 * and don't affect production builds
 */
export default function SuppressHydrationWarnings() {
  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;

    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;

    // Filter out hydration warnings
    console.error = (...args: any[]) => {
      const message = args[0];
      if (
        typeof message === 'string' &&
        (message.includes('Hydration failed') ||
         message.includes('hydrated but some attributes') ||
         message.includes('There was an error while hydrating') ||
         message.includes('__gchrome_uniqueid') ||
         message.includes('__gchrome_remoteframetoken'))
      ) {
        // Suppress these specific errors
        return;
      }
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const message = args[0];
      if (
        typeof message === 'string' &&
        (message.includes('Hydration') ||
         message.includes('__gchrome_uniqueid') ||
         message.includes('__gchrome_remoteframetoken'))
      ) {
        // Suppress these specific warnings
        return;
      }
      originalWarn.apply(console, args);
    };

    // Cleanup: restore original methods when component unmounts
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return null;
}
