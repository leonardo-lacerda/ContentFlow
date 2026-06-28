import type {
  BackendTemplateDefinition,
} from './template-registry.types';
import type {
  CarouselPlan,
  CarouselSlide,
  CompanyProfile,
  CostEstimate,
  EditorialIssue,
  GeneratedImage,
  ReferenceImage,
} from './ai-generate-images.types';

export function imageSrc(image?: GeneratedImage) {
  if (!image) {
    return '';
  }

  return image.b64_json
    ? `data:image/png;base64,${image.b64_json}`
    : image.url || '';
}

export function imagePayload(image?: GeneratedImage) {
  if (!image) {
    return '';
  }

  return (
    image.url ||
    (image.b64_json ? `data:image/png;base64,${image.b64_json}` : '')
  );
}

export function formatCurrency(value: number, currency: 'USD' | 'BRL') {
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'pt-BR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 6,
  }).format(value);
}

export function sumCosts(costs: Array<CostEstimate | null | undefined>) {
  return costs.reduce(
    (acc, cost) => {
      if (!cost) {
        return acc;
      }

      return {
        usd: acc.usd + cost.usd,
        brl: acc.brl + cost.brl,
        tokens: acc.tokens + cost.tokens.totalTokens,
      };
    },
    { usd: 0, brl: 0, tokens: 0 }
  );
}

export type SlideRenderSpec = {
  // Layout/estrutura escolhida (vazio = a IA decide pelo conteúdo).
  structureLayout?: string;
  // Prompts dos presets de estilo/cor/tipografia (ignorados quando as
  // inspirações comandam o visual).
  stylePrompt?: string;
  colorPrompt?: string;
  brandColors?: string;
  typographyPrompt?: string;
  // Contexto de marca/segurança (CTA, termos proibidos, logo, estratégia).
  brief?: string;
  hasInspirations?: boolean;
  inspirationsLeadVisual?: boolean;
  // Ajuste rápido em linguagem natural escrito pelo usuário para ESTE slide
  // (ex.: "deixe o fundo mais escuro", "menos texto"). Entra como instrução de
  // alta prioridade na regeneração da imagem.
  adjustment?: string;
};

