import React, { useState } from 'react';
import { TradePosition } from '../types/trade';
import { formatCurrency, formatPercent, formatR } from '../utils/calculations';
import { X, CheckCircle2 } from 'lucide-react';

interface ClosePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: TradePosition | null;
  onConfirmClose: (
    positionId: string,
    exitPrice: number,
    closedDate: string,
    exitNote: string
  ) => void;
}

export const ClosePositionModal: React.FC<ClosePositionModalProps> = ({
  isOpen,
  onClose,
  position,
  onConfirmClose,
}) => {
  if (!isOpen || !position) return null;

  const today = new Date().toISOString().split('T')[0];
  const [exitPrice, setExitPrice] = useState<number>(
    position.currentPrice || position.entryPrice
  );
  const [closedDate, setClosedDate] = useState<string>(today);
  const [exitNote, setExitNote] = useState<string>('');

  // Calculate realized outcomes
  const diff =
    position.direction === 'short'
      ? position.entryPrice - exitPrice
      : exitPrice - position.entryPrice;

  const realizedPnL = diff * position.shares;
  const realizedPnLPercent =
    position.entryPrice > 0 ? (diff / position.entryPrice) * 100 : 0;

  const riskPerShare =
    position.direction === 'short'
      ? position.stopLoss > position.entryPrice
        ? position.stopLoss - position.entryPrice
        : Math.abs(position.entryPrice - position.stopLoss)
      : position.stopLoss > 0 && position.stopLoss < position.entryPrice
      ? position.entryPrice - position.stopLoss
      : Math.abs(position.entryPrice - position.stopLoss);

  const initialTotalRisk = riskPerShare * position.shares;
  const realizedR = initialTotalRisk > 0 ? realizedPnL / initialTotalRisk : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (exitPrice <= 0) return;

    onConfirmClose(
      position.id,
      exitPrice,
      closedDate,
      exitNote.trim()
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Затваряне на позиция:</span>
              <span className="text-white font-mono">{position.ticker}</span>
            </h2>
            <p className="text-xs text-slate-400">
              Позицията ще бъде преместена в архива със затворени сделки
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Цена на затваряне ($) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={exitPrice}
                onChange={(e) => setExitPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Дата на затваряне *
              </label>
              <input
                type="date"
                required
                value={closedDate}
                onChange={(e) => setClosedDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Realized Performance Summary */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg font-mono text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Дялове за изход:</span>
              <span className="text-slate-200 font-bold">{position.shares}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Цена на вход:</span>
              <span className="text-slate-300">{formatCurrency(position.entryPrice)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-850 pt-2">
              <span className="text-slate-400 font-sans font-medium">Краен Реализиран PnL:</span>
              <span
                className={`text-sm font-bold ${
                  realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(realizedPnL)} ({formatPercent(realizedPnLPercent)})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans font-medium">Краен R-Multiple:</span>
              <span
                className={`text-sm font-bold ${
                  realizedR >= 0 ? 'text-emerald-300' : 'text-rose-400'
                }`}
              >
                {formatR(realizedR)}
              </span>
            </div>
          </div>

          {/* Closing Notes / Post-trade Review */}
          <div>
            <label className="block text-xs text-slate-300 mb-1 font-medium">
              Бележка при затваряне (анализ на изпълнението)
            </label>
            <textarea
              rows={2}
              placeholder="Как мина сделката? Спазен ли беше планът? Какво беше научено?"
              value={exitNote}
              onChange={(e) => setExitNote(e.target.value)}
              className="w-full px-3 py-2 text-xs text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Отказ
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors cursor-pointer shadow-sm shadow-blue-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Затвори и архивирай</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
