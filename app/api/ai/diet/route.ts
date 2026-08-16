import { NextResponse } from "next/server";
import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";
import { checkAiDietAccess } from "@/lib/access/checkAiDietAccess";

export async function POST(req: Request) {
  const auth = await getAuthenticatedCoach(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const allowed = await checkAiDietAccess(auth.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "IA de dietas disponível apenas no plano PRO" },
      { status: 403 },
    );
  }

  return NextResponse.json(
    { error: "IA de dietas ainda não está disponível." },
    { status: 501 },
  );
}
