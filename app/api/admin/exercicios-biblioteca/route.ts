import { NextResponse } from "next/server";
import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";

type CreateExercisePayload = {
  nome?: string;
  grupo_muscular?: string;
  descricao?: string | null;
  video_url?: string | null;
  equipamento?: string | null;
  musculos_secundarios?: string | null;
  tipo_exercicio?: string | null;
};

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedCoach(req, {
      allowedRoles: ["coach", "super_admin", "admin"],
    });
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let body: CreateExercisePayload;
    try {
      body = (await req.json()) as CreateExercisePayload;
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido (JSON esperado)" }, { status: 400 });
    }

    const nome = String(body?.nome || "").trim();
    const grupoMuscular = String(body?.grupo_muscular || "").trim();
    const descricao = body?.descricao ? String(body.descricao).trim() : null;
    const videoUrl = body?.video_url ? String(body.video_url).trim() : null;
    const equipamento = body?.equipamento ? String(body.equipamento).trim() : null;
    const musculosSecundarios = body?.musculos_secundarios ? String(body.musculos_secundarios).trim() : null;
    const tipoExercicio = body?.tipo_exercicio ? String(body.tipo_exercicio).trim() : null;

    if (!nome || !grupoMuscular) {
      return NextResponse.json({ error: "Informe nome e grupo muscular" }, { status: 400 });
    }

    const { userId, adminClient } = auth;

    const { data, error } = await adminClient
      .from("exercicios_biblioteca")
      .insert({
        nome,
        grupo_muscular: grupoMuscular,
        descricao,
        video_url: videoUrl,
        equipamento,
        musculos_secundarios: musculosSecundarios,
        tipo_exercicio: tipoExercicio,
        coach_id: userId,
        tipo: "privado",
      })
      .select("id, nome, grupo_muscular, equipamento, tipo_exercicio")
      .single();

    if (error) {
      return NextResponse.json({ error: "Falha ao criar exercício", details: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, exercicio: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Ocorreu um erro interno ao criar o exercício.", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
