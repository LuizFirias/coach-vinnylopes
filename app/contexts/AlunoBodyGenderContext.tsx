'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  getBootstrapProfile,
  peekBootstrapProfile,
} from '@/lib/auth/bootstrapProfile';
import { profileSexoToBodyGender, type BodyGender, type ProfileSexo } from '@/lib/utils/bodyGender';

const AlunoBodyGenderContext = createContext<BodyGender>('male');

function toGender(sexo: string | null | undefined): BodyGender {
  return profileSexoToBodyGender(sexo as ProfileSexo);
}

export function AlunoBodyGenderProvider({ children }: { children: React.ReactNode }) {
  // Reaproveita o bootstrap de profile (mesma request do guard) — zero query extra
  const [gender, setGender] = useState<BodyGender>(
    () => toGender(peekBootstrapProfile()?.sexo),
  );

  useEffect(() => {
    let cancelled = false;
    void getBootstrapProfile().then((profile) => {
      if (!cancelled) setGender(toGender(profile?.sexo));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AlunoBodyGenderContext.Provider value={gender}>
      {children}
    </AlunoBodyGenderContext.Provider>
  );
}

export function useAlunoBodyGender(): BodyGender {
  return useContext(AlunoBodyGenderContext);
}
