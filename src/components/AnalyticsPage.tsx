import React, { useState, useMemo } from 'react';
import { TradePosition } from '../types/trade';
import {
  calculatePerformanceMetrics,
  calculateDaysBetween,
  isDateInCurrentWeek,
  isDateInCurrentMonth,
  isDateInPreviousMonth,
} from '../utils/statistics';
import {
  formatCurrency,
  formatPercent,
  formatR,
} from '../utils/calculations';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Award,
  AlertTriangle,
  Scale,
  Zap,
  BarChart3,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface AnalyticsPageProps {
  closedTrades: TradePosition[];
  onExportExcel: () => void;
  onOpenGoogleSheets: () => void;
}

type PeriodType = 'week' | 'month' | 'prev_month' | 'all';
type AssetFilterType = 'all' | 'stock' | 'crypto';

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  closedTrades,
  onExportExcel,
  onOpenGoogleSheets,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const [assetFilter, setAssetFilter] = useState<AssetFilterType>('all');

  // Filter trades based on selected period & asset class
  const filteredTrades = useMemo(() => {
    return closedTrades.filter((trade) => {
      // Asset filter
      if (assetFilter !== 'all' && trade.assetType !== assetFilter) {
        return false;
      }

      // Period filter based on closedDate
      const dateStr = trade.closedDate || trade.entryDate;
      if (selectedPeriod === 'week') {
        return isDateInCurrentWeek(dateStr);
      }
      if (selectedPeriod === 'month') {
        return isDateInCurrentMonth(dateStr);
      }
      if (selectedPeriod === 'prev_month') {
        return isDateInPreviousMonth(dateStr);
      }
      return true; // 'all'
    });
  }, [closedTrades, selectedPeriod, assetFilter]);

  // Calculate comprehensive stats
  const metrics = useMemo(() => {
    return calculatePerformanceMetrics(filteredTrades, selectedPeriod);
  }, [filteredTrades, selectedPeriod]);

  // Holding period comparison ratio
  const holdingRatio =
    metrics.avgHoldingDaysLosers > 0
      ? metrics.avgHoldingDaysWinners / metrics.avgHoldingDaysLosers
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Filter & Toolbar Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl">
        {/* Period Selector Tabs */}
        <div>
          <span className="text-[11px] font-mono text-slate-400 block mb-1.5 uppercase tracking-wider">
            Период на отчета
          </span>
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-850 rounded-lg">
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedPeriod === 'week'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Тази седмица</span>
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedPeriod === 'month'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Този месец</span>
            </button>
            <button
              onClick={() => setSelectedPeriod('prev_month')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                selectedPeriod === 'prev_month'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Предишен месец
            </button>
            <button
              onClick={() => setSelectedPeriod('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                selectedPeriod === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Всички сделки
            </button>
          </div>
        </div>

        {/* Asset Class Filter & Export Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Asset filter */}
          <div>
            <span className="text-[11px] font-mono text-slate-400 block mb-1.5 uppercase tracking-wider">
              Клас актив
            </span>
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-850 rounded-lg">
              <button
                onClick={() => setAssetFilter('all')}
                className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                  assetFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Всички
              </button>
              <button
                onClick={() => setAssetFilter('stock')}
                className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                  assetFilter === 'stock'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Акции
              </button>
              <button
                onClick={() => setAssetFilter('crypto')}
                className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                  assetFilter === 'crypto'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Крипто
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-5">
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              title="Експортирай статистиката в Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>
            <button
              onClick={onOpenGoogleSheets}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-lg hover:bg-emerald-900/40 transition-colors cursor-pointer"
              title="Синхронизирай с Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Sheets</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid: Core Batting Average & Win/Loss Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Батинг авередж (Batting Average / Win Rate) */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Батинг авередж (Win Rate)</span>
            <span className="text-[10px] font-mono text-slate-500">
              {metrics.winningTrades}W · {metrics.losingTrades}L
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold font-mono tabular-nums ${
                metrics.battingAverage >= 50 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {metrics.battingAverage.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 font-mono">
              от {metrics.totalTrades} сделки
            </span>
          </div>
          {/* Visual Mini Progress Bar */}
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${metrics.battingAverage}%` }}
              className="bg-emerald-400 h-full transition-all duration-300"
            />
            <div
              style={{ width: `${100 - metrics.battingAverage}%` }}
              className="bg-rose-500 h-full transition-all duration-300"
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 pt-1 font-mono">
            <span className="text-emerald-400">Печеливши: {metrics.winningTrades}</span>
            <span className="text-rose-400">Губещи: {metrics.losingTrades}</span>
          </div>
        </div>

        {/* 2. Нетен PnL & Profit Factor */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Нетен реализиран PnL</span>
            <span className="text-[10px] font-mono text-slate-500">
              PF: {metrics.profitFactor > 99 ? '∞' : metrics.profitFactor.toFixed(2)}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold font-mono tabular-nums ${
                metrics.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(metrics.netPnL)}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 pt-1 font-mono">
            <span>Печалби: +{formatCurrency(metrics.grossProfit)}</span>
            <span className="text-rose-400">Загуби: -{formatCurrency(Math.abs(metrics.grossLoss))}</span>
          </div>
        </div>

        {/* 3. Win / Loss Ratio */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Win / Loss Ratio</span>
            <Scale className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold font-mono tabular-nums ${
                metrics.winLossRatio >= 2
                  ? 'text-emerald-400'
                  : metrics.winLossRatio >= 1
                  ? 'text-cyan-300'
                  : 'text-rose-400'
              }`}
            >
              {metrics.winLossRatio > 99 ? '∞' : `${metrics.winLossRatio.toFixed(2)}:1`}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Средната ви печалба е {metrics.winLossRatio.toFixed(1)}x по-голяма от средната загуба.
          </p>
        </div>

        {/* 4. Expectancy на сделка */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Очаквана стойност (Expectancy)</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold font-mono tabular-nums ${
                metrics.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(metrics.expectancy)}
            </span>
            <span className="text-xs text-slate-500 font-mono">/ сделка</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Математическо очакване за всяка изиграна позиция.
          </p>
        </div>
      </div>

      {/* Secondary Detailed Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card A: Средно печеливша vs Средно губеща */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Среден PnL на резултат
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Ср. сделка: {formatCurrency(metrics.avgTradePnL)}
            </span>
          </div>

          <div className="space-y-3 font-mono">
            {/* Average Win */}
            <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-sans">
                  Средно Печеливша (Avg Win)
                </span>
                <span className="text-[10px] text-slate-500">
                  (всички печалби / {metrics.winningTrades} сделки)
                </span>
              </div>
              <span className="text-lg font-bold text-emerald-400 tabular-nums">
                +{formatCurrency(metrics.avgWin)}
              </span>
            </div>

            {/* Average Loss */}
            <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-sans">
                  Средно Губеща (Avg Loss)
                </span>
                <span className="text-[10px] text-slate-500">
                  (|всички загуби| / {metrics.losingTrades} сделки)
                </span>
              </div>
              <span className="text-lg font-bold text-rose-400 tabular-nums">
                -{formatCurrency(metrics.avgLoss)}
              </span>
            </div>

            {/* Average R achieved */}
            <div className="p-2.5 bg-slate-950/40 rounded flex items-center justify-between text-xs">
              <span className="text-slate-400 font-sans">Среден R-Multiple:</span>
              <span className="text-emerald-300 font-bold tabular-nums">
                +{formatR(metrics.avgRMultiple)}
              </span>
            </div>
          </div>
        </div>

        {/* Card B: Най-голям печеливш и най-голям губещ */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Екстремни Резултати (Суми)
            </h3>
            <Award className="w-4 h-4 text-amber-400" />
          </div>

          <div className="space-y-3 font-mono">
            {/* Largest Win */}
            <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-sans">
                  Най-голям печеливш
                </span>
                <span className="text-xs text-white font-bold font-sans">
                  {metrics.largestWinTrade ? metrics.largestWinTrade.ticker : '—'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-emerald-400 tabular-nums block">
                  +{formatCurrency(metrics.largestWin)}
                </span>
                {metrics.largestWinTrade && (
                  <span className="text-[10px] text-emerald-400/80">
                    {formatR(metrics.largestWinTrade.realizedR ?? 0)}
                  </span>
                )}
              </div>
            </div>

            {/* Largest Loss */}
            <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-sans">
                  Най-голям губещ
                </span>
                <span className="text-xs text-white font-bold font-sans">
                  {metrics.largestLossTrade ? metrics.largestLossTrade.ticker : '—'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-rose-400 tabular-nums block">
                  {formatCurrency(metrics.largestLoss)}
                </span>
                {metrics.largestLossTrade && (
                  <span className="text-[10px] text-rose-400/80">
                    {formatR(metrics.largestLossTrade.realizedR ?? 0)}
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-sans">
              Дисциплината изисква най-големият губещ да бъде стриктно ограничен до 1R.
            </p>
          </div>
        </div>

        {/* Card C: По колко дни са държани печелившите и губещите */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Време на задържане (Holding Days)
            </h3>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="space-y-3 font-mono">
            {/* Days held winners */}
            <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-sans">
                  Държани печеливши средно
                </span>
                <span className="text-[10px] text-slate-500 font-sans">
                  (Let winners run)
                </span>
              </div>
              <span className="text-lg font-bold text-emerald-400 tabular-nums">
                {metrics.avgHoldingDaysWinners.toFixed(1)} дни
              </span>
            </div>

            {/* Days held losers */}
            <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block font-sans">
                  Държани губещи средно
                </span>
                <span className="text-[10px] text-slate-500 font-sans">
                  (Cut losses fast)
                </span>
              </div>
              <span className="text-lg font-bold text-rose-400 tabular-nums">
                {metrics.avgHoldingDaysLosers.toFixed(1)} дни
              </span>
            </div>

            {/* Comparison */}
            <div className="p-2.5 bg-slate-950/40 rounded text-xs flex justify-between items-center">
              <span className="text-slate-400 font-sans">Ср. дни общо:</span>
              <span className="text-slate-200 font-bold tabular-nums">
                {metrics.avgHoldingDaysAll.toFixed(1)} дни
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Trade Breakdown for Selected Period */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Сделки за периода:{' '}
              <span className="text-emerald-400 font-mono">
                {selectedPeriod === 'week'
                  ? 'Тази седмица'
                  : selectedPeriod === 'month'
                  ? 'Този месец'
                  : selectedPeriod === 'prev_month'
                  ? 'Предишен месец'
                  : 'Всички сделки'}
              </span>{' '}
              ({filteredTrades.length} записа)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Общ нетен резултат:{' '}
            <strong
              className={
                metrics.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }
            >
              {formatCurrency(metrics.netPnL)}
            </strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Дата вход</th>
                <th className="py-3 px-3">Дата изход</th>
                <th className="py-3 px-3 text-right">Дни държане</th>
                <th className="py-3 px-3 font-sans">Тикър</th>
                <th className="py-3 px-3">Клас</th>
                <th className="py-3 px-3 text-right">Дялове</th>
                <th className="py-3 px-3 text-right">Вход ($)</th>
                <th className="py-3 px-3 text-right">Изход ($)</th>
                <th className="py-3 px-3 text-right">PnL ($)</th>
                <th className="py-3 px-3 text-right">R-Multiple</th>
                <th className="py-3 px-3 font-sans">Бележки при изход</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-500 font-sans">
                    Няма затворени сделки за избрания период ({selectedPeriod}).
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const pnl = t.realizedPnL ?? 0;
                  const isWin = pnl >= 0;
                  const r = t.realizedR ?? 0;
                  const holdingDays = calculateDaysBetween(t.entryDate, t.closedDate);

                  return (
                    <tr key={t.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {t.entryDate || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-semibold whitespace-nowrap">
                        {t.closedDate || '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-850 text-slate-300">
                          {holdingDays} дни
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans whitespace-nowrap">
                        <span className="font-bold text-white mr-1">{t.ticker}</span>
                        <span className="text-[10px] text-slate-500">
                          {t.direction === 'short' ? 'SHORT' : 'LONG'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-400">
                        {t.assetType === 'crypto' ? 'Крипто' : 'Акция'}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-200">
                        {t.shares}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">
                        {formatCurrency(t.entryPrice)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-200 font-semibold">
                        {formatCurrency(t.exitPrice || t.currentPrice)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-bold whitespace-nowrap ${
                          isWin ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(pnl)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${
                            r >= 1
                              ? 'bg-emerald-950 text-emerald-300 ring-1 ring-emerald-700/60'
                              : r >= 0
                              ? 'bg-slate-800 text-emerald-400'
                              : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {formatR(r)}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-400 max-w-[240px] truncate">
                        {t.notes || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
