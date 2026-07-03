'use client';

import React, { useState, useEffect } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';

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
        throw new Error(data.message || 'Failed to register');
      }
      await loadAffiliate();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p style={{ color: 'var(--muted, #888)' }}>Carregando...</p>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Programa de Afiliados</h1>
        <p style={{ color: 'var(--muted, #888)' }}>
          Indique o ContentFlow e ganhe comissão por cada novo assinante.
        </p>

        <div className="rounded-lg p-6 space-y-4 border" style={{ background: 'var(--card, white)' }}>
          <h2 className="text-lg font-semibold">Como funciona</h2>
          <ul className="space-y-2 text-sm">
            <li>✅ Receba um link único de indicação</li>
            <li>✅ Ganhe 20% de comissão por cada assinatura convertida</li>
            <li>✅ Acompanhe cliques, conversões e ganhos em tempo real</li>
            <li>✅ Pagamento mensal via transferência</li>
          </ul>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Seu nome *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Seu email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <button
            onClick={handleRegister}
            disabled={registering || !name || !email}
            className="px-4 py-2 text-white rounded text-sm font-medium disabled:opacity-50"
            style={{ background: 'var(--primary, #3b82f6)' }}
          >
            {registering ? 'Registrando...' : 'Tornar-se afiliado'}
          </button>

          {error && (
            <div className="p-3 rounded text-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard de Afiliados</h1>

      <div className="flex items-center gap-2">
        <span
          className="px-2 py-0.5 rounded text-xs font-medium"
          style={{
            background: affiliate.status === 'ACTIVE' ? '#dcfce7' : '#fef3c7',
            color: affiliate.status === 'ACTIVE' ? '#166534' : '#92400e',
          }}
        >
          {affiliate.status}
        </span>
        <span className="text-sm" style={{ color: 'var(--muted, #888)' }}>
          Código: <strong>{affiliate.code}</strong>
        </span>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg p-4 border" style={{ background: 'var(--card, white)' }}>
            <div className="text-2xl font-bold">{stats.stats.totalClicks}</div>
            <div className="text-sm" style={{ color: 'var(--muted, #888)' }}>Cliques</div>
          </div>
          <div className="rounded-lg p-4 border" style={{ background: 'var(--card, white)' }}>
            <div className="text-2xl font-bold">{stats.stats.totalConversions}</div>
            <div className="text-sm" style={{ color: 'var(--muted, #888)' }}>Conversões</div>
          </div>
          <div className="rounded-lg p-4 border" style={{ background: 'var(--card, white)' }}>
            <div className="text-2xl font-bold">{stats.stats.conversionRate}%</div>
            <div className="text-sm" style={{ color: 'var(--muted, #888)' }}>Taxa de conversão</div>
          </div>
          <div className="rounded-lg p-4 border" style={{ background: 'var(--card, white)' }}>
            <div className="text-2xl font-bold">R$ {stats.stats.totalEarnings.toFixed(2)}</div>
            <div className="text-sm" style={{ color: 'var(--muted, #888)' }}>Ganhos totais</div>
          </div>
        </div>
      )}

      <div className="rounded-lg p-4 border" style={{ background: 'var(--card, white)' }}>
        <h3 className="font-semibold mb-2">Seu link de indicação</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={`https://contentflow.com/ref/${affiliate.code}`}
            className="flex-1 border rounded px-3 py-2 text-sm bg-gray-50"
          />
          <button
            onClick={() => navigator.clipboard.writeText(`https://contentflow.com/ref/${affiliate.code}`)}
            className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
          >
            Copiar
          </button>
        </div>
      </div>
    </div>
  );
}
