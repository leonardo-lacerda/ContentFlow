# Fase 1 — Arquitetura da experiência e interface

## Objetivo da fase

Construir a experiência visual do Chat Studio sem implementar geração ainda.

## F1.1 — Informação e navegação

### Estrutura

```text
Studio
├── Conversas
├── Artefatos
├── Recursos
├── Marca
├── Publicações
└── Configurações
```

### Entregáveis

- mapa de navegação;
- estados de conversa nova, ativa, arquivada e com erro;
- estratégia de migração de `/creative`;
- rota de fallback para o laboratório avançado.

### Entregue quando

- o usuário sempre souber onde iniciar uma conversa;
- projetos antigos continuarem acessíveis;
- o modo avançado não aparecer como requisito.

## F1.2 — Layout de três áreas

### Área esquerda

- botão “Nova conversa”;
- busca;
- conversas recentes;
- conversas fixadas;
- título gerado automaticamente;
- status de geração.

### Área central

- mensagens;
- respostas em streaming;
- cartões de tool call;
- progressos de job;
- composer;
- sugestões contextuais.

### Área direita

- artefato ativo;
- abas Plano, Conteúdo, Recursos e Resultado;
- ações Editar, Gerar, Variar, Exportar e Publicar;
- botão para recolher o painel.

### Entregue quando

- o usuário entender a relação entre mensagem e artefato;
- o painel direito não bloquear a leitura do chat;
- o layout funcionar em desktop e mobile.

## F1.3 — Composer

### Entregáveis

- textarea expansível;
- envio por Enter;
- quebra por Shift + Enter;
- anexos;
- preview de arquivo;
- remoção de anexo;
- chips de intenção;
- estado enviando;
- cancelamento;
- tratamento de erro.

### Sugestões iniciais

- “Me dê ideias”;
- “Crie um carrossel”;
- “Faça um vídeo”;
- “Use minha marca”;
- “Transforme isso em post”.

### Entregue quando

- qualquer capacidade do MVP puder ser iniciada pelo mesmo campo;
- o composer não exigir escolha técnica antes da mensagem.

## F1.4 — Estados de artefato

Projetar estados para:

- vazio;
- planejando;
- aguardando resposta;
- aguardando confirmação;
- cotando;
- gerando;
- pronto;
- falhou;
- cancelado;
- nova versão disponível.

### Entregue quando

- cada estado tiver mensagem acionável;
- nenhum job parecer travado;
- o usuário souber o próximo passo.

## F1.5 — Acessibilidade e responsividade

### Entregáveis

- navegação por teclado;
- foco visível;
- labels e aria-live para streaming;
- contraste aprovado;
- suporte a zoom;
- painel direito como drawer no mobile;
- mensagens sem depender apenas de cor.

### Entregue quando

- os fluxos principais puderem ser concluídos via teclado;
- a interface passar revisão manual de acessibilidade.

## Gate da Fase 1

Protótipo aprovado em teste de usabilidade, com layout, composer, artefatos e
estados de job definidos.
