'use client';

import { useJobs, mutateJobs } from './generation-jobs.hooks';
import { GenerationJob, GenerationJobStatus } from './generation-jobs.types';
import { cancelJob } from './generation-jobs.service';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Loader,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Cpu,
  Trash2,
} from 'lucide-react';
import {
  PageShell,
  PageHeader,
  PageBody,
  EmptyState,
  SectionCard,
} from '@gitroom/frontend/components/new-layout/page-system';

const statusConfig: Record<
  GenerationJobStatus,
  { label: string; className: string; icon: any }
> = {
  QUEUED: {
    label: 'Na fila',
    className: 'bg-newSettings text-textItemBlur border border-newTableBorder',
    icon: Clock,
  },
  RUNNING: {
    label: 'Executando',
    className: 'bg-btnPrimary/20 text-newTextColor',
    icon: Loader,
  },
  WAITING_PROVIDER: {
    label: 'Aguardando provider',
    className: 'bg-amber-500/15 text-amber-400',
    icon: Clock,
  },
  COMPLETED: {
    label: 'Concluído',
    className: 'bg-emerald-500/15 text-emerald-400',
    icon: CheckCircle,
  },
  FAILED: {
    label: 'Falhou',
    className: 'bg-red-500/15 text-red-400',
    icon: XCircle,
  },
  CANCELLED: {
    label: 'Cancelado',
    className: 'bg-newSettings text-textItemBlur border border-newTableBorder',
    icon: Ban,
  },
};

const typeLabels: Record<string, string> = {
  BRAND_DNA_EXTRACTION: 'Extração de Brand DNA',
  IDEA_GENERATION: 'Geração de ideias',
  CAROUSEL_PLAN: 'Plano de carrossel',
  IMAGE_GENERATION: 'Geração de imagens',
  CAPTION_GENERATION: 'Geração de caption',
  BULK_GENERATION: 'Geração em lote',
};

export function JobsListPage() {
  const { data: jobs, isLoading, error } = useJobs();
  const toaster = useToaster();

  const list: GenerationJob[] = Array.isArray(jobs) ? jobs : jobs?.data || [];

  const handleCancel = async (job: GenerationJob) => {
    try {
      await cancelJob(job.id);
      toaster.show('Job cancelado', 'success');
      mutateJobs();
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao cancelar job', 'warning');
    }
  };

  if (isLoading) {
    return (
      <PageShell>
        <PageBody className="!p-0">
          <div className="flex flex-1 items-center justify-center min-h-[320px]">
            <Loader className="w-8 h-8 animate-spin text-textItemBlur" />
          </div>
        </PageBody>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <PageBody className="!p-0">
          <EmptyState
            title="Erro ao carregar jobs"
            description="Não foi possível carregar os jobs de geração."
            actionLabel="Atualizar"
            onAction={() => mutateJobs()}
          />
        </PageBody>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        description={
          list.length
            ? `${list.length} job${list.length !== 1 ? 's' : ''} registrado${list.length !== 1 ? 's' : ''}`
            : 'Acompanhe extrações, gerações e processamentos em segundo plano.'
        }
        actions={
          <Button secondary onClick={() => mutateJobs()}>
            Atualizar
          </Button>
        }
      />
      <PageBody className={!list.length ? '!p-0' : undefined}>
        {!list.length ? (
          <EmptyState
            icon={<Cpu className="w-5 h-5" />}
            title="Nenhum job registrado"
            description="Jobs de geração aparecem aqui quando você cria carrosséis, gera ideias ou extrai Brand DNA."
          />
        ) : (
          <div className="flex flex-col gap-[10px]">
            {list.map((job) => {
              const config = statusConfig[job.status] || statusConfig.QUEUED;
              const Icon = config.icon;
              const isActive = [
                'QUEUED',
                'RUNNING',
                'WAITING_PROVIDER',
              ].includes(job.status);

              return (
                <SectionCard key={job.id} className="!p-[14px]">
                  <div className="flex items-center gap-[12px]">
                    <div className="flex items-center justify-center w-[40px] h-[40px] rounded-[10px] bg-newSettings border border-newTableBorder shrink-0">
                      <Icon
                        className={`w-4 h-4 text-textItemBlur ${
                          isActive && job.status === 'RUNNING'
                            ? 'animate-spin'
                            : ''
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-[8px] flex-wrap">
                        <span className="text-[14px] font-[600] text-newTextColor">
                          {typeLabels[job.type] || job.type}
                        </span>
                        <span
                          className={`inline-flex items-center text-[11px] font-[600] px-[8px] py-[2px] rounded-full ${config.className}`}
                        >
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-[10px] mt-[4px] text-[12px] text-textItemBlur flex-wrap">
                        <span>
                          {new Date(job.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {job.model ? <span>{job.model}</span> : null}
                        {job.provider ? <span>{job.provider}</span> : null}
                        {job.costEstimate != null ? (
                          <span>${job.costEstimate.toFixed(4)}</span>
                        ) : null}
                      </div>
                      {job.error ? (
                        <p className="text-[12px] text-red-400 mt-[4px] truncate">
                          {job.error}
                        </p>
                      ) : null}
                    </div>
                    {isActive ? (
                      <Button
                        secondary
                        className="!h-[32px] !text-[12px] shrink-0"
                        onClick={() => handleCancel(job)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Cancelar
                      </Button>
                    ) : null}
                  </div>
                </SectionCard>
              );
            })}
          </div>
        )}
      </PageBody>
    </PageShell>
  );
}
