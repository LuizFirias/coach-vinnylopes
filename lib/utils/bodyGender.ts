/** Mapeia sexo do perfil para o prop `gender` do react-muscle-highlighter */

export type ProfileSexo = 'masculino' | 'feminino' | 'outro' | null | undefined;
export type BodyGender = 'male' | 'female';

export function profileSexoToBodyGender(sexo: ProfileSexo): BodyGender {
  return sexo === 'feminino' ? 'female' : 'male';
}
