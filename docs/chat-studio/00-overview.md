# 00 — Visão geral e decisões-base

## 1. Problema

O fluxo atual começa com telas, campos e escolhas técnicas. Isso aumenta a
carga cognitiva e faz o usuário decidir sobre produção antes de explicar o que
quer comunicar.

O Chat Studio inverte a ordem: primeiro o usuário descreve a intenção; depois a
IA organiza o trabalho e revela apenas as decisões necessárias.

## 2. Referência de experiência

O padrão desejado é uma conversa que produz um plano revisável antes de iniciar
uma geração cara. O HeyGen documenta um Video Agent com modo de conversa para
revisar e refinar o plano e um modo automático para reduzir a interação; o
ContentFlow deve adotar o modo conversacional como padrão e manter o editor
manual como etapa posterior.

Não copiar identidade visual, textos, assets ou implementação de terceiros.
Reproduzir somente o princípio de produto: prompt, plano, artefato, revisão e
produção no mesmo contexto.

## 3. Proposta de valor

> Diga o que você quer criar. O ContentFlow transforma a ideia em conteúdo
> pronto para revisar, publicar e reutilizar.

## 4. Personas prioritárias

### Criador ou especialista

Quer ideias, carrosséis e vídeos sem dominar produção audiovisual.

### Profissional de marketing

Quer criar variações, adaptar para canais e testar ângulos rapidamente.

### Agência ou equipe

Quer manter marca, aprovação, recursos, custos e histórico organizados.

### Operador

Precisa controlar direitos, créditos, providers, falhas, auditoria e publicação.

## 5. Capacidades do produto

| Capacidade | Entrada | Artefato principal |
|---|---|---|
| Ideias | tema, nicho ou objetivo | lista de ideias |
| Copy | ideia ou produto | pacote de copy |
| Roteiro | objetivo e formato | roteiro versionado |
| Carrossel | tema ou roteiro | slides + legenda |
| Imagem | prompt + referências | imagem + variantes |
| Vídeo | prompt + produto | plano + vídeo |
| Repurpose | artefato existente | variantes por canal |
| Publicação | artefato aprovado | plano de publicação |

## 6. Não objetivos do primeiro lançamento

- editor de vídeo profissional completo;
- media buying;
- marketplace público de atores;
- clonagem de pessoas sem contrato;
- suporte imediato a todos os providers do mercado;
- publicação automática sem revisão;
- substituir o Creative Engine de backend.

## 7. Princípios de interação

1. Uma conversa por intenção ou projeto.
2. Um artefato ativo por vez no painel direito.
3. Perguntas curtas com opções rápidas.
4. Defaults sensatos para tudo que não bloqueia a tarefa.
5. Plano gratuito; renderização sujeita a quote e créditos.
6. Revisão conversacional antes do editor técnico.
7. Ações destrutivas sempre explícitas.
8. Todas as mudanças são versionadas.

## 8. Fluxo de referência

```text
Mensagem do usuário
  -> classificação da intenção
  -> coleta mínima de contexto
  -> plano estruturado
  -> revisão conversacional
  -> quote, se necessário
  -> confirmação
  -> job assíncrono
  -> artefato pronto
  -> revisar, variar, exportar ou publicar
```

## 9. Métricas de sucesso

- tempo até o primeiro artefato;
- taxa de conclusão sem abrir modo avançado;
- taxa de aprovação do plano;
- taxa de sucesso das gerações;
- quantidade média de revisões;
- custo médio por artefato aprovado;
- taxa de publicação após geração;
- taxa de abandono;
- satisfação do usuário;
- uso de recursos de marca.
