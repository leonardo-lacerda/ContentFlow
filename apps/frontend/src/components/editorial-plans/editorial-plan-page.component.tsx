'use client';

import { useState, useMemo } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useModals, areYouSure } from '@gitroom/frontend/components/layout/new-modal';
import {
  Plus,
  Loader,
  Calendar,
  Trash2,
  Edit3,
  Clock,
  Tag,
  Globe,
  ChevronLeft,
  Zap,
  AlertTriangle,
  CalendarDays,
  Filter,
  Play,
  Power,
  RefreshCw,
} from 'lucide-react';
import { useEditorialPlans, useEditorialSlots, mutateEditorialPlans, mutateEditorialSlots } from './editorial-plans.hooks';
import { EditorialPlan, EditorialSlot, EditorialSlotStatus } from './editorial-plans.types';
import { useSelectedBrand } from '@gitroom/frontend/components/brand-dna/brand-dna.hooks';
import { createPlan, deletePlan, updatePlan, generateCalendar, updateSlot, runGeneration, toggleAutoGeneration } from './editorial-plans.service';

const inputClass =
  'h-[48px] w-full rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] px-[16px] text-[15px] outline-none placeholder:text-black/35 dark:placeholder:text-white/35 text-black dark:text-white transition duration-200 focus:border-black/40 dark:focus:border-white/40 focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 hover:border-black/20 dark:hover:border-white/20';

const cardClass =
  'rounded-[12px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] p-6';

const platformOptions = [
  'Instagram',
  'Facebook',
  'LinkedIn',
  'Twitter/X',
  'TikTok',
  'YouTube',
  'Pinterest',
];

const timezoneOptions = [
  'America/Sao_Paulo',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'UTC',
];

