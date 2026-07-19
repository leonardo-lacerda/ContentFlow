# ContentFlow Design System

> Identidade visual editorial light.  
> **SSOT da landing:** `landing/styles.css`  
> **Tokens do app:** `apps/frontend/src/app/ds-tokens.scss` → `colors.scss` → Tailwind

---

## Princípios

1. **Light editorial** — white / offwhite / cream  
2. **Um acento** — amber `#b4530a` (terracota); hover `#8a3f08`  
3. **Serif = voz, sans = UI** — Fraunces em títulos; Inter no produto  
4. **Sombras leves em camadas** — sem glow neon  
5. **Radius progressivo** — 10 → 14–16 → 18–24 → pill  
6. **Motion com propósito** + `prefers-reduced-motion`  
7. **Sem clichês de IA** — sem purple gradients, glassmorphism global, mesh blobs  

---

## Paleta

| Token | Valor | Uso |
|-------|-------|-----|
| `--cf-white` | `#ffffff` | Superfícies elevadas |
| `--cf-offwhite` | `#fafafa` | Fundo da app |
| `--cf-cream` | `#f7f2ea` | Superfície quente, hover soft |
| `--cf-sand` | `#efe7da` | Profundidade quente |
| `--cf-ink` | `#1c1917` | Texto primário |
| `--cf-muted` | `#78716c` | Texto secundário |
| `--cf-amber` | `#b4530a` | CTA, focus, active |
| `--cf-amber-dark` | `#8a3f08` | Hover primary |
| `--cf-amber-soft` | `#f3e6d8` | Chip ativo, item selecionado |
| `--cf-ok` / `--cf-ok-bg` | `#3f7d4e` / `#e8f2ea` | Sucesso |

### App bridge (`--new-*`)

| App | Light |
|-----|-------|
| `--new-bgColor` | offwhite |
| `--new-bgColorInner` | white |
| `--new-btn-primary` | amber |
| `--new-boxFocused` | amber-soft |
| `--new-textItemFocused` | amber-dark |
| `--new-textColor` | ink RGB `28 25 23` |

Dark mode: fundos stone-900/800, **mesmo amber**.

---

## Tipografia

| Papel | Família | Peso |
|-------|---------|------|
| UI / body | Inter | 400–700 |
| Títulos de página / marketing | Fraunces | 600 |
| Code | system mono | — |

Tailwind: `font-sans` → Inter · `font-serif` → Fraunces

---

## Componentes-base

### Botão primary
- bg amber, texto branco, radius 10  
- hover amber-dark + lift sutil  

### Item de menu ativo
- bg `amber-soft`, texto `amber-dark`  

### Cards / page shell
- bg white, border line, radius 14–16, shadow-sm  

### Focus
- ring `0 0 0 4px rgba(180,83,10,0.08)`  

---

## O que não rethemear

- Skins fiéis de rede (LinkedIn, IG, TikTok previews)  
- Polotno / vendors  
- Assets e cores da marca do usuário (Brand DNA)  

---

## Como estender

1. Novo primitivo → `ds-tokens.scss`  
2. Mapear em `colors.scss` (light + dark) se for chrome do app  
3. Expor no `tailwind.config.cjs` só se precisar de utility  
4. Preferir `bg-btnPrimary`, `border-newBorder`, `text-textItemBlur` em vez de hex  

---

## Landing

A pasta `landing/` já implementa este DS em HTML estático. O app React consome os mesmos valores via tokens.
