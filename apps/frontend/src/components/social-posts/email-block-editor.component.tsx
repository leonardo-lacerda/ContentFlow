'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import { FormField, FormInput, FormTextarea, FormSelect } from '@gitroom/frontend/components/new-layout/page-system';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { X, GripVertical, Plus, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { ReactSortable } from 'react-sortablejs';
import { emailCampaignsApi } from './email-campaigns.api';
import {
  type EmailBlock,
  type EmailCampaign,
  BLOCK_TYPE_OPTIONS,
  makeDefaultBlock,
  createBlockId,
} from './email-campaigns.types';

/* ------------------------------------------------------------------ */
/*  Sortable wrapper                                                  */
/* ------------------------------------------------------------------ */

interface SortableBlock {
  id: string;
  block: EmailBlock;
}

/* ------------------------------------------------------------------ */
/*  Block editors                                                     */
/* ------------------------------------------------------------------ */

function BlockToolbar({
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: {
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button type="button" onClick={onMoveUp} disabled={index === 0} className="p-1 rounded hover:bg-white/10 disabled:opacity-30">
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onMoveDown} disabled={index === total - 1} className="p-1 rounded hover:bg-white/10 disabled:opacity-30">
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onDuplicate} className="p-1 rounded hover:bg-white/10">
        <Copy className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onRemove} className="p-1 rounded hover:bg-red-500/20 text-red-400">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function AlignmentSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <FormSelect value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="left">Esquerda</option>
      <option value="center">Centro</option>
      <option value="right">Direita</option>
    </FormSelect>
  );
}

function HeadingEditor({ block, onChange }: { block: EmailBlock & { type: 'heading' }; onChange: (b: EmailBlock) => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Nível">
          <FormSelect value={block.level} onChange={(e) => onChange({ ...block, level: e.target.value as 'h1' | 'h2' | 'h3' })}>
            <option value="h1">H1</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
          </FormSelect>
        </FormField>
        <FormField label="Alinhamento">
          <AlignmentSelect value={block.alignment} onChange={(v) => onChange({ ...block, alignment: v as any })} />
        </FormField>
      </div>
      <FormField label="Texto">
        <FormInput value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} placeholder="Título" />
      </FormField>
      <FormField label="Cor" hint="hex">
        <FormInput value={block.color || ''} onChange={(e) => onChange({ ...block, color: e.target.value || null })} placeholder="#1a1a1a" />
      </FormField>
    </div>
  );
}

function TextEditor({ block, onChange }: { block: EmailBlock & { type: 'text' }; onChange: (b: EmailBlock) => void }) {
  return (
    <div className="space-y-2">
      <FormField label="Conteúdo" hint="HTML permitido: b, i, a, strong, em">
        <FormTextarea value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} rows={4} placeholder="Texto do e-mail" />
      </FormField>
      <div className="grid grid-cols-3 gap-2">
        <FormField label="Alinhamento">
          <AlignmentSelect value={block.alignment} onChange={(v) => onChange({ ...block, alignment: v as any })} />
        </FormField>
        <FormField label="Tamanho (px)">
          <FormInput type="number" min={10} max={48} value={block.fontSize || ''} onChange={(e) => onChange({ ...block, fontSize: Number(e.target.value) || null })} placeholder="16" />
        </FormField>
        <FormField label="Cor">
          <FormInput value={block.color || ''} onChange={(e) => onChange({ ...block, color: e.target.value || null })} placeholder="#333333" />
        </FormField>
      </div>
    </div>
  );
}

function ImageEditor({ block, onChange }: { block: EmailBlock & { type: 'image' }; onChange: (b: EmailBlock) => void }) {
  return (
    <div className="space-y-2">
      <FormField label="URL da imagem">
        <FormInput value={block.src} onChange={(e) => onChange({ ...block, src: e.target.value })} placeholder="https://..." />
      </FormField>
      <FormField label="Alt text">
        <FormInput value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })} placeholder="Descrição da imagem" />
      </FormField>
      <div className="grid grid-cols-3 gap-2">
        <FormField label="Largura (px)">
          <FormInput type="number" value={block.width || ''} onChange={(e) => onChange({ ...block, width: Number(e.target.value) || null })} placeholder="Auto" />
        </FormField>
        <FormField label="Alinhamento">
          <AlignmentSelect value={block.alignment} onChange={(v) => onChange({ ...block, alignment: v as any })} />
        </FormField>
        <FormField label="Link">
          <FormInput value={block.linkUrl || ''} onChange={(e) => onChange({ ...block, linkUrl: e.target.value || null })} placeholder="https://..." />
        </FormField>
      </div>
    </div>
  );
}

