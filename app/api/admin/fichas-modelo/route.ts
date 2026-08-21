import { NextResponse } from "next/server";
import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";

/** Lista os modelos de ficha salvos pelo coach logado (mais recente primeiro). */
export async function GET(req: Request) {
  const auth = await getAuthenticatedCoach(req, {
    allowedRoles: ["coach", "super_admin", "admin"],
  });
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.adminClient
    .from("fichas_modelo")
    .select("id, nome, configuracao, updated_at")
    .eq("coach_id", auth.userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ modelos: data || [] });
}

/** Salva a ficha atual como um modelo reutilizável. */
export async function POST(req: Request) {
  const auth = await getAuthenticatedCoach(req, {
    allowedRoles: ["coach", "super_admin", "admin"],
  });
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const nome = String(body?.nome || "").trim();
    const configuracao = body?.configuracao;

    if (!nome) {
      return NextResponse.json({ error: "Dê um nome ao modelo." }, { status: 400 });
    }
    if (!configuracao || typeof configuracao !== "object") {
      return NextResponse.json({ error: "Modelo inválido." }, { status: 400 });
    }

    const { data, error } = await auth.adminClient
      .from("fichas_modelo")
      .insert({ coach_id: auth.userId, nome, configuracao })
      .select("id, nome, configuracao, updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, modelo: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Falha ao salvar o modelo.", details: err?.message || String(err) },
      { status: 500 },
    );
  }
}
