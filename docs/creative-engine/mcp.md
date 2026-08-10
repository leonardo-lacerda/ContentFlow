# MCP do Creative Engine

O servidor HTTP existente do ContentFlow (`/mcp`, OAuth em `/mcp-oauth` e compatibilidade `/mcp/:id`) expõe `creativeEngineTool`.

Operações: `capabilities`, `presets`, `projects`, `project`, `create-project`, `create-script`, `quote`, `generate`, `jobs` e `job`.

O contexto MCP resolve a organização pelo OAuth/API key. A ferramenta não bypassa rights, moderação, créditos, idempotência ou tenant isolation. Clientes devem cotar antes de gerar e acompanhar o job até estado terminal.
