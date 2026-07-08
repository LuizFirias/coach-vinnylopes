/** Lê resposta de API com mensagem clara quando o servidor devolve HTML (ex.: 404 do Next). */
export async function readApiJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await res.text();
    if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
      throw new Error(
        "A API retornou HTML em vez de JSON. Reinicie o servidor com npm run dev e tente novamente.",
      );
    }
    throw new Error("Resposta inválida do servidor.");
  }

  return res.json() as Promise<T>;
}
