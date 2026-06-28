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
  AlertTriangle,
  Ban,
  Cpu,
  Trash2,
} from 'lucide-react';

const statusConfig: Record<GenerationJobStatus, { label: string; color: string; icon: any }> = {
  QUEUED: {
    label: 'Na fila',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    icon: Clock,
  },
  RUNNING: {
    label: 'Executando',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    icon: Loader,
  },
  WAITING_PROVIDER: {
    label: 'Aguardando provider',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    icon: Clock,
  },
  COMPLETED: {
    label: 'Concluido',
    color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    icon: CheckCircle,
  },
  FAILED: {
    label: 'Falhou',
    color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    icon: XCircle,
  },
  CANCELLED: {
    label: 'Cancelado',
    color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    icon: Ban,
  },
};

const typeLabels: Record<string, string> = {
  BRAND_DNA_EXTRACTION: 'Extracao de Brand DNA',
  IDEA_GENERATION: 'Geracao de Ideias',
  CAROUSEL_PLAN: 'Plano de Carrossel',
  IMAGE_GENERATION: 'Geracao de Imagens',
  CAPTION_GENERATION: 'Geracao de Caption',
  BULK_GENERATION: 'Geracao em Lote',
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
      <div className="flex items-center justify-center h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <AlertTriangle className="w-12 h-12 text-red-400" />
        <p className="text-gray-500">Erro ao carregar jobs</p>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <Cpu className="w-16 h-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-500">Nenhum job registrado</h2>
        <p className="text-gray-400 text-center max-w-md">
          Jobs de geracao aparecerem aqui quando voce criar carrosseis, gerar ideias ou extrair Brand DNA.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Jobs de Geracao</h1>
          <p className="text-sm text-gray-500 mt-1">
            {list.length} job{list.length !== 1 ? 's' : ''} registrado{list.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => mutateJobs()} secondary>
          Atualizar
        </Button>
      </div>

      <div className="space-y-3">
        {list.map((job) => {
          const config = statusConfig[job.status] || statusConfig.QUEUED;
          const Icon = config.icon;
          const isActive = ['QUEUED', 'RUNNING', 'WAITING_PROVIDER'].includes(job.status);

          return (
            <div
              key={job.id}
              className="rounded-[12px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] p-4 transition-all hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0">
                    <Icon className={`w-5 h-5 ${isActive ? 'animate-spin' : ''}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-black dark:text-white">
                        {typeLabels[job.type] || job.type}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{new Date(job.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {job.model && <span>{job.model}</span>}
                      {job.provider && <span>{job.provider}</span>}
                      {job.costEstimate != null && <span>${job.costEstimate.toFixed(4)}</span>}
                    </div>
                    {job.error && (
                      <p className="text-xs text-red-500 mt-1 truncate">{job.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4 shrink-0">
                  {isActive && (
                    <Button onClick={() => handleCancel(job)} secondary className="!px-3 !py-1.5">
                      <Trash2 className="w-3.5 h-3.5" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
