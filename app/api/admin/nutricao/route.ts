import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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

    const formData = await request.formData();
    const alunoId = formData.get('aluno_id') as string;
    const descricao = formData.get('descricao') as string | null;
    const file = formData.get('file') as File;

    if (!alunoId || !file) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verificar se o coach tem acesso ao aluno
    const { data: relationship } = await supabaseAdmin
      .from('coach_alunos')
      .select('*')
      .eq('coach_id', user.id)
      .eq('aluno_id', alunoId)
      .single();

    if (!relationship) {
      return NextResponse.json(
        { error: 'Você não tem permissão para adicionar planos para este aluno' },
        { status: 403 }
      );
    }

    // Upload do arquivo para o storage
    const fileName = `${alunoId}/${Date.now()}_${file.name}`;
    const fileBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(fileBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('plano_alimentar')
      .upload(fileName, fileData, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Inserir registro no banco
    const { data: planData, error: dbError } = await supabaseAdmin
      .from('plano_alimentar_pdf')
      .insert({
        aluno_id: alunoId,
        coach_id: user.id,
        url_pdf: fileName,
        nome_arquivo: file.name,
        descricao: descricao || null,
        criado_em: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Tentar remover o arquivo do storage se falhar no banco
      await supabaseAdmin.storage
        .from('plano_alimentar')
        .remove([fileName]);
      throw dbError;
    }

    return NextResponse.json({ success: true, plan: planData });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
