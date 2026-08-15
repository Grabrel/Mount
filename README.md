# Cofrinho.exe — Web v0.4.1

Correção da v0.4 para GitHub Pages.

## Por que existe esta versão

O repositório podia acabar com arquivos de versões diferentes ao mesmo tempo, por exemplo:

- `index.html` novo;
- `style.css` novo;
- `app.js` antigo.

Nesse caso, os controles aparecem na tela, mas não funcionam.

A v0.4.1 evita isso usando nomes novos:

- `style-v041.css`
- `app-v041.js`

O `index.html` aponta especificamente para esses dois arquivos.

## O que funciona

- tema **Claro**: mostarda suave + vermelho;
- tema **Escuro**: vinho + mostarda;
- tema salvo no navegador;
- foto de perfil recolhível;
- foto por **arquivo do dispositivo**;
- foto por **link direto online**;
- seletor de mês;
- prioridades Essencial / Importante / Flexível;
- vencimento opcional;
- edição mensal dos gastos previstos;
- pagamento com valor real;
- previsto x realizado;
- livre de verdade;
- backup e integridade.

## Como subir no GitHub

Envie para a raiz do repositório:

1. `index.html`
2. `style-v041.css`
3. `app-v041.js`
4. `README.md`

Você NÃO precisa apagar `app.js` ou `style.css` antigos. O novo `index.html` não usa mais esses arquivos.

Depois faça **Commit changes** e espere o GitHub Pages terminar o deployment.

Para confirmar visualmente que a versão nova carregou, o cabeçalho deve mostrar:

`Cofrinho.exe — WEB v0.4.1`

## Dados

A v0.4.1 continua usando a mesma chave local da v0.4, então não cria uma base separada só por causa dessa correção.
