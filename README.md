# Torque — Gestão de oficina

PWA React + TypeScript + Vite com backend Supabase, criado em diretório isolado para não alterar o projeto existente na raiz.

## Executar

```bash
npm install
npm run dev
```

Sem `.env`, o app abre em modo demonstração. Use os dados já preenchidos na tela de login.

Para conectar um projeto Supabase:

1. Copie `.env.example` para `.env` e informe URL e chave anônima.
2. Aplique `supabase/migrations/202606220001_initial_schema.sql` com a CLI ou SQL Editor.
3. Crie o primeiro usuário no Auth e cadastre oficina, perfil e vínculo owner (nesta ordem).
4. Para e-mails, publique `supabase/functions/send-notifications` e configure `CRON_SECRET`, `RESEND_API_KEY` e `EMAIL_FROM`.

## Entregue nesta versão

- Login real quando configurado e recuperação de senha.
- PWA instalável, responsivo e com cache de navegação.
- Experiências responsivas separadas para dono, mecânico e cliente.
- Painel do dono, agenda operacional do mecânico e portal do cliente.
- Agendamento, histórico do veículo, ordens, etapas e chat demonstráveis.
- Esquema completo para todos os módulos do MVP.
- RLS por dono/mecânico/cliente, Storage privado, Realtime e auditoria.
- Fila de notificações internas/e-mail e Edge Function de envio.

Consulte [ARQUITETURA.md](./ARQUITETURA.md) para decisões e limites do modelo.
