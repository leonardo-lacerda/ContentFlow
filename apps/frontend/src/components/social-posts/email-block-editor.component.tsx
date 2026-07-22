'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
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
/*  Dark-theme form primitives                                         */
/* ------------------------------------------------------------------ */

const inp =
  'w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors';

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className || ''}`}>
      <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wide">
        {label}
        {hint ? <span className="ml-1 font-normal text-white/25">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inp} ${props.className || ''}`} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inp} resize-y min-h-[80px] ${props.className || ''}`} />;
}

function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select {...props} className={`${inp} ${props.className || ''}`}>
      {children}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/*  Sortable wrapper                                                  */
/* ------------------------------------------------------------------ */

interface SortableBlock {
  id: string;
  block: EmailBlock;
}

/* ------------------------------------------------------------------ */
/*  Block toolbar                                                     */
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
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        onClick={onMoveUp}
        disabled={index === 0}
        className="p-1 rounded hover:bg-white/10 disabled:opacity-20 text-white/40 hover:text-white/70"
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={index === total - 1}
        className="p-1 rounded hover:bg-white/10 disabled:opacity-20 text-white/40 hover:text-white/70"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onDuplicate}
        className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded hover:bg-red-500/20 text-red-400/60 hover:text-red-400"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function AlignmentControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="left">Esquerda</option>
      <option value="center">Centro</option>
      <option value="right">Direita</option>
    </Select>
  );
}

/* ------------------------------------------------------------------ */
/*  Per-block editors                                                 */
/* ------------------------------------------------------------------ */

function HeadingEditor({ block, onChange }: { block: EmailBlock & { type: 'heading' }; onChange: (b: EmailBlock) => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Nível">
          <Select value={block.level} onChange={(e) => onChange({ ...block, level: e.target.value as 'h1' | 'h2' | 'h3' })}>
            <option value="h1">H1</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
          </Select>
        </Field>
        <Field label="Alinhamento">
          <AlignmentControl value={block.alignment} onChange={(v) => onChange({ ...block, alignment: v as any })} />
        </Field>
      </div>
      <Field label="Texto">
        <Input value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} placeholder="Título" />
      </Field>
      <Field label="Cor" hint="hex">
        <Input value={block.color || ''} onChange={(e) => onChange({ ...block, color: e.target.value || null })} placeholder="#1a1a1a" />
      </Field>
    </div>
  );
}

function TextEditor({ block, onChange }: { block: EmailBlock & { type: 'text' }; onChange: (b: EmailBlock) => void }) {
  return (
    <div className="space-y-2">
      <Field label="Conteúdo" hint="HTML: b, i, a, strong, em">
        <Textarea value={block.content} onChange={(e) => onChange({ ...block, content: e.target.value })} rows={4} placeholder="Texto do e-mail" />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Alinhamento">
          <AlignmentControl value={block.alignment} onChange={(v) => onChange({ ...block, alignment: v as any })} />
        </Field>
        <Field label="Tamanho">
          <Input type="number" min={10} max={48} value={block.fontSize || ''} onChange={(e) => onChange({ ...block, fontSize: Number(e.target.value) || null })} placeholder="16" />
        </Field>
        <Field label="Cor">
          <Input value={block.color || ''} onChange={(e) => onChange({ ...block, color: e.target.value || null })} placeholder="#333333" />
        </Field>
      </div>
    </div>
  );
}

function ImageEditor({ block, onChange }: { block: EmailBlock & { type: 'image' }; onChange: (b: EmailBlock) => void }) {
  return (
    <div className="space-y-2">
      <Field label="URL da imagem">
        <Input value={block.src} onChange={(e) => onChange({ ...block, src: e.target.value })} placeholder="https://..." />
      </Field>
      <Field label="Alt text">
        <Input value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })} placeholder="Descrição" />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Largura (px)">
          <Input type="number" value={block.width || ''} onChange={(e) => onChange({ ...block, width: Number(e.target.value) || null })} placeholder="Auto" />
        </Field>
        <Field label="Alinhamento">
          <AlignmentControl value={block.alignment} onChange={(v) => onChange({ ...block, alignment: v as any })} />
        </Field>
        <Field label="Link">
          <Input value={block.linkUrl || ''} onChange={(e) => onChange({ ...block, linkUrl: e.target.value || null })} placeholder="https://..." />
        </Field>
      </div>
    </div>
  );
}

function CtaEditor({ block, onChange }: { block: EmailBlock & { type: 'cta' }; onChange: (b: EmailBlock) => void }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Texto do botão">
          <Input value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Clique aqui" />
        </Field>
        <Field label="URL">
          <Input value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="https://..." />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Cor fundo">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={block.color}
              onChange={(e) => onChange({ ...block, color: e.target.value })}
              className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent"
            />
            <Input value={block.color} onChange={(e) => onChange({ ...block, color: e.target.value })} className="flex-1" />
          </div>
        </Field>
        <Field label="Cor texto">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={block.textColor}
              onChange={(e) => onChange({ ...block, textColor: e.target.value })}
              className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent"
            />
            <Input value={block.textColor} onChange={(e) => onChange({ ...block, textColor: e.target.value })} className="flex-1" />
          </div>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Alinhamento">
          <AlignmentControl value={block.alignment} onChange={(v) => onChange({ ...block, alignment: v as any })} />
        </Field>
        <Field label="Raio borda (px)">
          <Input type="number" min={0} max={24} value={block.borderRadius} onChange={(e) => onChange({ ...block, borderRadius: Number(e.target.value) || 0 })} />
        </Field>
      </div>
    </div>
  );
}

function DividerEditor({ block, onChange }: { block: EmailBlock & { type: 'divider' }; onChange: (b: EmailBlock) => void }) {
  return (
    <Field label="Cor">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={block.color}
          onChange={(e) => onChange({ ...block, color: e.target.value })}
          className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent"
        />
        <Input value={block.color} onChange={(e) => onChange({ ...block, color: e.target.value })} className="flex-1" />
      </div>
    </Field>
  );
}

function SpacerEditor({ block, onChange }: { block: EmailBlock & { type: 'spacer' }; onChange: (b: EmailBlock) => void }) {
  return (
    <Field label={`Altura: ${block.height}px`}>
      <input
        type="range"
        min={4}
        max={80}
        value={block.height}
        onChange={(e) => onChange({ ...block, height: Number(e.target.value) })}
        className="w-full accent-white/60"
      />
    </Field>
  );
}

function CarouselEditor({ block, onChange }: { block: EmailBlock & { type: 'carousel' }; onChange: (b: EmailBlock) => void }) {
  const updateCard = (idx: number, field: string, value: string) => {
    const cards = [...block.cards];
    cards[idx] = { ...cards[idx], [field]: value };
    onChange({ ...block, cards });
  };
  const addCard = () => {
    onChange({
      ...block,
      cards: [
        ...block.cards,
        { type: 'carousel_card' as const, imageUrl: '', title: 'Novo card', summary: 'Descrição' },
      ],
    });
  };
  const removeCard = (idx: number) => {
    onChange({ ...block, cards: block.cards.filter((_, i) => i !== idx) });
  };
  return (
    <div className="space-y-2">
      <Field label="Layout">
        <Select value={block.layout} onChange={(e) => onChange({ ...block, layout: e.target.value as any })}>
          <option value="horizontal">Horizontal</option>
          <option value="stacked">Empilhado</option>
        </Select>
      </Field>
      <div className="space-y-2">
        {block.cards.map((card, i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-white/40">Card {i + 1}</span>
              <button
                type="button"
                onClick={() => removeCard(i)}
                className="p-0.5 rounded hover:bg-red-500/20 text-red-400/60 hover:text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <Input value={card.imageUrl} onChange={(e) => updateCard(i, 'imageUrl', e.target.value)} placeholder="URL da imagem" />
            <Input value={card.title} onChange={(e) => updateCard(i, 'title', e.target.value)} placeholder="Título" />
            <Input value={card.summary} onChange={(e) => updateCard(i, 'summary', e.target.value)} placeholder="Resumo" />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addCard}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/15 text-[12px] text-white/40 hover:text-white/60 hover:border-white/25 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Adicionar card
      </button>
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
      <Field label="Alinhamento">
        <AlignmentControl value={block.alignment} onChange={(v) => onChange({ ...block, alignment: v as any })} />
      </Field>
      <div className="space-y-1.5">
        {block.networks.map((net, i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <Input
              value={net.name}
              onChange={(e) => updateNetwork(i, 'name', e.target.value)}
              placeholder="Nome"
              className="w-[100px] shrink-0"
            />
            <Input
              value={net.url}
              onChange={(e) => updateNetwork(i, 'url', e.target.value)}
              placeholder="URL"
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => removeNetwork(i)}
              className="p-1 rounded hover:bg-red-500/20 text-red-400/60 hover:text-red-400 shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addNetwork}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-white/15 text-[12px] text-white/40 hover:text-white/60 hover:border-white/25 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Rede social
      </button>
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: EmailBlock; onChange: (b: EmailBlock) => void }) {
  switch (block.type) {
    case 'heading':
      return <HeadingEditor block={block} onChange={onChange} />;
    case 'text':
      return <TextEditor block={block} onChange={onChange} />;
    case 'image':
      return <ImageEditor block={block} onChange={onChange} />;
    case 'cta':
      return <CtaEditor block={block} onChange={onChange} />;
    case 'carousel':
      return <CarouselEditor block={block} onChange={onChange} />;
    case 'divider':
      return <DividerEditor block={block} onChange={onChange} />;
    case 'spacer':
      return <SpacerEditor block={block} onChange={onChange} />;
    case 'social_links':
      return <SocialLinksEditor block={block} onChange={onChange} />;
    default:
      return <div className="text-xs text-white/30">Tipo desconhecido</div>;
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
    (campaign.bodyJson?.blocks || []).map((b) => ({
      id: createBlockId(),
      block: b,
    }))
  );

  const [previewHtml, setPreviewHtml] = useState(campaign.bodyHtml || '');
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* -- Live preview ------------------------------------------------ */

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

  const blockLabel = (type: string) => BLOCK_TYPE_OPTIONS.find((o) => o.type === type)?.label || type;

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 text-white flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h2 className="text-sm font-bold truncate">Editor de e-mail</h2>
          <span className="text-xs text-white/30 truncate max-w-[300px]">{subject}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button secondary className="!h-8 !text-xs" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="!h-8 !text-xs" loading={saving} onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </div>

      {/* ── 3-column layout ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left sidebar: settings + block palette */}
        <div className="w-[240px] border-r border-white/10 overflow-y-auto p-3 space-y-5 shrink-0">
          {/* Campaign settings */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Campanha</h4>
            <Field label="Nome">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Assunto">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field label="Preheader">
              <Input value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder="Texto no inbox" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Primária">
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={primaryColor || '#007bff'}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-7 h-7 rounded border border-white/10 cursor-pointer bg-transparent shrink-0"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#007bff"
                    className="flex-1"
                  />
                </div>
              </Field>
              <Field label="Secundária">
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={secondaryColor || '#666666'}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-7 h-7 rounded border border-white/10 cursor-pointer bg-transparent shrink-0"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#666"
                    className="flex-1"
                  />
                </div>
              </Field>
            </div>
          </div>

          {/* Block palette */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Adicionar bloco</h4>
            <div className="grid grid-cols-2 gap-1.5">
              {BLOCK_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => addBlock(opt.type)}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-white/10 hover:bg-white/[0.07] text-white/50 hover:text-white/80 transition-colors"
                >
                  <span className="text-base leading-none">{opt.icon}</span>
                  <span className="text-[10px] font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: sortable blocks */}
        <div className="flex-1 overflow-y-auto p-4">
          {sortableBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-white/20">
              <div className="text-3xl mb-3 opacity-40">&#9993;</div>
              <p className="text-sm font-medium">Nenhum bloco ainda</p>
              <p className="text-xs mt-1 text-white/15">Use a paleta à esquerda para adicionar blocos</p>
            </div>
          ) : (
            <ReactSortable
              list={sortableBlocks}
              setList={setSortableBlocks}
              handle=".drag-handle"
              animation={200}
              ghostClass="opacity-30"
              className="space-y-2"
            >
              {sortableBlocks.map((sb, i) => (
                <div
                  key={sb.id}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden hover:border-white/15 transition-colors"
                >
                  {/* Block header bar */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.05] bg-white/[0.015]">
                    <GripVertical className="drag-handle w-4 h-4 text-white/15 cursor-move hover:text-white/40 transition-colors" />
                    <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">
                      {blockLabel(sb.block.type)}
                    </span>
                    <span className="text-[10px] text-white/15">#{i + 1}</span>
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
                  {/* Block editor body */}
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

        {/* Right: live preview */}
        <div className="w-[380px] border-l border-white/10 flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Preview</span>
            {rendering && (
              <span className="text-[10px] text-white/20 animate-pulse">renderizando...</span>
            )}
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
              <div className="flex items-center justify-center h-full text-xs text-gray-300">
                Sem preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
