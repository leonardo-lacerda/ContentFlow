'use client';

import { useState, useMemo } from 'react';
import {
  Loader,
  BarChart3,
  Eye,
  Users,
  TrendingUp,
  TrendingDown,
  Heart,
  Share2,
  MessageCircle,
  MousePointerClick,
  Bookmark,
  Trophy,
  Calendar,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Layout,
  Palette,
  Target,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { useCarouselDashboard } from './carousel-performance.hooks';
import {
  DashboardData,
  PlatformAggregation,
  TemplateAggregation,
  ThemeAggregation,
  TrendData,
} from './carousel-performance.types';
import { useSelectedBrand } from '@gitroom/frontend/components/brand-dna/brand-dna.hooks';
import { EmptyPerformance } from './empty-performance';
import {
  PageShell,
  PageHeader,
  PageBody,
  EmptyState,
} from '@gitroom/frontend/components/new-layout/page-system';
import { Button } from '@gitroom/react/form/button';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';

const inputClass =
  'h-[40px] w-full rounded-[10px] border border-newTableBorder bg-newBgColorInner px-[12px] text-[14px] outline-none placeholder:text-textItemBlur text-newTextColor transition duration-200 focus:border-btnPrimary';

const cardClass =
  'rounded-[12px] border border-newTableBorder bg-newSettings p-6';

const platformColors: Record<string, string> = {
  instagram: '#E1306C',
  facebook: '#1877F2',
  linkedin: '#0A66C2',
  'linkedin-page': '#0A66C2',
  tiktok: '#000000',
  x: '#1DA1F2',
  twitter: '#1DA1F2',
  youtube: '#FF0000',
  pinterest: '#E60023',
  threads: '#000000',
};

const platformLabels: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  'linkedin-page': 'LinkedIn',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  x: 'X / Twitter',
  twitter: 'X / Twitter',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
  threads: 'Threads',
};

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Math.round(n).toLocaleString('pt-BR');
}

function formatPercent(n: number | null | undefined): string {
  if (n == null) return '0.00%';
  return n.toFixed(2) + '%';
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** Returns a score color class based on value (0-100) */
function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

/** Returns a score badge background */
function scoreBg(score: number): string {
  if (score >= 70) return 'bg-emerald-50 dark:bg-emerald-900/30';
  if (score >= 40) return 'bg-amber-50 dark:bg-amber-900/30';
  return 'bg-red-50 dark:bg-red-900/30';
}

// Score bar visualization (0-100)
function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.min((score / max) * 100, 100);
  const color =
    score >= 70
      ? 'bg-emerald-500'
      : score >= 40
        ? 'bg-amber-500'
        : 'bg-red-500';
  return (
    <div className="h-[6px] w-full rounded-full bg-newBgColorInner overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color: string;
}) {
  return (
    <div className={cardClass + ' flex flex-col gap-3'}>
      <div className="flex items-center justify-between">
        <div
          className={`w-[36px] h-[36px] rounded-[8px] flex items-center justify-center ${color}`}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[24px] font-[700] text-newTextColor leading-tight">
          {value}
        </p>
        <p className="text-[13px] text-textItemBlur mt-1">{label}</p>
      </div>
      {subValue && (
        <p className="text-[12px] text-textItemBlur">{subValue}</p>
      )}
    </div>
  );
}

