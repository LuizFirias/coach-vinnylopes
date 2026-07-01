import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
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

    // Fetch the coach user details from Auth Admin API
    const { data: { user }, error } = await adminClient.auth.admin.getUserById(coachId);

    if (error || !user) {
      console.error("[COACH_WHATSAPP] Error fetching coach user from Auth:", error?.message);
      return NextResponse.json({ whatsapp: "556781232717" }); // Fallback to default
    }

    // Try to find the phone in auth user phone or user_metadata
    let phone = user.phone || user.user_metadata?.phone || user.user_metadata?.whatsapp || "";
    
    // Normalize phone number (remove +, spaces, parentheses)
    phone = phone.replace(/\D/g, "");

    // Fallback to default owner phone if empty
    if (!phone) {
      phone = "556781232717";
    }

    return NextResponse.json({ whatsapp: phone });
  } catch (err: any) {
    console.error("[COACH_WHATSAPP] Unexpected error:", err);
    return NextResponse.json({ whatsapp: "556781232717" });
  }
}
