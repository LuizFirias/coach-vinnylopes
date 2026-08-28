import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { count, error } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "coach");

    if (error) {
      return NextResponse.json({ count: null }, { status: 200 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: null }, { status: 200 });
  }
}
