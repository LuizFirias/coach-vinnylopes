# Restaura o schema no banco NOVO (auronfit-prod) e aplica os fixes multi-coach.
# Uso:
#   $env:NEW_DB_URL = "postgresql://postgres.xxxx:SENHA@aws-0-...pooler.supabase.com:5432/postgres"
#   powershell -ExecutionPolicy Bypass -File scripts\restore-schema.ps1

$ErrorActionPreference = "Stop"

$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"

if (-not (Test-Path $psql)) {
  Write-Error "psql nao encontrado em $psql"
  exit 1
}

if (-not $env:NEW_DB_URL) {
  Write-Error "Defina a connection string do banco NOVO: `$env:NEW_DB_URL = '...'"
  exit 1
}

Write-Host "==> 1/3 Habilitando extensao uuid-ossp..." -ForegroundColor Cyan
& $psql $env:NEW_DB_URL -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;'
if ($LASTEXITCODE -ne 0) { Write-Error "Falha ao habilitar uuid-ossp"; exit 1 }

Write-Host "==> 2/3 Restaurando schema (dump)..." -ForegroundColor Cyan
& $psql $env:NEW_DB_URL -v ON_ERROR_STOP=1 -f docs/schema-dump-auronfit.sql
if ($LASTEXITCODE -ne 0) { Write-Error "Falha ao restaurar o dump (veja o erro acima)"; exit 1 }

Write-Host "==> 3/3 Aplicando fixes multi-coach..." -ForegroundColor Cyan
& $psql $env:NEW_DB_URL -v ON_ERROR_STOP=1 -f docs/restore-fixes.sql
if ($LASTEXITCODE -ne 0) { Write-Error "Falha ao aplicar os fixes"; exit 1 }

Write-Host ""
Write-Host "CONCLUIDO! Banco auronfit-prod restaurado e corrigido." -ForegroundColor Green