const slotStatusConfig: Record<EditorialSlotStatus, { label: string; color: string; bg: string }> = {
  PLANNED: { label: 'Planejado', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800' },
  IDEAS_GENERATED: { label: 'Ideias Geradas', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  APPROVED: { label: 'Aprovado', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  REJECTED: { label: 'Rejeitado', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
  CAROUSEL_CREATED: { label: 'Carrossel Criado', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  SCHEDULED: { label: 'Agendado', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  PUBLISHED: { label: 'Publicado', color: 'text-green-700', bg: 'bg-green-200 dark:bg-green-900/50' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getDayOfWeek(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { weekday: 'short' });
}

export function EditorialPlanPage() {
  const toaster = useToaster();
  const modals = useModals();
  const { data: brand } = useSelectedBrand();
  const { data: plans, isLoading, error, mutate } = useEditorialPlans();
  const [selectedPlan, setSelectedPlan] = useState<EditorialPlan | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [autoGenerating, setAutoGenerating] = useState<string | null>(null);

  const selectedPlanId = selectedPlan?.id;
  const { data: slots, isLoading: slotsLoading } = useEditorialSlots(selectedPlanId);

  const filteredPlans = useMemo(() => {
    if (!plans || !brand?.id) return plans || [];
    return plans.filter((p: EditorialPlan) => p.brandProfileId === brand.id);
  }, [plans, brand?.id]);

  const handleCreate = () => {
    let nameValue = '';
    let frequencyValue = '3';
    const platformsValue: string[] = [];
    let pillarsValue = '';
    let objectivesValue = '';
    let timezoneValue = 'America/Sao_Paulo';
    const blackoutValue = '';

    modals.openModal({
      title: 'Novo Plano Editorial',
      closeOnEscape: true,
      closeOnClickOutside: false,
      size: '560px',
      children: (close: () => void) => (
        <div className="flex flex-col gap-[16px] max-h-[70vh] overflow-y-auto pr-2">
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] font-[500]">
              Nome do Plano <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass}
              placeholder="Ex: Plano Mensal Instagram"
              defaultValue={nameValue}
              onChange={(e) => { nameValue = e.target.value; }}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] font-[500]">
              Frequência por Semana <span className="text-red-500">*</span>
            </label>
            <select
              className={inputClass}
              defaultValue={frequencyValue}
              onChange={(e) => { frequencyValue = e.target.value; }}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n}x por semana
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] font-[500]">Plataformas</label>
            <div className="flex flex-wrap gap-2">
              {platformOptions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    const idx = platformsValue.indexOf(p);
                    if (idx >= 0) platformsValue.splice(idx, 1);
                    else platformsValue.push(p);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    platformsValue.includes(p)
                      ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                      : 'border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black/20'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] font-[500]">Pilares de Conteúdo</label>
            <textarea
              className={`${inputClass} h-auto min-h-[80px] py-3 resize-none`}
              placeholder="Um pilar por linha (ex: Educativo, Inspiracional, Promocional)"
              defaultValue={pillarsValue}
              onChange={(e) => { pillarsValue = e.target.value; }}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] font-[500]">Objetivos</label>
            <textarea
              className={`${inputClass} h-auto min-h-[80px] py-3 resize-none`}
              placeholder="Um objetivo por linha (ex: Engajamento, Vendas, Brand awareness)"
              defaultValue={objectivesValue}
              onChange={(e) => { objectivesValue = e.target.value; }}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] font-[500]">Fuso Horário</label>
            <select
              className={inputClass}
              defaultValue={timezoneValue}
              onChange={(e) => { timezoneValue = e.target.value; }}
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] font-[500]">Datas de Bloqueio</label>
            <input
              className={inputClass}
              type="date"
              defaultValue={blackoutValue}
              onChange={(e) => { blackoutValue; e.target.value; }}
            />
            <p className="text-xs text-gray-400">Adicione datas individualmente</p>
          </div>
          <div className="flex gap-[12px] justify-end mt-[8px]">
            <Button onClick={close}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!nameValue.trim()) {
                  toaster.show('O nome é obrigatório', 'warning');
                  return;
                }
                if (platformsValue.length === 0) {
                  toaster.show('Selecione pelo menos uma plataforma', 'warning');
                  return;
                }
                close();
                try {
                  const pillars = pillarsValue.split('\n').map((s) => s.trim()).filter(Boolean);
                  const objectives = objectivesValue.split('\n').map((s) => s.trim()).filter(Boolean);
                  const blackoutDates = blackoutValue ? [blackoutValue] : [];

                  await createPlan({
                    brandProfileId: brand?.id,
                    name: nameValue.trim(),
                    frequencyPerWeek: parseInt(frequencyValue, 10),
                    platforms: platformsValue,
                    pillars,
                    objectives,
                    languages: ['pt-BR'],
                    timezone: timezoneValue,
                    blackoutDates,
                    autoGenerate: false,
                  });
                  toaster.show('Plano editorial criado!', 'success');
                  mutateEditorialPlans();
                } catch (err: any) {
                  toaster.show(err.message || 'Erro ao criar plano', 'warning');
                }
              }}
            >
              Criar Plano
            </Button>
          </div>
        </div>
      ),
    });
  };

  const handleDelete = async (plan: EditorialPlan) => {
    const confirmed = await areYouSure({
      title: 'Excluir plano',
      description: `Tem certeza que deseja excluir "${plan.name}"? Todos os slots associados serão removidos.`,
      approveLabel: 'Excluir',
      cancelLabel: 'Cancelar',
    });

    if (!confirmed) return;

    try {
      await deletePlan(plan.id);
      toaster.show('Plano excluído', 'success');
      if (selectedPlan?.id === plan.id) {
        setSelectedPlan(null);
      }
      mutateEditorialPlans();
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao excluir plano', 'warning');
    }
  };

  const handleEdit = (plan: EditorialPlan) => {
    let nameValue = plan.name;
    let frequencyValue = String(plan.frequencyPerWeek);
    const platformsValue = [...plan.platforms];
    let pillarsValue = plan.pillars.join('\n');
    let objectivesValue = plan.objectives.join('\n');
    let timezoneValue = plan.timezone;

    modals.openModal({
      title: 'Editar Plano Editorial',
      closeOnEscape: true,
      closeOnClickOutside: false,
      size: '560px',
      children: (close: () => void) => (
        <div className="flex flex-col gap-[16px] max-h-[70vh] overflow-y-auto pr-2">
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] font-[500]">
              Nome do Plano <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass}
              defaultValue={nameValue}
              onChange={(e) => { nameValue = e.target.value; }}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] font-[500]">Frequência por Semana</label>
            <select
              className={inputClass}
              defaultValue={frequencyValue}
              onChange={(e) => { frequencyValue = e.target.value; }}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n}x por semana
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] font-[500]">Plataformas</label>
            <div className="flex flex-wrap gap-2">
              {platformOptions.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    const idx = platformsValue.indexOf(p);
                    if (idx >= 0) platformsValue.splice(idx, 1);
                    else platformsValue.push(p);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    platformsValue.includes(p)
                      ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                      : 'border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-black/20'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] font-[500]">Pilares de Conteúdo</label>
            <textarea
              className={`${inputClass} h-auto min-h-[80px] py-3 resize-none`}
              defaultValue={pillarsValue}
              onChange={(e) => { pillarsValue = e.target.value; }}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] font-[500]">Objetivos</label>
            <textarea
              className={`${inputClass} h-auto min-h-[80px] py-3 resize-none`}
              defaultValue={objectivesValue}
              onChange={(e) => { objectivesValue = e.target.value; }}
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] font-[500]">Fuso Horário</label>
            <select
              className={inputClass}
              defaultValue={timezoneValue}
              onChange={(e) => { timezoneValue = e.target.value; }}
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-[12px] justify-end mt-[8px]">
            <Button onClick={close}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!nameValue.trim()) {
                  toaster.show('O nome é obrigatório', 'warning');
                  return;
                }
                close();
                try {
                  const pillars = pillarsValue.split('\n').map((s) => s.trim()).filter(Boolean);
                  const objectives = objectivesValue.split('\n').map((s) => s.trim()).filter(Boolean);

                  await updatePlan(plan.id, {
                    name: nameValue.trim(),
                    frequencyPerWeek: parseInt(frequencyValue, 10),
                    platforms: platformsValue,
                    pillars,
                    objectives,
                    timezone: timezoneValue,
                  });
                  toaster.show('Plano atualizado!', 'success');
                  mutateEditorialPlans();
                  setSelectedPlan((prev) =>
                    prev?.id === plan.id ? { ...prev, name: nameValue.trim() } : prev
                  );
                } catch (err: any) {
                  toaster.show(err.message || 'Erro ao atualizar plano', 'warning');
                }
              }}
            >
              Salvar
            </Button>
          </div>
        </div>
      ),
    });
  };

  const handleGenerateCalendar = async (plan: EditorialPlan, days: number) => {
    setGenerating(plan.id);
    try {
      await generateCalendar(plan.id, days);
      toaster.show(`Calendário de ${days} dias gerado!`, 'success');
      mutateEditorialSlots(plan.id);
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao gerar calendário', 'warning');
    } finally {
      setGenerating(null);
    }
  };

  const handleSlotStatusChange = async (slot: EditorialSlot, newStatus: EditorialSlotStatus) => {
    try {
      await updateSlot(slot.id, { status: newStatus });
      toaster.show('Status atualizado', 'success');
      mutateEditorialSlots(slot.editorialPlanId);
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao atualizar status', 'warning');
    }
  };

  const handleRunGeneration = async (plan: EditorialPlan) => {
    setAutoGenerating(plan.id);
    try {
      await runGeneration(plan.id);
      toaster.show('Geração executada com sucesso!', 'success');
      mutateEditorialPlans();
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao executar geração', 'warning');
    } finally {
      setAutoGenerating(null);
    }
  };

  const handleToggleAuto = async (plan: EditorialPlan, autoGenerate: boolean) => {
    try {
      await toggleAutoGeneration(plan.id, autoGenerate);
      toaster.show(autoGenerate ? 'Auto-geração ativada' : 'Auto-geração desativada', 'success');
      mutateEditorialPlans();
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao atualizar auto-geração', 'warning');
    }
  };

  const handleGenerateOptions = (plan: EditorialPlan) => {
    modals.openModal({
      title: 'Gerar Calendário',
      closeOnEscape: true,
      closeOnClickOutside: true,
      size: '400px',
      children: (close: () => void) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gere slots para os próximos dias baseados na frequência do plano ({plan.frequencyPerWeek}x/semana).
          </p>
          {[
            { days: 30, label: '30 Dias' },
            { days: 60, label: '60 Dias' },
            { days: 90, label: '90 Dias' },
          ].map((opt) => (
            <button
              key={opt.days}
              onClick={() => {
                close();
                handleGenerateCalendar(plan, opt.days);
              }}
              className="flex items-center justify-between w-full px-4 py-3 rounded-[10px] border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-gray-400" />
                <div>
                  <span className="font-medium text-[15px]">{opt.label}</span>
                  <p className="text-xs text-gray-400">
                    ~{Math.ceil((opt.days / 7) * plan.frequencyPerWeek)} slots
                  </p>
                </div>
              </div>
              <Zap className="w-4 h-4 text-amber-500" />
            </button>
          ))}
        </div>
      ),
    });
  };

  // ---- LOADING ----
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // ---- ERROR ----
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <p className="text-gray-500">Erro ao carregar planos editoriais</p>
        <Button onClick={() => mutate()}>Tentar novamente</Button>
      </div>
    );
  }

  // ---- NO BRAND ----
  if (!brand?.id) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <Calendar className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-500">Nenhuma marca selecionada</h2>
        <p className="text-gray-400 text-center max-w-md">
          Selecione uma marca em Marcas antes de criar um plano editorial.
        </p>
      </div>
    );
  }

  // ---- SLOT DETAIL VIEW ----
  if (selectedPlan) {
    const groupedSlots = useMemo(() => {
      if (!slots) return {};
      const sorted = [...slots].sort(
        (a: EditorialSlot, b: EditorialSlot) =>
          new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      );
      const groups: Record<string, EditorialSlot[]> = {};
      sorted.forEach((slot: EditorialSlot) => {
        const key = new Date(slot.scheduledDate).toISOString().split('T')[0];
        if (!groups[key]) groups[key] = [];
        groups[key].push(slot);
      });
      return groups;
    }, [slots]);

    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setSelectedPlan(null)}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{selectedPlan.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedPlan.frequencyPerWeek}x/semana · {selectedPlan.platforms.join(', ')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => handleEdit(selectedPlan)}>
              <Edit3 className="w-4 h-4" />
              Editar
            </Button>
            <Button onClick={() => handleGenerateOptions(selectedPlan)} loading={generating === selectedPlan.id}>
              <CalendarDays className="w-4 h-4" />
              Gerar Calendário
            </Button>
          </div>
        </div>

        {/* Plan metadata */}
        <div className={`${cardClass} mb-6`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400 text-xs uppercase tracking-wide">Frequência</span>
              <p className="font-medium mt-1">{selectedPlan.frequencyPerWeek}x/semana</p>
            </div>
            <div>
              <span className="text-gray-400 text-xs uppercase tracking-wide">Timezone</span>
              <p className="font-medium mt-1">{selectedPlan.timezone}</p>
            </div>
            <div>
              <span className="text-gray-400 text-xs uppercase tracking-wide">Pilares</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedPlan.pillars.map((p) => (
                  <span key={p} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                    {p}
                  </span>
                ))}
                {selectedPlan.pillars.length === 0 && (
                  <span className="text-xs text-gray-400">Nenhum</span>
                )}
              </div>
            </div>
            <div>
              <span className="text-gray-400 text-xs uppercase tracking-wide">Objetivos</span>
                 <div className="flex flex-wrap gap-1 mt-1">
                   {selectedPlan.objectives.map((o) => (
                     <span key={o} className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                       {o}
                     </span>
                   ))}
                   {selectedPlan.objectives.length === 0 && (
                     <span className="text-xs text-gray-400">Nenhum</span>
                   )}
                 </div>
               </div>
              </div>
              </div>

              {/* Auto-Generation Config */}
              <div className={`${cardClass} mb-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Power className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">Auto-Generation Recorrente</span>
                </div>
                <button
                  onClick={() => handleToggleAuto(selectedPlan, !selectedPlan.autoGenerate)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    selectedPlan.autoGenerate
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      selectedPlan.autoGenerate ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Janela de Geração</span>
                  <p className="font-medium mt-1">{selectedPlan.generationWindow || '02:00-06:00'}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Limite Mensal</span>
                  <p className="font-medium mt-1">${selectedPlan.maxCostPerMonth ?? 50}/mês</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Última Execução</span>
                  <p className="font-medium mt-1">
                    {selectedPlan.lastRunAt
                      ? formatDate(selectedPlan.lastRunAt)
                      : <span className="text-gray-400">Nunca</span>
                    }
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs uppercase tracking-wide">Falhas Consecutivas</span>
                  <p className={`font-medium mt-1 ${(selectedPlan.consecutiveFails ?? 0) > 0 ? 'text-red-500' : ''}`}>
                    {selectedPlan.consecutiveFails ?? 0}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                <Button
                  onClick={() => handleRunGeneration(selectedPlan)}
                  loading={autoGenerating === selectedPlan.id}
                  disabled={!selectedPlan.autoGenerate}
                >
                  <RefreshCw className="w-4 h-4" />
                  Executar Agora
                </Button>
              </div>
              </div>

        {/* Slots */}
        {slotsLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <Loader className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : Object.keys(groupedSlots).length === 0 ? (
          <div className={`${cardClass} flex flex-col items-center justify-center h-[200px] gap-3`}>
            <CalendarDays className="w-10 h-10 text-gray-300" />
            <p className="text-gray-500">Nenhum slot gerado ainda</p>
            <p className="text-sm text-gray-400">Clique em &quot;Gerar Calendário&quot; para criar slots</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedSlots).map(([date, dateSlots]) => (
              <div key={date} className={cardClass}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium">
                    {getDayOfWeek(date)}, {formatDate(date)}
                  </span>
                </div>
                <div className="space-y-2">
                  {dateSlots.map((slot: EditorialSlot) => {
                    const statusConf = slotStatusConfig[slot.status] || slotStatusConfig.PLANNED;
                    return (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-3 rounded-[10px] border border-black/5 dark:border-white/5 hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">{slot.platform}</span>
                          {slot.pillar && (
                            <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                              {slot.pillar}
                            </span>
                          )}
                          {slot.objective && (
                            <span className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">
                              {slot.objective}
                            </span>
                          )}
                          {slot.notes && (
                            <span className="text-xs text-gray-400 truncate max-w-[200px]">
                              {slot.notes}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusConf.bg} ${statusConf.color}`}>
                            {statusConf.label}
                          </span>
                          <select
                            className="h-7 text-xs rounded border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] px-1 outline-none cursor-pointer"
                            value={slot.status}
                            onChange={(e) =>
                              handleSlotStatusChange(slot, e.target.value as EditorialSlotStatus)
                            }
                          >
                            {(Object.keys(slotStatusConfig) as EditorialSlotStatus[]).map((s) => (
                              <option key={s} value={s}>
                                {slotStatusConfig[s].label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- PLAN LIST VIEW ----
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Calendário Editorial</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredPlans.length} {filteredPlans.length === 1 ? 'plano' : 'planos'} editoria{filteredPlans.length !== 1 ? 'is' : 'l'}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4" />
          Novo Plano
        </Button>
      </div>

      {filteredPlans.length === 0 ? (
        <div className={`${cardClass} flex flex-col items-center justify-center h-[300px] gap-4`}>
          <Calendar className="w-16 h-16 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-500">Nenhum plano editorial</h2>
          <p className="text-gray-400 text-center max-w-md">
            Crie seu primeiro plano editorial para organizar e automatizar sua estratégia de conteúdo.
          </p>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4" />
            Criar Primeiro Plano
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPlans.map((plan: EditorialPlan) => (
            <div
              key={plan.id}
              className={`${cardClass} transition-all hover:shadow-sm cursor-pointer`}
              onClick={() => setSelectedPlan(plan)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[15px]">{plan.name}</span>
                    <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                      {plan.frequencyPerWeek}x/semana
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Globe className="w-3 h-3" />
                      {plan.platforms.join(', ')}
                    </div>
                    {plan.pillars.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Tag className="w-3 h-3" />
                        {plan.pillars.length} pilares
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {plan.timezone}
                    </div>
                    {plan.blackoutDates.length > 0 && (
                      <span className="text-xs text-red-400">
                        {plan.blackoutDates.length} dias bloqueados
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <Button onClick={(e) => { e.stopPropagation(); handleEdit(plan); }}>
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button onClick={(e) => { e.stopPropagation(); handleGenerateOptions(plan); }} loading={generating === plan.id}>
                    <CalendarDays className="w-4 h-4" />
                  </Button>
                  <Button onClick={(e) => { e.stopPropagation(); handleDelete(plan); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
