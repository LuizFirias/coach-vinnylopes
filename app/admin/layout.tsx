import MustChangePasswordGuard from '@/app/components/MustChangePasswordGuard';
import { CoachAppChrome } from '@/app/components/coach/CoachAppChrome';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <MustChangePasswordGuard area="admin">
      <div className="coach-app-typography">
        <CoachAppChrome>{children}</CoachAppChrome>
      </div>
    </MustChangePasswordGuard>
  );
}