// Platform Row Component
function PlatformRow({ data }: { data: PlatformAggregation }) {
  const platform = data.platform.toLowerCase();
  const color = platformColors[platform] || '#6B7280';
  const label = platformLabels[platform] || data.platform;
  const totalInteractions =
    (data._sum.saves || 0) +
    (data._sum.shares || 0) +
    (data._sum.comments || 0) +
    (data._sum.clicks || 0) +
    (data._sum.likes || 0);

  return (
    <div className="flex items-center gap-4 py-3 border-b border-newTableBorder last:border-0">
      <div className="flex items-center gap-3 min-w-[160px]">
        <div
          className="w-[10px] h-[10px] rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-[14px] font-[500] text-newTextColor">
          {label}
        </span>
      </div>
      <div className="flex-1 grid grid-cols-5 gap-4 text-center">
        <div>
          <p className="text-[13px] font-[600] text-newTextColor">
            {formatNumber(data._sum.impressions || 0)}
          </p>
          <p className="text-[11px] text-textItemBlur">Impressões</p>
        </div>
        <div>
          <p className="text-[13px] font-[600] text-newTextColor">
            {formatNumber(data._sum.reach || 0)}
          </p>
          <p className="text-[11px] text-textItemBlur">Alcance</p>
        </div>
        <div>
          <p className="text-[13px] font-[600] text-newTextColor">
            {formatNumber(totalInteractions)}
          </p>
          <p className="text-[11px] text-textItemBlur">Interações</p>
        </div>
        <div>
          <p className="text-[13px] font-[600] text-newTextColor">
            {formatPercent(data._avg.engagementRate)}
          </p>
          <p className="text-[11px] text-textItemBlur">Engajamento</p>
        </div>
        <div>
          <p className="text-[13px] font-[600] text-newTextColor">
            {data._count}
          </p>
          <p className="text-[11px] text-textItemBlur">Registros</p>
        </div>
      </div>
    </div>
  );
}

// Top Performer Row Component
function TopPerformerRow({
  item,
  rank,
}: {
  item: DashboardData['topPerformers'][0];
  rank: number;
}) {
  const platform = item.platform.toLowerCase();
  const color = platformColors[platform] || '#6B7280';
  const label = platformLabels[platform] || item.platform;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-newTableBorder last:border-0">
      <div className="w-[28px] h-[28px] rounded-full bg-newBgColorInner flex items-center justify-center">
        <span className="text-[12px] font-[700] text-textItemBlur">
          {rank}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-[500] text-newTextColor truncate">
          {item.carouselProject?.title || 'Carrossel'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <div
            className="w-[8px] h-[8px] rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-[12px] text-textItemBlur">{label}</span>
          <span className="text-[12px] text-textItemBlur">•</span>
          <span className="text-[12px] text-textItemBlur">{formatDate(item.collectedAt)}</span>
        </div>
      </div>
      <div className="flex items-center gap-6 text-right">
        <div>
          <p className="text-[13px] font-[600] text-newTextColor">
            {formatNumber(item.impressions)}
          </p>
          <p className="text-[11px] text-textItemBlur">Impressões</p>
        </div>
        <div>
          <p className="text-[13px] font-[600] text-newTextColor">
            {formatPercent(item.engagementRate)}
          </p>
          <p className="text-[11px] text-textItemBlur">Engajamento</p>
        </div>
        <div className="min-w-[60px]">
          <div className="flex items-center justify-end gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <p className="text-[13px] font-[700] text-emerald-600 dark:text-emerald-400">
              {item.normalizedScore.toFixed(1)}
            </p>
          </div>
          <p className="text-[11px] text-textItemBlur">Score</p>
        </div>
      </div>
    </div>
  );
}