export function buildSlideImagePrompt(
  plan: CarouselPlan,
  slide: CarouselSlide,
  spec: SlideRenderSpec = {}
) {
  const {
    structureLayout,
    stylePrompt,
    colorPrompt,
    brandColors,
    typographyPrompt,
    brief,
    hasInspirations,
    inspirationsLeadVisual,
    adjustment,
  } = spec;

  const inspirationsLead = !!hasInspirations && !!inspirationsLeadVisual;

  const textBlocks = [
    slide.headline.trim() && `HEADLINE PRINCIPAL: "${slide.headline.trim()}"`,
    slide.body.trim() && `TEXTO DE APOIO: "${slide.body.trim()}"`,
    slide.cta.trim() && `CTA/SELO PEQUENO: "${slide.cta.trim()}"`,
  ]
    .filter(Boolean)
    .join('\n');

  // Conceito visual específico deste slide, vindo do briefing do carrossel.
  // É a cena/metáfora única que o plano gerou para o slide e DEVE ser
  // respeitada — não pode ser engolida pela direção criativa genérica.
  const slideConcept = slide.imagePrompt?.trim();

  const parts: Array<string | false | undefined> = [
    'Crie uma arte quadrada 1:1 para um slide de carrossel de Instagram premium.',
    'O texto abaixo deve aparecer DENTRO da imagem, com grafia exatamente igual, em portugues, sem trocar palavras, sem traduzir e sem adicionar outros textos.',
    textBlocks,
    '',
    // O QUE mostrar neste slide (briefing). Sempre presente quando existir.
    slideConcept &&
      `Conceito visual deste slide (siga fielmente o briefing): ${slideConcept}`,
    // COMO organizar: sistema de layout da Direção Criativa. Complementa o
    // conceito acima, sem substituí-lo.
    structureLayout?.trim() &&
      `Estrutura/layout do slide: ${structureLayout.trim()}`,
    // Fallback só quando não há nem conceito de slide nem estrutura definida.
    !slideConcept &&
      !structureLayout?.trim() &&
      'Estrutura do slide: arte editorial limpa, com a headline em destaque e o apoio em hierarquia clara.',
  ];

  if (inspirationsLead) {
    // Prompt curto: as imagens anexadas assumem o visual. Sem descrever
    // estilo/cor/tipografia em texto para não competir com elas.
    parts.push(
      'Estilo visual: siga FIELMENTE as imagens de referencia anexadas — composicao, enquadramento, paleta de cores, tipografia, textura, iluminacao e atmosfera. As imagens definem o visual; em caso de conflito com qualquer outra instrucao, priorize as imagens.'
    );
  } else {
    parts.push(
      stylePrompt?.trim()
        ? `Estilo visual: ${stylePrompt.trim()}`
        : `Direcao visual geral: ${plan.imageStyleGuide}`,
      colorPrompt?.trim()
        ? `Cores: ${colorPrompt.trim()}`
        : brandColors?.trim() && `Cores a respeitar: ${brandColors.trim()}.`,
      typographyPrompt?.trim() && `Tipografia: ${typographyPrompt.trim()}.`,
      hasInspirations &&
        'As imagens de referencia anexadas sao apoio de composicao e atmosfera, equilibradas com o estilo acima.'
    );
  }

  parts.push(
    brief?.trim() && `Contexto da marca e campanha: ${brief.trim()}`,
    // Ajuste do usuário é a instrução de maior prioridade: vem por último e é
    // explicitamente marcado para o modelo aplicar sobre tudo acima.
    adjustment?.trim() &&
      `AJUSTE PRIORITARIO PEDIDO PELO USUARIO (aplique sobre todas as instrucoes acima, mantendo o texto e o conceito do slide): ${adjustment.trim()}`,
    '',
    'Regras: texto perfeitamente legivel no celular, alto contraste, margens seguras, hierarquia tipografica clara e muito respiro. Nao copie marcas, logos, rostos ou elementos protegidos.'
  );

  return parts.filter(Boolean).join('\n');
}

