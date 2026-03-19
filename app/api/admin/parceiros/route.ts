import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(request: Request) {
  try {
    const { id, nome_marca, descricao, cupom, link_desconto, logo_url, imagens } = await request.json();

    if (!id) {
      return Response.json({ error: "ID do parceiro é obrigatório" }, { status: 400 });
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
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao atualizar parceiro:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "ID do parceiro é obrigatório" }, { status: 400 });
    }

    // Se tiver imagens, deletar do storage
    const { data: parceiro } = await supabaseAdmin
      .from("parceiros")
      .select("imagens, logo_url")
      .eq("id", id)
      .single();

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
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err: any) {
    console.error("Erro ao deletar parceiro:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
