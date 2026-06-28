# Plano de Implementação — Subfase 3.3: Editor Visual Mais Forte

**Projeto:** ContentFlow Carousel Studio  
**Data:** 28/06/2026  
**Escopo:** Refatoração de identidade de slides, CRUD de slides, undo/redo global, gaps residuais

---

## 1. Diagnóstico do Estado Atual

### O que existe hoje
- `CarouselSlide.index: number` é o **único** identificador do slide
- Todos os `Record` states (`slideImages`, `slideHistory`, `slideImageHistory`, `slideLoading`, `slideImageAdjustments`) são indexados por `slide.index` (número numérico)
- O hook `use-ai-generate-images-studio.ts` (2721 linhas) gerencia todo o estado com `useState` isolado
- Histórico por slide existe (regeneração de copy/imagem), mas não há undo/redo global
- O backend recebe/envia `slideIndex` como número para job de imagens, save, export

### O que falta (4 features críticas)
1. **Adicionar slide** — impossível hoje
2. **Remover slide** — impossível hoje
3. **Duplicar slide** — impossível hoje
4. **Reordenar slides** — impossível hoje
5. **Undo/redo global** — não existe

### Problema raiz: index numérico como ID
O `slide.index` serve **duas finalidades conflitantes**:
- **Identidade** (chave para lookup em Records)
- **Posição** (ordem de exibição e numeração visual)

Quando um slide é adicionado/removido/reordenado, todos os indices mudam, quebrando todos os `Record<number, ...>` states associados.

---

## 2. Arquitetura da Solução

### 2.1 Princípio: IDs estáveis + posição derivada

```
CarouselSlide.id    → UUID estável (nunca muda)
CarouselSlide.index → Número derivado da posição (1, 2, 3...) — recalculado após operações CRUD
```

O `index` continua existindo mas é **calculado**, não armazenado. Isso garante:
- Backend compatibility (continua recebendo `slideIndex: number`)
- Compatibilidade com todos os exports que usam `slide.index` para naming/ordering
- IDs estáveis para todos os `Record` states internos

### 2.2 Mapeamento de compatibilidade com backend

```
Backend API  ←→  Frontend
slideIndex: 3  ←→  slide.id = "s_abc123"  (index 3 é derivado)
```

Antes de enviar ao backend (createImageJob, saveCarousel, export), mapeamos:
```ts
slides.map((slide, i) => ({ slideIndex: i + 1, ... }))
```

---

## 3. Implementação Detalhada

### Fase 3.3.1 — Tipos e utilitários (base)

**Arquivo:** `ai-generate-images.types.ts`

```ts
// Adicionar campo id, manter index como derivado
export type CarouselSlide = {
  id: string;          // UUID estável — nova PK
  index: number;       // Posição (1-based) — recalculado sempre
  headline: string;
  body: string;
  cta: string;
  imagePrompt: string;
  altText: string;
};
```

**Novo arquivo:** `slide-operations.ts` (utilitários puros de slide CRUD)

```ts
// Funções puras — testáveis sem React
export function createSlideId(): string;
export function makeDefaultSlide(overrides?: Partial<CarouselSlide>): CarouselSlide;
export function addSlideAt(slides: CarouselSlide[], afterIndex: number): CarouselSlide[];
export function removeSlideAt(slides: CarouselSlide[], targetIndex: number): CarouselSlide[];
export function duplicateSlideAt(slides: CarouselSlide[], targetIndex: number): CarouselSlide[];
export function moveSlide(slides: CarouselSlide[], fromIndex: number, toIndex: number): CarouselSlide[];
export function reindexSlides(slides: CarouselSlide[]): CarouselSlide[];
```

Todas as funções CRUD retornam um **novo array** com slides reindexados. A reindexação é:
```ts
function reindexSlides(slides: CarouselSlide[]): CarouselSlide[] {
  return slides.map((slide, i) => ({ ...slide, index: i + 1 }));
}
```

**Constantes** (`ai-generate-images.constants.ts`):
```ts
export const MIN_CAROUSEL_SLIDES = 2;   // manter
export const MAX_CAROUSEL_SLIDES = 10;  // manter
// NOVO: limite máximo de undo
export const MAX_UNDO_HISTORY = 50;
```

