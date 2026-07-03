# 🟡 Subfase P1-3: CompanyProfile → BrandProfile Migration

> **Fase:** CRÍTICO — Riscos de Infraestrutura
> **Subfase:** P1-3
> **Status:** Especificação Técnica Completa
> **Data:** 2026-07-02
> **Autor:** Hermes Agent

---

## 1. Objetivo

Migrar os dados de perfil de marca/empresa de **JSON serializado em `Organization.description`** para o **model `BrandProfile`** dedicado no Prisma, com adapter de compatibilidade que permite coexistência durante período de transição, suporte a multi-brand real, e script de migração de dados legados.

---

## 2. Contexto

### 2.1 Problema Atual

O sistema atual armazena CompanyProfile como JSON dentro do campo `description` (String) da tabela `Organization`:

```typescript
// organization.service.ts linha 15-16
const COMPANY_PROFILE_TYPE = 'company_profile_v1';
const COMPANY_PROFILE_COLLECTION_TYPE = 'company_profiles_v2';

// organization.repository.ts linha 423
getCompanyProfile(orgId: string) {
  // SELECT id, name, description FROM Organization WHERE id = orgId
  // description contém JSON serializado
}

// organization.service.ts linha 443
private parseCompanyProfiles(org, rawDescription) {
  const parsed = JSON.parse(rawDescription);
  // Dois formatos: v1 (perfil único) e v2 (coleção)
}
```

**Formato v1 (legado):**
```json
{
  "__type": "company_profile_v1",
  "id": "abc-123",
  "companyName": "Minha Empresa",
  "website": "https://exemplo.com",
  "industry": "Tecnologia",
  "targetAudience": "...",
  "productsOrServices": "...",
  "toneOfVoice": "...",
  "summary": "...",
  "visualIdentitySummary": "...",
  "brandColors": "#FF0000,#00FF00",
  "brandFonts": "Arial, Helvetica",
  "defaultCta": "...",
  "forbiddenTerms": "...",
  "contentPreferences": "...",
  "visualIdentityAssets": [...],
  "brandPalettes": [...],
  "brandFontPresets": [...],
  "brandLogos": [...],
  "styleRules": [...],
  "inspirationLibrary": [...],
  "ideasLibrary": [...]
}
```

**Formato v2 (atual):**
```json
{
  "__type": "company_profiles_v2",
  "selectedCompanyId": "abc-123",
  "companies": [
    { /* CompanyProfile v1 data */ },
    { /* CompanyProfile v1 data */ }
  ]
}
```

### 2.2 Por Que Isso É Crítico

| Problema | Impacto | Severidade |
|----------|---------|------------|
| **Sem índices** | Não filtrar por nome, indústria, público | ALTA |
| **Sem isolamento multi-brand** | Uma org não pode ter marcas separadas | ALTA |
| **Sem versionamento** | Não há histórico de alterações | ALTA |
| **Lost updates** | Duas requisições simultâneas sobrescrevem | ALTA |
| **Tamanho ilimitado** | JSON pode exceder limites de TEXT | MÉDIA |
| **Sem soft delete** | Excluir marca remove dados permanentemente | MÉDIA |
| **Sem auditoria** | Não sabe quem alterou o quê | MÉDIA |

### 2.3 Model BrandProfile (Já Existente)

O model `BrandProfile` **já existe** no schema Prisma (linha 984):

```prisma
model BrandProfile {
  id             String             @id @default(uuid())
  organizationId String
  name           String
  website        String?
  industry       String?
  status         BrandProfileStatus @default(DRAFT)
  selected       Boolean            @default(false)
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
  deletedAt      DateTime?
  organization   Organization       @relation(...)
  dnaSnapshots   BrandDnaSnapshot[]
  assets         BrandAsset[]
  contentIdeas   ContentIdea[]
  // ... mais 6 relações
}
```

**Enum de status:**
```prisma
enum BrandProfileStatus {
  DRAFT
  ANALYZING
  NEEDS_REVIEW
  ACTIVE
  FAILED
}
```

### 2.4 O Que JÁ Existe

| Componente | Status | Arquivo |
|-----------|--------|---------|
| Model `BrandProfile` | ✅ Criado | `schema.prisma:984` |
| Model `BrandDnaSnapshot` | ✅ Criado | `schema.prisma:1012` |
| Model `BrandAsset` | ✅ Criado | `schema.prisma:1034` |
| Enum `BrandProfileStatus` | ✅ Criado | `schema.prisma:976` |
| Controller `BrandsController` | ✅ Criado (15 endpoints) | `brands.controller.ts` |
| Service/Repository | ⚠️ Possivelmente stub | `brand-profile.service.ts` |
| Adapter de compatibilidade | ❌ Não implementado | — |
| Script de migração | ❌ Não implementado | — |
| CompanyProfile legado | ❌ Ainda é fonte primária | `organization.service.ts` |

---

## 3. Escopo da Subfase

### 3.1 O Que Será Implementado

