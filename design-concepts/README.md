# ContentFlow — design concepts (white mode)

Protótipos HTML estáticos do sistema interno. **Não** alteram o app React.

## Como abrir

1. Abra `index.html` no browser  
2. Entre em um conceito  
3. Use o menu lateral e o botão **Novo** (atalho `C` em vários)

## Estrutura

```
design-concepts/
  index.html                 # catálogo
  _shared/
    base.css                 # layout + componentes
    data.js                  # conteúdo mock PT-BR
    runtime.js               # navegação e views
    shell.html               # template base
  01-operator/ … 10-signal/
    index.html               # shell da direção
    styles.css               # tokens / tema
    config.js                # nav + crumbs + home
```

## Conceitos

| # | Nome | Metáfora |
|---|------|----------|
| 01 | Operator | Issue tracker denso |
| 02 | Ledger | Dashboard financeiro/SaaS |
| 03 | Pages | Docs / wiki |
| 04 | Console | Deploy console |
| 05 | Desk | Inbox de trabalho |
| 06 | Grid | Planilha / base tabular |
| 07 | Board | Kanban de produção |
| 08 | Thread | Revisão + comentários |
| 09 | Shelf | Biblioteca / catálogo |
| 10 | Signal | Central de atenção |

## Extender

- Novo dado: `_shared/data.js`  
- Nova tela: função em `_shared/runtime.js` → `Views`  
- Novo conceito: copiar uma pasta, ajustar `styles.css` + `config.js`
