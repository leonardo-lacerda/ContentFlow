'use client';

import clsx from 'clsx';
import { CheckCircle } from 'lucide-react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
  stepIndex,
} from '../unified-onboarding.types';

export function OnboardingStepper({
  current,
  onJump,
}: {
  current: OnboardingStepId;
  onJump?: (id: OnboardingStepId) => void;
}) {
  const t = useT();
  const currentIdx = stepIndex(current);

  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
      {ONBOARDING_STEPS.map((s, i) => {
        const Icon = s.icon;
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        const clickable = !!onJump && i <= currentIdx;

        return (
          <div key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onJump?.(s.id)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition whitespace-nowrap',
                isDone &&
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                isCurrent && 'bg-boxFocused text-textItemFocused',
                !isDone &&
                  !isCurrent &&
                  'bg-newBgColorInner text-textItemBlur border border-newTableBorder',
                clickable && 'cursor-pointer hover:opacity-90',
                !clickable && 'cursor-default'
              )}
            >
              {isDone ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <Icon className="w-4 h-4 shrink-0" />
              )}
              <span className="hidden sm:inline">
                {t(s.labelKey, s.labelDefault)}
              </span>
            </button>
            {i < ONBOARDING_STEPS.length - 1 && (
              <div
                className={clsx(
                  'h-[2px] flex-1 min-w-[8px]',
                  isDone
                    ? 'bg-green-300 dark:bg-green-700'
                    : 'bg-newTableBorder'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
