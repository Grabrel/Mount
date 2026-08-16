# Nervi — Cofrinho.exe Web v0.8

**Nervi — Seu dinheiro. Suas escolhas. Mais tranquilidade.**

## Por que a v0.8 existe

A v0.8 mantém as funcionalidades da v0.7.1, mas volta o **frontend inteiro para a raiz do repositório** para evitar erros 404 no GitHub Pages quando o upload pelo navegador achata pastas.

Não existe pasta `assets/` nesta versão. O `index.html`, CSS, JavaScript, favicon e todas as logos ficam lado a lado na raiz.

## Arquivos que devem aparecer na raiz do GitHub

```text
index.html
style-v080.css
app-v080.js
favicon.svg
icon-nervi.svg
logo-nervi.svg
logo-nervi-dark.svg
logo-nervi-compact.svg
logo-nervi-compact-dark.svg
identidade-nervi.png
README.md
VERSION.txt
GITHUB_UPLOAD.txt
.nojekyll
SUPABASE_BACKEND_v0.8.zip
```

O arquivo `SUPABASE_BACKEND_v0.8.zip` é apenas o backend versionado. O GitHub Pages não precisa abri-lo para o site funcionar.

## Publicação no GitHub Pages

O Pages deve continuar configurado em:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/(root)`

Depois do upload, teste estas URLs:

```text
https://grabrel.github.io/Nervi/style-v080.css
https://grabrel.github.io/Nervi/app-v080.js
https://grabrel.github.io/Nervi/logo-nervi.svg
```

As três devem abrir sem 404.

## Recursos mantidos

- Supabase / Nervi Cloud;
- sincronização entre dispositivos;
- prioridades Essencial, Importante e Flexível;
- vencimentos e status dos gastos previstos;
- histórico mensal;
- metas e ciclos;
- foto de perfil;
- modo claro e escuro, inclusive no login;
- mensagens separadas para usuário e senha incorretos;
- celular associado à conta;
- recuperação de senha somente por SMS;
- código de 6 dígitos, validade, tentativas e intervalo de reenvio;
- identidade visual Nervi e slogan oficial.

## Backend

O backend completo está em `SUPABASE_BACKEND_v0.8.zip`. Extraia esse ZIP apenas quando precisar versionar/aplicar SQL ou Edge Functions do Supabase. Credenciais privadas de SMS nunca devem ser adicionadas ao frontend ou ao GitHub Pages.
