export const COACH_SPECIALTIES = [
  "Emagrecimento",
  "Hipertrofia",
  "Funcional",
  "Corrida",
  "Crossfit",
  "Reabilitação",
  "Terceira idade",
  "Gestante",
  "Powerlifting",
  "Online Coaching",
  "Mobilidade",
  "Performance esportiva",
] as const;

export type CoachSpecialty = (typeof COACH_SPECIALTIES)[number];

export const COACH_MODALITIES = [
  { value: "online", label: "Online" },
  { value: "presencial", label: "Presencial" },
  { value: "hibrido", label: "Híbrido" },
] as const;

export type CoachModality = (typeof COACH_MODALITIES)[number]["value"];

export const PRICE_PRESETS = [
  "Sob consulta",
  "A partir de R$ 150",
  "A partir de R$ 200",
  "A partir de R$ 250",
  "A partir de R$ 300",
  "A partir de R$ 400",
] as const;

/**
 * Capa do card público = 1ª foto da galeria.
 * Preview desktop sticky ~360×144 (h-36) → proporção 2,5:1.
 * Export sugerido em 2× para nitidez em telas retina / cards maiores no Mercado.
 */
export const COACH_COVER_SPECS = {
  width: 1200,
  height: 480,
  ratioLabel: "2,5:1",
  displayLabel: "1200 × 480 px",
  tip:
    "Proporção 2,5:1 — funciona no card desktop (~360×144) e no mobile do Mercado sem cortar o rosto no centro.",
} as const;

export function normalizeInstagramHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^@+/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/.*$/, "")
    .replace(/[^a-zA-Z0-9._]/g, "")
    .slice(0, 30)
    .toLowerCase();
}

/** Aceita URL completa ou monta a partir do @. */
export function normalizeInstagramUrl(raw: string, fallbackHandle?: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    if (!fallbackHandle) return null;
    const h = normalizeInstagramHandle(fallbackHandle);
    return h ? `https://instagram.com/${h}` : null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      if (!/instagram\.com$/i.test(u.hostname.replace(/^www\./, ""))) {
        return trimmed; // permite colar link mesmo se host variar
      }
      return `https://instagram.com${u.pathname.replace(/\/$/, "") || ""}`;
    } catch {
      return trimmed;
    }
  }
  const handle = normalizeInstagramHandle(trimmed);
  return handle ? `https://instagram.com/${handle}` : null;
}

export function isValidInstagramUrl(raw: string): boolean {
  if (!raw.trim()) return true;
  return /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/i.test(
    raw.trim(),
  ) || Boolean(normalizeInstagramHandle(raw));
}

export const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

/** Cidades principais para autocomplete leve (sem dependência externa). */
export const BR_CITIES: { city: string; state: string }[] = [
  { city: "São Paulo", state: "SP" },
  { city: "Rio de Janeiro", state: "RJ" },
  { city: "Belo Horizonte", state: "MG" },
  { city: "Brasília", state: "DF" },
  { city: "Salvador", state: "BA" },
  { city: "Fortaleza", state: "CE" },
  { city: "Curitiba", state: "PR" },
  { city: "Recife", state: "PE" },
  { city: "Porto Alegre", state: "RS" },
  { city: "Manaus", state: "AM" },
  { city: "Belém", state: "PA" },
  { city: "Goiânia", state: "GO" },
  { city: "Guarulhos", state: "SP" },
  { city: "Campinas", state: "SP" },
  { city: "São Gonçalo", state: "RJ" },
  { city: "São Luís", state: "MA" },
  { city: "Maceió", state: "AL" },
  { city: "Natal", state: "RN" },
  { city: "Teresina", state: "PI" },
  { city: "Campo Grande", state: "MS" },
  { city: "João Pessoa", state: "PB" },
  { city: "Jaboatão dos Guararapes", state: "PE" },
  { city: "Contagem", state: "MG" },
  { city: "São Bernardo do Campo", state: "SP" },
  { city: "Santo André", state: "SP" },
  { city: "Osasco", state: "SP" },
  { city: "Uberlândia", state: "MG" },
  { city: "Sorocaba", state: "SP" },
  { city: "Ribeirão Preto", state: "SP" },
  { city: "Niterói", state: "RJ" },
  { city: "Cuiabá", state: "MT" },
  { city: "Juiz de Fora", state: "MG" },
  { city: "Florianópolis", state: "SC" },
  { city: "Joinville", state: "SC" },
  { city: "Londrina", state: "PR" },
  { city: "Maringá", state: "PR" },
  { city: "Vitória", state: "ES" },
  { city: "Santos", state: "SP" },
  { city: "Aracaju", state: "SE" },
  { city: "Palmas", state: "TO" },
  { city: "Macapá", state: "AP" },
  { city: "Boa Vista", state: "RR" },
  { city: "Porto Velho", state: "RO" },
  { city: "Rio Branco", state: "AC" },
];