### Fase 3.3.2 — Refatoração do hook principal

**Arquivo:** `use-ai-generate-images-studio.ts`

#### 3.3.2.1 Mudar todos os Record states para usar `string` (slide id)

| Estado atual (key: number) | Novo estado (key: string) |
|---|---|
| `slideImages: Record<number, SlideImageResult>` | `slideImages: Record<string, SlideImageResult>` |
| `slideHistory: Record<number, CarouselSlide[]>` | `slideHistory: Record<string, CarouselSlide[]>` |
| `slideImageHistory: Record<number, SlideImageResult[]>` | `slideImageHistory: Record<string, SlideImageResult[]>` |
| `slideLoading: Record<number, string>` | `slideLoading: Record<string, string>` |
| `slideImageAdjustments: Record<number, string>` | `slideImageAdjustments: Record<string, string>` |

#### 3.3.2.2 Novos estados

```ts
// Undo/redo stack — cada snapshot é uma cópia profunda do plan + slideImages
const [undoStack, setUndoStack] = useState<Array<{ plan: CarouselPlan; slideImages: Record<string, SlideImageResult> }>>([]);
const [redoStack, setRedoStack] = useState<Array<{ plan: CarouselPlan; slideImages: Record<string, SlideImageResult> }>>([]);
```

#### 3.3.2.3 Funções de undo/redo

```ts
function pushUndoSnapshot() {
  // Salva snapshot atual (deep clone) no undoStack, limpa redoStack
}

function undo() {
  // Pop do undoStack → restaura plan + slideImages
  // Push do estado atual no redoStack
}

function redo() {
  // Pop do redoStack → restaura plan + slideImages
  // Push do estado atual no undoStack
}

const canUndo = undoStack.length > 0;
const canRedo = redoStack.length > 0;
```

**Regra:** Toda operação mutável (add/remove/duplicate/reorder/updateSlide/updatePlan) primeiro chama `pushUndoSnapshot()`, depois aplica a mudança.

#### 3.3.2.4 Funções CRUD de slides

```ts
const addSlide = useCallback((afterIndex?: number) => {
  if (!plan) return;
  if (plan.slides.length >= MAX_CAROUSEL_SLIDES) {
    setError(`Máximo de ${MAX_CAROUSEL_SLIDES} slides.`);
    return;
  }
  pushUndoSnapshot();
  const insertAt = afterIndex ?? plan.slides.length;
  const newSlides = addSlideAt(plan.slides, insertAt);
  setPlan({ ...plan, slides: newSlides });
  setSlideImages(current => {
    const next = { ...current };
    // Copia imagem do slide duplicado se existir
    return next;
  });
  // Limpa savedCarouselCount, etc.
}, [plan, pushUndoSnapshot]);

const removeSlide = useCallback((targetIndex: number) => {
  if (!plan) return;
  if (plan.slides.length <= MIN_CAROUSEL_SLIDES) {
    setError(`Mínimo de ${MIN_CAROUSEL_SLIDES} slides.`);
    return;
  }
  pushUndoSnapshot();
  const removedSlideId = plan.slides.find(s => s.index === targetIndex)?.id;
  const newSlides = removeSlideAt(plan.slides, targetIndex);
  setPlan({ ...plan, slides: newSlides });
  // Limpa todos os states associados ao slide removido
  if (removedSlideId) {
    setSlideImages(current => { const n = {...current}; delete n[removedSlideId]; return n; });
    setSlideLoading(current => { const n = {...current}; delete n[removedSlideId]; return n; });
    // ... etc para history, adjustments
  }
}, [plan, pushUndoSnapshot]);

const duplicateSlide = useCallback((targetIndex: number) => {
  if (!plan) return;
  if (plan.slides.length >= MAX_CAROUSEL_SLIDES) {
    setError(`Máximo de ${MAX_CAROUSEL_SLIDES} slides.`);
    return;
  }
  pushUndoSnapshot();
  const newSlides = duplicateSlideAt(plan.slides, targetIndex);
  setPlan({ ...plan, slides: newSlides });
  // Copia imagem do slide original para o novo
}, [plan, pushUndoSnapshot]);

const reorderSlide = useCallback((fromIndex: number, toIndex: number) => {
  if (!plan) return;
  pushUndoSnapshot();
  const newSlides = moveSlide(plan.slides, fromIndex, toIndex);
  setPlan({ ...plan, slides: newSlides });
  // slideImages usa id como key — não precisa remapear!
}, [plan, pushUndoSnapshot]);
```

