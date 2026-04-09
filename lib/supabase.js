import { createClient } from '@supabase/supabase-js'

// Valores fixos — não dependem de variáveis de ambiente
const url = 'https://khwqbycptmczjzgoosot.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtod3FieWNwdG1jemp6Z29vc290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjMzNzEsImV4cCI6MjA4NzU5OTM3MX0.xjUojK0vEXwxxDws1qBeCeXvalIhLTU9SC6lUZTSR8A'

export const supabase = createClient(url, key)
