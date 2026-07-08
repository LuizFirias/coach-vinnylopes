export interface PostLoginProfile {
  role: string;
  must_change_password?: boolean | null;
  first_access_completed?: boolean | null;
}

export function getPasswordChangePath(role: string): string | null {
  if (role === 'aluno') return '/aluno/trocar-senha';
  if (role === 'coach' || role === 'super_admin') return '/admin/trocar-senha';
  return null;
}

export function getPostLoginPath(profile: PostLoginProfile): string {
  if (profile.must_change_password) {
    const passwordPath = getPasswordChangePath(profile.role);
    if (passwordPath) return passwordPath;
  }

  if (profile.role === 'aluno' && !profile.first_access_completed) {
    return '/aluno/onboarding';
  }

  if (profile.role === 'coach' || profile.role === 'super_admin') {
    return '/admin/dashboard';
  }

  return '/aluno/dashboard';
}
