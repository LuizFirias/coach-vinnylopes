-- Contas teste/parceiro: tipo de conta e convites (já aplicado manualmente em produção se necessário)

alter table profiles add column if not exists account_type text not null default 'padrao';

create table if not exists partner_invites (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  account_type text not null check (account_type in ('teste', 'parceiro')),
  student_limit integer,
  max_uses integer not null default 1,
  uses_count integer not null default 0,
  created_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now()
);

alter table partner_invites enable row level security;
