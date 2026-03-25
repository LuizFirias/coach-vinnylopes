// =====================================================
// EXEMPLO: API atualizada para Biblioteca Híbrida
// =====================================================
// Arquivo: app/api/admin/exercicios-biblioteca/route.ts
// 
// Use este código quando executar a migração híbrida
// =====================================================

import { NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const nome = String(body?.nome || '').trim();
    const grupoMuscular = String(body?.grupo_muscular || '').trim();
    const videoUrl = String(body?.video_url || '').trim();
    const descricao = String(body?.descricao || '').trim();
    
    // Validações
    if (!nome || !grupoMuscular) {
      return NextResponse.json(
        { error: 'Informe nome e grupo muscular' },
        { status: 400 }
      );
    }

    // ✅ NOVO: Obter usuário e role
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // ✅ NOVO: Verificar se é admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

    // ✅ NOVO: Definir tipo e coach_id baseado no role
    const exercicioData = {
      nome,
      grupo_muscular: grupoMuscular,
      video_url: videoUrl || null,
      descricao: descricao || null,
      tipo: isAdmin ? 'global' : 'privado', // ← Admin cria global
      coach_id: isAdmin ? null : user.id,    // ← Admin = NULL (global)
    };

    // Inserir no banco
    const { data, error } = await supabaseClient
      .from('exercicios_biblioteca')
      .insert(exercicioData)
      .select('id, nome, grupo_muscular, tipo')
      .single();

    if (error) {
      console.error('Erro ao criar exercício:', error);
      return NextResponse.json(
        { error: 'Erro ao criar exercício' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Erro no POST /api/admin/exercicios-biblioteca:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const id = String(body?.id || '').trim();
    const nome = String(body?.nome || '').trim();
    const grupoMuscular = String(body?.grupo_muscular || '').trim();
    const videoUrl = String(body?.video_url || '').trim();
    const descricao = String(body?.descricao || '').trim();

    if (!id || !nome || !grupoMuscular) {
      return NextResponse.json(
        { error: 'Informe id, nome e grupo muscular' },
        { status: 400 }
      );
    }

    // ✅ NOVO: Verificar permissão
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // RLS já garante que só pode editar próprios ou globais (se admin)
    const { data, error } = await supabaseClient
      .from('exercicios_biblioteca')
      .update({
        nome,
        grupo_muscular: grupoMuscular,
        video_url: videoUrl || null,
        descricao: descricao || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar exercício:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar exercício' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Erro no PUT /api/admin/exercicios-biblioteca:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID não fornecido' },
        { status: 400 }
      );
    }

    // ✅ Verificar autenticação
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // RLS já garante que só pode deletar próprios ou globais (se admin)
    const { error } = await supabaseClient
      .from('exercicios_biblioteca')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao deletar exercício:', error);
      return NextResponse.json(
        { error: 'Erro ao deletar exercício' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erro no DELETE /api/admin/exercicios-biblioteca:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// =====================================================
// MUDANÇAS RESUMIDAS:
// =====================================================
// 
// ✅ POST:
//    - Verifica role do usuário
//    - Admin → tipo='global', coach_id=NULL
//    - Coach → tipo='privado', coach_id=user.id
//
// ✅ PUT/DELETE:
//    - RLS já controla permissões
//    - Não precisa mudar lógica
//
// ✅ GET:
//    - Não muda nada!
//    - RLS filtra automaticamente
//
// =====================================================
