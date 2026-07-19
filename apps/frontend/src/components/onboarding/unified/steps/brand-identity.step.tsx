'use client';

import { Building2, Globe } from 'lucide-react';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { formControlClass } from '@gitroom/frontend/components/new-layout/page-system';
import {
  createBrand,
  selectBrand,
  updateBrand,
} from '@gitroom/frontend/components/brand-dna/brand-dna.service';
import { StepFooter } from '../ui/step-footer';
import {
  industryOptions,
  type UnifiedOnboardingContext,
} from '../unified-onboarding.types';

const inputClass = formControlClass + ' h-[48px]';

export function BrandIdentityStep({ ctx }: { ctx: UnifiedOnboardingContext }) {
  const t = useT();
  const { brandForm, setBrandForm } = ctx;

  const save = async () => {
    if (!brandForm.name.trim()) {
      ctx.setError(
        t('onboarding_brand_name_required', 'O nome da marca é obrigatório')
      );
      return;
    }
    ctx.setLoading(true);
    ctx.setError('');
    try {
      let brandId = ctx.brandId;
      if (brandId) {
        await updateBrand(brandId, {
          name: brandForm.name.trim(),
          website: brandForm.website.trim() || undefined,
          industry: brandForm.industry || undefined,
        });
      } else {
        const brand = await createBrand({
          name: brandForm.name.trim(),
          website: brandForm.website.trim() || undefined,
          industry: brandForm.industry || undefined,
        });
        brandId = brand.id;
        ctx.setBrandId(brandId);
      }
      await selectBrand(brandId);
      // v1: Brand DNA é a fonte da verdade — sem dual-write Company Profile
      await ctx.persistProgress({ brandId, currentStep: 'brand-analyze' });
      ctx.goNext();
    } catch (err: any) {
      ctx.setError(
        err?.message ||
          t('onboarding_brand_save_error', 'Erro ao salvar a marca')
      );
    } finally {
      ctx.setLoading(false);
    }
  };

  return (
    <div className="rounded-[14px] border border-newTableBorder bg-newSettings p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-[800] text-newTextColor">
          {t('onboarding_brand_title', 'Sua marca')}
        </h2>
        <p className="text-sm text-textItemBlur mt-1">
          {t(
            'onboarding_brand_subtitle',
            'Informe o nome e, se tiver, o site. Usaremos isso para gerar o Brand DNA e alimentar o studio de IA.'
          )}
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-[700] text-newTextColor flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {t('onboarding_brand_name', 'Nome da marca')}
          </span>
          <input
            className={inputClass}
            value={brandForm.name}
            onChange={(e) =>
              setBrandForm((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder={t(
              'onboarding_brand_name_ph',
              'Ex.: Acme SaaS'
            )}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-[700] text-newTextColor flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t('onboarding_brand_website', 'Website (opcional)')}
          </span>
          <input
            className={inputClass}
            value={brandForm.website}
            onChange={(e) =>
              setBrandForm((prev) => ({ ...prev, website: e.target.value }))
            }
            placeholder="https://..."
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-[700] text-newTextColor">
            {t('onboarding_brand_industry', 'Indústria (opcional)')}
          </span>
          <div className="flex flex-wrap gap-2">
            {industryOptions.map((opt) => {
              const active = brandForm.industry === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    setBrandForm((prev) => ({
                      ...prev,
                      industry: active ? '' : opt,
                    }))
                  }
                  className={`rounded-full border px-[14px] py-[9px] text-[13px] font-[700] transition ${
                    active
                      ? 'border-stone-900 bg-stone-900 text-white dark:border-white dark:bg-white dark:text-stone-900'
                      : 'border-newTableBorder bg-newBgColorInner text-textItemBlur hover:text-newTextColor'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <StepFooter
        onBack={ctx.goBack}
        onNext={save}
        onSkip={ctx.skipStep}
        loading={ctx.loading}
        nextLabel={t('onboarding_brand_continue', 'Salvar e continuar')}
        nextDisabled={!brandForm.name.trim()}
      />
    </div>
  );
}
