# Creative Engine — especificação do produto

## Wedge

Transformar produto + brief em anúncios UGC verticais versionados, usando atores e vozes autorizados, com variações por idioma/formato e saída pronta para exportação ou publicação.

## Personas

- **Performance marketer:** quer testar hooks, atores e idiomas sem montar cada vídeo manualmente.
- **Creative strategist:** quer transformar brief em roteiro editável, cenas e direção visual.
- **Operador de workspace:** controla créditos, providers, direitos, retenção e incidentes.
- **Desenvolvedor/integrador:** usa API ou MCP para automatizar quote, geração, polling e publicação.

## Fluxo mínimo

1. Criar projeto e objetivo.
2. Enviar produto/asset e registrar consentimento.
3. Gerar ou editar roteiro versionado.
4. Selecionar ator/voz `APPROVED`.
5. Cotar e reservar créditos.
6. Gerar, validar e registrar provenance.
7. Fazer preflight e revisão humana.
8. Publicar como rascunho/agendamento ou exportar ZIP.

## Não-objetivos do wedge

Clone de creator sem contrato, cópia de marca ou interface da Arcads, catálogo ilimitado de atores, fashion try-on completo e suporte a todos os providers do mercado.

## Critérios de aceite

- Nenhum recurso sem tenant e sem direitos aprovados entra em uma geração.
- A mesma idempotency key produz um único job, débito e publicação.
- Falha técnica reembolsa a reserva conforme o ledger.
- Todo output possui provider, modelo, input hash, custo e status verificável.
- Um usuário consegue editar uma cena e criar nova versão sem alterar a anterior.
- Um output `READY` pode chegar ao fluxo de canais ou ao export sem perder o projeto e a variante de origem.