#### 3.3.2.5 Atualizar `updateSlide` existente

```ts
// ANTES: usa slide.index para match
slide.index === index

// DEPOIS: usa slide.id para match
slide.id === slideId

// E toda chamada existente: updateSlide(slide.index, 'headline', val)
// Vira: updateSlide(slide.id, 'headline', val)
```

#### 3.3.2.6 Atualizar todas as referências `slideImages[slide.index]` → `slideImages[slide.id]`

Localizações afetadas (24+ ocorrências no hook):
- `generatedSlides` filter
- `imageDisabled` check
- `generateCarouselImages` job creation
- `saveCarouselToMedia`
- `exportCarouselPackage`
- `generateSlideImage`
- `regenerateSlideCopy`
- `restoreImageVersion`
- `restoreSlideVersion`
- `loadProjectIntoStudio`
- `fixCarouselWithAi`
- `applyEditorialQuickFixes`
- `setSlideImageAdjustment`

#### 3.3.2.7 Garantir IDs em todos os pontos de criação de slides

1. **`generatePlan`** (resposta do backend) — mapear slides recebidos:
   ```ts
   const slides = data.slides.map((s, i) => ({
     ...s,
     id: s.id || createSlideId(),
     index: i + 1,
   }));
   ```

2. **`loadProjectIntoStudio`** — garantir IDs:
   ```ts
   slides: loadedPlan.slides.map((slide: any, index: number) => ({
     id: slide.id || createSlideId(),
     index: Number(slide.index || index + 1),
     headline: slide.headline || '',
     // ...
   }))
   ```

3. **`fixCarouselWithAi`** — resposta do backend também pode vir sem IDs

### Fase 3.3.3 — Atualizar componentes UI

#### 3.3.3.1 `ai-generate-images-slide-editor.tsx`

Adicionar barra de ações por slide:
```
[↑ Mover] [↓ Mover] [📋 Duplicar] [✕ Remover]
```

- **Botão "Mover acima"**: `reorderSlide(slide.index, slide.index - 1)` — desabilitado no primeiro
- **Botão "Mover abaixo"**: `reorderSlide(slide.index, slide.index + 1)` — desabilitado no último
- **Botão "Duplicar"**: `duplicateSlide(slide.index)` — desabilitado se >= MAX
- **Botão "Remover"**: `removeSlide(slide.index)` — desabilitado se <= MIN

Todas as chamadas passam a usar `slide.id` como chave React e `slide.index` para operações.

Propriedades novas do `SlideEditorPanelProps`:
```ts
addSlide: (afterIndex?: number) => void;
removeSlide: (targetIndex: number) => void;
duplicateSlide: (targetIndex: number) => void;
reorderSlide: (fromIndex: number, toIndex: number) => void;
totalSlides: number;
```

#### 3.3.3.2 `ai-generate-images-preview.tsx`

- Trocar keys de `preview-${slide.index}` para `preview-${slide.id}`
- O display `{slide.index}/{plan.slides.length}` continua correto (index é derivado)
- Adicionar botão "+ Adicionar slide" no final da lista de previews (opcional)

#### 3.3.3.3 `ai-generate-images-studio-view.tsx`

- Passar novas props para `SlideEditorPanel`: addSlide, removeSlide, duplicateSlide, reorderSlide, totalSlides
- Passar undo/redo props: undo, redo, canUndo, canRedo

#### 3.3.3.4 `ai-generate-images.sections.tsx` (CarouselLightbox)

- Usar `slide.id` nas keys se aplicável

### Fase 3.3.4 — Undo/Redo

#### 3.3.4.1 Estratégia: Snapshot full-state