1. **BrandProfileService completo** — CRUD, seleção, soft delete, snapshots
2. **BrandProfileRepository** — Queries Prisma com índices
3. **Adapter de compatibilidade** — `CompanyProfileToBrandProfileAdapter` que converte JSON legado
4. **Script de migração** — Popular BrandProfile a partir de Organization.description
5. **Dual-write** — durante transição: escrever em AMBOS (BrandProfile + description)
6. **Dual-read** — durante transição: ler de BrandProfile com fallback para description
7. **Cleanup** — após 30 dias, parar de escrever em description

### 3.2 O Que NÃO Será Implementado

- Pipeline de extração por URL (será Fase 1.2)
- Brand DNA editor UI (será Fase 1.3)
- Migração de dados visuais (paletas, logos) — manter em JSON dentro de BrandDnaSnapshot

---

## 4. Arquitetura

### 4.1 Diagrama de Migração

```
┌─────────────────────────────────────────────────────────────┐
│                    ESTADO ATUAL (antes)                      │
│                                                              │
│  Organization.description (JSON String)                      │
│    ├── __type: "company_profiles_v2"                         │
│    ├── selectedCompanyId: "abc-123"                          │
│    └── companies: [                                          │
│          { id, companyName, website, industry, ... }         │
│        ]                                                     │
│                                                              │
│  OrganizationService.parseCompanyProfiles()                  │
│    └── JSON.parse(description) → CompanyProfile[]            │
└─────────────────────────────────────────────────────────────┘

                           ↓ MIGRAÇÃO ↓

┌─────────────────────────────────────────────────────────────┐
│                    ESTADO FINAL (depois)                      │
│                                                              │
│  BrandProfile (tabela dedicada)                              │
│    ├── id, organizationId, name, website, industry           │
│    ├── status: ACTIVE                                        │
│    ├── selected: true/false                                  │
│    └── deletedAt: null                                       │
│                                                              │
│  BrandDnaSnapshot (histórico versionado)                     │
│    ├── brandProfileId → BrandProfile                         │
│    ├── version: 1, 2, 3...                                   │
│    ├── summary, voice, audience, offer, visual, constraints  │
│    └── confidence: { ... }                                   │
│                                                              │
│  BrandAsset (assets vinculados)                              │
│    ├── brandProfileId → BrandProfile                         │
│    ├── type: "logo" | "palette" | "font" | "image"           │
│    ├── mediaId → Media (se existir)                          │
│    └── approved: true/false                                  │
│                                                              │
│  Organization.description (VOLÁVEL durante transição)        │
│    └── Mantido por 30 dias, depois pode ser limpo            │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Fluxo de Leitura (Dual-Read)

```
1. BrandProfileService.getBrandProfile(orgId, brandId)
   ├── Busca no Prisma: BrandProfile WHERE id=brandId AND organizationId=orgId
   ├── Se ENCONTRA: retorna BrandProfile (fonte primária)
   └── Se NÃO encontra (legacy): 
       ├── OrganizationService.parseCompanyProfiles(orgId)
       ├── Converte CompanyProfile → BrandProfile (formato)
       └── Retorna com flag _isLegacy: true

2. BrandProfileService.getSelectedBrand(orgId)
   ├── Busca no Prisma: BrandProfile WHERE organizationId=orgId AND selected=true
   ├── Se ENCONTRA: retorna BrandProfile selecionada
   └── Se NÃO encontra:
       ├── OrganizationService.parseCompanyProfiles(orgId)
       ├── Busca selectedCompanyId no JSON
       └── Retorna CompanyProfile selecionada (formato compatível)
```

### 4.3 Fluxo de Escrita (Dual-Write)

```
1. BrandProfileService.createBrandProfile(orgId, data)
   ├── Cria BrandProfile no Prisma
   ├── Cria BrandDnaSnapshot v1 (se dados fornecidos)
   └── SE transição ativa:
       ├── Atualiza Organization.description com JSON v2
       └── Adiciona nova CompanyProfile ao array

2. BrandProfileService.updateBrandProfile(orgId, brandId, data)
   ├── Atualiza BrandProfile no Prisma
   └── SE transição ativa:
       ├── Atualiza Organization.description
       └── Sincroniza dados no JSON v2
```

---

## 5. Implementação Detalhada

### 5.1 Arquivos a Criar

| Arquivo | Caminho | Responsabilidade |
|---------|---------|-----------------|
| `brand-profile.repository.ts` | `libraries/nestjs-libraries/src/database/prisma/brand-profiles/brand-profile.repository.ts` | Queries Prisma |
| `brand-profile.service.ts` | `libraries/nestjs-libraries/src/database/prisma/brand-profiles/brand-profile.service.ts` | Lógica de negócio |
| `brand-profile.module.ts` | `libraries/nestjs-libraries/src/database/prisma/brand-profiles/brand-profile.module.ts` | Módulo NestJS |
| `brand-dna.service.ts` | `libraries/nestjs-libraries/src/database/prisma/brand-profiles/brand-dna.service.ts` | Snapshots de DNA |
| `brand-asset.service.ts` | `libraries/nestjs-libraries/src/database/prisma/brand-profiles/brand-asset.service.ts` | Assets da marca |
| `legacy-adapter.ts` | `libraries/nestjs-libraries/src/database/prisma/brand-profiles/legacy-adapter.ts` | Adapter CompanyProfile → BrandProfile |
| `migrate-legacy.ts` | `scripts/migrate-legacy.ts` | Script de migração |

### 5.2 Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `organization.service.ts` | Adicionar dual-write para BrandProfile |
| `organization.repository.ts` | Adicionar dual-read com fallback |
| `brands.controller.ts` | Integrar com BrandProfileService completo |
| `api.module.ts` | Registrar BrandProfileModule |

### 5.3 Detalhamento por Arquivo

#### 5.3.1 `legacy-adapter.ts`

```typescript
// Caminho: libraries/nestjs-libraries/src/database/prisma/brand-profiles/legacy-adapter.ts

