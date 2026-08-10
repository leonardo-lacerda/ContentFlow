# Fase 2 — Fundação de conversas

## Objetivo da fase

Criar persistência, streaming e anexos para que o chat seja uma superfície de
produto, não apenas uma chamada pontual para um agente.

## F2.1 — Modelo de dados

### Entidades

- `Conversation`;
- `ConversationParticipant`;
- `Message`;
- `MessageAttachment`;
- `ToolCall`;
- `ConversationEvent`;
- `ConversationPreference`.

### Regras

- todas as entidades possuem `organizationId`;
- mensagens são imutáveis depois de persistidas;
- exclusão é lógica por padrão;
- payloads grandes ficam em storage;
- índices cobrem organização, conversa e data.

### Entregue quando

- uma conversa puder ser criada, listada, reaberta, arquivada e excluída;
- não existir consulta sem filtro de organização.

## F2.2 — API de conversas

### Endpoints propostos

```text
POST   /studio/conversations
GET    /studio/conversations
GET    /studio/conversations/:id
PATCH  /studio/conversations/:id
DELETE /studio/conversations/:id
POST   /studio/conversations/:id/messages
POST   /studio/conversations/:id/cancel
GET    /studio/conversations/:id/events
```

### Entregue quando

- os endpoints tiverem DTOs, validação, autorização e testes;
- retries não duplicarem mensagens nem execuções.

## F2.3 — Streaming e eventos

### Eventos mínimos

- `message.started`;
- `message.delta`;
- `message.completed`;
- `tool.started`;
- `tool.progress`;
- `tool.completed`;
- `artifact.created`;
- `artifact.updated`;
- `job.updated`;
- `message.failed`.

### Entregue quando

- o frontend receber resposta progressiva;
- uma reconexão recuperar eventos perdidos;
- o usuário puder cancelar uma execução em andamento.

## F2.4 — Anexos

### Tipos aceitos no MVP

- PNG, JPG, WEBP;
- MP4, MOV;
- PDF;
- TXT, DOCX;
- URL pública HTTPS.

### Validações

- MIME real;
- tamanho;
- antivírus;
- checksum;
- tenant;
- expiração de URL;
- SSRF para URLs externas.

### Entregue quando

- um anexo tiver preview, metadados e vínculo à mensagem;
- a IA puder referenciar o anexo sem copiar seu conteúdo para o histórico textual.

## F2.5 — Títulos e contexto de conversa

### Entregáveis

- título automático após a primeira mensagem;
- resumo compacto da conversa;
- janela de contexto configurável;
- compactação de mensagens antigas;
- restauração do artefato ativo.

### Entregue quando

- uma conversa longa continuar funcional sem crescimento ilimitado de tokens;
- o usuário voltar dias depois e continuar do ponto correto.

## Gate da Fase 2

Uma conversa autenticada consegue receber mensagem, transmitir resposta, anexar
arquivo, criar eventos e ser retomada após desconexão.
