# Nervi — Cofrinho.exe Web v0.6

A v0.6 conecta a Nervi ao Supabase e transforma o perfil local em uma conta sincronizada.

## Login

A interface continua mostrando somente:

- Usuário
- Senha
- Entrar
- Criar conta

O usuário não precisa informar e-mail nem telefone.

Internamente a Nervi gera um identificador de autenticação a partir do nome de usuário e usa Supabase Auth com senha.

## Criar conta

Ao clicar em **Criar conta na Nervi**:

1. a Edge Function `nervi-create-account` cria o usuário no Supabase Auth;
2. o estado financeiro inicial é salvo em `cofrinho_state`;
3. o banco atualiza `profiles` e `goal_cycles`;
4. a sessão é iniciada e a conta é carregada da nuvem.

A chave administrativa do Supabase não fica no GitHub Pages. O navegador usa apenas a Publishable Key.

## Usuários únicos

O mesmo usuário não pode ser criado duas vezes.

Maiúsculas/minúsculas são normalizadas no acesso, portanto `Gabriel` e `gabriel` representam o mesmo login.

## Sincronização entre dispositivos

Depois do login, cada alteração é salva:

- no `localStorage`, como cache deste navegador;
- no `cofrinho_state`, como estado oficial sincronizado.

Ao entrar em outro dispositivo com o mesmo usuário e senha, a Nervi baixa o estado da conta no Supabase.

## Migração automática das versões v0.5.x

Se existe uma conta criada localmente na v0.5.x, tente entrar na v0.6 usando o mesmo usuário e senha.

Se a credencial local for válida e o usuário ainda não existir na Nervi Cloud, a conta é criada no Supabase e o estado local é enviado automaticamente.

## Banco

- `profiles`: identidade e dados principais do perfil
- `goal_cycles`: ciclos das metas
- `cofrinho_state`: estado financeiro sincronizado
- RLS por `user_id`
- travas dos dados do ciclo no banco
- reserva mensal calculada automaticamente

## Publicação

Suba na raiz do repositório Nervi:

- `index.html`
- `style-v060.css`
- `app-v060.js`
- `README.md`

Mantenha `.nojekyll`.

Site:

`https://grabrel.github.io/Nervi/`