function CtaEditor({ block, onChange }: { block: EmailBlock & { type: 'cta' }; onChange: (b: EmailBlock) => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <FormField label="Texto do botão">
          <FormInput value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Clique aqui" />
        </FormField>
        <FormField label="URL">
          <FormInput value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="https://..." />
        </FormField>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <FormField label="Cor fundo">
          <FormInput value={block.color} onChange={(e) => onChange({ ...block, color: e.target.value })} />
        </FormField>
        <FormField label="Cor texto">
          <FormInput value={block.textColor} onChange={(e) => onChange({ ...block, textColor: e.target.value })} />
        </FormField>
        <FormField label="Alinhamento">
          <AlignmentSelect value={block.alignment} onChange={(v) => onChange({ ...block, alignment: v as any })} />
        </FormField>
        <FormField label="Raio borda">
          <FormInput type="number" min={0} max={24} value={block.borderRadius} onChange={(e) => onChange({ ...block, borderRadius: Number(e.target.value) || 0 })} />
        </FormField>
      </div>
    </div>
  );
}

function DividerEditor({ block, onChange }: { block: EmailBlock & { type: 'divider' }; onChange: (b: EmailBlock) => void }) {
  return (
    <FormField label="Cor">
      <FormInput value={block.color} onChange={(e) => onChange({ ...block, color: e.target.value })} />
    </FormField>
  );
}

function SpacerEditor({ block, onChange }: { block: EmailBlock & { type: 'spacer' }; onChange: (b: EmailBlock) => void }) {
  return (
    <FormField label="Altura (px)">
      <input
        type="range"
        min={4}
        max={80}
        value={block.height}
        onChange={(e) => onChange({ ...block, height: Number(e.target.value) })}
        className="w-full accent-white/60"
      />
      <span className="text-xs text-white/50">{block.height}px</span>
    </FormField>
  );
}

function CarouselEditor({ block, onChange }: { block: EmailBlock & { type: 'carousel' }; onChange: (b: EmailBlock) => void }) {
  const updateCard = (idx: number, field: string, value: string) => {
    const cards = [...block.cards];
    cards[idx] = { ...cards[idx], [field]: value };
    onChange({ ...block, cards });
  };
  const addCard = () => {
    onChange({ ...block, cards: [...block.cards, { type: 'carousel_card' as const, imageUrl: '', title: 'Novo card', summary: 'Descrição' }] });
  };
  const removeCard = (idx: number) => {
    onChange({ ...block, cards: block.cards.filter((_, i) => i !== idx) });
  };
  return (
    <div className="space-y-2">
      <FormField label="Layout">
        <FormSelect value={block.layout} onChange={(e) => onChange({ ...block, layout: e.target.value as any })}>
          <option value="horizontal">Horizontal</option>
          <option value="stacked">Empilhado</option>
        </FormSelect>
      </FormField>
      {block.cards.map((card, i) => (
        <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Card {i + 1}</span>
            <button type="button" onClick={() => removeCard(i)} className="p-0.5 rounded hover:bg-red-500/20 text-red-400">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <FormInput value={card.imageUrl} onChange={(e) => updateCard(i, 'imageUrl', e.target.value)} placeholder="URL da imagem" />
          <FormInput value={card.title} onChange={(e) => updateCard(i, 'title', e.target.value)} placeholder="Título" />
          <FormInput value={card.summary} onChange={(e) => updateCard(i, 'summary', e.target.value)} placeholder="Resumo" />
        </div>
      ))}
      <Button secondary className="!h-7 !text-xs w-full" onClick={addCard}>
        <Plus className="w-3 h-3" /> Adicionar card
      </Button>
    </div>
  );
}

