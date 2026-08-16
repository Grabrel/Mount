# Nervi — Cofrinho.exe v1.0.1

Aplicativo financeiro pessoal com GitHub Pages + Supabase.

## Destaques

- dashboard com “Livre de verdade” em primeiro plano;
- cadastro rápido de gastos por botão flutuante `+`;
- metas financeiras com anúncio vinculado e atualização manual de preço;
- temas claro/escuro;
- sincronização na Nervi Cloud;
- novas contas sujeitas à aprovação do gerente;
- recuperação de senha manual, sem Twilio/SMS.

## Publicação

O frontend foi empacotado de forma plana para upload pela interface web do GitHub. Extraia o ZIP principal e envie os arquivos diretamente para a raiz do repositório.

O backend está dentro de `SUPABASE_BACKEND_v1.0.1.zip` e deve ser tratado separadamente. Leia `SUPABASE_SETUP_v1.0.1.md` antes de aplicá-lo.

## Aprovação de contas

O usuário pode solicitar uma conta, mas não recebe acesso imediatamente. A solicitação aparece em `public.nervi_account_access` com `status = pending`. O gerente altera o status para `approved` no Table Editor do Supabase. Veja `ADMIN_APROVACAO_CONTAS_v1.0.1.md`.
