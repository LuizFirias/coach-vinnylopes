import { NextResponse } from "next/server";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";
import { uploadToR2 } from "@/lib/r2/client";

const ALLOWED_TYPES = ["image/gif", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB — mesmo limite já usado hoje

/**
 * Recebe um GIF/WebP animado de exercício, sobe o arquivo original pro R2 e
 * gera + sobe uma miniatura estática (1º frame) automaticamente — sharp só
 * lê a página 0 de uma imagem animada por padrão, não precisa de flag extra.
 */
export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedCoach(req, {
      allowedRoles: ["coach", "super_admin", "admin"],
    });
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const genero = String(formData.get("genero") || "padrao");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Apenas arquivos GIF ou WebP animado são permitidos." },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "O arquivo não pode exceder 2MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/gif" ? "gif" : "webp";
    const id = randomUUID();
    const gifKey = `exercicios/${id}.${ext}`;
    const posterKey = `exercicios/${id}-poster.webp`;

    let posterBuffer: Buffer | null = null;
    try {
      // Sem { animated: true } — sharp lê só a página 0 (1º frame), que é
      // exatamente a miniatura estática que queremos.
      posterBuffer = await sharp(buffer).resize(400, 400, { fit: "inside" }).webp().toBuffer();
    } catch (err) {
      console.error("[upload-exercicio-media] Falha ao gerar miniatura:", err);
      // Segue sem miniatura — a tela cai pro GIF animado como fallback.
    }

    await uploadToR2(gifKey, buffer, file.type);
    if (posterBuffer) {
      await uploadToR2(posterKey, posterBuffer, "image/webp");
    }

    return NextResponse.json({
      success: true,
      genero,
      gifKey,
      posterKey: posterBuffer ? posterKey : null,
    });
  } catch (err: any) {
    console.error("[upload-exercicio-media] Erro:", err);
    return NextResponse.json(
      { error: "Falha ao enviar o arquivo.", details: err?.message || String(err) },
      { status: 500 },
    );
  }
}
