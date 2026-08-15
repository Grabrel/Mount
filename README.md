# Nervi — Cofrinho.exe Web v0.5.2

## Usuário único

A base Supabase já possui um índice único case-insensitive em `profiles.username`.

Isso significa que nomes como:

- `gabriel`
- `Gabriel`
- `GABRIEL`

são tratados como o mesmo nome de acesso e não poderão existir em contas diferentes quando o cadastro em nuvem estiver conectado.

A interface também deixa essa regra explícita no cadastro.

## Reserva automática calculada

O usuário não digita mais manualmente a reserva mensal.

A Nervi calcula:

`valor-alvo ÷ duração da meta`

e mostra o resultado em reais antes da criação da conta.

Exemplo:

- Meta: R$ 500,00
- Duração: 6 meses
- 5 aportes: R$ 83,33
- Último aporte: R$ 83,35
- Total: R$ 500,00

Os centavos do último aporte são ajustados automaticamente para que a meta feche exatamente.

Se a reserva mensal necessária superar a renda líquida informada, a criação do ciclo é bloqueada e a Nervi orienta aumentar a duração ou reduzir o valor-alvo.

## GitHub Pages

Envie para a raiz do repositório Nervi:

- `index.html`
- `style-v052.css`
- `app-v052.js`
- `README.md`

Mantenha `.nojekyll`.

Endereço público:

`https://grabrel.github.io/Nervi/`
