import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ exists: false }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    return NextResponse.json({ exists: !!data });
  } catch {
    return NextResponse.json({ exists: false }, { status: 200 });
  }
}
