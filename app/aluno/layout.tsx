import ActiveWorkoutBanner from '@/app/components/ActiveWorkoutBanner';
import MustChangePasswordGuard from '@/app/components/MustChangePasswordGuard';

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return (
    <MustChangePasswordGuard area="aluno">
      {children}
      <ActiveWorkoutBanner />
    </MustChangePasswordGuard>
  );
}
