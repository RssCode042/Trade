import React, { useState } from 'react';
import { TradePosition } from '../types/trade';
import {
  calculateMetrics,
  formatCurrency,
  formatPercent,
  formatR,
} from '../utils/calculations';
import {
  Edit3,
  Percent,
  CheckCircle2,
  Trash2,
  ArrowUpDown,
  Search,
  Download,
  FileSpreadsheet,
  Clock,
  Coins,
  Building2,
  AlertTriangle,
  ShieldAlert,
  Zap,
} from 'lucide-react';

interface TradeTableProps {
  positions: TradePosition[];
  onEditPosition: (pos: TradePosition) => void;
  onPartialClose: (pos: TradePosition) => void;
  onClosePosition: (pos: TradePosition) => void;
  onDeletePosition: (id: string) => void;
  onExportExcel: () => void;
  onOpenGoogleSheets: () => void;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (seconds: number) => void;
  isRefreshing: boolean;
  onRefreshNow: () => void;
  lastUpdated: string | null;
  autoStopLossEnabled?: boolean;
  onToggleAutoStopLoss?: (enabled: boolean) => void;
}

type SortField =
  | 'ticker'
  | 'entryDate'
  | 'shares'
  | 'leverage'
  | 'initialMargin'
  | 'entryPrice'
  | 'stopLoss'
  | 'currentPrice'
  | 'openPnL'
  | 'openPnLPercent'
  | 'rMultiple'
  | 'openRisk';

