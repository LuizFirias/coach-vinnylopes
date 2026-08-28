import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getFullPlanDetails } from '@/lib/nutrition/plans';
import { getAuthenticatedCoach } from '@/lib/auth/getAuthenticatedCoach';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedCoach(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id: planId } = await params;
    if (!planId) {
      return NextResponse.json({ error: 'Missing plan ID' }, { status: 400 });
    }

    const fullPlan = await getFullPlanDetails(planId, supabaseAdmin);
    if (!fullPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Verify coach has access to this plan (super_admin pode acessar qualquer plano)
    if (auth.role !== 'super_admin' && fullPlan.coach_id !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, plan: fullPlan });
  } catch (error: any) {
    console.error('[plan GET by id] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
