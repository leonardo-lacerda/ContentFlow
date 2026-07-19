import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'fs';
import { designSystemDataPath } from '../paths';
import type {
  DesignDirection,
  DesignFontPairing,
  DesignPalette,
  DesignSize,
  DesignTemplateMeta,
} from '../types/design-system.types';

type JsonBag = Record<string, unknown>;

@Injectable()
export class DesignSystemCatalogService implements OnModuleInit {
  private readonly logger = new Logger(DesignSystemCatalogService.name);

  private palettes: DesignPalette[] = [];
  private fonts: DesignFontPairing[] = [];
  private directions: DesignDirection[] = [];
  private templates: DesignTemplateMeta[] = [];
  private sizes: DesignSize[] = [];
  private motifs: Array<{ id: string; name?: string; tags?: string[] }> = [];
  private loaded = false;

  onModuleInit() {
    this.reload();
  }

  reload() {
    this.palettes = this.readArray<DesignPalette>('palettes.json', 'palettes');
    this.fonts = this.readArray<DesignFontPairing>('fonts.json', 'fonts');
    this.directions = this.readArray<DesignDirection>(
      'directions.json',
      'directions'
    );
    this.templates = this.readArray<DesignTemplateMeta>(
      'templates.json',
      'templates'
    );
    this.sizes = this.readArray<DesignSize>('sizes.json', 'sizes');
    const motifsRaw = this.readJson('motifs.json');
    this.motifs = Array.isArray(motifsRaw?.motifs)
      ? (motifsRaw.motifs as typeof this.motifs)
      : Array.isArray(motifsRaw)
        ? (motifsRaw as typeof this.motifs)
        : [];
    this.loaded = true;
    this.logger.log(
      `Catalog loaded: ${this.palettes.length} palettes, ${this.fonts.length} fonts, ${this.directions.length} directions, ${this.templates.length} templates, ${this.sizes.length} sizes`
    );
  }

  isEnabled(): boolean {
    const flag = process.env.DESIGN_SYSTEM_ENABLED;
    if (flag === undefined || flag === '') {
      return true;
    }
    return !['0', 'false', 'off', 'no'].includes(flag.toLowerCase());
  }

  getSummary() {
    this.ensureLoaded();
    return {
      enabled: this.isEnabled(),
      attribution: 'xniper-social-studio@MIT',
      counts: {
        palettes: this.palettes.length,
        fonts: this.fonts.length,
        directions: this.directions.length,
        templates: this.templates.length,
        sizes: this.sizes.length,
        motifs: this.motifs.length,
      },
      defaultSizeId: 'ig-portrait',
      defaultPaletteId: 'ocean-deep',
      defaultFontId: 'archivo-figtree',
    };
  }

  getCatalog() {
    this.ensureLoaded();
    return {
      ...this.getSummary(),
      palettes: this.palettes,
      fonts: this.fonts,
      directions: this.directions.map((d) => ({
        id: d.id,
        name: d.name,
        tags: d.tags,
        vibe: d.vibe,
        example_palettes: d.example_palettes,
        example_fonts: d.example_fonts,
        motifs: d.motifs,
      })),
      templates: this.templates,
      sizes: this.sizes,
    };
  }

  listPalettes() {
    this.ensureLoaded();
    return this.palettes;
  }

  listFonts() {
    this.ensureLoaded();
    return this.fonts;
  }

  listDirections() {
    this.ensureLoaded();
    return this.directions;
  }

  listTemplates() {
    this.ensureLoaded();
    return this.templates;
  }

  listSizes() {
    this.ensureLoaded();
    return this.sizes;
  }

  getPalette(id: string): DesignPalette | undefined {
    return this.listPalettes().find((p) => p.id === id);
  }

  getFont(id: string): DesignFontPairing | undefined {
    return this.listFonts().find((f) => f.id === id);
  }

  getDirection(id: string): DesignDirection | undefined {
    return this.listDirections().find((d) => d.id === id);
  }

  getTemplate(id: string): DesignTemplateMeta | undefined {
    return this.listTemplates().find((t) => t.id === id);
  }

  getSize(id: string): DesignSize | undefined {
    return this.listSizes().find((s) => s.id === id);
  }

  requirePalette(id: string): DesignPalette {
    const p = this.getPalette(id);
    if (!p) {
      throw new Error(`Unknown palette: ${id}`);
    }
    return p;
  }

  requireFont(id: string): DesignFontPairing {
    const f = this.getFont(id);
    if (!f) {
      throw new Error(`Unknown font pairing: ${id}`);
    }
    return f;
  }

  requireTemplate(id: string): DesignTemplateMeta {
    const t = this.getTemplate(id);
    if (!t) {
      throw new Error(`Unknown template: ${id}`);
    }
    return t;
  }

  requireSize(id: string): DesignSize {
    const s = this.getSize(id) || this.getSize('ig-portrait');
    if (!s) {
      throw new Error(`Unknown size: ${id}`);
    }
    return s;
  }

  private ensureLoaded() {
    if (!this.loaded) {
      this.reload();
    }
  }

  private readJson(fileName: string): JsonBag {
    const full = designSystemDataPath(fileName);
    const raw = readFileSync(full, 'utf-8');
    return JSON.parse(raw) as JsonBag;
  }

  private readArray<T>(fileName: string, key: string): T[] {
    try {
      const json = this.readJson(fileName);
      const value = json[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
      if (Array.isArray(json)) {
        return json as unknown as T[];
      }
      this.logger.warn(`Expected array at ${fileName}#${key}`);
      return [];
    } catch (error) {
      this.logger.error(
        `Failed to load ${fileName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return [];
    }
  }
}
