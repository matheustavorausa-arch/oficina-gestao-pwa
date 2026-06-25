import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Cron recomendado: a cada minuto. RESEND_API_KEY deve existir nos secrets da função.
Deno.serve(async (request) => {
  if (request.headers.get('authorization') !== `Bearer ${Deno.env.get('CRON_SECRET')}`) return new Response('Unauthorized', { status: 401 })
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: queue, error } = await client.from('notifications').select('id,title,body,user_id,metadata').eq('channel', 'email').is('sent_at', null).is('failed_at', null).limit(50)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  let sent = 0
  for (const item of queue ?? []) {
    const email = (item.metadata as { email?: string })?.email
    if (!email) { await client.from('notifications').update({ failed_at: new Date().toISOString(), error: 'E-mail ausente' }).eq('id', item.id); continue }
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: Deno.env.get('EMAIL_FROM'), to: email, subject: item.title, text: item.body }) })
    await client.from('notifications').update(response.ok ? { sent_at: new Date().toISOString() } : { failed_at: new Date().toISOString(), error: await response.text() }).eq('id', item.id)
    if (response.ok) sent++
  }
  return Response.json({ processed: queue?.length ?? 0, sent })
})
