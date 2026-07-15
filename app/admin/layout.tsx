import MustChangePasswordGuard from '@/app/components/MustChangePasswordGuard';
import CoachSubscriptionGuard from '@/app/components/CoachSubscriptionGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <MustChangePasswordGuard area="admin">
      <CoachSubscriptionGuard>
        {children}
      </CoachSubscriptionGuard>
    </MustChangePasswordGuard>
  );
}
