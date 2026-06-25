# Arquitetura — Torque Oficina

## Visão geral

O frontend é um PWA React/TypeScript compilado pelo Vite. O Supabase concentra autenticação, PostgreSQL, RLS, Storage, Realtime e Edge Functions. A primeira versão roda também em modo demonstração sem credenciais.

```text
PWA React
  ├─ Supabase Auth (sessão e recuperação)
  ├─ PostgREST + PostgreSQL (dados e RLS)
  ├─ Realtime (chat, etapas, notificações)
  ├─ Storage privado (fotos da OS)
  └─ Edge Function + Resend (fila de e-mail)
```

## Isolamento multi-tenant

`workshops` é a raiz do tenant; todas as tabelas dependentes possuem `workshop_id` obrigatório. Triggers impedem alteração do tenant e validam que pais e filhos pertencem à mesma oficina. Os helpers RLS são `SECURITY DEFINER`, com `search_path` fixo, para consultar vínculo sem recursão.

- Dono: lê e administra os dados da oficina.
- Mecânico: lê somente OS explicitamente atribuídas e pode operar checklist, fotos e etapas dessas OS.
- Cliente: lê seus cadastros, veículos e OS; participa do chat e decide orçamento apenas pela RPC fechada `decide_estimate`.
- Auditoria: triggers registram INSERT/UPDATE/DELETE. O cliente não grava diretamente no log; somente o dono lê.

## Módulos

1. Identidade e oficina: `workshops`, `profiles`, `workshop_members`.
2. CRM e frota: `customers`, `vehicles`.
3. Operação: `appointments`, `service_orders`, `service_assignments`, `checklist_items`, `service_photos`.
4. Comercial: `estimates`, `estimate_items`.
5. Comunicação: `service_stage_events`, `chat_messages`, `notifications`.
6. Governança: `audit_logs`.

## Experiências por perfil

Os três aplicativos compartilham autenticação, banco e regras RLS, mas não a mesma densidade de interface:

- **Dono:** painel operacional desktop-first, métricas, agenda, equipe, financeiro e visão completa das ordens.
- **Mecânico:** interface mobile-first com agenda atribuída, atualização de etapas, observações, fotos e comunicação com o cliente.
- **Cliente:** interface mobile-first para agendamento, acompanhamento em tempo real, aprovação de orçamento, mensagens e histórico do veículo.

O modo demonstração permite alternar os perfis na própria tela de login. Em produção, o papel vem exclusivamente de `workshop_members` e nunca de uma escolha no frontend.

## Evolução recomendada

- Separar telas e queries por domínio conforme os módulos deixam o estágio MVP.
- Gerar tipos com `supabase gen types typescript` e substituir os casts temporários.
- Adicionar testes de RLS para cada papel antes de produção.
- Integrar provedor fiscal/pagamentos em um contexto isolado; não armazenar dados de cartão.
- Executar e-mail por cron com idempotência e retentativas exponenciais.
