import { NextResponse } from "next/server";
import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";

/** Remove um modelo de ficha salvo pelo coach logado. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthenticatedCoach(req, {
    allowedRoles: ["coach", "super_admin", "admin"],
  });
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  const { error } = await auth.adminClient
    .from("fichas_modelo")
    .delete()
    .eq("id", id)
    .eq("coach_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
