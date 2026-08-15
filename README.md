# Cofrinho.exe — Web v0.1

Site estático do Cofrinho.exe, pensado para publicação gratuita no GitHub Pages.

## O que já funciona

- criação de perfil local;
- renda líquida mensal e dia de pagamento;
- meta obrigatória e reserva automática;
- gastos previstos recorrentes;
- três níveis de prioridade;
- botão **✓ Pago** para transformar um gasto previsto em gasto real do mês;
- registro de gastos manuais;
- painel com:
  - renda recebida;
  - reservado para a meta;
  - gastos realizados;
  - disponível hoje;
  - compromissos previstos;
  - compromissos ainda pendentes;
  - livre após compromissos;
  - livre previsto do mês;
- histórico mensal;
- cadeia SHA-256 para verificação de integridade;
- exportação e importação de backup JSON;
- dados armazenados no `localStorage` do navegador.

## Privacidade

Esta versão não possui conta online, servidor ou banco remoto.

Os dados financeiros digitados pelo usuário não são enviados pelo código do Cofrinho.exe. Eles ficam no `localStorage` daquele navegador/origem.

Consequências importantes:

- abrir em outro dispositivo não sincroniza os dados;
- limpar os dados do navegador pode apagar o Cofrinho;
- use **Configurações → Exportar backup JSON** para preservar os dados;
- o código do site pode ser público no GitHub sem que os dados financeiros dos usuários sejam publicados.

## Testar localmente

Você pode abrir `index.html` diretamente no navegador.

Para testar exatamente como um site HTTP, também pode usar qualquer servidor estático local, mas isso não é necessário para começar.

## Publicar no GitHub Pages pela interface do GitHub

1. Crie um repositório chamado `cofrinho`.
2. Deixe o repositório público se estiver usando GitHub Free.
3. Envie para a raiz do repositório:
   - `index.html`
   - `style.css`
   - `app.js`
   - `.nojekyll`
   - `README.md`
4. Abra **Settings** no repositório.
5. Vá em **Pages**.
6. Em **Build and deployment**, escolha **Deploy from a branch**.
7. Em **Branch**, selecione:
   - branch: `main`
   - pasta: `/(root)`
8. Clique em **Save**.
9. Aguarde o GitHub publicar.

O endereço normalmente ficará no formato:

`https://SEU-USUARIO.github.io/cofrinho/`

## Estrutura

```text
cofrinho/
├── index.html
├── style.css
├── app.js
├── README.md
└── .nojekyll
```

## Próximas ideias

- nomes definitivos das prioridades;
- edição de renda/meta com regras de segurança;
- recorrência personalizada dos gastos;
- múltiplas rendas;
- meses anteriores e seletor de período;
- PWA instalável;
- autenticação e sincronização, somente quando o projeto realmente precisar de backend.
