# Nervi v1.1.2 — configuração do Supabase

Esta revisão consolida aprovação manual de contas, bloqueio após 3 tentativas e Sugestões. Não usa Twilio, SMS ou secrets customizados.

## Ordem correta

### 1. SQL Editor

Extraia `SUPABASE_BACKEND_v1.1.2.zip` e abra:

`supabase/sql/02_nervi_v112_access_lock_suggestions_and_sms_cleanup.sql`

No Supabase: **SQL Editor → New query**. Cole o arquivo inteiro e clique em **Run** uma única vez.

A migration:

- remove as tabelas/campo de recuperação por SMS da v1.0;
- cria/atualiza `nervi_account_access`;
- preserva contas já existentes como `approved`;
- adiciona `failed_login_attempts`, `login_locked` e datas de auditoria;
- bloqueia a conta na terceira senha incorreta;
- permite ao gerente desbloquear com uma única alteração no Table Editor;
- cria `nervi_suggestions` com limite de 140 caracteres;
- cria os status `Nova`, `Lida`, `Em análise`, `Implementada`;
- reforça RLS: apenas contas aprovadas e não bloqueadas acessam os dados financeiros.

### 2. Edge Functions

Publicar:

- `nervi-create-account`
- `nervi-check-username`
- `nervi-login`
- `nervi-read-goal-link`

A nova `nervi-login` é obrigatória: ela é quem registra as tentativas de senha e aplica o bloqueio seguro após a terceira falha.

Via Supabase CLI:

```bash
supabase login
supabase link --project-ref exyxxbytvryxgvpsldyu
supabase functions deploy
```

Se o deploy for feito pelo ChatGPT conectado ao projeto, não é necessário usar a CLI localmente.

### 3. GitHub

Somente depois de SQL + Edge Functions concluídos, publique o ZIP principal no GitHub Pages.

### 4. Teste rápido

1. Abra a apresentação pública pelo botão de solicitar acesso.
2. Tente criar PIN `123456`: deve ser recusado.
3. Crie uma conta com PIN válido de 6 números.
4. Confirme `pending` em `nervi_account_access`.
5. Aprove no Table Editor.
6. Faça primeiro login e veja a página de boas-vindas.
7. Envie uma Sugestão e confira `nervi_suggestions`.
8. Em uma conta de teste, erre a senha 3 vezes e confirme `login_locked = true`.
9. Mude `login_locked` para `false` e confirme que o contador zera automaticamente.

## Secrets

Nenhum Custom Secret é necessário para estas funcionalidades. Não configure Twilio.
