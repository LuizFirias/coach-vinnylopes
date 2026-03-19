import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get current user from auth header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's total points
    const { data: pontuacao } = await supabaseAdmin
      .from('pontuacao_alunos')
      .select('total_pontos')
      .eq('aluno_id', user.id)
      .single();

    return NextResponse.json({
      userId: user.id,
      totalPoints: pontuacao?.total_pontos || 0
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST to force recalculate points (for testing/admin)
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

    // Recalculate points for user
    const { data: workouts } = await supabaseAdmin
      .from('treinos_manuais')
      .select('pontos_earn')
      .eq('aluno_id', user.id)
      .eq('concluido', true);

    const totalPoints = (workouts || []).reduce((sum, w) => sum + (w.pontos_earn || 0), 0);

    // Upsert pontuacao
    const { error: upsertError } = await supabaseAdmin
      .from('pontuacao_alunos')
      .upsert({
        aluno_id: user.id,
        total_pontos: totalPoints,
        atualizado_em: new Date().toISOString()
      }, {
        onConflict: 'aluno_id'
      });

    if (upsertError) throw upsertError;

    return NextResponse.json({
      userId: user.id,
      totalPoints
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