export const TradeTable: React.FC<TradeTableProps> = ({
  positions,
  onEditPosition,
  onPartialClose,
  onClosePosition,
  onDeletePosition,
  onExportExcel,
  onOpenGoogleSheets,
  autoRefreshInterval,
  setAutoRefreshInterval,
  isRefreshing,
  onRefreshNow,
  lastUpdated,
  autoStopLossEnabled = true,
  onToggleAutoStopLoss,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'stock' | 'crypto' | 'margin' | 'winning' | 'atRisk'
  >('all');
  const [sortField, setSortField] = useState<SortField>('openPnL');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Filter positions
  const filteredPositions = positions.filter((pos) => {
    if (pos.status === 'closed') return false;

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTicker = pos.ticker.toLowerCase().includes(q);
      const matchName = pos.name?.toLowerCase().includes(q) ?? false;
      const matchNotes = pos.notes?.toLowerCase().includes(q) ?? false;
      if (!matchTicker && !matchName && !matchNotes) return false;
    }

    // Type / Status filter
    const metrics = calculateMetrics(pos);
    if (filterType === 'stock' && pos.assetType !== 'stock') return false;
    if (filterType === 'crypto' && pos.assetType !== 'crypto') return false;
    if (filterType === 'margin' && (pos.leverage || 1) <= 1) return false;
    if (filterType === 'winning' && metrics.openPnL <= 0) return false;
    if (filterType === 'atRisk' && metrics.openPnL >= 0) return false;

    return true;
  });

  // Sort positions
  const sortedPositions = [...filteredPositions].sort((a, b) => {
    const ma = calculateMetrics(a);
    const mb = calculateMetrics(b);

    let valA: string | number = 0;
    let valB: string | number = 0;

    switch (sortField) {
      case 'ticker':
        valA = a.ticker;
        valB = b.ticker;
        break;
      case 'entryDate':
        valA = a.entryDate || '';
        valB = b.entryDate || '';
        break;
      case 'shares':
        valA = a.shares;
        valB = b.shares;
        break;
      case 'leverage':
        valA = a.leverage || 1;
        valB = b.leverage || 1;
        break;
      case 'initialMargin':
        valA = ma.initialMargin;
        valB = mb.initialMargin;
        break;
      case 'entryPrice':
        valA = a.entryPrice;
        valB = b.entryPrice;
        break;
      case 'stopLoss':
        valA = a.stopLoss;
        valB = b.stopLoss;
        break;
      case 'currentPrice':
        valA = a.currentPrice;
        valB = b.currentPrice;
        break;
      case 'openPnL':
        valA = ma.openPnL;
        valB = mb.openPnL;
        break;
      case 'openPnLPercent':
        valA = ma.openPnLPercent;
        valB = mb.openPnLPercent;
        break;
      case 'rMultiple':
        valA = ma.rMultiple;
        valB = mb.rMultiple;
        break;
      case 'openRisk':
        valA = ma.openRisk;
        valB = mb.openRisk;
        break;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Table Controls & Filter Toolbar */}
      <div className="p-4 border-b border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search & Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Търси тикър, компания, бележки..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-200 bg-slate-950 border border-slate-850 rounded-lg placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-850 rounded-lg">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Всички ({positions.filter((p) => p.status !== 'closed').length})
            </button>
            <button
              onClick={() => setFilterType('stock')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'stock'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3 h-3 text-blue-400" />
              <span>Акции</span>
            </button>
            <button
              onClick={() => setFilterType('crypto')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'crypto'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Coins className="w-3 h-3 text-amber-400" />
              <span>Крипто</span>
            </button>
            <button
              onClick={() => setFilterType('margin')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                filterType === 'margin'
                  ? 'bg-amber-950/80 text-amber-300 shadow-sm border border-amber-800/80'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Марджин ({positions.filter((p) => p.status !== 'closed' && (p.leverage || 1) > 1).length})</span>
            </button>
            <button
              onClick={() => setFilterType('winning')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                filterType === 'winning'
                  ? 'bg-emerald-950/80 text-emerald-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Печеливши
            </button>
            <button
              onClick={() => setFilterType('atRisk')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                filterType === 'atRisk'
                  ? 'bg-rose-950/80 text-rose-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              На риск
            </button>
          </div>
        </div>

        {/* Live Auto-Refresh & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Auto Refresh Interval */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 border border-slate-850 px-2.5 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Авто-обновяване:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer"
            >
              <option value={0} className="bg-slate-900 text-slate-200">
                Изключено
              </option>
              <option value={10} className="bg-slate-900 text-slate-200">
                10 сек
              </option>
              <option value={30} className="bg-slate-900 text-slate-200">
                30 сек
              </option>
              <option value={60} className="bg-slate-900 text-slate-200">
                60 сек
              </option>
            </select>
          </div>

          {/* Auto Stop-Loss Transfer Toggle */}
          {onToggleAutoStopLoss && (
            <button
              type="button"
              onClick={() => onToggleAutoStopLoss(!autoStopLossEnabled)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                autoStopLossEnabled
                  ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                  : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
              }`}
              title="Автоматично прехвърляне на позиции в архива (затворени сделки), ако стоп-лосът бъде ударен въз основа на последната пазарна цена"
            >
              <ShieldAlert className={`w-3.5 h-3.5 ${autoStopLossEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Авто-стоп архив:</span>
              <span className="font-mono font-bold text-[11px]">{autoStopLossEnabled ? 'ВКЛ' : 'ИЗКЛ'}</span>
            </button>
          )}

          {/* Export to Excel */}
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Експортирай дневника в Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* Export to Google Sheets */}
          <button
            onClick={onOpenGoogleSheets}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-lg hover:bg-emerald-900/40 transition-colors cursor-pointer"
            title="Синхронизирай с Google Sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Google Sheets</span>
          </button>
        </div>
      </div>

      {/* High-density Trading Table Viewport */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
              <th
                onClick={() => handleSort('entryDate')}
                className="py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Дата</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => handleSort('ticker')}
                className="py-3 px-3 cursor-pointer hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center gap-1">
                  <span>Тикър</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => handleSort('shares')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Дялове</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => handleSort('initialMargin')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
                title="Заделен марджин (Обезпечение) = Стойност / Ливъридж"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Марджин ($)</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => handleSort('entryPrice')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Цена вход</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => handleSort('stopLoss')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Стоп цена</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => handleSort('currentPrice')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Текуща цена</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => handleSort('openPnL')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Open PnL ($)</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => handleSort('openPnLPercent')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Open PnL (%)</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => handleSort('rMultiple')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
                title="R Multiple = Van Tharp съотношение между текущия PnL и първоначалния поет риск"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>R-Multiple</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              <th
                onClick={() => handleSort('openRisk')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white whitespace-nowrap"
                title="Open Risk = Общ капитал в риск при достигане на стоп цената"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Open Risk ($)</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>

              <th className="py-3 px-3 whitespace-nowrap">
                <span>Частичен прибиране</span>
              </th>

              <th className="py-3 px-3 whitespace-nowrap">
                <span>Бележки</span>
              </th>

              <th className="py-3 px-3 text-center whitespace-nowrap">
                <span>Действия</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800 font-mono">
            {sortedPositions.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-sm font-sans">
                      Няма намерени отворени позиции по избраните критерии.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterType('all');
                      }}
                      className="text-xs text-emerald-400 hover:underline font-sans cursor-pointer"
                    >
                      Изчисти филтрите
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              sortedPositions.map((pos) => {
                const m = calculateMetrics(pos);
                const isPnLPositive = m.openPnL >= 0;
                const isRPositive = m.rMultiple >= 0;

                // Stop loss warning: if current price is within 1.5% of stop loss
                const stopDiff =
                  pos.direction === 'short'
                    ? pos.stopLoss - pos.currentPrice
                    : pos.currentPrice - pos.stopLoss;
                const isNearStop =
                  pos.currentPrice > 0 &&
                  pos.stopLoss > 0 &&
                  stopDiff > 0 &&
                  stopDiff / pos.currentPrice < 0.02;

                return (
                  <tr
                    key={pos.id}
                    className="hover:bg-slate-850/50 transition-colors group"
                  >
                    {/* 1. Дата на вход */}
                    <td className="py-3 px-3 text-slate-400 whitespace-nowrap tabular-nums">
                      {pos.entryDate || '—'}
                    </td>

                    {/* 2. Тикър + Икона & Посока */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-bold text-slate-100 text-sm group-hover:text-emerald-400 transition-colors">
                          {pos.ticker}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-sans">
                          <span
                            className={`px-1 rounded ${
                              pos.direction === 'short'
                                ? 'bg-purple-950/80 text-purple-300'
                                : 'bg-blue-950/80 text-blue-300'
                            }`}
                          >
                            {pos.direction === 'short' ? 'SHORT' : 'LONG'}
                          </span>
                          {(pos.leverage || 1) > 1 ? (
                            <span
                              className="px-1 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono font-semibold"
                              title={`Ливъридж: ${pos.leverage}x (${pos.marginMode || 'isolated'})`}
                            >
                              {pos.leverage}x
                            </span>
                          ) : (
                            <span className="px-1 rounded bg-slate-950 text-slate-500 border border-slate-800/80 font-mono">
                              1x
                            </span>
                          )}
                          <span className="text-slate-500">
                            {pos.assetType === 'crypto' ? 'Крипто' : 'Акция'}
                          </span>
                        </div>
                      </div>
                      {pos.name && (
                        <div className="text-[11px] font-sans text-slate-500 truncate max-w-[150px]">
                          {pos.name}
                        </div>
                      )}
                    </td>

                    {/* 3. Дялове */}
                    <td className="py-3 px-3 text-right text-slate-200 tabular-nums whitespace-nowrap">
                      {pos.shares}
                    </td>

                    {/* 3.1 Заделен марджин */}
                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                      <div className="font-semibold text-slate-200">
                        {formatCurrency(m.initialMargin)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {(pos.leverage || 1) > 1
                          ? `${pos.leverage}x ${pos.marginMode === 'cross' ? 'Cross' : 'Isol'}`
                          : '1x Спот'}
                      </div>
                    </td>

                    {/* 4. Цена покупка */}
                    <td className="py-3 px-3 text-right text-slate-300 tabular-nums whitespace-nowrap">
                      {formatCurrency(pos.entryPrice)}
                    </td>

                    {/* 5. Стоп цена & Ликвидация */}
                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {isNearStop && (
                          <span title="Текущата цена е близо до стопа!">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          </span>
                        )}
                        <span
                          className={
                            isNearStop ? 'text-amber-400 font-semibold' : 'text-slate-400'
                          }
                        >
                          {formatCurrency(pos.stopLoss)}
                        </span>
                      </div>
                      {(pos.leverage || 1) > 1 && m.liquidationPrice > 0 && (
                        <div className="flex items-center justify-end gap-1 text-[10px] mt-0.5">
                          {m.isNearLiquidation && (
                            <span title="Внимание! Риск от ликвидация: текущата цена е критично близо до ликвидационното ниво!">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                            </span>
                          )}
                          <span
                            className={
                              m.isNearLiquidation
                                ? 'text-rose-400 font-bold'
                                : 'text-slate-500'
                            }
                            title="Очаквана ликвидационна цена"
                          >
                            Ликв: {formatCurrency(m.liquidationPrice)}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* 6. Текуща цена */}
                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                      <div className="text-slate-100 font-semibold">
                        {formatCurrency(pos.currentPrice)}
                      </div>
                      {typeof pos.priceChangePercent24h === 'number' && (
                        <div
                          className={`text-[10px] ${
                            pos.priceChangePercent24h >= 0
                              ? 'text-emerald-400/80'
                              : 'text-rose-400/80'
                          }`}
                        >
                          {pos.priceChangePercent24h >= 0 ? '+' : ''}
                          {pos.priceChangePercent24h.toFixed(2)}% (24h)
                        </div>
                      )}
                    </td>

                    {/* 7. Open PnL ($) */}
                    <td
                      className={`py-3 px-3 text-right tabular-nums font-bold whitespace-nowrap ${
                        isPnLPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(m.openPnL)}
                    </td>

                    {/* 8. Open PnL (%) & ROE % */}
                    <td
                      className={`py-3 px-3 text-right tabular-nums font-medium whitespace-nowrap ${
                        isPnLPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      <div>{formatPercent(m.openPnLPercent)}</div>
                      {(pos.leverage || 1) > 1 && (
                        <div
                          className={`text-[10px] font-semibold font-mono ${
                            m.roePercent >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'
                          }`}
                          title="Return on Equity (ROE %) = Open PnL / Заделен марджин"
                        >
                          ROE: {formatPercent(m.roePercent)}
                        </div>
                      )}
                    </td>

                    {/* 9. R-Multiple */}
                    <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${
                          m.rMultiple >= 2
                            ? 'bg-emerald-950 text-emerald-300 ring-1 ring-emerald-700/60'
                            : m.rMultiple >= 0.5
                            ? 'bg-emerald-950/60 text-emerald-400'
                            : m.rMultiple >= 0
                            ? 'bg-slate-800 text-slate-300'
                            : m.rMultiple <= -1
                            ? 'bg-rose-950 text-rose-300 ring-1 ring-rose-700/60'
                            : 'bg-rose-950/60 text-rose-400'
                        }`}
                      >
                        {formatR(m.rMultiple)}
                      </span>
                    </td>

                    {/* 10. Open Risk ($) */}
                    <td className="py-3 px-3 text-right text-amber-300/90 tabular-nums whitespace-nowrap font-medium">
                      {formatCurrency(m.openRisk)}
                    </td>

                    {/* 11. Частичен за прибиране на печалба */}
                    <td className="py-3 px-3 text-slate-300 font-sans text-xs max-w-[180px] truncate">
                      {pos.partialTakeProfit ? (
                        <span
                          title={pos.partialTakeProfit}
                          className="text-slate-300"
                        >
                          {pos.partialTakeProfit}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* 12. Бележки */}
                    <td className="py-3 px-3 font-sans text-slate-400 max-w-[220px] truncate">
                      {pos.notes ? (
                        <span title={pos.notes} className="hover:text-slate-200">
                          {pos.notes}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">няма бележки</span>
                      )}
                    </td>

                    {/* 13. Действия */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {/* Редакция */}
                        <button
                          onClick={() => onEditPosition(pos)}
                          title="Редактирай позиция"
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Частично прибиране */}
                        <button
                          onClick={() => onPartialClose(pos)}
                          title="Частично прибиране на печалба (Take Profit)"
                          className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 rounded transition-colors cursor-pointer"
                        >
                          <Percent className="w-3.5 h-3.5" />
                        </button>

                        {/* Пълно затваряне */}
                        <button
                          onClick={() => onClosePosition(pos)}
                          title="Затвори позицията напълно"
                          className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-950/60 rounded transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Изтриване */}
                        <button
                          onClick={() => onDeletePosition(pos.id)}
                          title="Изтрий позиция"
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Summary Counter and Legend */}
      <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
        <div className="flex items-center gap-3">
          <span>
            Показани <strong className="text-slate-300">{sortedPositions.length}</strong> от общо{' '}
            <strong className="text-slate-300">
              {positions.filter((p) => p.status !== 'closed').length}
            </strong>{' '}
            отворени позиции
          </span>
          {lastUpdated && (
            <span className="hidden md:inline font-mono text-[11px] text-slate-400">
              · Последна котировка: {lastUpdated}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            <span>Печалба (&gt;0R)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>
            <span>Загуба (&lt;0R)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
            <span>Риск на стопа (1R)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