export function normalizeHandle(raw: string): string {
  return normalizeInstagramHandle(raw);
}

export function isValidHandle(handle: string): boolean {
  return /^[a-z0-9._]{3,30}$/.test(handle);
}

/** Máscara CREF: XXXXXX-G/UF */
export function formatCrefInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const digits = cleaned.replace(/[^0-9]/g, "").slice(0, 6);
  const rest = cleaned.replace(/[0-9]/g, "");
  const letter = (rest[0] || "G").replace(/[^A-Z]/g, "G").slice(0, 1);
  const uf = rest.slice(1, 3).replace(/[^A-Z]/g, "");
  if (!digits) return "";
  if (digits.length < 6) return digits;
  if (!uf) return `${digits}-${letter}/`;
  return `${digits}-${letter}/${uf}`;
}

export function isValidCref(cref: string): boolean {
  if (!cref.trim()) return true;
  return /^\d{4,6}-[A-Z]\/[A-Z]{2}$/.test(cref.trim().toUpperCase());
}

export type CoachPublicProfileForm = {
  handle: string;
  headline: string;
  bio: string;
  specialties: string[];
  modality: CoachModality | "";
  city: string;
  state: string;
  cref: string;
  yearsExperience: string;
  certifications: string[];
  galleryPaths: string[];
  instagram: string;
  disponivelNoMercado: boolean;
  aceitandoNovosAlunos: boolean;
  priceDisplay: string;
  showStudentCount: boolean;
};

export const EMPTY_PUBLIC_PROFILE: CoachPublicProfileForm = {
  handle: "",
  headline: "",
  bio: "",
  specialties: [],
  modality: "",
  city: "",
  state: "",
  cref: "",
  yearsExperience: "",
  certifications: [],
  galleryPaths: [],
  instagram: "",
  disponivelNoMercado: false,
  aceitandoNovosAlunos: true,
  priceDisplay: "",
  showStudentCount: true,
};

export function rowToForm(row: Record<string, unknown> | null): CoachPublicProfileForm {
  if (!row) return { ...EMPTY_PUBLIC_PROFILE };
  return {
    handle: String(row.handle ?? ""),
    headline: String(row.headline ?? ""),
    bio: String(row.bio ?? ""),
    specialties: Array.isArray(row.specialties) ? (row.specialties as string[]) : [],
    modality: (row.modality as CoachModality) || "",
    city: String(row.city ?? ""),
    state: String(row.state ?? ""),
    cref: String(row.cref ?? ""),
    yearsExperience:
      row.years_experience != null && row.years_experience !== ""
        ? String(row.years_experience)
        : "",
    certifications: Array.isArray(row.certifications)
      ? (row.certifications as string[])
      : [],
    galleryPaths: Array.isArray(row.gallery_paths)
      ? (row.gallery_paths as string[])
      : [],
    instagram: String(row.instagram ?? ""),
    disponivelNoMercado: Boolean(row.disponivel_no_mercado),
    aceitandoNovosAlunos: row.aceitando_novos_alunos !== false,
    priceDisplay: String(row.price_display ?? ""),
    showStudentCount: row.show_student_count !== false,
  };
}

export function formToRow(form: CoachPublicProfileForm, coachId: string) {
  return {
    coach_id: coachId,
    handle: form.handle ? normalizeHandle(form.handle) : null,
    headline: form.headline.trim() || null,
    bio: form.bio.trim() || null,
    specialties: form.specialties,
    modality: form.modality || null,
    city: form.city.trim() || null,
    state: form.state.trim().toUpperCase() || null,
    cref: form.cref.trim().toUpperCase() || null,
    years_experience: form.yearsExperience
      ? Math.max(0, Number.parseInt(form.yearsExperience, 10) || 0)
      : null,
    certifications: form.certifications.map((c) => c.trim()).filter(Boolean),
    gallery_paths: form.galleryPaths.slice(0, 6),
    instagram: normalizeInstagramUrl(form.instagram, form.handle),
    disponivel_no_mercado: form.disponivelNoMercado,
    aceitando_novos_alunos: form.aceitandoNovosAlunos,
    price_display: form.priceDisplay.trim() || null,
    show_student_count: form.showStudentCount,
  };
}