export function getEditorialIssues(
  slides: CarouselSlide[],
  forbiddenTerms?: string,
  backendTemplate?: BackendTemplateDefinition | null,
): EditorialIssue[] {
  // Parse forbidden terms from comma/semicolon/newline-separated string
  const parsedForbidden = forbiddenTerms
    ? forbiddenTerms
        .split(/[,;\n]/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : [];

  return slides.flatMap((slide) => {
    const issues: EditorialIssue[] = [];
    const headlineLength = slide.headline.trim().length;
    const bodyLength = slide.body.trim().length;
    const combinedText = `${slide.headline} ${slide.body} ${slide.cta}`.toLowerCase();

    if (headlineLength > 78) {
      issues.push({
        slide: slide.index,
        label: 'Headline longa demais para leitura rápida no celular.',
        tone: 'danger',
      });
    }

    if (bodyLength > 150) {
      issues.push({
        slide: slide.index,
        label: 'Texto de apoio pode ficar pequeno dentro da imagem.',
        tone: 'warning',
      });
    }

    if (!slide.imagePrompt.trim()) {
      issues.push({
        slide: slide.index,
        label: 'Direção visual vazia.',
        tone: 'danger',
      });
    }

    if (
      /(garantido|milagre|100%|sem esforço|resultado certo)/i.test(
        `${slide.headline} ${slide.body}`
      )
    ) {
      issues.push({
        slide: slide.index,
        label: 'Promessa forte demais; vale revisar para soar mais confiável.',
        tone: 'warning',
      });
    }

    // --- Forbidden terms check ---
    if (parsedForbidden.length > 0) {
      for (const term of parsedForbidden) {
        if (combinedText.includes(term)) {
          issues.push({
            slide: slide.index,
            label: `Termo proibido encontrado: "${term}".`,
            tone: 'danger',
          });
        }
      }
    }

    // --- Template-specific editorial checks ---
    if (backendTemplate?.editorialChecks?.length) {
      for (const check of backendTemplate.editorialChecks) {
        const desc = (check.description || '').toLowerCase();
        const msg = check.message || check.description;

        // Headline length check per template
        if (
          desc.includes('headline') &&
          (desc.includes('curt') || desc.includes('breve') || desc.includes('máx') || desc.includes('max'))
        ) {
          const match = desc.match(/(\d+)/);
          const limit = match ? parseInt(match[1], 10) : 60;
          if (headlineLength > limit) {
            issues.push({
              slide: slide.index,
              label: `${msg} (${headlineLength}/${limit} caracteres).`,
              tone: check.severity === 'error' ? 'danger' : 'warning',
            });
          }
        }

        // Body text length check per template
        if (
          desc.includes('corpo') &&
          (desc.includes('curt') || desc.includes('breve') || desc.includes('máx') || desc.includes('max'))
        ) {
          const match = desc.match(/(\d+)/);
          const limit = match ? parseInt(match[1], 10) : 120;
          if (bodyLength > limit) {
            issues.push({
              slide: slide.index,
              label: `${msg} (${bodyLength}/${limit} caracteres).`,
              tone: check.severity === 'error' ? 'danger' : 'warning',
            });
          }
        }

        // CTA required check
        if (
          desc.includes('cta') &&
          (desc.includes('obrigatório') || desc.includes('necessário') || desc.includes('required'))
        ) {
          if (!slide.cta.trim()) {
            issues.push({
              slide: slide.index,
              label: msg,
              tone: check.severity === 'error' ? 'danger' : 'warning',
            });
          }
        }

        // No all-caps / shouting check
        if (desc.includes('maiúscul') || desc.includes('caps') || desc.includes('shout')) {
          const words = slide.headline.split(/\s+/);
          const capsWords = words.filter(
            (w) => w.length >= 3 && w === w.toUpperCase() && /[A-ZÀ-Ú]/.test(w)
          );
          if (capsWords.length >= 2) {
            issues.push({
              slide: slide.index,
              label: msg,
              tone: check.severity === 'error' ? 'danger' : 'warning',
            });
          }
        }

        // No competitor mentions
        if (desc.includes('concorrent') || desc.includes('competitor')) {
          const competitorPattern = /contra\s+(o|a|os|as)\s+\w+|vs\.?\s+\w+|versus\s+\w+/i;
          if (competitorPattern.test(combinedText)) {
            issues.push({
              slide: slide.index,
              label: msg,
              tone: check.severity === 'error' ? 'danger' : 'warning',
            });
          }
        }

        // Image prompt must contain specific visual direction keywords
        if (
          desc.includes('imagem') &&
          desc.includes('prompt') &&
          (desc.includes('direção') || desc.includes('descrição') || desc.includes('conteúdo'))
        ) {
          if (slide.imagePrompt.trim().length < 20) {
            issues.push({
              slide: slide.index,
              label: msg,
              tone: check.severity === 'error' ? 'danger' : 'warning',
            });
          }
        }
      }
    }

    return issues;
  });
}

export const compactText = (value: string, maxLength: number) => {
  const normalized = value.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
};

export const buildLimitedBrief = (
  parts: Array<string | false | undefined>,
  maxLength = 4800
) => compactText(parts.filter(Boolean).join('\n'), maxLength);

export const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

export const crc32 = (data: Uint8Array) => {
  let crc = 0xffffffff;
  data.forEach((byte) => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
};

export const writeUint16 = (view: DataView, offset: number, value: number) =>
  view.setUint16(offset, value, true);
export const writeUint32 = (view: DataView, offset: number, value: number) =>
  view.setUint32(offset, value, true);

export const createZipBlob = (files: Array<{ name: string; data: Uint8Array }>) => {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const name = encoder.encode(file.name);
    const checksum = crc32(file.data);
    const local = new Uint8Array(30 + name.length + file.data.length);
    const localView = new DataView(local.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint32(localView, 14, checksum);
    writeUint32(localView, 18, file.data.length);
    writeUint32(localView, 22, file.data.length);
    writeUint16(localView, 26, name.length);
    local.set(name, 30);
    local.set(file.data, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0);
    writeUint16(centralView, 10, 0);
    writeUint32(centralView, 16, checksum);
    writeUint32(centralView, 20, file.data.length);
    writeUint32(centralView, 24, file.data.length);
    writeUint16(centralView, 28, name.length);
    writeUint32(centralView, 42, offset);
    central.set(name, 46);
    centralParts.push(central);
    offset += local.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralSize);
  writeUint32(endView, 16, offset);

  return new Blob([...localParts, ...centralParts, end], {
    type: 'application/zip',
  });
};

export const dataUrlToBytes = (dataUrl: string) => {
  const [, base64 = ''] = dataUrl.split(',');
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const slugifyFileName = (value: string) =>
  (value || 'carrossel')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'carrossel';

export const blobToBytes = async (blob: Blob) =>
  new Uint8Array(await blob.arrayBuffer());

export const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
      type,
      quality
    );
  });

