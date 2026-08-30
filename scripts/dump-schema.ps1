# Gera o dump do schema (somente estrutura) do banco antigo para docs/schema-dump-auronfit.sql
# Uso:
#   $env:OLD_DB_URL = "postgresql://postgres.xxxx:SENHA@aws-0-...pooler.supabase.com:5432/postgres"
#   powershell -ExecutionPolicy Bypass -File scripts\dump-schema.ps1

$ErrorActionPreference = "Stop"

$pgDump = "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
$outFile = "docs/schema-dump-auronfit.sql"

if (-not (Test-Path $pgDump)) {
  Write-Error "pg_dump nao encontrado em $pgDump"
  exit 1
}

if (-not $env:OLD_DB_URL) {
  Write-Error "Defina a variavel primeiro: `$env:OLD_DB_URL = '...connection string...'"
  exit 1
}

Write-Host "Gerando dump do schema..." -ForegroundColor Cyan

& $pgDump $env:OLD_DB_URL --schema=public --schema-only --no-owner --no-privileges -f $outFile

if ($LASTEXITCODE -eq 0) {
  $size = (Get-Item $outFile).Length
  Write-Host "OK -> $outFile ($size bytes)" -ForegroundColor Green
} else {
  Write-Error "pg_dump falhou (exit code $LASTEXITCODE)"
  exit 1
}
