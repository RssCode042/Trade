import React, { useState } from 'react';
import { TradePosition } from '../types/trade';
import { formatCurrency, formatPercent, formatR } from '../utils/calculations';
import { X, Check, ArrowRight } from 'lucide-react';

interface PartialCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: TradePosition | null;
  onConfirmPartialClose: (
    positionId: string,
    closedShares: number,
    exitPrice: number,
    newStopLoss?: number,
    noteAddition?: string
  ) => void;
}

export const PartialCloseModal: React.FC<PartialCloseModalProps> = ({
  isOpen,
  onClose,
  position,
  onConfirmPartialClose,
}) => {
  if (!isOpen || !position) return null;

  const [trimPercentage, setTrimPercentage] = useState<number>(50);
  const [exitPrice, setExitPrice] = useState<number>(position.currentPrice || position.entryPrice);
  const [moveStopToBreakeven, setMoveStopToBreakeven] = useState<boolean>(true);
  const [customNewStop, setCustomNewStop] = useState<number>(position.stopLoss);
  const [partialNote, setPartialNote] = useState<string>('');

  const sharesToClose = Math.round((position.shares * (trimPercentage / 100)) * 1000) / 1000;
  const remainingShares = Math.max(0, position.shares - sharesToClose);

  // Realized profit calculation on trimmed portion
  const priceDiff =
    position.direction === 'short'
      ? position.entryPrice - exitPrice
      : exitPrice - position.entryPrice;

  const realizedPnL = priceDiff * sharesToClose;
  const realizedPnLPercent =
    position.entryPrice > 0 ? (priceDiff / position.entryPrice) * 100 : 0;

  // Van Tharp R on closed portion
  const riskPerShare =
    position.direction === 'short'
      ? position.stopLoss > position.entryPrice
        ? position.stopLoss - position.entryPrice
        : Math.abs(position.entryPrice - position.stopLoss)
      : position.stopLoss > 0 && position.stopLoss < position.entryPrice
      ? position.entryPrice - position.stopLoss
      : Math.abs(position.entryPrice - position.stopLoss);

  const initialRiskOnClosed = riskPerShare * sharesToClose;
  const realizedR = initialRiskOnClosed > 0 ? realizedPnL / initialRiskOnClosed : 0;

  const handlePercentageClick = (pct: number) => {
    setTrimPercentage(pct);
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (sharesToClose <= 0 || sharesToClose > position.shares) return;

    const newStop = moveStopToBreakeven ? position.entryPrice : customNewStop;
    const noteText = partialNote.trim()
      ? `Прибрани ${trimPercentage}% (${sharesToClose} дяла) на $${exitPrice}: ${partialNote}`
      : `Прибрани ${trimPercentage}% (${sharesToClose} дяла) на $${exitPrice} (+${formatCurrency(realizedPnL)}, ${formatR(realizedR)})`;

    onConfirmPartialClose(
      position.id,
      sharesToClose,
      exitPrice,
      newStop,
      noteText
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
              <span>Частично прибиране на печалба:</span>
              <span className="text-emerald-400 font-mono">{position.ticker}</span>
            </h2>
            <p className="text-xs text-slate-400">
              Заключете част от печалбата и намалете остатъчния риск
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
        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          {/* Quick Percent Buttons */}
          <div>
            <label className="block text-xs text-slate-300 mb-1.5 font-medium">
              Процент за затваряне:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[25, 33.3, 50, 75].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentageClick(pct)}
                  className={`py-1.5 text-xs font-mono rounded border transition-colors cursor-pointer ${
                    trimPercentage === pct
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Shares breakdown */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px]">Текущи дялове</span>
              <span className="text-slate-200 font-bold">{position.shares}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600" />
            <div>
              <span className="text-emerald-400 block text-[10px]">Прибиране</span>
              <span className="text-emerald-400 font-bold">{sharesToClose}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600" />
            <div>
              <span className="text-slate-500 block text-[10px]">Оставащи дялове</span>
              <span className="text-slate-200 font-bold">{remainingShares}</span>
            </div>
          </div>

          {/* Exit Price */}
          <div>
            <label className="block text-xs text-slate-300 mb-1 font-medium">
              Цена на частичното затваряне ($)
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

          {/* Projected Realized Gain */}
          <div className="p-3.5 bg-emerald-950/30 border border-emerald-900/50 rounded-lg font-mono text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Реализирана печалба:</span>
              <span
                className={`font-bold ${
                  realizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(realizedPnL)} ({formatPercent(realizedPnLPercent)})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Реализиран R-Multiple:</span>
              <span className="text-emerald-300 font-bold">
                {formatR(realizedR)}
              </span>
            </div>
          </div>

          {/* Move Stop Loss Option */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={moveStopToBreakeven}
                onChange={(e) => setMoveStopToBreakeven(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700"
              />
              <span>
                Премести стопа на оставащите дялове на <strong>Break-Even (${position.entryPrice.toFixed(2)})</strong>
              </span>
            </label>

            {!moveStopToBreakeven && (
              <div className="pl-6">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Нова стоп цена за остатъка ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={customNewStop}
                  onChange={(e) => setCustomNewStop(parseFloat(e.target.value) || 0)}
                  className="w-36 px-2.5 py-1 text-xs font-mono text-white bg-slate-950 border border-slate-800 rounded"
                />
              </div>
            )}
          </div>

          {/* Note addition */}
          <div>
            <label className="block text-xs text-slate-300 mb-1 font-medium">
              Допълнителна бележка към дневника (незадължително)
            </label>
            <input
              type="text"
              placeholder="напр. достигнато TP1, стоп на нула"
              value={partialNote}
              onChange={(e) => setPartialNote(e.target.value)}
              className="w-full px-3 py-1.5 text-xs text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Buttons */}
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
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm shadow-emerald-500/20"
            >
              <Check className="w-4 h-4" />
              <span>Потвърди частично прибиране</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
