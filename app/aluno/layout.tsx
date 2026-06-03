import ActiveWorkoutBanner from '@/app/components/ActiveWorkoutBanner';

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ActiveWorkoutBanner />
    </>
  );
}
