import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getNutritionPlanByStudent, getFullPlanDetails } from '@/lib/nutrition/plans';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active digital nutrition plan for the student
    const activePlan = await getNutritionPlanByStudent(user.id, supabaseAdmin);
    if (!activePlan) {
      return NextResponse.json({ plan: null });
    }

    const fullPlan = await getFullPlanDetails(activePlan.id, supabaseAdmin);
    return NextResponse.json({ plan: fullPlan });
  } catch (error: any) {
    console.error('[digital plan GET] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
