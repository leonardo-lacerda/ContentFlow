'use client';

import { FC, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useBrands, useSelectedBrand, mutateBrands } from './brand-dna.hooks';
import { selectBrand } from './brand-dna.service';
import { BrandProfile } from './brand-dna.types';
import { BrandStatusBadge } from './brand-status-badge.component';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { ChevronDown, CheckCircle, Plus, Building2 } from 'lucide-react';
import clsx from 'clsx';

export const BrandSelector: FC = () => {
  const toaster = useToaster();
  const { data: brands, isLoading } = useBrands();
  const { data: selected } = useSelectedBrand();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const list: BrandProfile[] = Array.isArray(brands)
    ? brands
    : brands?.data || [];

  // Hide if no brands exist or only one brand (nothing to select)
  if (isLoading || list.length === 0) {
    return null;
  }

  const currentName = selected?.name || 'Selecionar marca';

  const handleSelect = useCallback(
    async (brand: BrandProfile) => {
      if (brand.selected) {
        setOpen(false);
        return;
      }
      try {
        await selectBrand(brand.id);
        mutateBrands();
        setOpen(false);
      } catch (err: any) {
        toaster.show(err.message || 'Erro ao selecionar marca', 'warning');
      }
    },
    [toaster]
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-[12px] text-textItemBlur hover:text-newTextColor transition-colors px-3 py-2 rounded-[8px] hover:bg-boxFocused max-w-[180px]"
      >
        <Building2 className="w-4 h-4 shrink-0" />
        <span className="truncate">{currentName}</span>
        <ChevronDown
          className={clsx(
            'w-3 h-3 shrink-0 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-[240px] bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-[10px] shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-black/5 dark:border-white/5">
            <span className="text-[11px] font-medium text-black/40 dark:text-white/40 px-2 uppercase tracking-wider">
              Marcas
            </span>
          </div>

          <div className="max-h-[300px] overflow-y-auto py-1">
            {list.map((brand) => (
              <button
                key={brand.id}
                onClick={() => handleSelect(brand)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors',
                  brand.selected && 'bg-green-50 dark:bg-green-900/20'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-black dark:text-white truncate">
                      {brand.name}
                    </span>
                    {brand.selected && (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    )}
                  </div>
                  {brand.website && (
                    <p className="text-[11px] text-black/40 dark:text-white/40 truncate mt-0.5">
                      {brand.website}
                    </p>
                  )}
                </div>
                <BrandStatusBadge status={brand.status} />
              </button>
            ))}
          </div>

          <div className="border-t border-black/5 dark:border-white/5 p-1">
            <Link
              href="/brands"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-[6px] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Gerenciar marcas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