Cada operação mutável salva um snapshot completo:
```ts
type UndoSnapshot = {
  plan: CarouselPlan;  // deep clone
  slideImages: Record<string, SlideImageResult>;  // deep clone
};
```

**Por que full-state e não diffs?**
- Mais simples de implementar
- Mais robusto (nenhum edge case de state divergente)
- `MAX_UNDO_HISTORY = 50` snapshots não é muita memória (plan é ~5-10KB × 50 = ~500KB worst case)

#### 3.3.4.2 Teclado: Ctrl+Z / Ctrl+Shift+Z

```ts
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      redo();
    }
  }
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [undo, redo]);
```

#### 3.3.4.3 Botões visuais

Adicionar barra no topo do editor (após o plano estar definido):
```
[← Desfazer] [Refazer →]    (deshabilitado quando stack vazio)
```

#### 3.3.4.4 Operações que empilham undo

| Operação | Empilha undo? |
|---|---|
| addSlide | ✅ |
| removeSlide | ✅ |
| duplicateSlide | ✅ |
| reorderSlide | ✅ |
| updateSlide (edição de texto) | ✅ (debounced 500ms) |
| regenerateSlideCopy (resposta da IA) | ✅ |
| applyEditorialQuickFixes | ✅ |
| fixCarouselWithAi | ✅ |
| generatePlan (novo carrossel) | ❌ (limpa stacks) |
| loadProjectIntoStudio | ❌ (limpa stacks) |

### Fase 3.3.5 — Export e Save (compatibilidade)

O export e save usam `slide.index` para:
- Naming de arquivos: `slides-png/01-headline.png`
- Ordem no PDF
- Envio ao backend: `{ index: slide.index, ... }`

Com a refatoração, `slide.index` continua sendo o número correto (1, 2, 3...) porque é recalculado. Nenhuma mudança necessária no código de export/save — eles já usam `slide.index` que continuará válido.

Exceção: os nomes de arquivo no ZIP usam `String(slide.index).padStart(2, '0')` — funciona normalmente.

### Fase 3.3.6 — Drag & Drop (futuro, não no escopo 3.3)

A reordenabilidade por botão (↑↓) é suficiente para a Subfase 3.3. Para drag & drop visual, considerar `@dnd-kit/core` ou `react-beautiful-dnd` em uma futura subfase, já que a estrutura de IDs estáveis já suporta.

---

## 4. Ordem de Implementação Recomendada

| Passo | Arquivo(s) | Descrição | Esforço |
|---|---|---|---|
| 1 | `ai-generate-images.types.ts` | Adicionar `id: string` ao `CarouselSlide` | 5 min |
| 2 | `slide-operations.ts` (novo) | Funções puras de CRUD + reindex | 30 min |
| 3 | `use-ai-generate-images-studio.ts` | Refatorar Records para `Record<string, ...>` | 60 min |
| 4 | `use-ai-generate-images-studio.ts` | Refatorar `updateSlide` para usar `slide.id` | 15 min |
| 5 | `use-ai-generate-images-studio.ts` | Atualizar todas as 24+ referências `slideImages[slide.index]` → `slideImages[slide.id]` | 60 min |
| 6 | `use-ai-generate-images-studio.ts` | Garantir IDs em generatePlan, loadProjectIntoStudio, fixCarouselWithAi | 30 min |
| 7 | `use-ai-generate-images-studio.ts` | Implementar addSlide, removeSlide, duplicateSlide, reorderSlide | 45 min |
| 8 | `use-ai-generate-images-studio.ts` | Implementar undo/redo (snapshot system + hook keyboard) | 60 min |
| 9 | `ai-generate-images-slide-editor.tsx` | Adicionar barra de ações CRUD por slide | 30 min |
| 10 | `ai-generate-images-preview.tsx` | Trocar keys para `slide.id` | 10 min |
| 11 | `ai-generate-images-studio-view.tsx` | Conectar novas props | 15 min |
| 12 | `ai-generate-images.sections.tsx` | Atualizar keys no Lightbox se necessário | 5 min |

**Total estimado: ~5-6 horas de implementação**

---

## 5. Riscos e Mitigações

