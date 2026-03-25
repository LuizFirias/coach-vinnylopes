import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = getSupabaseAdmin();

export async function PUT(request: NextRequest) {
  try {
    // Validar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id, nome_marca, descricao, cupom, link_desconto, logo_url, imagens } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID do parceiro é obrigatório" }, { status: 400 });
    }

    // Verificar se o parceiro pertence ao coach autenticado
    const { data: parceiroExistente, error: checkError } = await supabaseAdmin
      .from("parceiros")
      .select("coach_id")
      .eq("id", id)
      .single();

    if (checkError || !parceiroExistente) {
      return NextResponse.json({ error: "Parceiro não encontrado" }, { status: 404 });
    }

    if (parceiroExistente.coach_id !== user.id) {
      return NextResponse.json({ error: "Você não tem permissão para editar este parceiro" }, { status: 403 });
    }

    const updateData: any = {};
    if (nome_marca) updateData.nome_marca = nome_marca;
    if (descricao !== undefined) updateData.descricao = descricao;
    if (cupom) updateData.cupom = cupom;
    if (link_desconto) updateData.link_desconto = link_desconto;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (imagens !== undefined) updateData.imagens = imagens;

    const { error } = await supabaseAdmin
      .from("parceiros")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao atualizar parceiro:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Validar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID do parceiro é obrigatório" }, { status: 400 });
    }

    // Buscar parceiro e verificar ownership
    const { data: parceiro, error: fetchError } = await supabaseAdmin
      .from("parceiros")
      .select("coach_id, imagens, logo_url")
      .eq("id", id)
      .single();

    if (fetchError || !parceiro) {
      return NextResponse.json({ error: "Parceiro não encontrado" }, { status: 404 });
    }

    if (parceiro.coach_id !== user.id) {
      return NextResponse.json({ error: "Você não tem permissão para deletar este parceiro" }, { status: 403 });
    }

    // Se tiver imagens, deletar do storage
    if (parceiro?.imagens) {
      const paths = parceiro.imagens.map((url: string) => {
        const matches = url.match(/\/storage\/v1\/object\/public\/parceiros-logos\/(.+)/);
        return matches ? matches[1] : null;
      }).filter(Boolean);

      if (paths.length > 0) {
        await supabaseAdmin.storage
          .from("parceiros-logos")
          .remove(paths);
      }
    }

    const { error } = await supabaseAdmin
      .from("parceiros")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao deletar parceiro:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
