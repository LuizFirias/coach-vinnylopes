import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const searchParams = req.nextUrl.searchParams;
    const coachId = searchParams.get("coachId");

    if (!coachId) {
      return NextResponse.json({ error: "Missing coachId parameter" }, { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("coach_id")
      .eq("id", user.id)
      .single();

    const isOwnCoach = profile?.coach_id === coachId;

    if (!isOwnCoach) {
      const { data: relationship } = await adminClient
        .from("coach_alunos")
        .select("id")
        .eq("aluno_id", user.id)
        .eq("coach_id", coachId)
        .maybeSingle();

      if (!relationship) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data: { user: coachUser }, error } = await adminClient.auth.admin.getUserById(coachId);

    if (error || !coachUser) {
      console.error("[COACH_WHATSAPP] Error fetching coach user from Auth:", error?.message);
      return NextResponse.json({ whatsapp: "556781232717" });
    }

    let phone =
      coachUser.phone ||
      coachUser.user_metadata?.phone ||
      coachUser.user_metadata?.whatsapp ||
      "";

    phone = phone.replace(/\D/g, "");

    if (!phone) {
      phone = "556781232717";
    }

    return NextResponse.json({ whatsapp: phone });
  } catch (err: unknown) {
    console.error("[COACH_WHATSAPP] Unexpected error:", err);
    return NextResponse.json({ whatsapp: "556781232717" });
  }
}
