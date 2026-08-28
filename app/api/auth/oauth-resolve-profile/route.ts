import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const PROFILE_FIELDS =
  "id, role, must_change_password, first_access_completed, onboarding_visto, email, full_name";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { data: profileById } = await admin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("id", user.id)
      .maybeSingle();

    const email = user.email?.trim().toLowerCase();
    let profileByEmail = null;

    if (email) {
      const { data } = await admin
        .from("profiles")
        .select(PROFILE_FIELDS)
        .ilike("email", email)
        .maybeSingle();
      profileByEmail = data;
    }

    if (profileById) {
      return NextResponse.json({ profile: profileById, userId: user.id });
    }

    // E-mail já vinculado a outro user_id (conta antiga de senha sem link OAuth)
    if (profileByEmail && profileByEmail.id !== user.id) {
      return NextResponse.json({
        error: "duplicate_account",
        message:
          "Este e-mail já possui conta com senha. Entre com e-mail e senha ou peça ao suporte para vincular o Google.",
        existingRole: profileByEmail.role,
      });
    }

    // Conta Google nova sem profile ainda — cria o mínimo (aluno)
    if (email) {
      await admin.from("profiles").upsert(
        {
          id: user.id,
          email,
          role: "aluno",
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );

      const { data: afterInsert } = await admin
        .from("profiles")
        .select(PROFILE_FIELDS)
        .eq("id", user.id)
        .maybeSingle();

      if (afterInsert) {
        return NextResponse.json({ profile: afterInsert, userId: user.id });
      }
    }

    return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  } catch (err) {
    console.error("[oauth-resolve-profile]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
