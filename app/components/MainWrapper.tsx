"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabaseClient';

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        console.log('Attempting to restore session...');
        
        // Try to get current session
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
          console.warn('Session retrieval error:', error);
        }
        
        if (session) {
          console.log('Session restored successfully from Supabase SDK');
          return;
        }

        // If no session, try to refresh using stored tokens
        if (!session && typeof window !== 'undefined') {
          const stored = localStorage.getItem('sb-auth-token');
          if (stored) {
            try {
              const tokenData = JSON.parse(stored);
              if (tokenData.refresh_token) {
                console.log('Attempting to refresh session with stored token...');
                const { data, error: refreshError } = await supabaseClient.auth.refreshSession({
                  refresh_token: tokenData.refresh_token,
                });
                if (data?.session) {
                  console.log('Session refreshed successfully from backup token');
                } else if (refreshError) {
                  console.warn('Failed to refresh session:', refreshError);
                  // Clear invalid token data
                  localStorage.removeItem('sb-auth-token');
                }
              }
            } catch (e) {
              console.warn('Failed to restore backup session:', e);
              localStorage.removeItem('sb-auth-token');
            }
          } else {
            console.log('No stored auth token found in localStorage');
          }
        }
      } catch (err) {
        console.warn('Unexpected error during session restoration:', err);
      }
    };

    // Run session restoration immediately
    restoreSession();
  }, []);

  // Consider internal routes to be those under /aluno, /admin, or /super-admin
  const isInternal = pathname.startsWith('/aluno') || pathname.startsWith('/admin') || pathname.startsWith('/super-admin');

  // For internal pages we add a large top padding on mobile for the floating header
  // and a left margin on desktop for the permanent sidebar (w-20 = 80px)
  const className = isInternal ? 'pt-20 lg:pt-0 lg:ml-20 transition-all duration-300' : 'pt-0';

  return <main className={className}>{children}</main>;
}
