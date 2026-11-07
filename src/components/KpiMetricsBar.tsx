import React from 'react';
import { PortfolioSummary } from '../types/trade';
import { formatCurrency, formatPercent, formatR } from '../utils/calculations';
import { TrendingUp, TrendingDown, ShieldAlert, Target, DollarSign, PieChart, Zap } from 'lucide-react';

interface KpiMetricsBarProps {
  summary: PortfolioSummary;
}

export const KpiMetricsBar: React.FC<KpiMetricsBarProps> = ({ summary }) => {
  const isPnLPositive = summary.totalOpenPnL >= 0;
  const isRealizedPositive = summary.realizedTotalPnL >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
      {/* 1. Open PnL in $ and % */}
      <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Open PnL ($)</span>
          {isPnLPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-lg font-bold font-mono tabular-nums ${
              isPnLPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(summary.totalOpenPnL)}
          </span>
          <span
            className={`text-xs font-mono tabular-nums ${
              isPnLPositive ? 'text-emerald-400/80' : 'text-rose-400/80'
            }`}
          >
            {formatPercent(summary.totalOpenPnLPercent)}
          </span>
        </div>
      </div>

      {/* 2. Total Open Risk in $ */}
      <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Общ Открит Риск</span>
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold font-mono tabular-nums text-amber-300">
            {formatCurrency(summary.totalOpenRisk)}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            при стоповете
          </span>
        </div>
      </div>

      {/* 3. Average R-Multiple */}
      <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Среден R-Multiple</span>
          <Target className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-lg font-bold font-mono tabular-nums ${
              summary.avgRMultiple >= 1
                ? 'text-emerald-400'
                : summary.avgRMultiple >= 0
                ? 'text-cyan-300'
                : 'text-rose-400'
            }`}
          >
            {formatR(summary.avgRMultiple)}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {summary.winningPositions}W / {summary.losingPositions}L
          </span>
        </div>
      </div>

      {/* 4. Total Portfolio Market Value */}
      <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Стойност позиции</span>
          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold font-mono tabular-nums text-slate-100">
            {formatCurrency(summary.totalValue)}
          </span>
        </div>
      </div>

      {/* 5. Total Margin Collateral Used & Effective Leverage */}
      <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Заделен марджин</span>
          <Zap className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold font-mono tabular-nums text-amber-300">
            {formatCurrency(summary.totalMarginUsed)}
          </span>
          <span className="text-xs text-slate-400 font-mono" title="Ефективен ливъридж = Обща експозиция / Заделен марджин">
            {summary.effectiveLeverage.toFixed(1)}x
          </span>
        </div>
      </div>

      {/* 6. Positions Count & Asset Allocation */}
      <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Активни позиции</span>
          <PieChart className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold font-mono tabular-nums text-slate-100">
            {summary.totalPositions}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {summary.stocksCount} акц · {summary.cryptoCount} крипто
          </span>
        </div>
      </div>

      {/* 7. Realized PnL from closed trades */}
      <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span>Реализиран PnL</span>
          <span className="text-[10px] uppercase font-mono text-slate-500">Архив</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-lg font-bold font-mono tabular-nums ${
              isRealizedPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(summary.realizedTotalPnL)}
          </span>
        </div>
      </div>
    </div>
  );
};
