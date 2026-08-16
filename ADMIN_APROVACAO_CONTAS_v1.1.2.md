# Nervi v1.1.2 — guia rápido do gerente

Tudo abaixo é feito no projeto **Nervi** pelo Supabase.

## Aprovar uma conta

1. Abra **Table Editor**.
2. Entre em `nervi_account_access`.
3. Localize o usuário.
4. Confira `status = pending`.
5. Altere somente `status` para `approved` e salve.

O banco promove automaticamente o estado inicial para `cofrinho_state`.

## Bloquear uma conta por decisão do gerente

Altere `status` para `blocked`.

## Desbloquear após 3 senhas incorretas

Quando o usuário usar as três tentativas, a linha ficará com:

- `failed_login_attempts = 3`
- `login_locked = true`

Para liberar, altere **somente**:

`login_locked: true → false`

Ao salvar, o trigger zera `failed_login_attempts` e limpa a data de bloqueio automaticamente.

## Ver sugestões

Abra `nervi_suggestions` no Table Editor.

Cada nova mensagem nasce com `status = Nova`. Você pode alterar o status para:

- `Nova`
- `Lida`
- `Em análise`
- `Implementada`

O campo `manager_note` é opcional e serve para suas anotações internas.

## Recuperação de senha

O site apenas orienta o usuário a entrar em contato com o gerente. Não existe SMS/e-mail automático nesta versão. A alteração da senha deve ser feita por uma ação administrativa segura do Supabase Auth; nunca edite diretamente o hash em `auth.users` e nunca exponha a secret/service-role key no navegador.
