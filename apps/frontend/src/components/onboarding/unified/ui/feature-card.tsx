'use client';

import clsx from 'clsx';
import { ExternalLink, Check } from 'lucide-react';
import { Button } from '@gitroom/react/form/button';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import type { FeatureCardDef } from '../unified-onboarding.types';

export function FeatureCard({
  feature,
  opened,
  skipped,
  onOpen,
  onLater,
}: {
  feature: FeatureCardDef;
  opened: boolean;
  skipped: boolean;
  onOpen: () => void;
  onLater: () => void;
}) {
  const t = useT();
  const Icon = feature.icon;
  const seen = opened || skipped;

  return (
    <div
      className={clsx(
        'rounded-[14px] border bg-newSettings p-4 flex flex-col gap-3 transition',
        seen
          ? 'border-green-300/60 dark:border-green-800/50'
          : 'border-newTableBorder'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-[10px] bg-newBgColorInner border border-newTableBorder flex items-center justify-center shrink-0">
          {Icon ? (
            <Icon className="w-5 h-5 text-newTextColor" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-newTextColor/40" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-[15px] font-[800] text-newTextColor truncate">
              {t(feature.titleKey, feature.titleDefault)}
            </h4>
            {seen && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-600 dark:text-green-400">
                <Check className="w-3 h-3" />
                {opened
                  ? t('onboarding_feature_opened', 'Aberta')
                  : t('onboarding_feature_later', 'Depois')}
              </span>
            )}
          </div>
          <p className="text-[13px] text-textItemBlur mt-1 leading-snug">
            {t(feature.descriptionKey, feature.descriptionDefault)}
          </p>
          <p className="text-[12px] text-textItemBlur/80 mt-1.5 leading-snug">
            {t(feature.whyKey, feature.whyDefault)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-auto pt-1">
        <Button onClick={onOpen} className="flex-1">
          {t('onboarding_feature_open', 'Abrir')}
          <ExternalLink className="w-3.5 h-3.5 ml-2" />
        </Button>
        {!seen && (
          <Button onClick={onLater} secondary className="flex-1">
            {t('onboarding_feature_skip', 'Depois')}
          </Button>
        )}
      </div>
    </div>
  );
}
