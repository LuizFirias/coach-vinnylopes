-- Quem faltou quando uma aula é marcada como cancelada por falta (coach ou
-- aluno) — usado nos cards de estatística e no gráfico da agenda.
-- null = motivo não especificado (aulas canceladas antes desta feature).

alter table public.aulas_presenciais
  add column if not exists falta_de text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'aulas_presenciais_falta_de_check'
  ) then
    alter table public.aulas_presenciais
      add constraint aulas_presenciais_falta_de_check
      check (falta_de is null or falta_de in ('coach', 'aluno'));
  end if;
end $$;
