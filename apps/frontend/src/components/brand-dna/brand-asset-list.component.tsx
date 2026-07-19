'use client';

import { useCallback, useState } from 'react';
import { useAssets } from './brand-dna.hooks';
import { BrandAsset } from './brand-dna.types';
import { approveAsset, deleteAsset } from './brand-dna.service';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { Button } from '@gitroom/react/form/button';
import { mutate } from 'swr';
import {
  Image,
  FileType,
  CheckCircle,
  XCircle,
  Loader,
  Trash2,
  ThumbsUp,
} from 'lucide-react';
import clsx from 'clsx';

const assetTypeIcons: Record<string, any> = {
  image: Image,
  logo: Image,
  screenshot: Image,
  document: FileType,
  video: FileType,
};

function AssetIcon({ type }: { type: string }) {
  const Icon = assetTypeIcons[type?.toLowerCase()] || FileType;
  return <Icon className="w-8 h-8 text-textItemBlur" />;
}

export function BrandAssetList({ brandId }: { brandId: string }) {
  const { data: assets, isLoading, error } = useAssets(brandId);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const toaster = useToaster();

  const list: BrandAsset[] = Array.isArray(assets) ? assets : assets?.data || [];

  const refreshAssets = useCallback(() => {
    mutate(`assets-${brandId}`);
  }, [brandId]);

  const handleApprove = useCallback(
    async (asset: BrandAsset) => {
      setProcessingIds((prev) => new Set(prev).add(asset.id));
      try {
        await approveAsset(brandId, asset.id);
        toaster.show('Asset aprovado com sucesso!', 'success');
        refreshAssets();
      } catch (err: any) {
        toaster.show(err.message || 'Erro ao aprovar asset', 'warning');
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(asset.id);
          return next;
        });
      }
    },
    [brandId, refreshAssets, toaster]
  );

  const handleDelete = useCallback(
    async (asset: BrandAsset) => {
      setProcessingIds((prev) => new Set(prev).add(asset.id));
      try {
        await deleteAsset(brandId, asset.id);
        toaster.show('Asset descartado.', 'success');
        refreshAssets();
      } catch (err: any) {
        toaster.show(err.message || 'Erro ao descartar asset', 'warning');
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(asset.id);
          return next;
        });
      }
    },
    [brandId, refreshAssets, toaster]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-textItemBlur">
        <Loader className="w-5 h-5 animate-spin mr-2" />
        Carregando assets...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 py-4 text-center text-sm">
        Erro ao carregar assets: {error.message}
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-textItemBlur">
        <Image className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Nenhum asset extraído ainda.</p>
        <p className="text-xs mt-1">
          Analyze o site da marca para gerar assets automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((asset) => {
        const isProcessing = processingIds.has(asset.id);

        return (
          <div
            key={asset.id}
            className={clsx(
              'flex flex-col rounded-[10px] border overflow-hidden transition-all',
              asset.approved
                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                : 'border-newTableBorder bg-newSettings'
            )}
          >
            {/* Thumbnail area */}
            <div className="h-40 bg-newBgColorInner flex items-center justify-center overflow-hidden">
              {asset.sourceUrl ? (
                <img
                  src={asset.sourceUrl}
                  alt={asset.type}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      parent.classList.add('flex', 'items-center', 'justify-center');
                    }
                  }}
                />
              ) : (
                <AssetIcon type={asset.type} />
              )}
            </div>

            {/* Info area */}
            <div className="p-3 flex-1 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-newTextColor capitalize truncate">
                  {asset.type}
                </span>
                {asset.approved ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" />
                    Aprovado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800 px-2 py-0.5 rounded-full">
                    <Loader className="w-3 h-3" />
                    Pendente
                  </span>
                )}
              </div>

              <div className="text-[11px] text-textItemBlur">
                {new Date(asset.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>

              {/* Actions */}
              {!asset.approved && (
                <div className="flex gap-2 mt-auto pt-2">
                  <Button
                    onClick={() => handleApprove(asset)}
                    disabled={isProcessing}
                    className="flex-1 !text-[12px] !px-[12px]"
                    loading={isProcessing}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Aprovar
                  </Button>
                  <Button
                    onClick={() => handleDelete(asset)}
                    disabled={isProcessing}
                    className="flex-1 !text-[12px] !px-[12px]"
                    secondary
                    loading={isProcessing}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Descartar
                  </Button>
                </div>
              )}

              {asset.approved && (
                <div className="flex gap-2 mt-auto pt-2">
                  <Button
                    onClick={() => handleDelete(asset)}
                    disabled={isProcessing}
                    className="flex-1 !text-[12px] !px-[12px]"
                    secondary
                    loading={isProcessing}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remover
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
