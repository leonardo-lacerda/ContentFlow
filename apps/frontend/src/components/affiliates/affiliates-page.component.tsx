'use client';

import React, { useState, useEffect } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Button } from '@gitroom/react/form/button';
import {
  PageShell,
  PageHeader,
  PageBody,
  EmptyState,
  SectionCard,
  FormField,
  FormInput,
} from '@gitroom/frontend/components/new-layout/page-system';

interface AffiliateStats {
  affiliate: {
    code: string;
    status: string;
    commissionRate: number;
  };
  stats: {
    totalClicks: number;
    totalConversions: number;
    totalEarnings: number;
    pendingEarnings: number;
    conversionRate: string;
  };
  referralsByStatus: Record<string, number>;
}

export function AffiliatesPage() {
  const fetch = useFetch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [affiliate, setAffiliate] = useState<any>(null);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadAffiliate();
  }, []);

  const loadAffiliate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/affiliates/me');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setAffiliate(data);
          const statsRes = await fetch('/affiliates/stats');
          if (statsRes.ok) {
            setStats(await statsRes.json());
          }
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email) return;
    setRegistering(true);
    setError(null);
    try {
      const res = await fetch('/affiliates/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Falha ao registrar');
      }
      await loadAffiliate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRegistering(false);
    }
  };

  const referralLink = affiliate
    ? `https://contentflow.com/ref/${affiliate.code}`
    : '';

  const handleCopy = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) {
    return (
      <PageShell>
        <PageBody className="!p-0">
          <div className="flex flex-1 items-center justify-center min-h-[320px] text-[13px] text-textItemBlur">
            Carregando...
          </div>
        </PageBody>
      </PageShell>
    );
  }

  if (!affiliate) {
    return (
      <PageShell>
        <PageHeader description="Indique o ContentFlow e acompanhe comissões em um só lugar." />
        <PageBody>
          <SectionCard
            title="Tornar-se afiliado"
            description="Cadastre-se para receber um link de indicação e acompanhar seus resultados."
            className="max-w-[520px]"
          >
            <div className="flex flex-col gap-[14px]">
              <FormField label="Seu nome" required>
                <FormInput
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo"
                />
              </FormField>
              <FormField label="Seu e-mail" required>
                <FormInput
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </FormField>
              {error ? (
                <div className="text-[13px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-[10px] p-[12px]">
                  {error}
                </div>
              ) : null}
              <div className="flex justify-end">
                <Button
                  onClick={handleRegister}
                  loading={registering}
                  disabled={!name || !email}
                >
                  Tornar-se afiliado
                </Button>
              </div>
            </div>
          </SectionCard>
        </PageBody>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        description="Acompanhe cliques, conversões e ganhos do seu link de indicação."
        actions={
          <span
            className={`text-[11px] font-[600] px-[10px] py-[4px] rounded-full ${
              affiliate.status === 'ACTIVE'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-amber-500/15 text-amber-400'
            }`}
          >
            {affiliate.status}
          </span>
        }
      />
      <PageBody>
        <div className="flex flex-col gap-[16px]">
          <div className="text-[13px] text-textItemBlur">
            Código:{' '}
            <span className="font-[600] text-newTextColor">
              {affiliate.code}
            </span>
          </div>

          {stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
              {[
                { label: 'Cliques', value: stats.stats.totalClicks },
                { label: 'Conversões', value: stats.stats.totalConversions },
                {
                  label: 'Taxa de conversão',
                  value: `${stats.stats.conversionRate}%`,
                },
                {
                  label: 'Ganhos totais',
                  value: `R$ ${Number(stats.stats.totalEarnings || 0).toFixed(2)}`,
                },
              ].map((item) => (
                <SectionCard key={item.label} className="!p-[14px]">
                  <div className="text-[22px] font-[700] text-newTextColor leading-none">
                    {item.value}
                  </div>
                  <div className="text-[12px] text-textItemBlur mt-[8px]">
                    {item.label}
                  </div>
                </SectionCard>
              ))}
            </div>
          ) : null}

          <SectionCard
            title="Seu link de indicação"
            description="Compartilhe este link para registrar conversões na sua conta."
          >
            <div className="flex items-center gap-[8px]">
              <FormInput readOnly value={referralLink} className="flex-1" />
              <Button secondary onClick={handleCopy} className="shrink-0">
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </SectionCard>
        </div>
      </PageBody>
    </PageShell>
  );
}