### Risco 1: Backend incompatível
**Mitigação:** O backend recebe `slideIndex: number` que continua sendo enviado corretamente. Mapeamento `id → index` é feito antes de cada chamada API.

### Risco 2: Breaking changes em Records durante desenvolvimento
**Mitigação:** Refatorar tudo em um passo atômico (passos 3-6 juntos). Não pode entregar parcialmente.

### Risco 3: Performance do deep clone no undo
**Mitigação:** `MAX_UNDO_HISTORY = 50` limita memória. Usar `structuredClone()` (nativo no browser moderno) que é mais rápido que `JSON.parse(JSON.stringify())`.

### Risco 4: Slide com ID duplicado em save/import
**Mitigação:** Usar `crypto.randomUUID()` ou fallback com `Date.now() + random`. No `loadProjectIntoStudio`, gerar novos IDs para slides importados (projetos antigos não têm `id`).

### Risco 5: Editorial review usa `issue.slide` (number)
**Mitigação:** O tipo `EditorialIssue.slide` continua sendo number (referencia posição). A revisão editorial é stateless — não usa IDs.

---

## 6. Gaps Residuais do Plano Original

Além das 4 features críticas + undo/redo:

### 6.1 Drag & Drop para reordenar
- **Status:** Não implementado — botões ↑↓ são suficientes para 3.3
- **Recomendação:** Subfase 3.4 usar `@dnd-kit/sortable` (já que IDs estáveis estarão prontos)

### 6.2 Criar post a partir do carrossel
- **Status:** A funcionalidade de caption/post já existe (`CaptionPanel`)
- **Gap:** Falta integração com plataforma de publicação (agendar post)
- **Recomendação:** Subfase dedicada — não é editor visual

### 6.3 Melhorias de export
- **Status:** ZIP + PDF já funcionam
- **Gaps potenciais:**
  - Export individual por slide (não existe)
  - Export com overlay de marca automático
  - Template de caption no ZIP
- **Recomendação:** Low priority — funcional

### 6.4 Limites de texto por slide
- **Status:** Headline/body/CTA não têm maxlength visual
- **Recomendação:** Adicionar contadores de caracteres no editor

---

## 7. Checklist de Validação

- [ ] Criar carrossel com 5 slides → todos têm IDs únicos
- [ ] Adicionar slide (6º) → IDs antigos não mudam, novo slide tem ID novo
- [ ] Remover slide 3 → slides restantes reindexados, IDs preservados
- [ ] Duplicar slide 2 → novo slide com ID novo, conteúdo copiado
- [ ] Reordenar slide 1 para posição 3 → todos os IDs preservados, display correto
- [ ] Undo desfaz a última operação
- [ ] Redo refaz o que foi desfeito
- [ ] Ctrl+Z / Ctrl+Shift+Z funciona
- [ ] Regenerar copy de um slide → undo desfaz
- [ ] Gerar imagens → funciona com novos IDs
- [ ] Export ZIP → arquivos nomeados corretamente
- [ ] Salvar carrossel → backend recebe slideIndex correto
- [ ] Carregar projeto salvo → IDs gerados para projetos antigos
- [ ] Limite mínimo (2) e máximo (10) respeitados
- [ ] Dark mode funciona nos novos botões

---

## 8. Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `ai-generate-images.types.ts` | Adicionar `id` ao CarouselSlide |
| `slide-operations.ts` | **NOVO** — funções CRUD puras |
| `use-ai-generate-images-studio.ts` | Refatoração massiva — Records, CRUD, undo/redo |
| `ai-generate-images-slide-editor.tsx` | Botões CRUD + usar slide.id |
| `ai-generate-images-preview.tsx` | Keys → slide.id |
| `ai-generate-images-studio-view.tsx` | Passar novas props |
| `ai-generate-images.sections.tsx` | Keys no Lightbox (se necessário) |
| `ai-generate-images.utils.ts` | Nenhuma mudança (usa slide.index que continua válido) |
| `ai-generate-images.api.ts` | Nenhuma mudança |
| `ai-generate-images.constants.ts` | Adicionar MAX_UNDO_HISTORY |
