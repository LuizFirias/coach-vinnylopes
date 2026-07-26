'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { profileSexoToBodyGender, type BodyGender } from '@/lib/utils/bodyGender';

const AlunoBodyGenderContext = createContext<BodyGender>('male');

type SexoCache = { userId: string; gender: BodyGender; at: number };
const TTL_MS = 90_000;
let sexoCache: SexoCache | null = null;
let sexoInflight: Promise<BodyGender> | null = null;

async function loadBodyGender(): Promise<BodyGender> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const user = session?.user;
  if (!user) return 'male';

  if (sexoCache && sexoCache.userId === user.id && Date.now() - sexoCache.at < TTL_MS) {
    return sexoCache.gender;
  }
  if (sexoInflight) return sexoInflight;

  sexoInflight = (async () => {
    try {
      const { data } = await supabaseClient
        .from('profiles')
        .select('sexo')
        .eq('id', user.id)
        .single();

      const gender = data?.sexo ? profileSexoToBodyGender(data.sexo) : 'male';
      sexoCache = { userId: user.id, gender, at: Date.now() };
      return gender;
    } finally {
      sexoInflight = null;
    }
  })();

  return sexoInflight;
}

export function AlunoBodyGenderProvider({ children }: { children: React.ReactNode }) {
  const [gender, setGender] = useState<BodyGender>(
    () => sexoCache?.gender ?? 'male',
  );

  useEffect(() => {
    let cancelled = false;
    void loadBodyGender().then((g) => {
      if (!cancelled) setGender(g);
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
