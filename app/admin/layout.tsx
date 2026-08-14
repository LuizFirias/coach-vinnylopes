import MustChangePasswordGuard from '@/app/components/MustChangePasswordGuard';
import CoachSubscriptionGuard from '@/app/components/CoachSubscriptionGuard';
import { CoachAppChrome } from '@/app/components/coach/CoachAppChrome';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <MustChangePasswordGuard area="admin">
      <CoachSubscriptionGuard>
        <div className="coach-app-typography">
          <CoachAppChrome>{children}</CoachAppChrome>
        </div>
      </CoachSubscriptionGuard>
    </MustChangePasswordGuard>
  );
}
