import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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

    // Get user's nutrition plans
    const { data: plans, error } = await supabaseAdmin
      .from('plano_alimentar_pdf')
      .select('*')
      .eq('aluno_id', user.id)
      .order('criado_em', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ plans: plans || [] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { planId } = await request.json();

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID required' },
        { status: 400 }
      );
    }

    // Verify ownership (coach or student)
    const { data: plan } = await supabaseAdmin
      .from('plano_alimentar_pdf')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan || (plan.coach_id !== user.id && plan.aluno_id !== user.id)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('plano_alimentar_pdf')
      .delete()
      .eq('id', planId);

    if (deleteError) throw deleteError;

    // Delete from storage (suporta path novo ou URL legada)
    if (plan.url_pdf) {
      const path = plan.url_pdf.startsWith('http')
        ? (plan.url_pdf.match(/\/plano_alimentar\/(.+?)(\?.*)?$/)?.[1] ?? null)
        : plan.url_pdf;
      if (path) {
        await supabaseAdmin.storage
          .from('plano_alimentar')
          .remove([path]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
