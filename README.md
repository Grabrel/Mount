# Nervi — Cofrinho.exe v1.0

**Nervi — Seu dinheiro. Suas escolhas. Mais tranquilidade.**

A v1.0 consolida a base anterior e adiciona **Meta vinculada**: o usuário pode associar opcionalmente um anúncio de produto, serviço ou imóvel à meta e consultar o preço sob demanda.

## Principais recursos

- Nervi Cloud com Supabase;
- login por usuário e senha;
- mensagens separadas para usuário incorreto e senha incorreta;
- recuperação de senha somente por celular/SMS;
- tema claro/escuro já no login;
- foto de perfil;
- gastos previstos com vencimento e prioridades Essencial, Importante e Flexível;
- botão flutuante `+` para registrar gasto rapidamente;
- atalho `Ctrl/Cmd + Shift + G`;
- dashboard com destaque para **Livre de verdade**;
- metas/ciclos e histórico;
- backup JSON;
- **Meta vinculada com leitura manual de anúncio**.

## Meta vinculada

Na criação da conta, o campo **Link da meta** é opcional.

Ao informar um link e clicar em **Ler anúncio**, o Nervi tenta encontrar:

- título do anúncio;
- preço principal;
- tipo de preço (compra, venda, aluguel mensal ou serviço mensal);
- custos adicionais reconhecidos, como condomínio e IPTU;
- disponibilidade da página.

Quando um preço é identificado durante a criação da conta, ele preenche automaticamente o **Valor-alvo**. O usuário ainda pode ajustar o valor antes de criar a conta.

Depois que o ciclo existe, a atualização do anúncio é **somente manual** pelo botão **↻ Atualizar preço**. Não existe Cron nem monitoramento automático.

O Nervi não altera automaticamente o valor-alvo de um ciclo em andamento. Ele compara o preço atual do anúncio com o valor-alvo e mostra a diferença.

O histórico de preço registra somente mudanças reais; verificações sem alteração atualizam apenas a data da última consulta.

## Estados do anúncio

- 🟢 Disponível
- 🟡 Preço não identificado
- 🔴 Anúncio indisponível
- 🔒 Consulta bloqueada pelo site
- ⚠ Não foi possível verificar

Se uma consulta falhar, o último preço conhecido é preservado.

## Limitações de leitura

Alguns sites usam CAPTCHA, proteção anti-bot ou carregam todos os dados por JavaScript. Nesses casos, a leitura pode falhar. A função não executa JavaScript do anúncio e nunca deve inventar um preço.

## Publicação no GitHub Pages

O frontend é propositalmente **flat**: HTML, CSS, JavaScript e logos ficam na raiz para evitar o problema de pastas achatadas durante upload pelo navegador.

Veja `GITHUB_UPLOAD.txt`.

## Backend Supabase

O arquivo `SUPABASE_BACKEND_v1.0.zip` contém:

- migration de celular/SMS;
- cinco funções da conta/recuperação;
- `nervi-read-goal-link` para leitura de anúncio;
- `config.toml`;
- comandos de deploy.

O backend precisa ser aplicado no Supabase separadamente. Veja `SUPABASE_SETUP_v1.0.md`.
