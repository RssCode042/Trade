import React, { useState } from 'react';
import { TradePosition } from '../types/trade';
import { formatCurrency, formatR } from '../utils/calculations';
import { Trash2, Search, ArrowUpDown, CheckCircle2, XCircle } from 'lucide-react';

interface ClosedTradesTableProps {
  closedTrades: TradePosition[];
  onDeleteClosedTrade: (id: string) => void;
  onExportExcel: () => void;
}

export const ClosedTradesTable: React.FC<ClosedTradesTableProps> = ({
  closedTrades,
  onDeleteClosedTrade,
  onExportExcel,
}) => {
  const [search, setSearch] = useState('');

  const filtered = closedTrades.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.ticker.toLowerCase().includes(q) ||
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.notes && t.notes.toLowerCase().includes(q))
    );
  });

  const totalRealizedPnL = closedTrades.reduce(
    (sum, t) => sum + (t.realizedPnL || 0),
    0
  );
  const wins = closedTrades.filter((t) => (t.realizedPnL || 0) > 0);
  const losses = closedTrades.filter((t) => (t.realizedPnL || 0) < 0);
  const winRate =
    closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

  const sumR = closedTrades.reduce((acc, t) => acc + (t.realizedR || 0), 0);
  const avgR = closedTrades.length > 0 ? sumR / closedTrades.length : 0;

  return (
    <div className="space-y-4">
      {/* Closed Trades Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg">
          <span className="text-[10px] text-slate-400 block font-sans">
            Общ Реализиран PnL
          </span>
          <span
            className={`text-lg font-bold font-mono tabular-nums ${
              totalRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(totalRealizedPnL)}
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg">
          <span className="text-[10px] text-slate-400 block font-sans">
            Успеваемост (Win Rate)
          </span>
          <span className="text-lg font-bold font-mono tabular-nums text-emerald-400">
            {winRate.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-500 font-mono block">
            {wins.length}W · {losses.length}L
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg">
          <span className="text-[10px] text-slate-400 block font-sans">
            Среден Реализиран R
          </span>
          <span
            className={`text-lg font-bold font-mono tabular-nums ${
              avgR >= 0 ? 'text-emerald-300' : 'text-rose-400'
            }`}
          >
            {formatR(avgR)}
          </span>
        </div>

        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg">
          <span className="text-[10px] text-slate-400 block font-sans">
            Затворени сделки
          </span>
          <span className="text-lg font-bold font-mono tabular-nums text-slate-200">
            {closedTrades.length}
          </span>
        </div>
      </div>

      {/* Table Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Търси в затворените сделки..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-200 bg-slate-950 border border-slate-850 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={onExportExcel}
            className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-950 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Експорт на историята в Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Дата вход</th>
                <th className="py-3 px-3">Дата изход</th>
                <th className="py-3 px-3 font-sans">Тикър</th>
                <th className="py-3 px-3 text-right">Дялове</th>
                <th className="py-3 px-3 text-right">Вход ($)</th>
                <th className="py-3 px-3 text-right">Изход ($)</th>
                <th className="py-3 px-3 text-right">Реализиран PnL ($)</th>
                <th className="py-3 px-3 text-right">Реализиран R</th>
                <th className="py-3 px-3 font-sans">Бележки при изход</th>
                <th className="py-3 px-3 text-center">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500 font-sans">
                    Няма намерени затворени сделки в архива.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const pnl = t.realizedPnL || 0;
                  const isWin = pnl >= 0;
                  const r = t.realizedR || 0;

                  return (
                    <tr key={t.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {t.entryDate || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-300 whitespace-nowrap font-semibold">
                        {t.closedDate || '—'}
                      </td>
                      <td className="py-3 px-3 font-sans whitespace-nowrap">
                        <span className="font-bold text-white mr-1.5">{t.ticker}</span>
                        <span className="text-[10px] text-slate-400 mr-1">
                          {t.direction === 'short' ? 'SHORT' : 'LONG'}
                        </span>
                        {t.leverage && t.leverage > 1 && (
                          <span className="text-[10px] font-mono font-semibold px-1 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                            {t.leverage}x
                          </span>
                        )}
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
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => onDeleteClosedTrade(t.id)}
                          title="Премахни от архива"
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
