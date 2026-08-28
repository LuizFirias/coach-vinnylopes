import { NextResponse } from "next/server";
import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";
import { checkImportQuota, logImportUsage } from "@/lib/ai/importUsageLimit";
import { parseWorkoutImport } from "@/lib/ai/parseWorkoutImport";
import { extractPdfText } from "@/lib/ai/extractPdfText";

const MAX_PDF_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req: Request) {
  const auth = await getAuthenticatedCoach(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const quota = await checkImportQuota(auth.adminClient, auth.userId);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error:
          "Você já usou as 2 importações por IA dessa semana. No plano PRO (ou START) esse limite não existe.",
      },
      { status: 429 },
    );
  }

  let texto = "";
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const textoCampo = formData.get("texto");

      if (file instanceof File) {
        if (file.type !== "application/pdf") {
          return NextResponse.json({ error: "Envie um arquivo PDF." }, { status: 400 });
        }
        if (file.size > MAX_PDF_BYTES) {
          return NextResponse.json({ error: "PDF muito grande (máximo 8MB)." }, { status: 400 });
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        texto = await extractPdfText(buffer);
        if (!texto.trim()) {
          return NextResponse.json(
            { error: "Não consegui ler texto desse PDF — ele pode ser só uma imagem escaneada." },
            { status: 400 },
          );
        }
      } else if (typeof textoCampo === "string") {
        texto = textoCampo;
      }
    } else {
      const body = await req.json().catch(() => ({}));
      texto = typeof body?.texto === "string" ? body.texto : "";
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao ler o conteúdo enviado." },
      { status: 400 },
    );
  }

  if (!texto.trim()) {
    return NextResponse.json({ error: "Cole o texto do treino ou envie um PDF." }, { status: 400 });
  }

  try {
    const exercicios = await parseWorkoutImport(texto);
    if (exercicios.length === 0) {
      return NextResponse.json(
        { error: "Não consegui reconhecer nenhum exercício nesse conteúdo." },
        { status: 422 },
      );
    }

    await logImportUsage(auth.adminClient, auth.userId);

    return NextResponse.json({
      exercicios,
      remaining: quota.remaining === null ? null : Math.max(quota.remaining - 1, 0),
    });
  } catch (err) {
    console.error("Erro na importação de treino por IA:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao processar com a IA." },
      { status: 500 },
    );
  }
}
