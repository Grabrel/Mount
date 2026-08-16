# Prompt mestre — Nervi / Cofrinho.exe v1.0

Atualize e mantenha o projeto **Nervi / Cofrinho.exe** sem remover funcionalidades existentes e sem apagar dados. A marca oficial é **Nervi** e o produto é **Cofrinho.exe**. A frase oficial é **“Nervi — Seu dinheiro. Suas escolhas. Mais tranquilidade.”**

## Regras de preservação

- Não recriar o projeto do zero quando houver uma base funcional.
- Não limpar o banco, contas, `cofrinho_state`, movimentos, históricos ou ciclos.
- Manter compatibilidade com Supabase e cache local.
- Manter RLS por usuário.
- Nunca expor service role, secret key, Twilio secrets ou OTP pepper no frontend.
- Para GitHub Pages, manter o frontend na raiz: `index.html`, CSS, JS e logos sem pasta `assets/`.

## Identidade visual

Usar a logo Nervi com linha/pulso minimalista formando discretamente um N, carvão/preto e vermelho `#B3261E`. Usar versões próprias para modo claro/escuro e compacta. Manter tema claro mostarda/vermelho e tema escuro vinho/mostarda, com preferência salva localmente.

## Login e conta

- Tema claro/escuro antes do login.
- `Usuário incorreto.` quando o nome não existir.
- `Senha incorreta.` quando o usuário existir e a senha falhar.
- Recuperação exclusivamente por celular/SMS.
- Código OTP de 6 dígitos, expiração, tentativas limitadas e intervalo de reenvio.
- Recuperação por celular deve usar resposta neutra para não enumerar números cadastrados.

## Financeiro

Prioridades exatamente:

1. Essencial
2. Importante
3. Flexível

Gastos previstos devem manter vencimento opcional, status `Previsto`, `Vence hoje`, `Atrasado`, `Pago`, valor previsto, valor realizado e data real separada.

Manter botão flutuante `+` para gasto rápido e atalho `Ctrl/Cmd + Shift + G`.

Na dashboard, dar maior destaque ao **Livre de verdade** e suavizar métricas secundárias.

Manter sanitização correta de strings: não exibir escapes como `&quot;`, `\\"` ou `\\n` em modais.

## Meta vinculada — novo recurso principal

O link é opcional.

Na criação da meta, permitir colar uma URL de produto, serviço ou imóvel e clicar **Ler anúncio**. O backend deve tentar identificar:

- título;
- preço principal;
- moeda;
- tipo de preço: compra, venda, aluguel mensal ou serviço mensal;
- custos adicionais reconhecidos, como condomínio e IPTU;
- status da página.

Se houver preço principal, preencher automaticamente o valor-alvo inicial. O usuário pode ajustar antes de criar a conta.

Depois que a meta existe, nunca atualizar preço automaticamente em background. Não criar Cron. Consultar somente quando o usuário clicar **↻ Atualizar preço** ou trocar o link.

Não alterar automaticamente o valor-alvo de um ciclo em andamento. Mostrar preço atual e diferença para a meta.

Registrar no histórico somente quando o preço mudar. Se o preço continuar igual, atualizar apenas `checkedAt`.

Estados visuais:

- `available`: 🟢 Disponível
- `price_not_found`: 🟡 Preço não identificado
- `unavailable`: 🔴 Anúncio indisponível
- `blocked`: 🔒 Consulta bloqueada pelo site
- `unreachable`: ⚠ Não foi possível verificar
- `unsupported`: ⚠ Página não suportada

Se uma consulta falhar, preservar último preço válido e última leitura válida.

## Leitura server-side do anúncio

Implementar em Supabase Edge Function. Não fazer `fetch()` direto do navegador para o site externo.

Extrair em camadas:

1. JSON-LD (`Product`, `Offer`, `price`, `lowPrice`, `priceCurrency`);
2. metadados Open Graph / product price;
3. título/h1;
4. texto visível e rótulos como `Preço`, `Valor aluguel`, `Valor venda`;
5. custos adicionais conhecidos.

Nunca inventar preço quando o conteúdo for ambíguo.

Aplicar proteção contra SSRF:

- apenas HTTP/HTTPS;
- bloquear localhost, IPs privados/link-local e metadata endpoints;
- resolver DNS e bloquear resultados privados;
- revalidar todo redirect;
- limitar redirects;
- limitar portas;
- timeout;
- limite de tamanho do HTML;
- não executar JavaScript da página.

## Critérios de aceite

- Site funciona em desktop e mobile.
- Todos os arquivos do frontend carregam da raiz no GitHub Pages.
- Gasto rápido funciona de qualquer tela autenticada.
- Livre de verdade continua em destaque.
- Modais não exibem escapes.
- SMS funciona após configuração dos secrets/Edge Functions.
- Link de meta é opcional.
- Leitura inicial pode preencher valor-alvo.
- Atualização de preço só ocorre manualmente.
- Histórico não registra verificações idênticas.
- Anúncio removido não apaga preço anterior.
- Site bloqueando consulta não é tratado como anúncio removido.
