export function generateInviteCode(
  accountType: "teste" | "parceiro",
  name?: string | null
): string {
  const slug = (name || "convite")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${accountType.toUpperCase()}-${slug}-${suffix}`;
}
