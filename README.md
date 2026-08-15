# Nervi — Cofrinho.exe Web v0.5

A v0.5 acrescenta ciclos de meta, bloqueio dos dados principais e uma ajuda simples no menu de três pontos.

## Ciclo da meta

No cadastro a pessoa escolhe a duração da Meta obrigatória.

Enquanto o ciclo estiver ativo, estes dados ficam bloqueados:

- nome de usuário;
- renda líquida mensal;
- dia de pagamento;
- nome/categoria/valor-alvo/reserva mensal da meta;
- data final da meta.

Quando o ciclo termina, a área **Minha meta** libera o botão **Iniciar novo ciclo**.

O ciclo anterior é preservado no estado local e o novo ciclo passa a valer a partir da data de criação.

## Ajuda

Nos três pontos do canto superior existe:

`? Como funciona?`

A explicação é curta e cobre perfil, meta, bloqueio do ciclo, planejamento, pagamentos e notificações.

## Notificações

Mantidas da v0.4.3:

- até 3 dias antes por padrão;
- vence amanhã;
- vence hoje;
- atrasado;
- sino no cabeçalho;
- preferências em Configurações.

## Supabase

A base Nervi já possui tabelas para:

- perfis;
- ciclos de meta;
- estado sincronizado do Cofrinho.

As tabelas usam RLS por usuário e o banco também impede alteração dos campos bloqueados enquanto o ciclo está ativo.

## GitHub Pages

Envie para a raiz:

- `index.html`
- `style-v050.css`
- `app-v050.js`
- `README.md`

Mantenha `.nojekyll`.

> A conexão de login/sincronização com o Supabase será a próxima etapa. Esta versão continua usando localStorage como armazenamento da interface.