export const imageToCanvas = async (src: string, width: number, height: number) => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.crossOrigin = 'anonymous';
    element.onload = () => resolve(element);
    element.onerror = reject;
    element.src = src;
  });
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas context unavailable');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
  return canvas;
};

export const createPdfBlob = (pages: Array<{ jpeg: Uint8Array; width: number; height: number }>) => {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let position = 0;
  const add = (content: string | Uint8Array) => {
    const data = typeof content === 'string' ? encoder.encode(content) : content;
    chunks.push(data);
    position += data.length;
  };
  const startObject = (id: number) => {
    offsets[id] = position;
    add(`${id} 0 obj\n`);
  };
  const objectCount = 2 + pages.length * 3;

  add('%PDF-1.4\n');
  startObject(1);
  add(`<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  startObject(2);
  add(
    `<< /Type /Pages /Kids ${pages
      .map((_, index) => `${3 + index * 3} 0 R`)
      .join(' ')} /Count ${pages.length} >>\nendobj\n`
  );

  pages.forEach((page, index) => {
    const pageObjectId = 3 + index * 3;
    const imageObjectId = pageObjectId + 1;
    const contentObjectId = pageObjectId + 2;
    startObject(pageObjectId);
    add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /XObject << /Im${index} ${imageObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>\nendobj\n`
    );
    startObject(imageObjectId);
    add(
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`
    );
    add(page.jpeg);
    add('\nendstream\nendobj\n');
    const draw = `q\n${page.width} 0 0 ${page.height} 0 0 cm\n/Im${index} Do\nQ\n`;
    startObject(contentObjectId);
    add(`<< /Length ${encoder.encode(draw).length} >>\nstream\n${draw}endstream\nendobj\n`);
  });

  const xrefOffset = position;
  add(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`);
  for (let id = 1; id <= objectCount; id += 1) {
    add(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  add(
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );
  return new Blob(chunks, { type: 'application/pdf' });
};

export const companyBrandReferences = (company?: CompanyProfile | null) => {
  if (!company?.id) {
    return [];
  }

  const visualAssets = (company.visualIdentityAssets || [])
    .filter((asset) => asset?.dataUrl?.startsWith('data:image/'))
    .slice(0, 8)
    .map((asset) => ({
      id: `brand-${company.id}-${asset.id}`,
      name: asset.description?.trim() || asset.name || 'Identidade visual',
      src: asset.dataUrl,
      source: 'brand' as const,
      favorite: true,
      selected: false,
      approved: true,
      category: 'brand-kit',
      description: asset.description || '',
    }));

  const logoReferences = (company.brandLogos || [])
    .filter((logo) => logo?.dataUrl?.startsWith('data:image/'))
    .slice(0, 8)
    .map((logo) => ({
      id: `brand-logo-${company.id}-${logo.id}`,
      name: logo.name || 'Logo oficial',
      src: logo.dataUrl,
      source: 'brand' as const,
      favorite: true,
      selected: false,
      approved: true,
      category: 'logo',
      description: logo.description || logo.usage || '',
    }));

  const companyInspirations = (company.inspirationLibrary || [])
    .filter((item) => item?.src)
    .slice(0, 80)
    .map((item) => ({
      id: `company-${company.id}-${item.id}`,
      name: item.name || 'Inspiração aprovada',
      src: item.src,
      source: 'company' as const,
      favorite: !!item.favorite,
      selected: false,
      approved: !!item.approved,
      category: item.category || 'geral',
      description: item.description || '',
    }));

  return [...companyInspirations, ...logoReferences, ...visualAssets];
};


export const inferReferenceCategory = (name: string) => {
  const value = name.toLowerCase();
  if (value.includes('story') || value.includes('narr')) return 'storytelling';
  if (value.includes('list') || value.includes('lista')) return 'lista';
  if (value.includes('offer') || value.includes('oferta')) return 'oferta';
  if (value.includes('case')) return 'case';
  if (value.includes('logo') || value.includes('brand')) return 'brand-kit';
  if (value.includes('educ')) return 'educacional';
  if (value.includes('mito') || value.includes('truth')) return 'mitos';
  return 'geral';
};

export const resizeImageBlobToDataUrl = async (
  blob: Blob,
  maxSize = 1024,
  quality = 0.72
) => {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = objectUrl;
    });

    const scale = Math.min(
      1,
      maxSize / Math.max(image.naturalWidth, image.naturalHeight)
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      return '';
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return '';
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const imageUrlToDataUrl = async (src: string) => {
  if (src.startsWith('data:image/')) {
    const response = await window.fetch(src);
    const blob = await response.blob();
    return resizeImageBlobToDataUrl(blob, 768, 0.62);
  }

  const response = await window.fetch(src);
  if (!response.ok) {
    return '';
  }

  const blob = await response.blob();

  return resizeImageBlobToDataUrl(blob, 768, 0.62);
};

export const selectedReferencesToDataUrls = async (
  references: ReferenceImage[],
  cache: Map<string, string>
) => {
  const urls = await Promise.all(
    references.slice(0, 3).map(async (image) => {
      const cached = cache.get(image.id);
      if (cached) {
        return cached;
      }

      const dataUrl = await imageUrlToDataUrl(image.src);
      if (dataUrl) {
        cache.set(image.id, dataUrl);
      }
      return dataUrl;
    })
  );
  return urls.filter(
    (url) => url.startsWith('data:image/') && url.length < 950000
  );
};

export const resolveImageRequestSettings = (
  provider: 'ia_generate' | 'openai_official',
  model: string,
  referenceCount: number
) => {
  if (!referenceCount) {
    return { provider, model };
  }

  return {
    provider: 'openai_official' as const,
    model: 'gpt-image-2',
  };
};

export const buildReferenceInstruction = (
  referenceCount: number,
  mode: 'brand' | 'balanced' | 'inspiration' = 'balanced'
) => {
  if (!referenceCount) {
    return '';
  }

  if (mode === 'inspiration') {
    return `\n\nAs ${referenceCount} imagem(ns) de inspiracao selecionadas sao a DIRECAO VISUAL PRINCIPAL desta arte. Em caso de conflito entre elas e qualquer instrucao de estilo da marca, siga as inspiracoes (composicao, enquadramento, paleta, tipografia, textura e atmosfera). Nao copie marcas, logos, rostos ou elementos protegidos; preserve o texto do slide com legibilidade perfeita.`;
  }

  if (mode === 'brand') {
    return `\n\nAs ${referenceCount} imagem(ns) de inspiracao selecionadas sao apenas tempero visual. Em caso de conflito, priorize sempre a identidade visual da marca descrita acima. Nao copie marcas, logos, rostos ou elementos protegidos. Priorize legibilidade do texto do slide.`;
  }

  return `\n\nAs ${referenceCount} imagem(ns) de inspiracao selecionadas sao referencia forte de composicao, enquadramento, hierarquia tipografica, textura, paleta, espacamento e atmosfera, em equilibrio com a identidade da marca. Nao copie marcas, logos, rostos ou elementos protegidos; crie uma adaptacao original. Priorize legibilidade do texto do slide.`;
};

export const runWithConcurrency = async <T,>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>
) => {
  const queue = [...items];
  const runners = Array.from(
    { length: Math.min(limit, queue.length) },
    async () => {
      while (queue.length) {
        const item = queue.shift();
        if (!item) {
          return;
        }
        await worker(item);
      }
    }
  );

  await Promise.all(runners);
};

