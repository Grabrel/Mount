# Cofrinho.exe — Web v0.2

Versão estática para GitHub Pages. Não requer Python, servidor ou banco online.

## Novidades da v0.2

### Prioridades com nomes definitivos

- **Essencial**
- **Importante**
- **Flexível**

### Vencimento opcional

Cada gasto previsto pode ter:

- nome;
- categoria;
- valor previsto;
- prioridade;
- dia de vencimento de 1 a 31;
- ou nenhum vencimento fixo.

Status:

- **Previsto**
- **Vence hoje**
- **Atrasado**
- **Pago**

Se o vencimento for dia 31 e o mês tiver menos dias, o sistema usa automaticamente o último dia do mês.

A **data real do pagamento** é armazenada separadamente do vencimento.

### Seletor de mês

O cabeçalho agora permite navegar entre meses.

Agosto, setembro, outubro etc. mantêm seus movimentos separados. Voltar para um mês anterior não apaga o que aconteceu nele.

### Previsões versionadas

Um gasto previsto pode ser editado.

Exemplo:

- agosto: Academia prevista em R$ 120;
- setembro: passa para R$ 130.

A edição feita em setembro vale de setembro em diante. Agosto continua mostrando R$ 120.

O histórico financeiro real continua imutável.

### Valor previsto x valor real

Ao clicar em **✓ Pago**, o aplicativo pede:

- valor real pago;
- data real do pagamento.

Exemplo:

- energia prevista: R$ 150;
- energia paga: R$ 137,84;
- observação: **R$ 12,16 abaixo do previsto**.

O dashboard e o histórico mostram essa diferença.

### Livre de verdade

O dashboard exibe uma mensagem no formato:

> Você tem R$ X disponíveis no mês, mas R$ Y ainda estão comprometidos. Livre de verdade: R$ Z.

## Atualizar o GitHub Pages

Substitua na raiz do repositório:

- `index.html`
- `style.css`
- `app.js`
- `README.md`

Mantenha também `.nojekyll`.

Depois faça o commit. Como o GitHub Pages já está configurado para `main / (root)`, o site será publicado novamente automaticamente.

## Migração da v0.1

A v0.2 procura primeiro seus dados na chave nova. Se não encontrar, tenta carregar automaticamente os dados salvos pela Web v0.1 no mesmo navegador e endereço do site.

Por isso, mantenha o mesmo repositório/URL durante a atualização se quiser preservar os dados locais existentes.

## Privacidade

Os dados ficam no `localStorage` do navegador. O repositório do GitHub contém somente o código do site.

Faça backups pelo menu **Configurações → Exportar backup JSON**.
