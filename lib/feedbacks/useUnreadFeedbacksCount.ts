'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import {
  countUnreadFeedbacks,
  FEEDBACKS_UNREAD_EVENT,
} from '@/lib/feedbacks/unread';

/** Contagem de feedbacks não lidos do coach — atualiza em foco e via evento. */
export function useUnreadFeedbacksCount() {
  const { user, userRole } = useAuth();
  const [count, setCount] = useState(0);

  const isCoach = userRole === 'coach' || userRole === 'super_admin';

  const refresh = useCallback(async () => {
    if (!user?.id || !isCoach) {
      setCount(0);
      return;
    }
    setCount(await countUnreadFeedbacks(user.id));
  }, [user?.id, isCoach]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isCoach) return;

    const onFocus = () => void refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener(FEEDBACKS_UNREAD_EVENT, onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(FEEDBACKS_UNREAD_EVENT, onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isCoach, refresh]);

  return { count, refresh, hasUnread: count > 0 };
}
