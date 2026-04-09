# Deploy Clube Sorriso Wedent

## ✅ Pré-requisitos
- Node.js instalado (https://nodejs.org)
- Conta Vercel (https://vercel.com) — crie gratuitamente

---

## 🚀 Opção A — Deploy pelo Windows (recomendado)

1. Extraia o ZIP em uma pasta (ex: `C:\clube-sorriso-wedent`)
2. Abra o PowerShell como **Administrador**
3. Navegue até a pasta:
   ```
   cd C:\clube-sorriso-wedent
   ```
4. Execute o script de deploy:
   ```
   .\deploy.ps1
   ```
5. O browser vai abrir para login no Vercel — faça login
6. Aguarde o deploy (~2 minutos)
7. Copie a URL que aparecer no final!

---

## 🚀 Opção B — Deploy pela interface web do Vercel

1. Acesse: https://vercel.com/new
2. Clique em **"Continue with..."** e entre com sua conta
3. Clique em **"Browse"** ou arraste a pasta do projeto
4. Em **"Environment Variables"** adicione:

   | Nome | Valor |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://khwqbycptmczjzgoosot.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3FieWNwdG1jemp6Z29vc290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjMzNzEsImV4cCI6MjA4NzU5OTM3MX0.xjUojK0vEXwxxDws1qBeCeXvalIhLTU9SC6lUZTSR8A` |

5. Clique em **Deploy** e aguarde!

---

## 🔑 Acesso após o deploy

| O que | URL |
|-------|-----|
| Portal do paciente | `https://seu-app.vercel.app/` |
| Painel admin | `https://seu-app.vercel.app/admin` |
| Login admin | `admin@wedent.com.br` / `wedent2025` |

> ⚠️ Após o deploy, acesse o admin e altere a senha padrão!

---

## 📋 Estrutura do sistema

```
/                       → Portal do paciente (consulta por CPF)
/paciente/[cpf]         → Dashboard do paciente
/admin                  → Login da equipe
/admin/dashboard        → Visão geral + aprovações
/admin/pacientes        → Cadastro e gestão de pacientes
/admin/lancamentos      → Lançar e aprovar pontos
/admin/resgates         → Controle de resgates
```