/**
 * Adapter para converter CompanyProfile (JSON em Organization.description)
 * para o formato BrandProfile (tabela dedicada).
 * 
 * Suporta:
 * - company_profile_v1 (perfil único legado)
 * - company_profiles_v2 (coleção de perfis)
 */

export interface LegacyCompanyProfile {
  id: string;
  companyName: string;
  website?: string;
  industry?: string;
  targetAudience?: string;
  productsOrServices?: string;
  differentials?: string;
  toneOfVoice?: string;
  summary?: string;
  visualIdentitySummary?: string;
  brandColors?: string;
  brandFonts?: string;
  defaultCta?: string;
  forbiddenTerms?: string;
  contentPreferences?: string;
  visualIdentityAssets?: any[];
  brandPalettes?: any[];
  brandFontPresets?: any[];
  brandLogos?: any[];
  styleRules?: any[];
  inspirationLibrary?: any[];
  ideasLibrary?: any[];
  updatedAt?: string;
}

export interface LegacyPayload {
  __type: string;
  selectedCompanyId?: string;
  companies?: LegacyCompanyProfile[];
  // v1 fields
  id?: string;
  companyName?: string;
}

export class LegacyAdapter {
  /**
   * Parsear Organization.description para CompanyProfile[]
   */
  static parse(rawDescription: string | null): {
    companies: LegacyCompanyProfile[];
    selectedCompanyId: string;
  } {
    if (!rawDescription || !rawDescription.trim()) {
      return { companies: [], selectedCompanyId: '' };
    }

    try {
      const parsed = JSON.parse(rawDescription) as LegacyPayload;

      // Formato v2 (atual)
      if (parsed.__type === 'company_profiles_v2' && Array.isArray(parsed.companies)) {
        const companies = parsed.companies.map((c) => this.normalizeCompany(c));
        return {
          companies,
          selectedCompanyId: parsed.selectedCompanyId || companies[0]?.id || '',
        };
      }

      // Formato v1 (legado - perfil único)
      if (parsed.__type === 'company_profile_v1' && parsed.companyName) {
        const company = this.normalizeCompany(parsed as any);
        return {
          companies: [company],
          selectedCompanyId: company.id,
        };
      }

      // Formato desconhecido
      console.warn('Unknown CompanyProfile format:', parsed.__type);
      return { companies: [], selectedCompanyId: '' };
    } catch (error) {
      console.error('Failed to parse CompanyProfile:', error);
      return { companies: [], selectedCompanyId: '' };
    }
  }

  /**
   * Converter CompanyProfile → BrandProfile (formato Prisma)
   */
  static toBrandProfile(
    company: LegacyCompanyProfile,
    orgId: string
  ): {
    name: string;
    website: string | null;
    industry: string | null;
    selected: boolean;
  } {
    return {
      name: company.companyName || 'Marca sem nome',
      website: company.website || null,
      industry: company.industry || null,
      selected: false, // será definido pelo service
    };
  }

  /**
   * Converter CompanyProfile → BrandDnaSnapshot (formato Prisma)
   */
  static toDnaSnapshot(
    company: LegacyCompanyProfile,
    version: number = 1
  ): {
    sourceType: string;
    summary: any;
    voice: any;
    audience: any;
    offer: any;
    visual: any;
    constraints: any;
    confidence: any;
    promptVersion: string;
    model: string;
  } {
    return {
      sourceType: 'legacy_migration',
      summary: {
        companyName: company.companyName,
        industry: company.industry,
        productsOrServices: company.productsOrServices,
        differentials: company.differentials,
        summary: company.summary,
      },
      voice: {
        toneOfVoice: company.toneOfVoice,
        defaultCta: company.defaultCta,
        forbiddenTerms: company.forbiddenTerms
          ? company.forbiddenTerms.split(',').map((t) => t.trim())
          : [],
      },
      audience: {
        targetAudience: company.targetAudience,
      },
      offer: {
        contentPreferences: company.contentPreferences,
      },
      visual: {
        visualIdentitySummary: company.visualIdentitySummary,
        brandColors: company.brandColors
          ? company.brandColors.split(',').map((c) => c.trim())
          : [],
        brandFonts: company.brandFonts
          ? company.brandFonts.split(',').map((f) => f.trim())
          : [],
      },
      constraints: {
        styleRules: company.styleRules || [],
        forbiddenTerms: company.forbiddenTerms,
      },
      confidence: null, // Dados legados não têm confidence
      promptVersion: 'legacy',
      model: 'legacy_migration',
    };
  }

