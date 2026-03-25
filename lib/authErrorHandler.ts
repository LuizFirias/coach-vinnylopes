/**
 * Utility to handle Supabase auth errors globally
 */

import { supabaseClient } from './supabaseClient';
import type { Session } from '@supabase/supabase-js';

export function isAuthError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error?.message || String(error);
  const errorStatus = error?.status;
  
  return (
    errorMessage.includes('Refresh Token') ||
    errorMessage.includes('refresh_token_not_found') ||
    errorMessage.includes('Invalid Refresh Token') ||
    errorMessage.includes('JWT') ||
    errorMessage.includes('session_not_found') ||
    errorStatus === 401
  );
}

export function handleAuthError(error: any): void {
  if (!isAuthError(error)) return;
  
  console.warn('Auth error detected, clearing session:', error?.message);
  
  // Clear all auth-related storage
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect to login if not already there
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
}

export function wrapWithAuthErrorHandler<T>(
  promise: Promise<T>
): Promise<T> {
  return promise.catch((error) => {
    handleAuthError(error);
    throw error;
  });
}

/**
 * Safe wrapper for getSession that handles auth errors gracefully
 */
export async function getSafeSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      if (isAuthError(error)) {
        handleAuthError(error);
        return null;
      }
      throw error;
    }
    
    return session;
  } catch (error) {
    if (isAuthError(error)) {
      handleAuthError(error);
      return null;
    }
    throw error;
  }
}
