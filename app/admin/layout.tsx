import MustChangePasswordGuard from '@/app/components/MustChangePasswordGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <MustChangePasswordGuard area="admin">
      {children}
    </MustChangePasswordGuard>
  );
}
