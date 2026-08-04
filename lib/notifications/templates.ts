export type CoachNotificationTipo = 'checkin_reminder' | 'photos_reminder';

export const COACH_NOTIFICATION_TEMPLATES: Record<
  CoachNotificationTipo,
  { titulo: string; corpo: string; link: string; source: string }
> = {
  checkin_reminder: {
    titulo: 'Check-in da dieta',
    corpo:
      'Seu personal pediu que você registre o check-in das refeições. Abra o plano alimentar e marque o que já consumiu.',
    link: '/aluno/plano-alimentar',
    source: 'cobrar_checkin',
  },
  photos_reminder: {
    titulo: 'Fotos de evolução',
    corpo:
      'Seu personal pediu novas fotos de evolução. Abra Fotos e envie frente, lado e costas para acompanhar seu progresso.',
    link: '/aluno/fotos',
    source: 'solicitar_fotos',
  },
};