// Mini Trend Chart with engagement rate overlay
function TrendChart({ data }: { data: TrendData[] }) {
  if (!data || data.length === 0) return null;

  const maxScore = Math.max(...data.map((d) => Number(d.avgNormalizedScore) || 0), 1);
  const maxEngRate = Math.max(...data.map((d) => Number(d.avgEngagementRate) || 0), 0.01);

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-[8px] h-[8px] rounded-sm bg-blue-500" />
          <span className="text-[11px] text-textItemBlur">Score Normalizado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-[8px] h-[8px] rounded-sm bg-purple-500" />
          <span className="text-[11px] text-textItemBlur">Taxa de Engajamento</span>
        </div>
      </div>
      {/* Chart */}
      <div className="flex items-end gap-[3px] h-[120px]">
        {data.map((d, i) => {
          const score = Number(d.avgNormalizedScore) || 0;
          const engRate = Number(d.avgEngagementRate) || 0;
          const scoreHeight = Math.max((score / maxScore) * 100, 4);
          const engHeight = Math.max((engRate / maxEngRate) * 100, 2);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-black dark:bg-white text-white dark:text-black text-[11px] px-2 py-1 rounded whitespace-nowrap">
                  {formatDate(d.date)}: Score {score.toFixed(1)} | Eng. {engRate.toFixed(2)}%
                </div>
              </div>
              <div className="w-full flex gap-[1px] items-end" style={{ height: '100%' }}>
                <div
                  className="flex-1 rounded-t-[3px] bg-gradient-to-t from-blue-500 to-blue-400 dark:from-blue-600 dark:to-blue-500 transition-all hover:opacity-80"
                  style={{ height: `${scoreHeight}%` }}
                />
                <div
                  className="flex-1 rounded-t-[3px] bg-gradient-to-t from-purple-500 to-purple-400 dark:from-purple-600 dark:to-purple-500 transition-all hover:opacity-80"
                  style={{ height: `${engHeight}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[11px] text-textItemBlur">
          {formatDate(data[0]?.date || '')}
        </span>
        <span className="text-[11px] text-textItemBlur">
          {formatDate(data[data.length - 1]?.date || '')}
        </span>
      </div>
    </div>
  );
}

// Template Performance Card
function TemplatePerformanceRow({
  data,
  index,
}: {
  data: TemplateAggregation;
  index: number;
}) {
  const score = Number(data.avgNormalizedScore) || 0;
  const engRate = Number(data.avgEngagementRate) || 0;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-newTableBorder last:border-0">
      <div className="flex items-center gap-3 min-w-[180px]">
        <div className="w-[28px] h-[28px] rounded-[6px] bg-newBgColorInner flex items-center justify-center">
          <Layout className="w-3.5 h-3.5 text-textItemBlur" />
        </div>
        <span className="text-[14px] font-[500] text-newTextColor truncate">
          {data.template || 'Sem template'}
        </span>
      </div>
      <div className="flex-1 grid grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-[13px] font-[600] text-newTextColor">
            {formatNumber(data.totalImpressions)}
          </p>
          <p className="text-[11px] text-textItemBlur">Impressões</p>
        </div>
        <div>
          <p className="text-[13px] font-[600] text-newTextColor">
            {formatPercent(engRate)}
          </p>
          <p className="text-[11px] text-textItemBlur">Engajamento</p>
        </div>
        <div>
          <p className={`text-[13px] font-[700] ${scoreColor(score)}`}>
            {score.toFixed(1)}
          </p>
          <p className="text-[11px] text-textItemBlur">Score Médio</p>
        </div>
        <div>
          <p className="text-[13px] font-[600] text-newTextColor">
            {data.recordCount}
          </p>
          <p className="text-[11px] text-textItemBlur">Publicações</p>
        </div>
      </div>
      <div className="w-[80px]">
        <ScoreBar score={score} />
      </div>
    </div>
  );
}

// Theme Performance Row
function ThemePerformanceRow({ data }: { data: ThemeAggregation }) {
  const score = Number(data.avgNormalizedScore) || 0;
  const engRate = Number(data.avgEngagementRate) || 0;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-newTableBorder last:border-0">
      <div className="flex items-center gap-3 min-w-[160px]">
        <div className="w-[28px] h-[28px] rounded-[6px] bg-newBgColorInner flex items-center justify-center">
          <Palette className="w-3.5 h-3.5 text-textItemBlur" />
        </div>
        <span className="text-[14px] font-[500] text-newTextColor truncate">
          {data.theme || 'Sem tema'}
        </span>
      </div>
      <div className="flex-1 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-[13px] font-[600] text-newTextColor">
            {formatNumber(data.totalImpressions)}
          </p>
          <p className="text-[11px] text-textItemBlur">Impressões</p>
        </div>
        <div>
          <p className="text-[13px] font-[600] text-newTextColor">
            {formatPercent(engRate)}
          </p>
          <p className="text-[11px] text-textItemBlur">Engajamento</p>
        </div>
        <div>
          <p className={`text-[13px] font-[700] ${scoreColor(score)}`}>
            {score.toFixed(1)}
          </p>
          <p className="text-[11px] text-textItemBlur">Score</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[13px] font-[600] text-newTextColor">
          {data.recordCount}
        </p>
        <p className="text-[11px] text-textItemBlur">Publicações</p>
      </div>
    </div>
  );
}

// Interaction Breakdown Bar
function InteractionBreakdown({ data }: { data: PlatformAggregation }) {
  const interactions = [
    { label: 'Curtidas', value: data._sum.likes || 0, icon: <Heart className="w-3 h-3" />, color: 'bg-red-400' },
    { label: 'Comentários', value: data._sum.comments || 0, icon: <MessageCircle className="w-3 h-3" />, color: 'bg-blue-400' },
    { label: 'Compartilhamentos', value: data._sum.shares || 0, icon: <Share2 className="w-3 h-3" />, color: 'bg-green-400' },
    { label: 'Cliques', value: data._sum.clicks || 0, icon: <MousePointerClick className="w-3 h-3" />, color: 'bg-amber-400' },
    { label: 'Salvamentos', value: data._sum.saves || 0, icon: <Bookmark className="w-3 h-3" />, color: 'bg-purple-400' },
  ];

  const total = interactions.reduce((sum, i) => sum + i.value, 0);
  if (total === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex h-[8px] rounded-full overflow-hidden">
        {interactions.map((item, i) => (
          <div
            key={i}
            className={`${item.color} transition-all`}
            style={{ width: `${(item.value / total) * 100}%` }}
            title={`${item.label}: ${formatNumber(item.value)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {interactions.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-[8px] h-[8px] rounded-full ${item.color}`} />
            <span className="text-[11px] text-textItemBlur">
              {item.label}: {formatNumber(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Collapsible Section
function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cardClass}>
      <button
        className="flex items-center justify-between w-full mb-4"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-[16px] font-[600] text-newTextColor">
            {title}
          </h2>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-textItemBlur" />
        ) : (
          <ChevronDown className="w-4 h-4 text-textItemBlur" />
        )}
      </button>
      {open && children}
    </div>
  );
}

// Brand Summary Card
function BrandSummaryCard({
  data,
}: {
  data: NonNullable<DashboardData['brandAggregated']>;
}) {
  const totalInteractions =
    (data._sum.saves || 0) +
    (data._sum.shares || 0) +
    (data._sum.comments || 0) +
    (data._sum.clicks || 0) +
    (data._sum.likes || 0);

  const score = data._avg.normalizedScore || 0;
  const engRate = data._avg.engagementRate || 0;

  return (
    <div className={cardClass}>
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-blue-500" />
        <h2 className="text-[16px] font-[600] text-newTextColor">
          Resumo da Marca
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[28px] font-[700] text-newTextColor">
            {formatNumber(data._sum.impressions)}
          </p>
          <p className="text-[12px] text-textItemBlur">Impressões Totais</p>
        </div>
        <div>
          <p className="text-[28px] font-[700] text-newTextColor">
            {formatNumber(data._sum.reach)}
          </p>
          <p className="text-[12px] text-textItemBlur">Alcance Total</p>
        </div>
        <div>
          <p className={`text-[28px] font-[700] ${scoreColor(score)}`}>
            {score.toFixed(1)}
          </p>
          <p className="text-[12px] text-textItemBlur">Score Médio</p>
          <ScoreBar score={score} />
        </div>
        <div>
          <p className="text-[28px] font-[700] text-newTextColor">
            {formatPercent(engRate)}
          </p>
          <p className="text-[12px] text-textItemBlur">Engajamento Médio</p>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-newTableBorder">
        <div className="flex items-center justify-between text-[13px] text-textItemBlur">
          <span>{data._count} registros de performance</span>
          <span>{formatNumber(totalInteractions)} interações totais</span>
        </div>
      </div>
    </div>
  );
}

// Main Dashboard Component
export function CarouselPerformanceDashboard() {
  const { data: brand } = useSelectedBrand();
  const { data: dashboard, isLoading, error, mutate } = useCarouselDashboard(brand?.id);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  const hasData = dashboard && (
    (dashboard.byPlatform && dashboard.byPlatform.length > 0) ||
    (dashboard.topPerformers && dashboard.topPerformers.length > 0)
  );

  // Compute summary metrics
  const summary = useMemo(() => {
    if (!dashboard?.byPlatform) return null;

    const platforms = dashboard.byPlatform as PlatformAggregation[];
    const totalRecords = platforms.reduce((sum, p) => sum + p._count, 0);
    const totalImpressions = platforms.reduce((sum, p) => sum + (p._sum.impressions || 0), 0);
    const totalReach = platforms.reduce((sum, p) => sum + (p._sum.reach || 0), 0);
    const totalLikes = platforms.reduce((sum, p) => sum + (p._sum.likes || 0), 0);
    const totalComments = platforms.reduce((sum, p) => sum + (p._sum.comments || 0), 0);
    const totalShares = platforms.reduce((sum, p) => sum + (p._sum.shares || 0), 0);

    // Weighted average engagement rate
    let avgEngagement = 0;
    let totalCount = 0;
    for (const p of platforms) {
      if (p._avg.engagementRate != null) {
        avgEngagement += p._avg.engagementRate * p._count;
        totalCount += p._count;
      }
    }
    if (totalCount > 0) avgEngagement /= totalCount;

    // Weighted average normalized score
    let avgScore = 0;
    totalCount = 0;
    for (const p of platforms) {
      if (p._avg.normalizedScore != null) {
        avgScore += p._avg.normalizedScore * p._count;
        totalCount += p._count;
      }
    }
    if (totalCount > 0) avgScore /= totalCount;

    return {
      totalRecords,
      totalImpressions,
      totalReach,
      avgEngagement,
      avgScore,
      totalLikes,
      totalComments,
      totalShares,
      platformCount: platforms.length,
    };
  }, [dashboard]);

  // Loading state
  if (isLoading) {
    return (
      <PageShell>
        <PageBody className="!p-0">
          <div className="flex flex-1 items-center justify-center min-h-[320px]">
            <Loader className="w-8 h-8 animate-spin text-textItemBlur" />
          </div>
        </PageBody>
      </PageShell>
    );
  }

  // Error state
  if (error) {
    return (
      <PageShell>
        <PageBody className="!p-0">
          <EmptyState
            title="Erro ao carregar performance"
            description="Não foi possível carregar os dados de performance dos carrosséis."
            actionLabel="Tentar novamente"
            onAction={() => mutate()}
          />
        </PageBody>
      </PageShell>
    );
  }

  // Empty state
  if (!hasData) {
    return (
      <PageShell>
        <PageHeader description="Métricas e analytics dos carrosséis publicados." />
        <PageBody className="!p-0">
          <EmptyPerformance onCollect={() => mutate()} />
        </PageBody>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        description="Métricas e analytics dos carrosséis publicados."
        actions={
          <Button onClick={() => mutate()} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        }
      />
      <PageBody>
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
            label="Total de Registros"
            value={formatNumber(summary.totalRecords)}
            subValue={`${summary.platformCount} plataforma${summary.platformCount !== 1 ? 's' : ''}`}
            color="bg-blue-50 dark:bg-blue-900/30"
          />
          <SummaryCard
            icon={<Eye className="w-5 h-5 text-purple-600" />}
            label="Total de Impressões"
            value={formatNumber(summary.totalImpressions)}
            subValue={`${formatNumber(summary.totalReach)} de alcance`}
            color="bg-purple-50 dark:bg-purple-900/30"
          />
          <SummaryCard
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            label="Taxa de Engajamento Média"
            value={formatPercent(summary.avgEngagement)}
            subValue={`${formatNumber(summary.totalLikes)} curtidas, ${formatNumber(summary.totalComments)} comentários`}
            color="bg-emerald-50 dark:bg-emerald-900/30"
          />
          <SummaryCard
            icon={<Trophy className="w-5 h-5 text-amber-600" />}
            label="Score Normalizado Médio"
            value={summary.avgScore.toFixed(1)}
            subValue="Escala 0-100"
            color="bg-amber-50 dark:bg-amber-900/30"
          />
        </div>
      )}

      {/* Brand Summary (only when a brand is selected) */}
      {dashboard?.brandAggregated && (
        <BrandSummaryCard data={dashboard.brandAggregated} />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Platform Performance Table */}
          <CollapsibleSection
            title="Performance por Plataforma"
            icon={<BarChart3 className="w-4 h-4 text-blue-500" />}
          >
            {dashboard?.byPlatform && dashboard.byPlatform.length > 0 ? (
              <div>
                {dashboard.byPlatform.map((platform: PlatformAggregation) => (
                  <PlatformRow key={platform.platform} data={platform} />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-textItemBlur text-center py-8">
                Nenhum dado por plataforma disponível
              </p>
            )}
          </CollapsibleSection>

          {/* Performance by Template */}
          {dashboard?.byTemplate && dashboard.byTemplate.length > 0 && (
            <CollapsibleSection
              title="Performance por Template"
              icon={<Layout className="w-4 h-4 text-indigo-500" />}
            >
              <div>
                {dashboard.byTemplate.map((template: TemplateAggregation, i: number) => (
                  <TemplatePerformanceRow
                    key={template.template || i}
                    data={template}
                    index={i}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Performance by Theme */}
          {dashboard?.byTheme && dashboard.byTheme.length > 0 && (
            <CollapsibleSection
              title="Performance por Tema"
              icon={<Palette className="w-4 h-4 text-pink-500" />}
            >
              <div>
                {dashboard.byTheme.map((theme: ThemeAggregation, i: number) => (
                  <ThemePerformanceRow
                    key={theme.theme || i}
                    data={theme}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Trend Chart */}
          {dashboard?.trend && dashboard.trend.length > 0 && (
            <CollapsibleSection
              title="Tendência de Performance (30 dias)"
              icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
            >
              <TrendChart data={dashboard.trend} />
            </CollapsibleSection>
          )}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Top Performers */}
          <CollapsibleSection
            title="Top Performers"
            icon={<Trophy className="w-4 h-4 text-amber-500" />}
          >
            {dashboard?.topPerformers && dashboard.topPerformers.length > 0 ? (
              <div>
                {dashboard.topPerformers.slice(0, 5).map((performer: DashboardData['topPerformers'][0], i: number) => (
                  <TopPerformerRow key={performer.id} item={performer} rank={i + 1} />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-textItemBlur text-center py-8">
                Nenhum performador encontrado
              </p>
            )}
          </CollapsibleSection>

          {/* Interaction Breakdown by Platform */}
          {dashboard?.byPlatform && dashboard.byPlatform.length > 0 && (
            <CollapsibleSection
              title="Detalhes de Interações"
              icon={<Heart className="w-4 h-4 text-red-500" />}
            >
              <div className="space-y-6">
                {dashboard.byPlatform.map((platform: PlatformAggregation) => (
                  <div key={platform.platform}>
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-[8px] h-[8px] rounded-full"
                        style={{
                          backgroundColor:
                            platformColors[platform.platform.toLowerCase()] || '#6B7280',
                        }}
                      />
                      <span className="text-[13px] font-[500] text-newTextColor">
                        {platformLabels[platform.platform.toLowerCase()] || platform.platform}
                      </span>
                    </div>
                    <InteractionBreakdown data={platform} />
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Score Methodology */}
          <CollapsibleSection
            title="Sobre o Score"
            icon={<Info className="w-4 h-4 text-textItemBlur" />}
            defaultOpen={false}
          >
            <div className="space-y-3 text-[12px] text-textItemBlur">
              <p>
                O <strong>Score Normalizado</strong> (0–100) permite comparar
                carrosséis entre plataformas diferentes de forma justa.
              </p>
              <div className="space-y-1">
                <p className="font-[600] text-textItemBlur">
                  Componentes do score:
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li><strong>Engajamento (0–70):</strong> Pesos por tipo de interação e por plataforma</li>
                  <li><strong>Eficiência de alcance (0–15):</strong> Alcance vs. impressões</li>
                  <li><strong>Bônus de volume (0–15):</strong> Logaritmo das impressões absolutas</li>
                </ul>
              </div>
              <p>
                Cada plataforma tem pesos diferentes — por exemplo, salvamentos
                valem mais no Instagram e Pinterest, enquanto compartilhamentos
                pesam mais no LinkedIn e X.
              </p>
            </div>
          </CollapsibleSection>
        </div>
      </div>
      </PageBody>
    </PageShell>
  );
}