function SocialLinksEditor({ block, onChange }: { block: EmailBlock & { type: 'social_links' }; onChange: (b: EmailBlock) => void }) {
  const updateNetwork = (idx: number, field: string, value: string) => {
    const networks = [...block.networks];
    networks[idx] = { ...networks[idx], [field]: value };
    onChange({ ...block, networks });
  };
  const addNetwork = () => {
    onChange({ ...block, networks: [...block.networks, { name: '', url: '' }] });
  };
  const removeNetwork = (idx: number) => {
    onChange({ ...block, networks: block.networks.filter((_, i) => i !== idx) });
  };
  return (
    <div className="space-y-2">
      <FormField label="Alinhamento">
        <AlignmentSelect value={block.alignment} onChange={(v) => onChange({ ...block, alignment: v as any })} />
      </FormField>
      {block.networks.map((net, i) => (
        <div key={i} className="flex gap-2 items-center">
          <FormInput value={net.name} onChange={(e) => updateNetwork(i, 'name', e.target.value)} placeholder="Nome" className="flex-1" />
          <FormInput value={net.url} onChange={(e) => updateNetwork(i, 'url', e.target.value)} placeholder="URL" className="flex-1" />
          <button type="button" onClick={() => removeNetwork(i)} className="p-1 rounded hover:bg-red-500/20 text-red-400">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
      <Button secondary className="!h-7 !text-xs" onClick={addNetwork}>
        <Plus className="w-3 h-3" /> Rede social
      </Button>
    </div>
  );
}

function BlockEditor({
  block,
  onChange,
}: {
  block: EmailBlock;
  onChange: (b: EmailBlock) => void;
}) {
  switch (block.type) {
    case 'heading': return <HeadingEditor block={block} onChange={onChange} />;
    case 'text': return <TextEditor block={block} onChange={onChange} />;
    case 'image': return <ImageEditor block={block} onChange={onChange} />;
    case 'cta': return <CtaEditor block={block} onChange={onChange} />;
    case 'carousel': return <CarouselEditor block={block} onChange={onChange} />;
    case 'divider': return <DividerEditor block={block} onChange={onChange} />;
    case 'spacer': return <SpacerEditor block={block} onChange={onChange} />;
    case 'social_links': return <SocialLinksEditor block={block} onChange={onChange} />;
    default: return <div className="text-xs text-white/40">Tipo desconhecido</div>;
  }
}

/* ------------------------------------------------------------------ */
/*  Main editor                                                       */
/* ------------------------------------------------------------------ */

export function EmailBlockEditor({
  campaign,
  onSaved,
  onClose,
}: {
  campaign: EmailCampaign;
  onSaved: () => void;
  onClose: () => void;
}) {
  const fetch = useFetch();
  const toaster = useToaster();
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);

  const [name, setName] = useState(campaign.name);
  const [subject, setSubject] = useState(campaign.subject);
  const [preheader, setPreheader] = useState(campaign.preheader || '');
  const [primaryColor, setPrimaryColor] = useState(campaign.primaryColor || '');
  const [secondaryColor, setSecondaryColor] = useState(campaign.secondaryColor || '');

  const [sortableBlocks, setSortableBlocks] = useState<SortableBlock[]>(() =>
    (campaign.bodyJson?.blocks || []).map((b, i) => ({
      id: createBlockId(),
      block: b,
    }))
  );

  const [previewHtml, setPreviewHtml] = useState(campaign.bodyHtml || '');
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* -- Live preview with debounce ---------------------------------- */

  const requestPreview = useCallback(() => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(async () => {
      setRendering(true);
      try {
        const blocks = sortableBlocks.map((sb) => sb.block);
        const data = await emailCampaignsApi.renderHtml(fetch, {
          blocks,
          subject,
          primaryColor: primaryColor || undefined,
          secondaryColor: secondaryColor || undefined,
        });
        setPreviewHtml(data.html);
      } catch {
        // keep current preview
      } finally {
        setRendering(false);
      }
    }, 600);
  }, [sortableBlocks, subject, primaryColor, secondaryColor, fetch]);

  useEffect(() => {
    requestPreview();
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [requestPreview]);

  /* -- Block operations -------------------------------------------- */

  const updateBlock = useCallback((id: string, newBlock: EmailBlock) => {
    setSortableBlocks((prev) =>
      prev.map((sb) => (sb.id === id ? { ...sb, block: newBlock } : sb))
    );
  }, []);

  const addBlock = (type: EmailBlock['type'], afterIndex?: number) => {
    const newBlock: SortableBlock = {
      id: createBlockId(),
      block: makeDefaultBlock(type),
    };
    setSortableBlocks((prev) => {
      const next = [...prev];
      const insertAt = afterIndex !== undefined ? afterIndex + 1 : next.length;
      next.splice(insertAt, 0, newBlock);
      return next;
    });
  };

  const removeBlock = (id: string) => {
    setSortableBlocks((prev) => prev.filter((sb) => sb.id !== id));
  };

  const duplicateBlock = (id: string) => {
    setSortableBlocks((prev) => {
      const idx = prev.findIndex((sb) => sb.id === id);
      if (idx === -1) return prev;
      const clone: SortableBlock = {
        id: createBlockId(),
        block: { ...prev[idx].block },
      };
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    setSortableBlocks((prev) => {
      const idx = prev.findIndex((sb) => sb.id === id);
      if (idx === -1) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  /* -- Save -------------------------------------------------------- */

  const handleSave = async () => {
    setSaving(true);
    try {
      const blocks = sortableBlocks.map((sb) => sb.block);
      await emailCampaignsApi.update(fetch, campaign.id, {
        name,
        subject,
        preheader: preheader || undefined,
        bodyJson: { blocks },
        primaryColor: primaryColor || undefined,
        secondaryColor: secondaryColor || undefined,
      });
      await emailCampaignsApi.reRender(fetch, campaign.id, { blocks });
      toaster.show('Campanha salva', 'success');
      onSaved();
    } catch (e: any) {
      toaster.show(e.message || 'Erro ao salvar', 'warning');
    } finally {
      setSaving(false);
    }
  };

  /* -- Render ------------------------------------------------------ */

  const blocks = sortableBlocks.map((sb) => sb.block);
  const blockTypeLabel = (type: string) => BLOCK_TYPE_OPTIONS.find((o) => o.type === type)?.label || type;

  return (
    <div className="fixed inset-0 z-[80] bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate">Editor de e-mail</h2>
          <span className="text-xs text-white/40 truncate">{subject}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button secondary className="!h-7 !text-xs" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="!h-7 !text-xs" loading={saving} onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </div>

      {/* Content: 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Block palette + settings */}
        <div className="w-[220px] border-r border-white/10 overflow-y-auto p-3 space-y-4 shrink-0">
          {/* Campaign settings */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white/60 uppercase">Campanha</h4>
            <FormField label="Nome">
              <FormInput value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label="Assunto">
              <FormInput value={subject} onChange={(e) => setSubject(e.target.value)} />
            </FormField>
            <FormField label="Preheader">
              <FormInput value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder="Texto no inbox" />
            </FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Cor primária">
                <FormInput value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#007bff" />
              </FormField>
              <FormField label="Cor secundária">
                <FormInput value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} placeholder="#666" />
              </FormField>
            </div>
          </div>

          {/* Block palette */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white/60 uppercase">Adicionar bloco</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {BLOCK_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => addBlock(opt.type)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <span className="text-base">{opt.icon}</span>
                  <span className="text-[10px]">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Sortable blocks */}
        <div className="flex-1 overflow-y-auto p-4">
          {sortableBlocks.length === 0 ? (
            <div className="text-center text-white/30 py-20">
              <p className="text-sm">Nenhum bloco ainda.</p>
              <p className="text-xs mt-1">Use a paleta à esquerda para adicionar blocos.</p>
            </div>
          ) : (
            <ReactSortable
              list={sortableBlocks}
              setList={setSortableBlocks}
              handle=".drag-handle"
              animation={200}
              ghostClass="opacity-40"
              className="space-y-2"
            >
              {sortableBlocks.map((sb, i) => (
                <div
                  key={sb.id}
                  className="rounded-lg border border-white/10 bg-white/5 overflow-hidden"
                >
                  {/* Block header */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-white/[0.02]">
                    <GripVertical className="drag-handle w-4 h-4 text-white/20 cursor-move" />
                    <span className="text-xs font-medium text-white/50 uppercase">
                      {blockTypeLabel(sb.block.type)}
                    </span>
                    <span className="text-[10px] text-white/20">#{i + 1}</span>
                    <div className="flex-1" />
                    <BlockToolbar
                      index={i}
                      total={sortableBlocks.length}
                      onMoveUp={() => moveBlock(sb.id, -1)}
                      onMoveDown={() => moveBlock(sb.id, 1)}
                      onDuplicate={() => duplicateBlock(sb.id)}
                      onRemove={() => removeBlock(sb.id)}
                    />
                  </div>
                  {/* Block editor */}
                  <div className="p-3">
                    <BlockEditor
                      block={sb.block}
                      onChange={(newBlock) => updateBlock(sb.id, newBlock)}
                    />
                  </div>
                </div>
              ))}
            </ReactSortable>
          )}
        </div>

        {/* Right: Live preview */}
        <div className="w-[360px] border-l border-white/10 flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-xs font-semibold text-white/60">Preview</span>
            {rendering && <span className="text-[10px] text-white/30">renderizando...</span>}
          </div>
          <div className="flex-1 overflow-auto bg-white">
            {previewHtml ? (
              <iframe
                title="preview"
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                style={{ minHeight: 500 }}
              />
            ) : (
              <div className="p-4 text-xs text-gray-400">Sem preview</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
