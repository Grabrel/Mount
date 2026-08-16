# Prompt mestre — Nervi / Cofrinho.exe v1.1.3

## Identidade

- Marca: Nervi.
- Produto: Cofrinho.exe.
- Frase oficial: “Nervi — Seu dinheiro. Suas escolhas. Mais tranquilidade.”
- Visual: linha/pulso minimalista formando discretamente um N; carvão/preto, vermelho `#B3261E` e mostarda de apoio.
- Temas claro e escuro inclusive antes do login.

## Contexto do projeto

O Nervi é um hobby/projeto fechado do Gabriel para amigos e colegas, com foco em rotina financeira mais saudável.

Apresentação do autor:
- Gabriel é formado em Relações Internacionais;
- atualmente é pós-graduando em Jornalismo pela FAAP;
- não possui formação em programação;
- possui um curso em design de jogos;
- LinkedIn: `https://www.linkedin.com/in/gabriel-almeida-12259b260`.

Antes da solicitação de acesso, mostrar uma página pública explicando o que o Nervi faz, para quem é e como funciona.

No primeiro login aprovado, mostrar uma única vez a página de boas-vindas/apresentação do Gabriel antes da dashboard.

## Cadastro e acesso

- Não usar e-mail visível ou celular como credencial de interface.
- Novas contas usam usuário + senha/PIN de exatamente 6 números.
- Não permitir sequências consecutivas crescentes ou decrescentes de 6 dígitos, como `012345`, `123456`, `234567`, `987654`, `654321` e semelhantes.
- Outras combinações são permitidas conforme decisão de produto.
- Informar claramente as regras ao criar a conta.
- Verificar disponibilidade do nome de usuário automaticamente após a digitação; quando livre, mostrar borda verde e `✓ Nome de usuário disponível`.
- Os dois campos de PIN devem ter botão de olho para mostrar/ocultar e feedback verde `✓ As senhas são iguais` quando coincidirem e forem válidos.
- Novas contas começam com `pending` e precisam de aprovação do gerente no Supabase.
- `approved` libera acesso; `blocked` bloqueia por decisão administrativa.
- Login possui no máximo 3 tentativas incorretas por conta.
- Após a terceira senha incorreta, `login_locked = true` e somente o gerente pode desbloquear.
- O login deve informar quantas tentativas restam.
- O gerente desbloqueia no Table Editor mudando `login_locked` de `true` para `false`; o banco zera o contador automaticamente.
- O bloqueio deve ser aplicado no backend, não somente em JavaScript/localStorage.
- A RLS deve exigir conta `approved` e `login_locked = false`.
- “Esqueci minha senha” orienta contato com o gerente. Sem SMS/Twilio/e-mail automático.
- Nunca armazenar senha em tabela própria ou localStorage em texto.

## Lembrar de mim

- Oferecer `Lembrar de mim neste dispositivo`.
- Marcado: persistir somente a sessão Supabase no armazenamento persistente do navegador.
- Desmarcado: manter sessão somente durante a sessão do navegador/tab.
- Logout remove a sessão.
- Informar para não usar a opção em computador compartilhado.

## Feedback de sucesso

Sempre que uma informação for criada ou alterada com sucesso por ação do usuário, exibir feedback visual claro com um `✓` verde, por exemplo:
- `✓ Gasto registrado com sucesso.`
- `✓ Alteração salva com sucesso.`
- `✓ Meta atualizada.`
- `✓ Sugestão enviada com sucesso.`

Erros não podem usar o ✓ verde.

## Sugestões

- Disponível no menu de três pontos do aplicativo autenticado.
- Limite rígido de 140 caracteres no frontend e no banco.
- Usuário apenas envia; não precisa visualizar um sistema de tickets.
- Salvar em `nervi_suggestions` com usuário, mensagem e datas.
- Status administrativos: `Nova`, `Lida`, `Em análise`, `Implementada`.
- Apenas o gerente administra status/anotações pelo Supabase.
- Usuários autenticados não podem ler sugestões de outros usuários.

## Metas vinculadas

- A meta deve ser criada em **um único modo por vez**: `Usar link de um anúncio` OU `Informar valor manualmente`.
- Link de produto, serviço ou imóvel é opcional porque o usuário pode escolher o modo manual.
- No modo por link, ocultar/desabilitar a edição manual do valor; o preço BRL identificado no anúncio define automaticamente o valor inicial da meta.
- Se o anúncio não fornecer preço válido em BRL, não permitir finalizar a meta por link; orientar o usuário a tentar novamente ou trocar para o modo manual.
- “Ler anúncio” tenta extrair título, preço, moeda, tipo de preço, custos adicionais e imagem.
- Após vincular, não usar Cron nem atualização automática.
- Atualização somente por ação explícita em `↻ Atualizar preço`.
- Registrar histórico apenas quando o preço mudar.
- Distinguir anúncio removido, bloqueio do site, erro temporário e preço não encontrado.
- Não alterar automaticamente o valor-alvo de uma meta existente sem decisão do usuário.
- Proteger a Edge Function contra SSRF e destinos privados.

## Financeiro

- Prioridades: Essencial, Importante, Flexível.
- Vencimento opcional 1–31 ou sem vencimento fixo.
- Dia 31 usa último dia do mês quando necessário.
- Status: Previsto, Vence hoje, Atrasado, Pago.
- Preservar data real do pagamento separada do vencimento.
- Botão flutuante `+` para gasto rápido e atalho Ctrl/Cmd + Shift + G.
- Dashboard destaca `Livre de verdade` e suaviza métricas secundárias.
- Corrigir/sanitizar textos de modais sem escapes visíveis.

## Segurança

- Secret/service-role key somente em backend/Edge Functions.
- Nunca colocar secret key no GitHub Pages.
- Edge Functions públicas pré-login validam origem e publishable key.
- Contador de tentativas deve ser atômico no banco.
- `nervi_account_access` não é editável por usuários comuns via API.
- Sugestões têm RLS e só podem ser inseridas pelo próprio usuário aprovado.
