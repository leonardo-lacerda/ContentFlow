# ADR-001 — fronteira do Creative Engine

## Decisão

O Creative Engine será uma camada de domínio no monorepo, reutilizando Prisma, Upload, Temporal, Posts e integrações sociais. Providers de IA entram por capability gateway; nenhuma tela ou serviço depende diretamente de um vendor específico.

## Motivos

- mantém créditos, direitos, provenance e retries centralizados;
- permite trocar providers sem mudar API/UI;
- conecta output aprovado ao fluxo social existente;
- reduz cópia de elementos protegidos da Arcads.

## Consequências

O staging precisa validar banco, storage, Temporal e contratos externos. A qualidade final não pode ser inferida de um fallback; deve ser medida por provider e capability.
