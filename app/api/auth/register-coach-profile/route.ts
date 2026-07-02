import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Usando o client do admin (service_role) para bypassar RLS com segurança no servidor
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl!, serviceRoleKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(req: Request) {
  try {
    const { userId, fullName, gender, instagram } = await req.json();

    if (!userId || !fullName) {
      return NextResponse.json({ error: "ID do usuário e nome são obrigatórios" }, { status: 400 });
    }

    console.log("[REGISTER-COACH-PROFILE] 🔍 Verificando usuário na base de autenticação:", userId);

    // 1. Buscar dados do usuário no Auth via Admin API para validar se foi cadastrado como coach
    const { data: userData, error: getUserError } = await adminClient.auth.admin.getUserById(userId);

    if (getUserError || !userData?.user) {
      console.error("[REGISTER-COACH-PROFILE] ❌ Usuário não encontrado no Auth:", getUserError?.message);
      return NextResponse.json({ error: "Usuário não encontrado no sistema" }, { status: 404 });
    }

    const authUser = userData.user;
    const metadataRole = authUser.user_metadata?.role;

    // 2. Segurança: Validar se a role salva no metadata seguro do Auth é de fato 'coach'
    if (metadataRole !== "coach") {
      console.warn("[REGISTER-COACH-PROFILE] ⚠️ Tentativa de elevação de privilégio negada para usuário:", userId);
      return NextResponse.json({ error: "Ação não permitida" }, { status: 403 });
    }

    console.log("[REGISTER-COACH-PROFILE] ✓ Usuário validado como Coach no Auth. Atualizando tabela profiles...");

    // 3. Atualizar/Upsert na tabela public.profiles usando a permissão bypass de RLS do service_role
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: userId,
        email: authUser.email?.toLowerCase(),
        role: "coach",
        full_name: fullName,
        sexo: gender,
        coaching_reference: instagram.replace("@", "").trim(),
        atualizado_em: new Date().toISOString()
      });

    if (profileError) {
      console.error("[REGISTER-COACH-PROFILE] ❌ Erro ao salvar dados no profiles:", profileError.message);
      return NextResponse.json({ error: "Erro ao salvar perfil no banco de dados" }, { status: 500 });
    }

    console.log("[REGISTER-COACH-PROFILE] 🎉 Perfil de Coach atualizado com sucesso para o usuário:", userId);
    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Erro interno do servidor";
    console.error("[REGISTER-COACH-PROFILE] ❌ Erro interno na rota:", err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
