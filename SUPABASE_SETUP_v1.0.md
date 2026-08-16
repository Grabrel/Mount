# Supabase — instalação manual da Nervi v1.0

Projeto atual do Nervi:

```text
exyxxbytvryxgvpsldyu
```

O upload no GitHub **não instala o backend**. Depois de publicar o frontend, faça as etapas abaixo uma vez.

## 1. Extrair o backend

Extraia:

```text
SUPABASE_BACKEND_v1.0.zip
```

Não envie os arquivos internos desse ZIP para a raiz do GitHub Pages.

## 2. Aplicar a migration do SMS

No Supabase Dashboard:

**Nervi → SQL Editor → New query**

Abra no computador:

```text
supabase/sql/01_nervi_v100_sms_recovery.sql
```

Copie o conteúdo inteiro para o SQL Editor, revise e execute.

Essa migration é incremental. Ela adiciona o celular e as tabelas internas de recuperação de senha. A Meta vinculada não precisa de tabela nova porque seus dados ficam dentro de `cofrinho_state`.

## 3. Configurar os secrets do SMS

No Supabase Dashboard, abra a área de **Edge Functions / Secrets** (o nome exato do menu pode variar), ou use o Supabase CLI.

Nunca coloque os valores reais no GitHub.

Secrets necessários:

```text
NERVI_OTP_PEPPER
TWILIO_ACCOUNT_SID
TWILIO_API_KEY
TWILIO_API_SECRET
TWILIO_MESSAGING_SERVICE_SID
```

Em vez de `TWILIO_MESSAGING_SERVICE_SID`, pode ser usado `TWILIO_FROM`.

Como fallback, a implementação também aceita `TWILIO_AUTH_TOKEN`.

Exemplo via CLI:

```bash
supabase login
supabase link --project-ref exyxxbytvryxgvpsldyu
supabase secrets set NERVI_OTP_PEPPER="SEU_VALOR_ALEATORIO"
supabase secrets set TWILIO_ACCOUNT_SID="AC..."
supabase secrets set TWILIO_API_KEY="SK..."
supabase secrets set TWILIO_API_SECRET="..."
supabase secrets set TWILIO_MESSAGING_SERVICE_SID="MG..."
```

Para gerar um pepper em macOS/Linux:

```bash
openssl rand -hex 32
```

## 4. Publicar as Edge Functions

No terminal, entre na pasta extraída do backend — a pasta que contém `supabase/` — e execute:

```bash
supabase login
supabase link --project-ref exyxxbytvryxgvpsldyu
supabase functions deploy
```

O `supabase/config.toml` já declara como públicas as funções pré-login:

```text
nervi-create-account
nervi-check-username
nervi-request-password-reset
nervi-verify-reset-code
nervi-reset-password
nervi-read-goal-link
```

Cada função ainda faz validações próprias de origem/client. `nervi-read-goal-link` também valida o destino para evitar acesso a redes privadas e revalida redirecionamentos.

## 5. Testes finais

Teste nesta ordem:

1. criar uma conta nova com celular;
2. sair e testar `Usuário incorreto.`;
3. testar `Senha incorreta.`;
4. usar **Esqueci minha senha** e receber o SMS;
5. redefinir a senha;
6. na criação de uma meta, colar um anúncio e clicar **Ler anúncio**;
7. conferir se o preço preenche o valor-alvo quando identificado;
8. em **Minha meta**, clicar **↻ Atualizar preço**;
9. repetir sem mudança de preço e verificar que o histórico não ganha linha duplicada;
10. testar um anúncio 404 e verificar que o último preço conhecido continua salvo.

## Observação sobre anúncios

A leitura de páginas é uma tentativa de extração, não uma garantia universal. Sites podem bloquear automação ou exigir JavaScript/CAPTCHA. O Nervi diferencia esses casos de um anúncio realmente removido.
