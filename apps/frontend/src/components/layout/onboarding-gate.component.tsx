'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useSelectedBrand } from '@gitroom/frontend/components/brand-dna/brand-dna.hooks';

/**
 * ContentFlow v1: força onboarding se a conta ainda não tem marca/DNA
 * e o wizard nunca foi concluído.
 *
 * Permitido fora do gate: onboarding, billing, settings, oauth.
 * Contas legadas com marca já criada não são bloqueadas.
 */
const ALLOW_PREFIXES = [
  '/onboarding',
  '/billing',
  '/settings',
  '/auth',
  '/integrations',
  '/oauth',
  '/p/',
  '/err',
];

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const fetch = useFetch();
  const { data: brand, isLoading: brandLoading } = useSelectedBrand();

  const { data: onboarding, isLoading: onboardingLoading } = useSWR(
    'onboarding-gate',
    async () => {
      const res = await fetch('/settings/onboarding');
      if (!res.ok) return { completedAt: new Date().toISOString() };
      return res.json();
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const allowed = ALLOW_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p)
  );

  useEffect(() => {
    if (brandLoading || onboardingLoading) return;
    if (allowed) return;

    // Wizard concluído → ok
    if (onboarding?.completedAt) return;

    // Já tem marca (legado ou skip parcial) → não bloqueia o app
    if (brand?.id) return;

    router.replace('/onboarding');
  }, [
    brand,
    brandLoading,
    onboarding,
    onboardingLoading,
    allowed,
    router,
    pathname,
  ]);

  return <>{children}</>;
}
