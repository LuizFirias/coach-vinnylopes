'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { profileSexoToBodyGender, type BodyGender } from '@/lib/utils/bodyGender';

const AlunoBodyGenderContext = createContext<BodyGender>('male');

export function AlunoBodyGenderProvider({ children }: { children: React.ReactNode }) {
  const [gender, setGender] = useState<BodyGender>('male');

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabaseClient.auth.getUser();
      if (!authData.user) return;

      const { data } = await supabaseClient
        .from('profiles')
        .select('sexo')
        .eq('id', authData.user.id)
        .single();

      if (data?.sexo) {
        setGender(profileSexoToBodyGender(data.sexo));
      }
    };

    load();
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
