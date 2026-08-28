import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

/** Instância única do client OpenAI — criada só na 1ª chamada (lazy), server-side. */
export function getOpenAI(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não configurada no servidor.");
  }
  client = new OpenAI({ apiKey });
  return client;
}
