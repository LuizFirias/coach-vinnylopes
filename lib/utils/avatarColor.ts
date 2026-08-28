const AVATAR_GRADIENTS = [
  "from-amber-500/60 to-amber-700/40",
  "from-orange-500/60 to-orange-700/40",
  "from-yellow-500/60 to-yellow-700/40",
  "from-brand/60 to-brand/30",
] as const;

export function getAvatarGradient(userId: string): string {
  const code = userId.charCodeAt(0) + (userId.charCodeAt(userId.length - 1) ?? 0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
}
