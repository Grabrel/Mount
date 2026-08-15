# Cofrinho.exe — Web v0.4

Versão pronta para GitHub Pages, sem dependências e sem pasta de imagens.

## Novidades da v0.4

### Dois temas

A pessoa pode alternar entre:

- **Claro** — mostarda suave com vermelho;
- **Escuro** — vinho com detalhes em mostarda.

A preferência fica salva localmente no navegador e é reaplicada quando o site abre novamente.

### Foto de perfil simplificada

Não existem mais avatares prontos nem emojis no pacote.

A foto de perfil é opcional e aceita somente:

1. **arquivo do dispositivo** — a imagem é reduzida no próprio navegador e guardada localmente;
2. **link direto online** — o navegador carrega a imagem usando a URL informada.

A área da foto no cadastro é **recolhível**. Fechada, ela mostra apenas a foto atual (ou a inicial do nome) e ocupa pouco espaço.

### Recursos preservados

- Essencial / Importante / Flexível;
- vencimento opcional;
- status Previsto / Vence hoje / Atrasado / Pago;
- seletor de mês;
- edição de gastos previstos por versão mensal;
- valor real ao marcar `✓ Pago`;
- observações de previsto x realizado;
- dashboard com disponível, comprometido e livre de verdade;
- histórico e verificação SHA-256;
- backup JSON.

## Atualizar no GitHub

Substitua na raiz do seu repositório:

- `index.html`
- `style.css`
- `app.js`
- `README.md`

Mantenha `.nojekyll`.

Esta versão **não precisa dos arquivos `avatar01.svg` ... `avatar08.svg`**. Eles podem ser removidos do repositório quando você quiser.

## Migração

A v0.4 tenta carregar automaticamente os dados locais das versões v0.3, v0.2 e v0.1 quando o endereço do site continua o mesmo.

Fotos antigas que já eram arquivo local ou link direto são preservadas. Avatares prontos/emoji de versões anteriores viram o marcador simples com a inicial do nome.
