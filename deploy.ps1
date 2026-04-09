# Deploy Clube Sorriso Wedent — Execute no PowerShell como Administrador
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY CLUBE SORRISO WEDENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Instalar Vercel CLI se nao existir
Write-Host "`n[1/4] Verificando Vercel CLI..." -ForegroundColor Yellow
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

# 2. Criar .env.local com as variaveis
Write-Host "`n[2/4] Configurando variaveis de ambiente..." -ForegroundColor Yellow
$envContent = @"
NEXT_PUBLIC_SUPABASE_URL=https://khwqbycptmczjzgoosot.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3FieWNwdG1jemp6Z29vc290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjMzNzEsImV4cCI6MjA4NzU5OTM3MX0.xjUojK0vEXwxxDws1qBeCeXvalIhLTU9SC6lUZTSR8A
"@
$envContent | Out-File -FilePath ".env.local" -Encoding utf8 -NoNewline
Write-Host "Variaveis configuradas." -ForegroundColor Green

# 3. Login no Vercel (abre o browser)
Write-Host "`n[3/4] Autenticando no Vercel..." -ForegroundColor Yellow
Write-Host "Uma janela do browser vai abrir. Faca login com sua conta Vercel." -ForegroundColor White
vercel login

# 4. Deploy para producao
Write-Host "`n[4/4] Fazendo deploy..." -ForegroundColor Yellow
vercel deploy --prod --yes --name clube-sorriso-wedent `
  --env NEXT_PUBLIC_SUPABASE_URL="https://khwqbycptmczjzgoosot.supabase.co" `
  --env NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3FieWNwdG1jemp6Z29vc290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjMzNzEsImV4cCI6MjA4NzU5OTM3MX0.xjUojK0vEXwxxDws1qBeCeXvalIhLTU9SC6lUZTSR8A"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  DEPLOY CONCLUIDO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nAcesse seu app em: https://clube-sorriso-wedent.vercel.app" -ForegroundColor Cyan
Write-Host "Admin: https://clube-sorriso-wedent.vercel.app/admin" -ForegroundColor Cyan
Write-Host "Login: admin@wedent.com.br / wedent2025" -ForegroundColor Cyan
