'use client';

import { useState, useCallback } from 'react';
import { ApprovalStatus } from '../content-ideas/content-ideas.types';
import {
  requestApproval,
  approveProject,
  rejectProject,
} from '../content-ideas/content-ideas.service';
import { mutateProject } from '../content-ideas/content-ideas.hooks';
import { Button } from '@gitroom/react/form/button';
import { useToaster } from '@gitroom/react/toaster/toaster';
import {
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Shield,
  AlertTriangle,
  Loader,
} from 'lucide-react';
import clsx from 'clsx';

const statusConfig: Record<
  ApprovalStatus,
  { label: string; color: string; icon: any }
> = {
  NONE: {
    label: 'Sem aprovação',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    icon: Shield,
  },
  PENDING: {
    label: 'Pendente',
    color:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    icon: Clock,
  },
  APPROVED: {
    label: 'Aprovado',
    color:
      'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    icon: CheckCircle,
  },
  REJECTED: {
    label: 'Rejeitado',
    color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    icon: XCircle,
  },
};

interface ApprovalPanelProps {
  projectId: string;
  approvalStatus?: ApprovalStatus;
  approvedAt?: string;
  rejectionReason?: string;
  onUpdate: () => void;
}

export function ApprovalPanel({
  projectId,
  approvalStatus = 'NONE',
  approvedAt,
  rejectionReason,
  onUpdate,
}: ApprovalPanelProps) {
  const toaster = useToaster();
  const [loading, setLoading] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const config = statusConfig[approvalStatus];
  const Icon = config.icon;

  const handleRequestApproval = useCallback(async () => {
    setLoading(true);
    try {
      await requestApproval(projectId);
      mutateProject(projectId);
      onUpdate();
      toaster.show('Aprovação solicitada!', 'success');
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao solicitar aprovação', 'warning');
    } finally {
      setLoading(false);
    }
  }, [projectId, onUpdate, toaster]);

  const handleApprove = useCallback(async () => {
    setLoading(true);
    try {
      await approveProject(projectId);
      mutateProject(projectId);
      onUpdate();
      toaster.show('Projeto aprovado! ✅', 'success');
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao aprovar projeto', 'warning');
    } finally {
      setLoading(false);
    }
  }, [projectId, onUpdate, toaster]);

  const handleReject = useCallback(async () => {
    setLoading(true);
    try {
      await rejectProject(projectId, rejectReason || undefined);
      mutateProject(projectId);
      onUpdate();
      setShowRejectInput(false);
      setRejectReason('');
      toaster.show('Projeto rejeitado', 'success');
    } catch (err: any) {
      toaster.show(err.message || 'Erro ao rejeitar projeto', 'warning');
    } finally {
      setLoading(false);
    }
  }, [projectId, rejectReason, onUpdate, toaster]);

  return (
    <div className="rounded-[12px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#171717] p-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Aprovação
        </h3>
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            config.color
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {config.label}
        </span>
      </div>

      {/* Approval Info */}
      {approvalStatus === 'APPROVED' && approvedAt && (
        <div className="mb-3 p-2 rounded-[8px] bg-green-50 dark:bg-green-900/20 text-xs text-green-700 dark:text-green-300">
          Aprovado em {new Date(approvedAt).toLocaleDateString('pt-BR')}
        </div>
      )}

      {approvalStatus === 'REJECTED' && rejectionReason && (
        <div className="mb-3 p-2 rounded-[8px] bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-300 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Motivo da rejeição:
          </div>
          <p className="text-xs text-red-600 dark:text-red-400">
            {rejectionReason}
          </p>
        </div>
      )}

      {/* Reject Reason Input */}
      {showRejectInput && (
        <div className="mb-3">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Motivo da rejeição (opcional)..."
            className="w-full p-2 text-xs rounded-[8px] border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
            rows={3}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {(approvalStatus === 'NONE' || approvalStatus === 'REJECTED') && (
          <Button
            onClick={handleRequestApproval}
            disabled={loading}
            className="!px-3 !py-1.5 !text-xs"
          >
            {loading ? (
              <Loader className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Solicitar Aprovação
          </Button>
        )}

        {approvalStatus === 'PENDING' && (
          <>
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="!px-3 !py-1.5 !text-xs"
            >
              {loading ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
              Aprovar
            </Button>

            {!showRejectInput ? (
              <Button
                onClick={() => setShowRejectInput(true)}
                disabled={loading}
                secondary
                className="!px-3 !py-1.5 !text-xs"
              >
                <XCircle className="w-3.5 h-3.5" />
                Rejeitar
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleReject}
                  disabled={loading}
                  secondary
                  className="!px-3 !py-1.5 !text-xs !bg-red-50 !text-red-700 dark:!bg-red-900/30 dark:!text-red-300"
                >
                  {loading ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  Confirmar Rejeição
                </Button>
                <Button
                  onClick={() => {
                    setShowRejectInput(false);
                    setRejectReason('');
                  }}
                  disabled={loading}
                  secondary
                  className="!px-3 !py-1.5 !text-xs"
                >
                  Cancelar
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
