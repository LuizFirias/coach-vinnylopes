import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/getAuthenticatedUser";
import { applyInviteCode } from "@/lib/invites/applyInviteCode";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUser(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId, user, adminClient } = auth;
    const { fullName, gender, instagram, inviteCode } = await req.json();

    if (!fullName) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    const metadataRole = user.user_metadata?.role;

    if (metadataRole !== "coach") {
      console.warn(
        "[REGISTER-COACH-PROFILE] ⚠️ Tentativa de elevação de privilégio negada para usuário:",
        userId
      );
      return NextResponse.json({ error: "Ação não permitida" }, { status: 403 });
    }

    console.log("[REGISTER-COACH-PROFILE] ✓ Usuário validado como Coach no Auth. Atualizando tabela profiles...");

    const cleanInsta = (instagram || "").replace("@", "").trim();
    const { accountType, studentLimit } = await applyInviteCode(inviteCode);

    const whatsappRaw =
      user.user_metadata?.phone || user.user_metadata?.whatsapp || user.phone || "";
    const whatsapp = String(whatsappRaw).replace(/\D/g, "") || null;

    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: userId,
        email: user.email?.toLowerCase(),
        role: "coach",
        full_name: fullName,
        sexo: gender,
        coaching_reference: cleanInsta,
        account_type: accountType,
        student_limit: studentLimit,
        whatsapp,
        atualizado_em: new Date().toISOString(),
      });

    if (profileError) {
      console.error("[REGISTER-COACH-PROFILE] ❌ Erro ao salvar dados no profiles:", profileError.message);
      return NextResponse.json({ error: "Erro ao salvar perfil no banco de dados" }, { status: 500 });
    }

    const { error: confirmError } = await adminClient.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (confirmError) {
      console.warn(
        "[REGISTER-COACH-PROFILE] ⚠️ Não foi possível auto-confirmar o e-mail:",
        confirmError.message
      );
    } else {
      console.log("[REGISTER-COACH-PROFILE] ✓ E-mail confirmado automaticamente. Login liberado.");
    }

    console.log("[REGISTER-COACH-PROFILE] 🎉 Perfil de Coach atualizado com sucesso para o usuário:", userId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Erro interno do servidor";
    console.error("[REGISTER-COACH-PROFILE] ❌ Erro interno na rota:", err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
