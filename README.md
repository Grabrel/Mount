# Nervi — Cofrinho.exe v1.1.3

Aplicativo financeiro pessoal para um grupo fechado de amigos e colegas, hospedado no GitHub Pages e sincronizado via Supabase.

## Destaques da v1.1.3

- criação de meta agora é exclusiva: **link de anúncio OU valor manual**;
- ao usar anúncio com preço BRL, o preço vira o valor da meta automaticamente e o campo manual não é exibido;
- nome de usuário ganha validação automática: verde + `✓ Nome de usuário disponível` quando livre;
- cadastro mostra `✓ As senhas são iguais` e permite visualizar/ocultar os dois PINs pelo botão de olho;

- apresentação pública do projeto antes da solicitação de acesso;
- primeiro acesso com página de boas-vindas e apresentação do Gabriel;
- LinkedIn: `www.linkedin.com/in/gabriel-almeida-12259b260`;
- novas contas usam senha de exatamente 6 números, sem sequências simples como `123456` ou `654321`;
- 3 tentativas de senha; na terceira falha a conta fica bloqueada até o gerente liberar;
- opção **Lembrar de mim neste dispositivo** usando persistência de sessão, sem salvar a senha em texto;
- aprovação obrigatória do gerente para novas contas;
- aba **Sugestões** no menu de três pontos, com limite de 140 caracteres;
- sugestões ficam disponíveis no Supabase com status `Nova`, `Lida`, `Em análise` ou `Implementada`;
- feedback visual verde com `✓` para criações/alterações concluídas;
- dashboard com “Livre de verdade” em destaque;
- cadastro rápido de gastos pelo botão flutuante `+` e atalho `Ctrl/Cmd + Shift + G`;
- Meta vinculada com leitura de anúncio e atualização de preço somente quando o usuário pedir;
- recuperação de senha manual com o gerente, sem Twilio/SMS.

## Publicação no GitHub Pages

O frontend continua totalmente plano. Extraia `Nervi-v1.1.3-GitHub.zip` e envie os arquivos diretamente para a raiz do repositório.

Não extraia `SUPABASE_BACKEND_v1.1.3.zip` dentro do GitHub.

**Esta revisão não exige nova migration nem novo deploy do Supabase.** O backend já publicado na v1.1.2 é compatível; o ZIP de backend permanece no pacote apenas como referência/backup.
