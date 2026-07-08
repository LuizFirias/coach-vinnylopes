import { NextResponse } from "next/server";

import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";
import { createPartnerInvite } from "@/lib/invites/createPartnerInvite";
import { getSiteUrl } from "@/lib/subscriptions/siteUrl";

export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedCoach(req, {
      allowedRoles: ["super_admin"],
    });

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data, error } = await auth.adminClient
      .from("partner_invites")
      .select("id, code, account_type, student_limit, max_uses, uses_count, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const siteUrl = getSiteUrl();
    const invites = (data ?? []).map((invite) => ({
      ...invite,
      inviteLink: `${siteUrl}/cadastro?convite=${invite.code}`,
      isExhausted: invite.uses_count >= invite.max_uses,
    }));

    return NextResponse.json({ invites });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedCoach(req, {
      allowedRoles: ["super_admin"],
    });

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const accountType = body?.accountType ?? body?.tipo;
    const notes = body?.notes ?? body?.nome ?? null;
    const maxUses = body?.maxUses ?? body?.usos;
    const studentLimit = body?.studentLimit ?? body?.limite;

    if (!accountType || !["teste", "parceiro"].includes(accountType)) {
      return NextResponse.json(
        { error: "Tipo inválido. Use teste ou parceiro." },
        { status: 400 }
      );
    }

    const parsedMaxUses = maxUses != null ? Number(maxUses) : 1;
    if (!Number.isFinite(parsedMaxUses) || parsedMaxUses < 1) {
      return NextResponse.json(
        { error: "Quantidade de usos deve ser pelo menos 1." },
        { status: 400 }
      );
    }

    let parsedLimit: number | null | undefined;
    if (studentLimit != null && studentLimit !== "") {
      parsedLimit = Number(studentLimit);
      if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
        return NextResponse.json(
          { error: "Limite de alunos inválido." },
          { status: 400 }
        );
      }
    } else if (accountType === "parceiro") {
      parsedLimit = null;
    }

    const invite = await createPartnerInvite({
      accountType,
      notes,
      maxUses: parsedMaxUses,
      studentLimit: parsedLimit,
      createdBy: auth.userId,
    });

    return NextResponse.json({ invite });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
