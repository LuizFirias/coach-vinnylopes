import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { saveMealCheckin } from '@/lib/nutrition/checkins';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { checkin } = body;

    if (!checkin || !checkin.plan_id || !checkin.meal_id || !checkin.checkin_date || !checkin.status) {
      return NextResponse.json({ error: 'Missing required checkin fields' }, { status: 400 });
    }

    // Force student_id to be the authenticated student
    const saved = await saveMealCheckin({
      ...checkin,
      student_id: user.id,
    });

    return NextResponse.json({ success: true, checkin: saved });
  } catch (error: any) {
    console.error('[checkin POST] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
