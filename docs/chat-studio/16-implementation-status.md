# 16 - Status de implementacao

Este arquivo registra o que esta executavel no repositorio e o que depende de
configuracao externa. O criterio de aceite continua sendo o
[Definition of Done](./12-definition-of-done.md).

## Executavel agora

- Chat Studio em `/studio`, com conversa nova e conversa persistida pelo Mastra.
- Painel lateral de artefatos e recursos, responsivo para desktop e mobile.
- Ideias e carrosseis salvos pelo chat tambem sao persistidos como artefatos
  duraveis da organizacao.
- Artefatos genericos podem ser salvos, revisados, versionados, restaurados,
  aprovados, rejeitados, arquivados, restaurados e duplicados pela API e pela
  ferramenta `studioArtifactTool`.
- Cada artefato cria versao inicial e evento de auditoria; revisoes criam nova
  versao sem sobrescrever o historico.
- Anexos possuem registro por organizacao, vinculo opcional com thread/artefato,
  exclusao logica e validacao de URL de armazenamento.
- O composer permite anexar PDF/documentos aceitos pelo storage e registrar
  links HTTPS na thread existente; o endereco tambem segue no contexto da
  mensagem para o agente.
- Anexos locais sao processados de forma assincrona: PDFs passam por extracao
  de texto e paginas; TXT, Markdown, CSV e JSON entram como texto limitado;
  formatos sem extracao textual ficam em `READY_NO_TEXT`, e falhas terminam em
  `FAILED` com metadado seguro.
- Operacoes de geracao, publicacao, direitos, exportacao, jobs, fallback,
  creditos, metricas e avaliacao permanecem no Creative Engine existente e
  podem ser acionadas pelos tools do chat.
- Publicacao e operacoes consumidoras de creditos continuam protegidas por
  confirmacao explicita.
- Backend rejeita acesso sem sessao e aplica escopo por organizacao.
- Falta de `OPENAI_API_KEY` retorna erro 503 explicito e o frontend exibe um
  aviso em vez de manter o chat em carregamento infinito ou cair em tela
  branca por erro interno do CopilotKit.
- O frontend consulta `/copilot/status` antes de montar o CopilotKit; quando a
  IA nao esta disponivel, renderiza um estado de indisponibilidade sem iniciar
  chamadas que causariam erro interno.
- O modo local define `NOT_SECURED=true`, permitindo que o header `auth` seja
  usado em `http://localhost` durante testes sem cookie Secure.
- O CORS local permite credenciais para o frontend em `http://localhost:4200`,
  mantendo a lista de origens explicitamente restrita.

## Evidencia local

- `node scripts/swc-compile-backend.js`: 482 arquivos compilados, 0 falhas.
- TypeScript do backend: passou.
- TypeScript do frontend: passou.
- Build de producao do frontend: passou.
- Creative Engine: 19 suites e 41 testes passaram.
- Studio Artifact Service: 4 testes passaram.
- Preflight CORS de `http://localhost:4200` para `http://localhost:3100`:
  `204` com `Access-Control-Allow-Origin` correto e
  `Access-Control-Allow-Credentials=true`.
- API `/studio/artifacts` sem sessao: `401`.
- Fluxo autenticado local registro -> self -> artefato -> versao ->
  arquivamento: passou.
- Isolamento entre duas organizacoes: a leitura cruzada retornou `404` e a
  segunda organizacao listou zero artefatos.
- Processamento de link HTTPS: inicia em `PROCESSING` e conclui em `READY` com
  texto extraido limitado no metadado do anexo.
- Processamento de PDF local: inicia em `PROCESSING` e conclui em `READY`, com
  `pageCount=1`, `extraction=pdf` e texto extraido no teste autenticado.
- `POST /copilot/agent` sem provider configurado: `503` imediato.
- Rota `/studio` autenticada sem provider: interface renderizada com aviso
  acionavel de indisponibilidade, sem `Cannot read properties of undefined` na
  tela global.
- Launcher local do backend validado usando o `node` do ambiente, sem depender
  do executavel Node cacheado pelo `pnpm dlx`.
- Creative Engine expoe readiness por capacidade e tenta provider compativel de
  fallback quando o primario falha tecnicamente sem selecao explicita.

## Dependencias externas antes do piloto

- Configurar `OPENAI_API_KEY` ou o adapter de provedor escolhido.
- Configurar as chaves dos provedores de imagem/video e confirmar os modelos
  habilitados em producao.
- Configurar storage publico/privado para anexos, exports e midia gerada.
- Conectar contas sociais reais e validar publicacao em sandbox de cada canal.
- Executar E2E autenticado de criacao -> revisao -> aprovacao -> geracao ->
  exportacao com providers reais.

## Proximo corte

1. Retentativa da ultima mensagem sem recarregar a pagina e estados terminais
   visuais para jobs.
2. Quality gates de video e publicacao em ambiente de staging.
