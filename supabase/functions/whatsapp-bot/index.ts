import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const PHONE_NUMBER_ID = "11326047299248411"
const META_TOKEN = "EAAiyaZCQGFwgBRPjz0isIWbvxVftMLdpiuSBsEPk8To2qr2yu4SJ38RNvyUMajDagI0vZB7UmlIhJYBB8BAba7sEICkJHEwL9LSkcHlqaceEzLxoH9BDUQQMErWsHmSjZCp9C1yVyNkmfDFDlMV0hfnj6H266OnTmH834VyRRU5ZAlbgqVnlYAeBZBiVp03laJWk5MpH1gDFXGyPBwNsUPBnPyDA5t706BO7jRltbo19Xk6dXtgZDZD"
const VERIFY_TOKEN = "wedent2025"
const SUPABASE_URL = "https://khwqbycptmczjzgoosot.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3FieWNwdG1jemp6Z29vc290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjMzNzEsImV4cCI6MjA4NzU5OTM3MX0.xjUojK0vEXwxxDws1qBeCeXvalIhLTU9SC6lUZTSR8A"

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Enviar mensagem WhatsApp ───────────────────────────────────────────────
async function sendMessage(to: string, text: string) {
  const res = await fetch(
    `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${META_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: text },
      }),
    }
  )
  const json = await res.json()
  console.log("Meta response:", JSON.stringify(json))
}

// ─── Buscar paciente por telefone ───────────────────────────────────────────
async function getPatiente(phone: string) {
  const { data, error } = await supabase
    .from("cs_pacientes")
    .select("id, nome, saldo_pontos, clinica")
    .eq("telefone", phone)
    .eq("ativo", true)
    .limit(1)
  if (error) console.error("Supabase error:", error)
  return data?.[0] || null
}

// ─── Buscar prêmios ativos ──────────────────────────────────────────────────
async function getPremios() {
  const { data } = await supabase
    .from("cs_premios")
    .select("nome, nivel, pontos_necessarios")
    .eq("ativo", true)
    .order("nivel")
    .order("pontos_necessarios")
  return data || []
}

// ─── Mensagens ──────────────────────────────────────────────────────────────
function msgMenu(nome: string, saldo: number, clinica: string) {
  const c = clinica === "central" ? "CENTRAL" : "WEDENT"
  return (
    `Olá, ${nome}! 😊\n\n` +
    `🦷 Clube Sorriso ${c}\n` +
    `Seu saldo: *${saldo} pontos* ⭐\n\n` +
    `O que deseja?\n` +
    `1️⃣ Ver meu saldo\n` +
    `2️⃣ Ver prêmios disponíveis\n` +
    `3️⃣ Registrar atividade\n` +
    `4️⃣ Solicitar resgate\n` +
    `5️⃣ Falar com a recepção\n\n` +
    `Digite o número da opção:`
  )
}

function msgSaldo(saldo: number, disponiveis: any[]) {
  let msg = `🦷 Seu saldo atual: *${saldo} pontos*\n`
  if (disponiveis.length > 0) {
    msg += `\nPrêmios que você já pode resgatar:\n`
    for (const p of disponiveis) {
      msg += `🎁 ${p.nome} — ${p.pontos_necessarios} pts\n`
    }
  } else {
    msg += `\nAinda não há prêmios disponíveis para o seu saldo. Continue acumulando! 💪`
  }
  msg += `\n\nDigite *menu* para voltar ao início.`
  return msg
}

function msgCatalogo(premios: any[]) {
  const niveis: Record<number, string> = {
    1: "Nível 1 — Entrada",
    2: "Nível 2 — Intermediário",
    3: "Nível 3 — Avançado",
    4: "Nível 4 — Troféu",
  }
  let msg = `🎁 *Catálogo de Prêmios*\n`
  let nivelAtual = 0
  for (const p of premios) {
    if (p.nivel !== nivelAtual) {
      nivelAtual = p.nivel
      msg += `\n*${niveis[nivelAtual]}:*\n`
    }
    msg += `• ${p.nome} — ${p.pontos_necessarios} pts\n`
  }
  msg += `\nDigite *menu* para voltar ao início.`
  return msg
}

const MSG_ATIVIDADE =
  `Para registrar sua atividade, entre em contato com a recepção! 😊\n\n` +
  `Suas ações valem pontos:\n` +
  `• Indicação que fechou tratamento: 40 pts\n` +
  `• Indicação cadastrada: 6 pts\n` +
  `• Depoimento em vídeo: 30 pts\n` +
  `• Avaliação 5★ Google: 20 pts\n` +
  `• Check-up semestral: 16 pts\n` +
  `• Story com @wedent: 5 pts\n\n` +
  `📱 WhatsApp: (43) 99952-3762\n` +
  `Pontos creditados em até 48h após validação. ✅\n\n` +
  `Digite *menu* para voltar ao início.`

const MSG_RESGATE =
  `Para solicitar seu resgate, entre em contato com a recepção:\n` +
  `📱 WhatsApp: (43) 99952-3762\n\n` +
  `Nossa equipe vai te ajudar a escolher e retirar seu prêmio! 😊\n\n` +
  `Digite *menu* para voltar ao início.`

const MSG_RECEPCAO =
  `Conectando você com nossa equipe! 😊\n` +
  `📱 (43) 99952-3762\n\n` +
  `Nosso horário de atendimento:\n` +
  `Seg-Sex: 8h às 18h\n` +
  `Sábado: 8h às 12h\n\n` +
  `Digite *menu* para voltar ao início.`

const MSG_NAO_CADASTRADO =
  `Olá! 👋\n\n` +
  `Não encontrei seu cadastro no Clube Sorriso Wedent.\n\n` +
  `Para participar gratuitamente, fale com nossa recepção e peça para cadastrar seu número! 😊\n\n` +
  `📱 (43) 99952-3762\n` +
  `🦷 Wedent Clínica Odontológica — Londrina/PR`

// ─── Servidor principal ─────────────────────────────────────────────────────
serve(async (req) => {
  // Verificação do webhook Meta (GET)
  if (req.method === "GET") {
    const url = new URL(req.url)
    const mode = url.searchParams.get("hub.mode")
    const token = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verificado com sucesso!")
      return new Response(challenge, { status: 200 })
    }
    return new Response("Forbidden", { status: 403 })
  }

  // Mensagens recebidas (POST)
  if (req.method === "POST") {
    try {
      const body = await req.json()
      console.log("Payload recebido:", JSON.stringify(body))

      const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]

      // Ignorar eventos que não são mensagens (ex: status updates)
      if (!message) {
        return new Response("OK", { status: 200 })
      }

      // Ignorar mensagens que não são texto
      if (message.type !== "text") {
        return new Response("OK", { status: 200 })
      }

      const from: string = message.from
      const text: string = (message.text?.body || "").trim()
      const textLower = text.toLowerCase()

      console.log(`Mensagem de ${from}: "${text}"`)

      const paciente = await getPatiente(from)

      if (!paciente) {
        console.log(`Paciente não encontrado para telefone: ${from}`)
        await sendMessage(from, MSG_NAO_CADASTRADO)
        return new Response("OK", { status: 200 })
      }

      const { nome, saldo_pontos, clinica } = paciente
      console.log(`Paciente encontrado: ${nome}, saldo: ${saldo_pontos}`)

      const saudacoes = ["menu", "inicio", "início", "oi", "ola", "olá", "hello", "hi", "bom dia", "boa tarde", "boa noite", "boa tarde!", "bom dia!"]

      if (saudacoes.includes(textLower)) {
        await sendMessage(from, msgMenu(nome, saldo_pontos, clinica))
      } else if (text === "1") {
        const premios = await getPremios()
        const disponiveis = premios.filter((p: any) => p.pontos_necessarios <= saldo_pontos)
        await sendMessage(from, msgSaldo(saldo_pontos, disponiveis))
      } else if (text === "2") {
        const premios = await getPremios()
        await sendMessage(from, msgCatalogo(premios))
      } else if (text === "3") {
        await sendMessage(from, MSG_ATIVIDADE)
      } else if (text === "4") {
        await sendMessage(from, MSG_RESGATE)
      } else if (text === "5") {
        await sendMessage(from, MSG_RECEPCAO)
      } else {
        // Qualquer outra mensagem: mostrar menu
        await sendMessage(from, msgMenu(nome, saldo_pontos, clinica))
      }

      return new Response("OK", { status: 200 })
    } catch (err) {
      console.error("Erro no bot:", err)
      return new Response("Error", { status: 500 })
    }
  }

  return new Response("Method not allowed", { status: 405 })
})