  /**
   * Converter CompanyProfile → BrandAsset[]
   */
  static toAssets(company: LegacyCompanyProfile): Array<{
    type: string;
    metadata: any;
    approved: boolean;
  }> {
    const assets: Array<{ type: string; metadata: any; approved: boolean }> = [];

    // Logos
    if (company.brandLogos?.length) {
      for (const logo of company.brandLogos) {
        assets.push({
          type: 'logo',
          metadata: { name: logo.name, dataUrl: logo.dataUrl, usage: logo.usage },
          approved: true,
        });
      }
    }

    // Paletas
    if (company.brandPalettes?.length) {
      for (const palette of company.brandPalettes) {
        assets.push({
          type: 'palette',
          metadata: { name: palette.name, colors: palette.colors, usage: palette.usage },
          approved: true,
        });
      }
    }

    // Fontes
    if (company.brandFontPresets?.length) {
      for (const font of company.brandFontPresets) {
        assets.push({
          type: 'font',
          metadata: { name: font.name, headline: font.headline, body: font.body, usage: font.usage },
          approved: true,
        });
      }
    }

    // Assets visuais
    if (company.visualIdentityAssets?.length) {
      for (const asset of company.visualIdentityAssets) {
        assets.push({
          type: 'image',
          metadata: { name: asset.name, type: asset.type, dataUrl: asset.dataUrl, description: asset.description },
          approved: true,
        });
      }
    }

    // Inspirações
    if (company.inspirationLibrary?.length) {
      for (const inspiration of company.inspirationLibrary) {
        assets.push({
          type: 'inspiration',
          metadata: {
            name: inspiration.name,
            src: inspiration.src,
            source: inspiration.source,
            category: inspiration.category,
            favorite: inspiration.favorite,
            approved: inspiration.approved,
          },
          approved: inspiration.approved || false,
        });
      }
    }

    return assets;
  }

  /**
   * Normalizar CompanyProfile (garantir campos obrigatórios)
   */
  private static normalizeCompany(
    company: Partial<LegacyCompanyProfile>
  ): LegacyCompanyProfile {
    return {
      id: company.id || `legacy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      companyName: company.companyName || 'Marca sem nome',
      website: company.website,
      industry: company.industry,
      targetAudience: company.targetAudience,
      productsOrServices: company.productsOrServices,
      differentials: company.differentials,
      toneOfVoice: company.toneOfVoice,
      summary: company.summary,
      visualIdentitySummary: company.visualIdentitySummary,
      brandColors: company.brandColors,
      brandFonts: company.brandFonts,
      defaultCta: company.defaultCta,
      forbiddenTerms: company.forbiddenTerms,
      contentPreferences: company.contentPreferences,
      visualIdentityAssets: company.visualIdentityAssets || [],
      brandPalettes: company.brandPalettes || [],
      brandFontPresets: company.brandFontPresets || [],
      brandLogos: company.brandLogos || [],
      styleRules: company.styleRules || [],
      inspirationLibrary: company.inspirationLibrary || [],
      ideasLibrary: company.ideasLibrary || [],
      updatedAt: company.updatedAt,
    };
  }
}
```

#### 5.3.2 `brand-profile.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BrandProfile, Prisma } from '@prisma/client';

@Injectable()
export class BrandProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criar BrandProfile
   */
  async create(data: {
    organizationId: string;
    name: string;
    website?: string;
    industry?: string;
    selected?: boolean;
  }): Promise<BrandProfile> {
    return this.prisma.brandProfile.create({ data });
  }

  /**
   * Buscar BrandProfile por ID
   */
  async findById(orgId: string, id: string): Promise<BrandProfile | null> {
    return this.prisma.brandProfile.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
    });
  }

  /**
   * Buscar BrandProfile selecionada
   */
  async findSelected(orgId: string): Promise<BrandProfile | null> {
    return this.prisma.brandProfile.findFirst({
      where: { organizationId: orgId, selected: true, deletedAt: null },
    });
  }

