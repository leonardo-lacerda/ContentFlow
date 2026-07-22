'use client';

import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  const list: BrandProfile[] = useMemo(
    () => (Array.isArray(brands) ? brands : brands?.data || []),
    [brands]
  );

  const currentName = selected?.name || 'Selecionar marca';
  const shouldHide = isLoading || list.length === 0;

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

  // Close on outside click — hooks must stay above any early return
  useEffect(() => {
    if (!open || shouldHide) {
      return;
    }
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, shouldHide]);

  // Hide if no brands exist (nothing to select yet)
  if (shouldHide) {
    return null;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
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
        <div className="absolute top-full left-0 mt-1 w-[240px] bg-newSettings border border-newTableBorder rounded-[10px] shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-newTableBorder">
            <span className="text-[11px] font-medium text-textItemBlur px-2 uppercase tracking-wider">
              Marcas
            </span>
          </div>
          <div className="max-h-[280px] overflow-y-auto p-1">
            {list.map((brand) => (
              <button
                type="button"
                key={brand.id}
                onClick={() => handleSelect(brand)}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-[6px] text-left transition-colors',
                  brand.selected
                    ? 'bg-boxFocused text-newTextColor'
                    : 'text-textItemBlur hover:bg-boxFocused hover:text-newTextColor'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium truncate">
                      {brand.name}
                    </span>
                    {brand.selected && (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    )}
                  </div>
                  {brand.status && (
                    <div className="mt-0.5">
                      <BrandStatusBadge status={brand.status} />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="p-1 border-t border-newTableBorder">
            <Link
              href="/brands"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-textItemBlur hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-[6px] transition-colors"
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
