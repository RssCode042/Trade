import React, { useState } from 'react';
import { formatCurrency, formatPercent, formatR } from '../utils/calculations';
import { X, Calculator, ShieldCheck, ArrowRight, Plus, Zap } from 'lucide-react';
import { AssetType, PositionDirection, TradePosition } from '../types/trade';

interface RiskCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferToNewTrade: (preset: Partial<TradePosition>) => void;
}

const LEVERAGE_OPTIONS = [1, 2, 3, 5, 10, 20, 50, 100];

export const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({
  isOpen,
  onClose,
  onTransferToNewTrade,
}) => {
  if (!isOpen) return null;

  const [accountSize, setAccountSize] = useState<number>(25000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [ticker, setTicker] = useState<string>('NVDA');
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [direction, setDirection] = useState<PositionDirection>('long');
  const [entryPrice, setEntryPrice] = useState<number>(140);
  const [stopLoss, setStopLoss] = useState<number>(133);
  const [leverage, setLeverage] = useState<number>(1);

  const numLeverage = Math.max(1, leverage || 1);

  // Calculations
  const maxRiskAmount = accountSize * (riskPercent / 100);
  const riskPerShare =
    direction === 'short'
      ? stopLoss > entryPrice
        ? stopLoss - entryPrice
        : Math.abs(entryPrice - stopLoss)
      : stopLoss > 0 && stopLoss < entryPrice
      ? entryPrice - stopLoss
      : Math.abs(entryPrice - stopLoss);

  // Max shares = maxRiskAmount / riskPerShare
  const maxShares =
    riskPerShare > 0
      ? assetType === 'crypto'
        ? Math.floor((maxRiskAmount / riskPerShare) * 1000) / 1000
        : Math.floor(maxRiskAmount / riskPerShare)
      : 0;

  const totalPositionCost = maxShares * entryPrice;
  const requiredMargin = numLeverage > 0 ? totalPositionCost / numLeverage : totalPositionCost;
  const portfolioAllocationPercent =
    accountSize > 0 ? (totalPositionCost / accountSize) * 100 : 0;
  const marginAllocationPercent =
    accountSize > 0 ? (requiredMargin / accountSize) * 100 : 0;

  // Estimated liquidation price
  let liquidationPrice = 0;
  if (numLeverage > 1 && entryPrice > 0) {
    const maxDrop = (1 / numLeverage) * 0.95;
    liquidationPrice =
      direction === 'short'
        ? entryPrice * (1 + maxDrop)
        : Math.max(0, entryPrice * (1 - maxDrop));
  }

  // Multiples table
  const rMultiples = [1, 1.5, 2, 2.5, 3, 5];
  const targets = rMultiples.map((r) => {
    const target =
      direction === 'short'
        ? entryPrice - riskPerShare * r
        : entryPrice + riskPerShare * r;
    const profit = maxRiskAmount * r;
    return { r, target, profit };
  });

  const handleUseInJournal = () => {
    onTransferToNewTrade({
      ticker: ticker.trim().toUpperCase(),
      assetType,
      direction,
      shares: maxShares,
      entryPrice,
      stopLoss,
      leverage: numLeverage,
      targetPrice: targets.find((t) => t.r === 2)?.target,
      partialTakeProfit: `50% при $${(targets.find((t) => t.r === 2)?.target || 0).toFixed(2)} (2R)`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                Професионален Калкулатор за Размер на Позицията (Van Tharp 1R)
              </h2>
              <p className="text-xs text-slate-400">
                Определете точния брой дялове, за да не рискувате повече от зададения % от капитала
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Inputs Row 1: Account Size & Risk % */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Общ размер на портфейла ($)
              </label>
              <input
                type="number"
                step="any"
                value={accountSize}
                onChange={(e) => setAccountSize(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-300 font-medium">
                  Риск на сделка (%)
                </label>
                <div className="flex gap-1 text-[11px] font-mono text-emerald-400">
                  {[0.5, 1, 1.5, 2].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setRiskPercent(pct)}
                      className={`px-1.5 py-0.5 rounded ${
                        riskPercent === pct
                          ? 'bg-emerald-950 text-emerald-300 font-bold'
                          : 'hover:text-white'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                step="0.1"
                value={riskPercent}
                onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Inputs Row 2: Ticker, Type, Entry, Stop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Тикър
              </label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Клас актив
              </label>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as AssetType)}
                className="w-full px-3 py-2 text-sm text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
              >
                <option value="stock">Акция</option>
                <option value="crypto">Крипто</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Цена вход ($)
              </label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Стоп цена ($)
              </label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Inputs Row 3: Leverage & Margin Selector */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="text-slate-300 font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Марджин опция (Ливъридж):</span>
                <span className="font-mono text-amber-300 font-bold bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded text-[11px]">
                  {numLeverage}x {numLeverage === 1 ? '(Кеш / Спот)' : 'Ливъридж'}
                </span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                Намалява нужното обезпечение без да променя 1R риска
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {LEVERAGE_OPTIONS.map((lev) => (
                <button
                  key={lev}
                  type="button"
                  onClick={() => setLeverage(lev)}
                  className={`px-2.5 py-1 text-xs font-mono rounded transition-colors cursor-pointer border ${
                    numLeverage === lev
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {lev === 1 ? '1x Спот' : `${lev}x`}
                </button>
              ))}
            </div>
          </div>

          {/* Results Summary Cards */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-sans font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Резултати за управление на риска и марджина</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
              {/* 1. Максимален риск (1R) */}
              <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg">
                <span className="text-[10px] text-amber-400 block font-sans">
                  Максимален риск (1R)
                </span>
                <span className="text-base font-bold text-amber-300">
                  {formatCurrency(maxRiskAmount)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ({riskPercent}% от капитала)
                </span>
              </div>

              {/* 2. Риск на дял */}
              <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-sans">
                  Риск на дял ($)
                </span>
                <span className="text-base font-bold text-slate-100">
                  {formatCurrency(riskPerShare)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  дистанция до стопа
                </span>
              </div>

              {/* 3. Препоръчани дялове */}
              <div className="p-3 bg-slate-900 border border-emerald-900/60 rounded-lg">
                <span className="text-[10px] text-emerald-400 block font-sans font-bold">
                  Препоръчани дялове
                </span>
                <span className="text-lg font-bold text-emerald-400">
                  {maxShares}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {assetType === 'crypto' ? 'монети' : 'акции'}
                </span>
              </div>

              {/* 4. Заделен марджин */}
              <div className="p-3 bg-slate-900 border border-amber-900/50 rounded-lg">
                <span className="text-[10px] text-amber-400 block font-sans font-semibold">
                  Заделен марджин ({numLeverage}x)
                </span>
                <span className="text-base font-bold text-amber-300">
                  {formatCurrency(requiredMargin)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {marginAllocationPercent.toFixed(1)}% от портфейла
                </span>
              </div>

              {/* 5. Ликвидация / Стойност */}
              <div className="p-3 bg-slate-900 border border-slate-850 rounded-lg">
                <span className="text-[10px] text-slate-400 block font-sans">
                  {numLeverage > 1 ? 'Очаквана ликвидация' : 'Номинален обем'}
                </span>
                <span className={`text-base font-bold ${numLeverage > 1 ? 'text-rose-400' : 'text-slate-200'}`}>
                  {numLeverage > 1 ? formatCurrency(liquidationPrice) : formatCurrency(totalPositionCost)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {numLeverage > 1 ? `Пълен обем: ${formatCurrency(totalPositionCost)}` : `${portfolioAllocationPercent.toFixed(1)}% от портфейла`}
                </span>
              </div>
            </div>
          </div>

          {/* Projected R Targets Grid */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 mb-2">
              Целеви нива на печалба по R-Multiple:
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 font-mono text-xs">
              {targets.map((t) => (
                <div
                  key={t.r}
                  className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg text-center"
                >
                  <div className="text-[11px] text-emerald-400 font-bold">
                    {formatR(t.r)}
                  </div>
                  <div className="text-xs text-slate-100 font-semibold my-0.5">
                    {formatCurrency(t.target)}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    +{formatCurrency(t.profit)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-xs text-slate-500">
              * Винаги спазвайте 1R правилото за защита на търговския капитал
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Затвори
              </button>
              <button
                type="button"
                onClick={handleUseInJournal}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Прехвърли в нова позиция</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
