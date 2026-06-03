import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      const missing = [];
      if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL");
      if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

      return NextResponse.json(
        { error: "Configuração do servidor incompleta", missingVariables: missing },
        { status: 500 }
      );
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

    let token = "";
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("sb-access-token")?.value || "";
    } catch {
      // ignore
    }

    if (!token) {
      const bearer = req.headers.get("authorization") || "";
      token = bearer.replace("Bearer ", "");
    }

    if (!token) {
      return NextResponse.json({ error: "Não autorizado - Sessão não encontrada" }, { status: 401 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authData?.user) {
      return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
    }

    const userId = authData.user.id;

    const { data: profile, error: roleError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (roleError) {
      return NextResponse.json({ error: "Erro ao verificar permissões", details: roleError.message }, { status: 500 });
    }

    const role = profile?.role;
    const allowedRoles = new Set(["coach", "super_admin", "admin"]);

    if (!role || !allowedRoles.has(role)) {
      return NextResponse.json({ error: "Acesso negado - Apenas coaches podem criar exercícios" }, { status: 403 });
    }

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
