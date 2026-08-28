import { redirect } from "next/navigation";

type SearchParams = { convite?: string };

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const qs = params.convite
    ? `?convite=${encodeURIComponent(params.convite)}`
    : "";
  redirect(`/signup/coach${qs}`);
}
