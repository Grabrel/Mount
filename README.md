# Cofrinho.exe — Web v0.3

Versão estática para GitHub Pages, com layout mais limpo em azul e vermelho.

## Novidades da v0.3

### Novo visual

- interface mais limpa;
- paleta azul + vermelho;
- mesmos recursos financeiros da v0.2 preservados.

### Avatares

Agora cada pessoa pode escolher o avatar de quatro formas:

1. **avatares prontos** incluídos no projeto;
2. **emoji**;
3. **arquivo do computador**;
4. **link direto online**.

Os avatares incluídos nesta pasta (`assets/avatars/`) são **originais do projeto**, então você pode usar no Cofrinho sem depender de imagens proprietárias de terceiros.

#### Observações sobre avatar por arquivo

- o arquivo é redimensionado no navegador;
- depois fica salvo localmente junto com os demais dados do usuário.

#### Observações sobre avatar por link

- o navegador tentará carregar a imagem a partir da URL informada;
- se o link sair do ar, o avatar pode deixar de aparecer;
- use somente imagens que você possa utilizar.

## Recursos mantidos da v0.2

- prioridades: **Essencial, Importante e Flexível**;
- gasto previsto com vencimento opcional;
- seletor de mês;
- previsão editável por versão mensal;
- pagamento com valor real e data real;
- observações de **previsto x realizado**;
- dashboard com **livre de verdade**;
- exportação/importação de backup;
- verificação de integridade com cadeia SHA-256.

## Publicar / atualizar no GitHub Pages

No mesmo repositório, substitua:

- `index.html`
- `style.css`
- `app.js`
- `README.md`
- pasta `assets/`

Mantenha também `.nojekyll`.

Depois faça commit. Se o Pages já estiver configurado em `main / (root)`, o site será atualizado automaticamente.

## Migração

A v0.3 tenta aproveitar automaticamente dados salvos das versões v0.2 e v0.1 no mesmo navegador e no mesmo endereço.
