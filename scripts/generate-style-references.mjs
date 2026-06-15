#!/usr/bin/env node
/**
 * Gera UMA VEZ, localmente, as referências visuais de estilo do estúdio de
 * carrosséis e as salva como assets estáticos (imagens + prompts) em
 * apps/frontend/public/style-references.
 *
 * O frontend apenas LÊ esse conteúdo estático em runtime — nenhuma imagem é
 * gerada quando o usuário abre a página.
 *
 * Como rodar (a partir da raiz do repo):
 *   OPENAI_API_KEY=sk-... node scripts/generate-style-references.mjs
 *   # opcional: COUNT=10 node scripts/generate-style-references.mjs
 *
 * Depois é só commitar a pasta apps/frontend/public/style-references.
 *
 * Variáveis de ambiente:
 *   OPENAI_API_KEY | AI_GENERATE_OPENAI_API_KEY  (obrigatório)
 *   AI_GENERATE_OPENAI_BASE_URL                  (default https://api.openai.com)
 *   AI_GENERATE_OPENAI_TEXT_MODEL                (default gpt-4.1-mini)
 *   AI_GENERATE_OPENAI_IMAGE_MODEL               (default gpt-image-1)
 *   COUNT                                        (default 10)
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(
  __dirname,
  '../apps/frontend/public/style-references'
);

const API_KEY =
  process.env.AI_GENERATE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const BASE_URL = (
  process.env.AI_GENERATE_OPENAI_BASE_URL || 'https://api.openai.com'
).replace(/\/$/, '');
const TEXT_MODEL = process.env.AI_GENERATE_OPENAI_TEXT_MODEL || 'gpt-4.1-mini';
const IMAGE_MODEL = process.env.AI_GENERATE_OPENAI_IMAGE_MODEL || 'gpt-image-2';
const COUNT = Math.min(12, Math.max(1, Number(process.env.COUNT) || 10));
// APPEND=true: mantém as referências já existentes e só adiciona novas
// (evitando repetir os estilos atuais).
const APPEND = /^(1|true|yes)$/i.test(process.env.APPEND || '');

// Biblioteca CURADA de estilos (baseada em prompts de referência da internet:
// estilos nomeados — Swiss/International, Bauhaus, Memphis, Risograph, Brutalist,
// Didone — com tipografia, grid, textura e iluminação específicos). Cada item
// vira um slide real 1:1 com a headline dentro da imagem.
// Para adicionar estilos no futuro, basta estender esta lista.
const STYLE_LIBRARY = [
  {
    label: 'Editorial Minimalista',
    headline: '5 hábitos que mudam tudo',
    style:
      'Swiss International Typographic Style: grid rigoroso, tipografia grotesque sans-serif (estilo Helvetica) em peso forte, layout assimétrico com muito espaço em branco, paleta off-white com preto e um único acento em vermelho, alto contraste, sofisticação de revista de design.',
  },
  {
    label: 'Memphis Geométrico Colorido',
    headline: 'Pare de adivinhar',
    style:
      'Memphis Group dos anos 80: formas geométricas irregulares, squiggles e confetes, padrões de pontos, cores primárias saturadas (amarelo, vermelho, azul, rosa) sobre fundo claro, tipografia bold arredondada, energia pop-art divertida.',
  },
  {
    label: 'Tipografia Brutalista',
    headline: 'Menos é mais',
    style:
      'Design brutalista: tipografia condensada bold gigantesca preenchendo o quadro, preto e branco cru, grid duro e exposto, zero ornamento, contraste máximo, impacto tipográfico de cartaz.',
  },
  {
    label: 'Gradiente Aurora',
    headline: 'O futuro começa agora',
    style:
      'Fundo mesh gradient moderno (aurora) com mistura suave de azul, magenta e laranja, leve granulação por cima, tipografia sans-serif geométrica branca e limpa, bastante respiro ao redor da headline, estética premium de tecnologia.',
  },
  {
    label: 'Risograph Print',
    headline: 'Ideias que grudam',
    style:
      'Estética de impressão risograph: paleta limitada de 2 cores fluorescentes (rosa e azul), granulação halftone visível e leve desalinhamento de registro, textura de papel, tipografia bold e divertida, vibe de zine independente.',
  },
  {
    label: 'Bauhaus Geométrico',
    headline: 'Construa com intenção',
    style:
      'Design Bauhaus: cores primárias (vermelho, amarelo, azul) com preto, formas geométricas (círculos, triângulos, linhas), grid funcional, tipografia geométrica sans-serif bold, assimetria equilibrada, cartaz modernista.',
  },
  {
    label: 'Editorial de Luxo',
    headline: 'A arte dos detalhes',
    style:
      'Editorial de luxo: fundo de papel creme quente, headline em serifada Didone de alto contraste com kerning refinado, sutis acentos dourados, textura de mármore ou linho, sofisticação de revista de moda.',
  },
  {
    label: 'Lifestyle com Overlay',
    headline: 'Respire e recomece',
    style:
      'Fundo de fotografia lifestyle com luz natural suave de janela, tons quentes levemente desaturados, profundidade de campo rasa, amplo espaço negativo, texto sobreposto em sans-serif fina e clara, clima calmo e aspiracional.',
  },
  {
    label: 'Dark Mode Neon',
    headline: 'Domine o algoritmo',
    style:
      'Fundo preto fosco profundo com acentos neon sutis (ciano e magenta) e leve brilho (glow), tipografia futurista bold com brilho suave, alto contraste, atmosfera sofisticada e misteriosa de tecnologia.',
  },
  {
    label: '3D Abstrato Pastel',
    headline: 'Cresça sem complicar',
    style:
      'Render 3D soft: formas abstratas arredondadas com material fosco tipo argila, paleta pastel, iluminação de estúdio suave com sombras delicadas, sensação de profundidade e leveza, tipografia geométrica sans-serif moderna.',
  },
];

if (!API_KEY) {
  console.error(
    'ERRO: defina OPENAI_API_KEY (ou AI_GENERATE_OPENAI_API_KEY) no ambiente.'
  );
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Authorization: `Bearer ${API_KEY}`,
};

// Seleciona estilos da biblioteca curada, ignorando os que já existem (append)
// e respeitando COUNT.
function getStyles(avoidLabels = []) {
  const avoid = new Set(avoidLabels);
  return STYLE_LIBRARY.filter((style) => !avoid.has(style.label)).slice(0, COUNT);
}

// Monta o prompt de imagem espelhando o buildSlideImagePrompt do sistema, para
// que a referencia pareca um SLIDE REAL de carrossel (texto dentro da imagem).
function buildReferenceImagePrompt(headline, style) {
  return [
    'Crie uma arte quadrada 1:1 para um slide de carrossel de Instagram premium.',
    'O texto abaixo deve aparecer DENTRO da imagem, com grafia exatamente igual, em portugues, sem trocar palavras e sem adicionar outros textos.',
    `HEADLINE PRINCIPAL: "${headline}"`,
    '',
    'Estrutura do slide: arte editorial limpa, com a headline em grande destaque e hierarquia tipografica clara.',
    `Estilo visual: ${style}`,
    '',
    'Regras: texto perfeitamente legivel no celular, alto contraste, margens seguras, muito respiro. Nao mostre produtos comerciais, marcas, logos, rostos ou elementos protegidos.',
  ].join('\n');
}

async function generateImage(prompt) {
  const response = await fetch(`${BASE_URL}/v1/images/generations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      n: 1,
      size: '1024x1024',
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Falha ao gerar imagem (${response.status}): ${text}`);
  }

  const data = await response.json();
  const image = data?.data?.[0];
  if (image?.b64_json) {
    return Buffer.from(image.b64_json, 'base64');
  }
  if (image?.url) {
    const file = await fetch(image.url);
    return Buffer.from(await file.arrayBuffer());
  }
  throw new Error('Resposta de imagem sem b64_json nem url.');
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const indexPath = resolve(OUTPUT_DIR, 'index.json');

  // Modo append: preserva o que já existe e só adiciona novos estilos.
  let existing = [];
  if (APPEND) {
    try {
      const raw = await readFile(indexPath, 'utf8');
      const parsed = JSON.parse(raw);
      existing = Array.isArray(parsed.references) ? parsed.references : [];
    } catch {
      existing = [];
    }
    console.log(`> Modo append: ${existing.length} referências já existentes preservadas.`);
  }

  const avoidLabels = existing.map((reference) => reference.label).filter(Boolean);
  const styles = getStyles(avoidLabels);
  if (!styles.length) {
    throw new Error('Nenhum estilo disponível na biblioteca curada.');
  }
  console.log(`> ${styles.length} estilos selecionados. Gerando imagens (${IMAGE_MODEL})...`);

  const references = [...existing];
  for (let index = 0; index < styles.length; index++) {
    const style = styles[index];
    const id = `style-${String(existing.length + index + 1).padStart(2, '0')}`;
    const file = `${id}.png`;
    try {
      const imagePrompt = buildReferenceImagePrompt(style.headline, style.style);
      const buffer = await generateImage(imagePrompt);
      await writeFile(resolve(OUTPUT_DIR, file), buffer);
      // O prompt salvo (reutilizado na geracao final) e SO o estilo visual,
      // sem a headline de exemplo.
      references.push({
        id,
        file,
        label: style.label,
        prompt: style.style,
      });
      console.log(`  [${index + 1}/${styles.length}] ${file} (${style.label})`);
    } catch (error) {
      console.warn(`  [${index + 1}/${styles.length}] FALHOU: ${error.message}`);
    }
  }

  if (!references.length) {
    throw new Error('Nenhuma imagem foi gerada com sucesso.');
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    model: { text: TEXT_MODEL, image: IMAGE_MODEL },
    references,
  };
  await writeFile(
    resolve(OUTPUT_DIR, 'index.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  );

  console.log(
    `\n✓ ${references.length} referências salvas em apps/frontend/public/style-references`
  );
  console.log('  Commite essa pasta para subir as imagens + prompts no sistema.');
}

main().catch((error) => {
  console.error(`\nERRO: ${error.message}`);
  process.exit(1);
});
