import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Identificador da build em produção (Vercel) — usado pelo banner de atualização do PWA. */
export async function GET() {
  const v =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.NEXT_PUBLIC_BUILD_ID ||
    "dev";

  return NextResponse.json(
    { v },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    },
  );
}
