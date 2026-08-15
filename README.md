# Nervi — Cofrinho.exe Web v0.5.1

## Nova página inicial

A página inicial agora é uma tela de acesso minimalista inspirada em mensageiros clássicos.

Ela mostra somente:

- Nervi;
- campo Usuário;
- campo Senha;
- botão Entrar;
- botão Criar conta;
- atalho `?` de ajuda.

O cadastro financeiro completo da v0.5 passou a ser o fluxo **Criar conta**.

## Senha nesta etapa

A v0.5.1 já permite criar uma senha local e entrar novamente no mesmo navegador.

A senha não é armazenada em texto puro. O navegador guarda apenas um verificador derivado com PBKDF2/SHA-256 e salt aleatório.

**Importante:** esta camada de login ainda é local. A sincronização/login multi-dispositivo com Supabase continua sendo a próxima integração.

## Sair

Dentro da conta, os três pontos agora também possuem a opção:

`↩ Sair`

Ela volta para a nova tela de login.

## Atualizar GitHub Pages

Suba para a raiz do repositório Nervi:

- `index.html`
- `style-v051.css`
- `app-v051.js`
- `README.md`

Mantenha `.nojekyll`.

O endereço público esperado é:

`https://grabrel.github.io/Nervi/`