  /**
   * Listar BrandProfiles de uma organização
   */
  async findByOrg(orgId: string): Promise<BrandProfile[]> {
    return this.prisma.brandProfile.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: [{ selected: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Atualizar BrandProfile
   */
  async update(
    id: string,
    data: Prisma.BrandProfileUpdateInput
  ): Promise<BrandProfile> {
    return this.prisma.brandProfile.update({ where: { id }, data });
  }

  /**
   * Soft delete BrandProfile
   */
  async softDelete(id: string): Promise<BrandProfile> {
    return this.prisma.brandProfile.update({
      where: { id },
      data: { deletedAt: new Date(), selected: false },
    });
  }

  /**
   * Selecionar BrandProfile (desselecionar todas as outras)
   */
  async select(orgId: string, brandId: string): Promise<void> {
    await this.prisma.$transaction([
      // Desselecionar todas
      this.prisma.brandProfile.updateMany({
        where: { organizationId: orgId, selected: true },
        data: { selected: false },
      }),
      // Selecionar a escolhida
      this.prisma.brandProfile.update({
        where: { id: brandId },
        data: { selected: true },
      }),
    ]);
  }

  /**
   * Contar BrandProfiles ativas
   */
  async countActive(orgId: string): Promise<number> {
    return this.prisma.brandProfile.count({
      where: { organizationId: orgId, deletedAt: null },
    });
  }
}
```

#### 5.3.3 `brand-profile.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { BrandProfileRepository } from './brand-profile.repository';
import { BrandDnaService } from './brand-dna.service';
import { BrandAssetService } from './brand-asset.service';
import { LegacyAdapter, LegacyCompanyProfile } from './legacy-adapter';
import { OrganizationService } from '../organizations/organization.service';
import { BrandProfile } from '@prisma/client';

@Injectable()
export class BrandProfileService {
  private readonly logger = new Logger(BrandProfileService.name);

  constructor(
    private readonly repo: BrandProfileRepository,
    private readonly dnaService: BrandDnaService,
    private readonly assetService: BrandAssetService,
    private readonly orgService: OrganizationService
  ) {}

  /**
   * Criar BrandProfile
   */
  async create(params: {
    organizationId: string;
    name: string;
    website?: string;
    industry?: string;
    select?: boolean;
  }): Promise<BrandProfile> {
    // Verificar limite de marcas por plano
    const count = await this.repo.countActive(params.organizationId);
    const limit = this.getBrandLimit(params.organizationId); // TODO: buscar do plano
    if (count >= limit) {
      throw new Error(`Limite de ${limit} marcas atingido. Faça upgrade para criar mais.`);
    }

    const brand = await this.repo.create({
      organizationId: params.organizationId,
      name: params.name,
      website: params.website,
      industry: params.industry,
      selected: params.select ?? count === 0, // Primeira marca é selecionada automaticamente
    });

    // Se selecionada, desselecionar outras
    if (brand.selected) {
      await this.repo.select(params.organizationId, brand.id);
    }

    this.logger.log(`BrandProfile created: ${brand.id} for org ${params.organizationId}`);
    return brand;
  }

  /**
   * Buscar BrandProfile por ID (com fallback legado)
   */
  async findById(orgId: string, id: string): Promise<BrandProfile | null> {
    // 1. Buscar no Prisma
    const brand = await this.repo.findById(orgId, id);
    if (brand) return brand;

    // 2. Fallback: buscar no JSON legado
    return this.findFromLegacy(orgId, id);
  }

  /**
   * Buscar BrandProfile selecionada (com fallback legado)
   */
  async findSelected(orgId: string): Promise<BrandProfile | null> {
    // 1. Buscar no Prisma
    const brand = await this.repo.findSelected(orgId);
    if (brand) return brand;

    // 2. Fallback: buscar no JSON legado
    const legacy = await this.findSelectedFromLegacy(orgId);
    return legacy;
  }

  /**
   * Listar BrandProfiles (com inclusão de legado)
   */
  async findByOrg(orgId: string): Promise<BrandProfile[]> {
    // 1. Buscar no Prisma
    const brands = await this.repo.findByOrg(orgId);

    // 2. Se não há marcas no Prisma, incluir legado
    if (brands.length === 0) {
      const legacy = await this.findAllFromLegacy(orgId);
      return legacy;
    }

    return brands;
  }

  /**
   * Atualizar BrandProfile
   */
  async update(
    orgId: string,
    id: string,
    data: { name?: string; website?: string; industry?: string }
  ): Promise<BrandProfile> {
    const brand = await this.repo.findById(orgId, id);
    if (!brand) throw new Error('BrandProfile not found');

    const updated = await this.repo.update(id, data);

    // Dual-write: atualizar JSON legado se existir
    await this.syncToLegacy(orgId, id, data);

    return updated;
  }

  /**
   * Soft delete BrandProfile
   */
  async softDelete(orgId: string, id: string): Promise<void> {
    const brand = await this.repo.findById(orgId, id);
    if (!brand) throw new Error('BrandProfile not found');

    // Não deletar se é a única marca
    const count = await this.repo.countActive(orgId);
    if (count <= 1) {
      throw new Error('Cannot delete the last brand. Create another brand first.');
    }

    await this.repo.softDelete(id);

    // Se era a selecionada, selecionar outra
    if (brand.selected) {
      const remaining = await this.repo.findByOrg(orgId);
      if (remaining.length > 0) {
        await this.repo.select(orgId, remaining[0].id);
      }
    }
  }

  /**
   * Selecionar BrandProfile
   */
  async select(orgId: string, brandId: string): Promise<void> {
    const brand = await this.repo.findById(orgId, brandId);
    if (!brand) throw new Error('BrandProfile not found');

    await this.repo.select(orgId, brandId);
  }

  // ==================== MÉTODOS DE MIGRAÇÃO ====================

  /**
   * Migrar CompanyProfile legado para BrandProfile
   * Chamado pelo script de migração ou sob demanda
   */
  async migrateFromLegacy(orgId: string): Promise<{
    migrated: number;
    skipped: number;
    errors: string[];
  }> {
    const org = await this.orgService.getOrganization(orgId);
    if (!org) throw new Error('Organization not found');

    const { companies, selectedCompanyId } = LegacyAdapter.parse(org.description);

    if (companies.length === 0) {
      return { migrated: 0, skipped: 0, errors: [] };
    }

    const results = { migrated: 0, skipped: 0, errors: [] as string[] };

    for (const company of companies) {
      try {
        // Verificar se já existe (por nome)
        const existing = await this.findByName(orgId, company.companyName);
        if (existing) {
          results.skipped++;
          continue;
        }

        // Criar BrandProfile
        const brand = await this.create({
          organizationId: orgId,
          name: company.companyName,
          website: company.website,
          industry: company.industry,
          select: company.id === selectedCompanyId,
        });

        // Criar BrandDnaSnapshot
        const snapshot = LegacyAdapter.toDnaSnapshot(company, 1);
        await this.dnaService.createSnapshot(brand.id, snapshot);

        // Criar BrandAssets
        const assets = LegacyAdapter.toAssets(company);
        for (const asset of assets) {
          await this.assetService.create(brand.id, asset);
        }

        results.migrated++;
        this.logger.log(`Migrated company "${company.companyName}" to BrandProfile ${brand.id}`);
      } catch (error) {
        results.errors.push(`Failed to migrate "${company.companyName}": ${error}`);
      }
    }

    return results;
  }

  /**
   * Buscar BrandProfile por nome
   */
  private async findByName(orgId: string, name: string): Promise<BrandProfile | null> {
    const brands = await this.repo.findByOrg(orgId);
    return brands.find((b) => b.name === name) || null;
  }

  /**
   * Buscar no JSON legado por ID
   */
  private async findFromLegacy(orgId: string, legacyId: string): Promise<BrandProfile | null> {
    const org = await this.orgService.getOrganization(orgId);
    if (!org?.description) return null;

    const { companies } = LegacyAdapter.parse(org.description);
    const company = companies.find((c) => c.id === legacyId);
    if (!company) return null;

    // Converter e retornar como BrandProfile
    return this.convertLegacyToBrandProfile(company, orgId, false);
  }

  /**
   * Buscar selecionada no JSON legado
   */
  private async findSelectedFromLegacy(orgId: string): Promise<BrandProfile | null> {
    const org = await this.orgService.getOrganization(orgId);
    if (!org?.description) return null;

    const { companies, selectedCompanyId } = LegacyAdapter.parse(org.description);
    const company = companies.find((c) => c.id === selectedCompanyId) || companies[0];
    if (!company) return null;

    return this.convertLegacyToBrandProfile(company, orgId, true);
  }

  /**
   * Listar todas no JSON legado
   */
  private async findAllFromLegacy(orgId: string): Promise<BrandProfile[]> {
    const org = await this.orgService.getOrganization(orgId);
    if (!org?.description) return [];

    const { companies, selectedCompanyId } = LegacyAdapter.parse(org.description);
    return companies.map((c) =>
      this.convertLegacyToBrandProfile(c, orgId, c.id === selectedCompanyId)
    );
  }

  /**
   * Converter CompanyProfile legado para formato BrandProfile
   */
  private convertLegacyToBrandProfile(
    company: LegacyCompanyProfile,
    orgId: string,
    selected: boolean
  ): BrandProfile {
    const data = LegacyAdapter.toBrandProfile(company, orgId);
    return {
      id: company.id,
      organizationId: orgId,
      name: data.name,
      website: data.website,
      industry: data.industry,
      status: 'ACTIVE',
      selected,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as BrandProfile;
  }

  /**
   * Sincronizar atualização para JSON legado
   */
  private async syncToLegacy(
    orgId: string,
    brandId: string,
    data: { name?: string; website?: string; industry?: string }
  ): Promise<void> {
    // TODO: implementar dual-write durante período de transição
    // Por enquanto, apenas log
    this.logger.debug(`Sync to legacy: org=${orgId}, brand=${brandId}`);
  }

  /**
   * Limite de marcas por plano
   */
  private getBrandLimit(orgId: string): number {
    // TODO: buscar do Subscription
    return 5; // Padrão
  }
}
```

#### 5.3.4 `brand-dna.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BrandDnaSnapshot } from '@prisma/client';

@Injectable()
export class BrandDnaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criar snapshot de Brand DNA
   */
  async createSnapshot(
    brandProfileId: string,
    data: {
      sourceType: string;
      sourceUrl?: string;
      summary: any;
      voice: any;
      audience: any;
      offer: any;
      visual: any;
      constraints: any;
      confidence?: any;
      promptVersion: string;
      model: string;
    }
  ): Promise<BrandDnaSnapshot> {
    // Determinar próxima versão
    const lastSnapshot = await this.prisma.brandDnaSnapshot.findFirst({
      where: { brandProfileId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (lastSnapshot?.version || 0) + 1;

    return this.prisma.brandDnaSnapshot.create({
      data: {
        brandProfileId,
        version: nextVersion,
        ...data,
      },
    });
  }

  /**
   * Buscar snapshots de uma marca
   */
  async findByBrand(brandProfileId: string): Promise<BrandDnaSnapshot[]> {
    return this.prisma.brandDnaSnapshot.findMany({
      where: { brandProfileId },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Buscar último snapshot
   */
  async findLatest(brandProfileId: string): Promise<BrandDnaSnapshot | null> {
    return this.prisma.brandDnaSnapshot.findFirst({
      where: { brandProfileId },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * Buscar snapshot por versão
   */
  async findByVersion(
    brandProfileId: string,
    version: number
  ): Promise<BrandDnaSnapshot | null> {
    return this.prisma.brandDnaSnapshot.findFirst({
      where: { brandProfileId, version },
    });
  }
}
```

#### 5.3.5 `brand-asset.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BrandAsset } from '@prisma/client';

@Injectable()
export class BrandAssetService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Criar asset
   */
  async create(
    brandProfileId: string,
    data: {
      type: string;
      mediaId?: string;
      sourceUrl?: string;
      metadata?: any;
      approved?: boolean;
    }
  ): Promise<BrandAsset> {
    return this.prisma.brandAsset.create({
      data: {
        brandProfileId,
        ...data,
      },
    });
  }

  /**
   * Buscar assets de uma marca
   */
  async findByBrand(
    brandProfileId: string,
    type?: string
  ): Promise<BrandAsset[]> {
    const where: any = { brandProfileId, deletedAt: null };
    if (type) where.type = type;

    return this.prisma.brandAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Aprovar asset
   */
  async approve(id: string): Promise<BrandAsset> {
    return this.prisma.brandAsset.update({
      where: { id },
      data: { approved: true },
    });
  }

  /**
   * Soft delete asset
   */
  async softDelete(id: string): Promise<BrandAsset> {
    return this.prisma.brandAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
```

### 5.4 Script de Migração (`scripts/migrate-legacy.ts`)

```typescript
#!/usr/bin/env npx ts-node
/**
 * Script de migração: CompanyProfile (JSON) → BrandProfile (tabela)
 * 
 * Uso: npx ts-node scripts/migrate-legacy.ts [--dry-run] [--org-id=xxx]
 * 
 * Flags:
 *   --dry-run    Simula a migração sem escrever no banco
 *   --org-id     Migra apenas uma organização específica
 */

import { PrismaClient } from '@prisma/client';
import { LegacyAdapter } from '../libraries/nestjs-libraries/src/database/prisma/brand-profiles/legacy-adapter';

const prisma = new PrismaClient();

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const orgIdArg = process.argv.find((a) => a.startsWith('--org-id='));
  const targetOrgId = orgIdArg?.split('=')[1];

  console.log('=== CompanyProfile → BrandProfile Migration ===');
  console.log(`Dry run: ${dryRun}`);
  console.log(`Target org: ${targetOrgId || 'ALL'}`);
  console.log('');

  // Buscar organizações com CompanyProfile no description
  const orgs = await prisma.organization.findMany({
    where: {
      description: { not: null },
      ...(targetOrgId ? { id: targetOrgId } : {}),
    },
    select: { id: name, description: true },
  });

  console.log(`Found ${orgs.length} organizations with CompanyProfile data`);

  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const org of orgs) {
    console.log(`\nProcessing org: ${org.id}`);

    const { companies, selectedCompanyId } = LegacyAdapter.parse(org.description);

    if (companies.length === 0) {
      console.log('  No companies found, skipping');
      continue;
    }

    console.log(`  Found ${companies.length} companies`);

    // Verificar se já migrou
    const existingBrands = await prisma.brandProfile.findMany({
      where: { organizationId: org.id, deletedAt: null },
    });

    if (existingBrands.length > 0) {
      console.log(`  Already has ${existingBrands.length} BrandProfiles, skipping`);
      totalSkipped += companies.length;
      continue;
    }

    for (const company of companies) {
      try {
        console.log(`  Migrating: "${company.companyName}"`);

        if (dryRun) {
          console.log(`    [DRY RUN] Would create BrandProfile for "${company.companyName}"`);
          totalMigrated++;
          continue;
        }

        // Criar BrandProfile
        const brand = await prisma.brandProfile.create({
          data: {
            organizationId: org.id,
            name: company.companyName,
            website: company.website,
            industry: company.industry,
            status: 'ACTIVE',
            selected: company.id === selectedCompanyId,
          },
        });

        // Criar BrandDnaSnapshot
        const snapshot = LegacyAdapter.toDnaSnapshot(company, 1);
        await prisma.brandDnaSnapshot.create({
          data: {
            brandProfileId: brand.id,
            version: 1,
            ...snapshot,
          },
        });

        // Criar BrandAssets
        const assets = LegacyAdapter.toAssets(company);
        for (const asset of assets) {
          await prisma.brandAsset.create({
            data: {
              brandProfileId: brand.id,
              ...asset,
            },
          });
        }

        console.log(`    ✓ Created BrandProfile ${brand.id} with ${assets.length} assets`);
        totalMigrated++;
      } catch (error) {
        console.error(`    ✗ Error: ${error}`);
        totalErrors++;
      }
    }
  }

  console.log('\n=== Migration Complete ===');
  console.log(`Migrated: ${totalMigrated}`);
  console.log(`Skipped: ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);

  if (!dryRun && totalMigrated > 0) {
    console.log('\n⚠️  Legacy data preserved in Organization.description');
    console.log('   Remove after 30 days of successful operation');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 6. Tratamento de Erros

| Erro | Causa | Ação |
|------|-------|------|
| **Limite de marcas** | Org já tem N marcas | Retornar 403 com mensagem de upgrade |
| **Marca não encontrada** | ID inválido ou deletada | Retornar 404 |
| **Última marca** | Tentativa de deletar a única | Retornar 400 com mensagem |
| **Dados legados corrompidos** | JSON inválido no description | Logar erro, retornar lista vazia |
| **Duplicata durante migração** | Mesmo nome já existe | Pular e registrar |

---

## 7. Edge Cases

| Caso | Comportamento Esperado |
|------|----------------------|
| **Org sem CompanyProfile** | Cria BrandProfile manualmente |
| **Org com 2 formatos legados (v1 e v2)** | Adapter detecta e converte corretamente |
| **Migração roda 2x** | Idempotente: pula orgs que já têm BrandProfiles |
| **Dual-write: escrita simultânea** | Prisma transação garante consistência |
| **Dual-read: BrandProfile não existe** | Fallback para JSON legado |
| **Cleanup: JSON removido prematuramente** | BrandProfile continua funcionando |

---

## 8. Critérios de Aceite

- [ ] `BrandProfileService.create()` cria no Prisma
- [ ] `BrandProfileService.findById()` busca no Prisma com fallback legado
- [ ] `BrandProfileService.findSelected()` retorna selecionada (Prisma ou legado)
- [ ] `BrandProfileService.findByOrg()` lista todas (Prisma + legado)
- [ ] `BrandProfileService.update()` atualiza e sincroniza com legado
- [ ] `BrandProfileService.softDelete()` não deleta a última marca
- [ ] `BrandProfileService.select()` desseleciona outras automaticamente
- [ ] `LegacyAdapter.parse()` converte v1 e v2 corretamente
- [ ] Script de migração `--dry-run` mostra o que seria feito
- [ ] Script de migração cria BrandProfile + Snapshot + Assets
- [ ] Script de migração é idempotente (pula orgs já migradas)
- [ ] Teste unitário: LegacyAdapter com v1, v2 e dados vazios
- [ ] Teste unitário: BrandProfileService com mocks
- [ ] Teste de integração: migração completa

---

## 9. Checklist de Implementação

### Schema
- [ ] Verificar que BrandProfile, BrandDnaSnapshot, BrandAsset existem
- [ ] Verificar que migrations foram aplicadas

### Backend
- [ ] Criar `legacy-adapter.ts`
- [ ] Criar `brand-profile.repository.ts`
- [ ] Criar `brand-profile.service.ts`
- [ ] Criar `brand-dna.service.ts`
- [ ] Criar `brand-asset.service.ts`
- [ ] Criar `brand-profile.module.ts`
- [ ] Modificar `brands.controller.ts` para usar novo service
- [ ] Modificar `api.module.ts` para registrar módulo

### Migração
- [ ] Criar `scripts/migrate-legacy.ts`
- [ ] Testar `--dry-run` em ambiente de dev
- [ ] Rodar migração em ambiente de staging
- [ ] Verificar dados migrados

### Testes
- [ ] Unit: LegacyAdapter.parse() v1, v2, vazio
- [ ] Unit: LegacyAdapter.toBrandProfile()
- [ ] Unit: LegacyAdapter.toDnaSnapshot()
- [ ] Unit: BrandProfileService.create() com limite
- [ ] Unit: BrandProfileService.softDelete() última marca
- [ ] Integration: migração completa

### Deploy
- [ ] Feature flag: `USE_BRAND_PROFILE_TABLE=true` (default: false)
- [ ] Rollback: se flag=false, usar JSON legado
- [ ] Monitorar: logs de migração, erros

---

## 10. Decisões de Projeto

| Decisão | Opção Escolhida | Justificativa |
|---------|----------------|---------------|
| **Migração** | Script idempotente | Seguro para rodar múltiplas vezes |
| **Dual-write** | Ativo durante 30 dias | Permite rollback suave |
| **Dual-read** | Fallback automático | Transição transparente |
| **Soft delete** | Obligatório | Preserva histórico |
| **Seleção** | Exclusiva (1 por org) | Simplifica contexto |
| **Snapshot** | Versionado | Histórico de alterações |
| **Assets** | No banco (não em JSON) | Consultáveis, auditáveis |

---

## 11. Próximas Subfases Dependentes

- **Fase 1.2**: Pipeline de extração por URL (usará BrandDnaService)
- **Fase 1.3**: Brand DNA editor (usará BrandProfileService)
- **Fase 1.4**: Multi-brand real (usará seletor de marca)
- **Fase 2.1**: Onboarding (usará BrandProfile + DNA)
- **Fase 2.2**: Content Swipe (usará BrandProfileId)
