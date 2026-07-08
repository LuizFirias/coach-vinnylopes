import ActiveWorkoutBanner from '@/app/components/ActiveWorkoutBanner';
import MustChangePasswordGuard from '@/app/components/MustChangePasswordGuard';
import { AlunoBodyGenderProvider } from '@/app/contexts/AlunoBodyGenderContext';

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return (
    <MustChangePasswordGuard area="aluno">
      <AlunoBodyGenderProvider>
        {children}
        <ActiveWorkoutBanner />
      </AlunoBodyGenderProvider>
    </MustChangePasswordGuard>
  );
}
