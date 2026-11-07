import React, { useState, useEffect } from 'react';
import { TradePosition, AssetType, PositionDirection } from '../types/trade';
import { formatCurrency, formatPercent, formatR } from '../utils/calculations';
import { X, Calculator, ShieldCheck, Sparkles, AlertTriangle, Zap, ShieldAlert } from 'lucide-react';

interface AddEditPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (position: TradePosition) => void;
  initialPosition?: TradePosition | null;
}

const QUICK_TICKERS = [
  { symbol: 'NVDA', type: 'stock', name: 'NVIDIA' },
  { symbol: 'AAPL', type: 'stock', name: 'Apple' },
  { symbol: 'TSLA', type: 'stock', name: 'Tesla' },
  { symbol: 'MSFT', type: 'stock', name: 'Microsoft' },
  { symbol: 'BTC-USD', type: 'crypto', name: 'Bitcoin' },
  { symbol: 'ETH-USD', type: 'crypto', name: 'Ethereum' },
  { symbol: 'SOL-USD', type: 'crypto', name: 'Solana' },
  { symbol: 'SPY', type: 'stock', name: 'S&P 500 ETF' },
];

const LEVERAGE_PRESETS = [1, 2, 3, 5, 10, 20, 50, 100];

export const AddEditPositionModal: React.FC<AddEditPositionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPosition,
}) => {
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [direction, setDirection] = useState<PositionDirection>('long');
  const [entryDate, setEntryDate] = useState('');
  const [shares, setShares] = useState<number | ''>('');
  const [entryPrice, setEntryPrice] = useState<number | ''>('');
  const [stopLoss, setStopLoss] = useState<number | ''>('');
  const [currentPrice, setCurrentPrice] = useState<number | ''>('');
  const [targetPrice, setTargetPrice] = useState<number | ''>('');
  const [partialTakeProfit, setPartialTakeProfit] = useState('');
  const [leverage, setLeverage] = useState<number>(1);
  const [marginMode, setMarginMode] = useState<'isolated' | 'cross'>('isolated');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPosition) {
      setTicker(initialPosition.ticker);
      setName(initialPosition.name || '');
      setAssetType(initialPosition.assetType);
      setDirection(initialPosition.direction);
      setEntryDate(initialPosition.entryDate);
      setShares(initialPosition.shares);
      setEntryPrice(initialPosition.entryPrice);
      setStopLoss(initialPosition.stopLoss);
      setCurrentPrice(initialPosition.currentPrice);
      setTargetPrice(initialPosition.targetPrice || '');
      setPartialTakeProfit(initialPosition.partialTakeProfit || '');
      setLeverage(initialPosition.leverage || 1);
      setMarginMode(initialPosition.marginMode || 'isolated');
      setNotes(initialPosition.notes || '');
    } else {
      // Defaults for new trade
      const today = new Date().toISOString().split('T')[0];
      setTicker('');
      setName('');
      setAssetType('stock');
      setDirection('long');
      setEntryDate(today);
      setShares('');
      setEntryPrice('');
      setStopLoss('');
      setCurrentPrice('');
      setTargetPrice('');
      setPartialTakeProfit('');
      setLeverage(1);
      setMarginMode('isolated');
      setNotes('');
    }
    setError(null);
  }, [initialPosition, isOpen]);

  if (!isOpen) return null;

  // Real-time risk calculations inside modal
  const numShares = typeof shares === 'number' ? shares : parseFloat(String(shares)) || 0;
  const numEntry = typeof entryPrice === 'number' ? entryPrice : parseFloat(String(entryPrice)) || 0;
  const numStop = typeof stopLoss === 'number' ? stopLoss : parseFloat(String(stopLoss)) || 0;
  const numCurrent = typeof currentPrice === 'number' && currentPrice > 0 ? currentPrice : numEntry;
  const numTarget = typeof targetPrice === 'number' ? targetPrice : parseFloat(String(targetPrice)) || 0;
  const numLeverage = Math.max(1, typeof leverage === 'number' && !isNaN(leverage) ? leverage : 1);

  // Position notional value and margin collateral
  const positionValue = numShares * numEntry;
  const initialMargin = numLeverage > 0 ? positionValue / numLeverage : positionValue;

  // Risk per share
  const riskPerShare =
    direction === 'short'
      ? numStop > numEntry
        ? numStop - numEntry
        : Math.abs(numEntry - numStop)
      : numStop > 0 && numStop < numEntry
      ? numEntry - numStop
      : Math.abs(numEntry - numStop);

  const totalRisk = riskPerShare * numShares;

  // Potential reward at target price
  const rewardPerShare =
    direction === 'short'
      ? numTarget > 0 && numTarget < numEntry
        ? numEntry - numTarget
        : 0
      : numTarget > numEntry
      ? numTarget - numEntry
      : 0;

  const targetReward = rewardPerShare * numShares;
  const potentialRR = totalRisk > 0 && targetReward > 0 ? targetReward / totalRisk : 0;

  // Current PnL, R, and ROE %
  const currentDiff = direction === 'short' ? numEntry - numCurrent : numCurrent - numEntry;
  const currentPnL = currentDiff * numShares;
  const currentR = totalRisk > 0 ? currentPnL / totalRisk : 0;
  const roePercent = initialMargin > 0 ? (currentPnL / initialMargin) * 100 : 0;

  // Estimated Liquidation Price for leveraged margin positions
  let liquidationPrice = 0;
  if (numLeverage > 1 && numEntry > 0) {
    const maxDropFraction = (1 / numLeverage) * 0.95; // 95% margin buffer
    if (direction === 'short') {
      liquidationPrice = numEntry * (1 + maxDropFraction);
    } else {
      liquidationPrice = Math.max(0, numEntry * (1 - maxDropFraction));
    }
  }

  // Safety Warning: Stop loss should never be beyond liquidation price
  const isStopLossWorseThanLiquidation =
    numLeverage > 1 &&
    liquidationPrice > 0 &&
    numStop > 0 &&
    (direction === 'short' ? numStop >= liquidationPrice : numStop <= liquidationPrice);

  const handleSelectQuickTicker = (item: (typeof QUICK_TICKERS)[0]) => {
    setTicker(item.symbol);
    setName(item.name);
    setAssetType(item.type as AssetType);
  };

  const handleCalculateTakeProfitSuggestion = (rMultipleTarget: number) => {
    if (numEntry <= 0 || riskPerShare <= 0) return;
    const target =
      direction === 'short'
        ? numEntry - riskPerShare * rMultipleTarget
        : numEntry + riskPerShare * rMultipleTarget;
    setTargetPrice(Math.round(target * 100) / 100);
    setPartialTakeProfit(`50% при $${(Math.round(target * 100) / 100).toFixed(2)} (${rMultipleTarget}R)`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) {
      setError('Моля, въведете борсов тикър (напр. AAPL, BTC-USD).');
      return;
    }
    if (numShares <= 0) {
      setError('Моля, въведете валиден брой дялове / количество (> 0).');
      return;
    }
    if (numEntry <= 0) {
      setError('Моля, въведете валидна цена на покупка (> 0).');
      return;
    }
    if (numStop <= 0) {
      setError('Моля, въведете стоп цена за управление на риска (> 0).');
      return;
    }

    const newPosition: TradePosition = {
      id: initialPosition ? initialPosition.id : `pos-${Date.now()}`,
      ticker: ticker.trim().toUpperCase(),
      name: name.trim() || undefined,
      assetType,
      direction,
      entryDate: entryDate || new Date().toISOString().split('T')[0],
      shares: numShares,
      entryPrice: numEntry,
      stopLoss: numStop,
      currentPrice: numCurrent > 0 ? numCurrent : numEntry,
      targetPrice: numTarget > 0 ? numTarget : undefined,
      partialTakeProfit: partialTakeProfit.trim(),
      leverage: numLeverage,
      marginMode,
      notes: notes.trim(),
      status: initialPosition ? initialPosition.status : 'open',
    };

    onSave(newPosition);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h2 className="text-base font-bold text-white">
              {initialPosition ? 'Редактиране на позиция' : 'Нова търговска позиция'}
            </h2>
            <p className="text-xs text-slate-400">
              Попълнете параметрите за управление на риска и пазарни цели
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs text-rose-300 bg-rose-950/60 border border-rose-800 rounded-lg">
              {error}
            </div>
          )}

          {/* Quick Tickers Selector */}
          {!initialPosition && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                Бърз избор на популярен инструмент:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TICKERS.map((item) => (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => handleSelectQuickTicker(item)}
                    className="px-2.5 py-1 text-xs font-mono bg-slate-950 border border-slate-800 text-slate-300 rounded hover:border-emerald-500 hover:text-white transition-colors cursor-pointer"
                  >
                    {item.symbol}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Row 1: Ticker, Asset Type, Direction */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Тикър (Символ) *
              </label>
              <input
                type="text"
                required
                placeholder="напр. NVDA или BTC-USD"
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
                className="w-full px-3 py-2 text-sm text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="stock">Акция (Stock / ETF)</option>
                <option value="crypto">Криптовалута (Crypto)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Посока
              </label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as PositionDirection)}
                className="w-full px-3 py-2 text-sm text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="long">Дълга (Long - покупка)</option>
                <option value="short">Къса (Short - продажба)</option>
              </select>
            </div>
          </div>

          {/* Row 2: Entry Date & Shares */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Дата на вход *
              </label>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Дялове / Количество *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="напр. 50 или 0.25"
                value={shares}
                onChange={(e) => setShares(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Row 3: Prices (Entry Price, Stop Loss, Current Price) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Цена покупка ($) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="100.00"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Стоп цена ($) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="95.00"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Текуща цена ($)
              </label>
              <input
                type="number"
                step="any"
                placeholder="Ако е празно, равна на вход"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Row 3.5: Margin & Leverage Controls */}
          <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-slate-200 font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Марджин опция & Ливъридж:</span>
                <span className="font-mono text-amber-300 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded text-[11px]">
                  {numLeverage}x {numLeverage === 1 ? '(Спот / Кеш)' : 'Ливъридж'}
                </span>
              </label>
              <div className="flex items-center gap-1 text-[11px] font-sans">
                <span className="text-slate-400">Режим:</span>
                <select
                  value={marginMode}
                  onChange={(e) => setMarginMode(e.target.value as 'isolated' | 'cross')}
                  className="bg-slate-900 border border-slate-800 text-slate-200 rounded px-2 py-0.5 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="isolated">Изолиран (Isolated)</option>
                  <option value="cross">Крос марджин (Cross)</option>
                </select>
              </div>
            </div>

            {/* Quick leverage buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {LEVERAGE_PRESETS.map((lev) => (
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

              {/* Custom input */}
              <div className="flex items-center gap-1 pl-2 text-xs">
                <span className="text-slate-500 font-mono">или:</span>
                <input
                  type="number"
                  min="1"
                  max="125"
                  step="1"
                  value={leverage}
                  onChange={(e) => setLeverage(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 text-xs font-mono text-white bg-slate-900 border border-slate-800 rounded focus:outline-none focus:border-amber-500 text-center"
                  placeholder="1x"
                />
              </div>
            </div>
          </div>

          {/* Interactive Live Risk, Margin & R-Multiple Assessment Card */}
          {numEntry > 0 && (
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 font-semibold text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Изчислен риск и марджин параметри
                </span>
                <span className="font-mono text-slate-500">1R = ${riskPerShare.toFixed(2)} / дял</span>
              </div>

              {/* Critical safety alert if stop loss is looser than liquidation price */}
              {isStopLossWorseThanLiquidation && (
                <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-lg flex items-start gap-2 text-xs text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">
                      Критично предупреждение за ликвидация!
                    </strong>
                    Стоп цената (${numStop.toFixed(2)}) е зад очакваната ликвидационна цена (${liquidationPrice.toFixed(2)}).
                    При движение на цената срещу вас, позицията ще бъде автоматично ликвидирана преди стопът да бъде изпълнен!
                    Преместете стопа по-близо до входа или намалете ливъриджа ({numLeverage}x).
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 font-mono text-xs">
                {/* 1. Номинален обем */}
                <div className="p-2 bg-slate-900 rounded border border-slate-850">
                  <div className="text-[10px] text-slate-400">Стойност позиция</div>
                  <div className="font-bold text-slate-200">
                    {formatCurrency(positionValue)}
                  </div>
                </div>

                {/* 2. Заделен марджин */}
                <div className="p-2 bg-slate-900 rounded border border-amber-900/50">
                  <div className="text-[10px] text-amber-400 font-semibold">Заделен марджин</div>
                  <div className="font-bold text-amber-300">
                    {formatCurrency(initialMargin)}
                  </div>
                </div>

                {/* 3. Ликвидационна цена (при марджин) */}
                <div className="p-2 bg-slate-900 rounded border border-slate-850">
                  <div className="text-[10px] text-slate-400">Ликвидация (оценка)</div>
                  <div
                    className={`font-bold ${
                      numLeverage > 1
                        ? isStopLossWorseThanLiquidation
                          ? 'text-rose-400 font-bold'
                          : 'text-amber-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {numLeverage > 1 ? formatCurrency(liquidationPrice) : 'Няма (1x)'}
                  </div>
                </div>

                {/* 4. Open Risk ($) */}
                <div className="p-2 bg-slate-900 rounded border border-slate-850">
                  <div className="text-[10px] text-amber-400">Open Risk (1R)</div>
                  <div className="font-bold text-amber-300">
                    {formatCurrency(totalRisk)}
                  </div>
                </div>

                {/* 5. Open PnL & ROE % */}
                <div className="p-2 bg-slate-900 rounded border border-slate-850">
                  <div className="text-[10px] text-slate-400">
                    {numLeverage > 1 ? 'Open PnL / ROE' : 'Open PnL'}
                  </div>
                  <div
                    className={`font-bold ${
                      currentPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(currentPnL)}
                  </div>
                  {numLeverage > 1 && (
                    <div
                      className={`text-[10px] ${
                        roePercent >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'
                      }`}
                    >
                      ROE: {formatPercent(roePercent)}
                    </div>
                  )}
                </div>

                {/* 6. R-Multiple */}
                <div className="p-2 bg-slate-900 rounded border border-slate-850">
                  <div className="text-[10px] text-slate-400">Текущ R-Multiple</div>
                  <div
                    className={`font-bold ${
                      currentR >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatR(currentR)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Row 4: Partial Take Profit & Target Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-300 font-medium">
                  Целева цена за Take Profit ($)
                </label>
                {riskPerShare > 0 && (
                  <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                    <button
                      type="button"
                      onClick={() => handleCalculateTakeProfitSuggestion(2)}
                      className="hover:underline cursor-pointer"
                    >
                      2R
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => handleCalculateTakeProfitSuggestion(3)}
                      className="hover:underline cursor-pointer"
                    >
                      3R
                    </button>
                  </div>
                )}
              </div>
              <input
                type="number"
                step="any"
                placeholder="напр. 120.00"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
              />
              {potentialRR > 0 && (
                <p className="mt-1 text-[11px] text-slate-400 font-mono">
                  Потенциално съотношение Риск/Печалба: 1:{potentialRR.toFixed(2)} (+{formatCurrency(targetReward)})
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Частичен за прибиране на печалба
              </label>
              <input
                type="text"
                placeholder="напр. 50% при $150.00 или TP1: $140"
                value={partialTakeProfit}
                onChange={(e) => setPartialTakeProfit(e.target.value)}
                className="w-full px-3 py-2 text-sm text-white bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Row 5: Notes */}
          <div>
            <label className="block text-xs text-slate-300 mb-1 font-medium">
              Бележки за конкретната позиция
            </label>
            <textarea
              rows={3}
              placeholder="Опишете търговската идея, катализатори, технически нива, план за местене на стопа..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs text-white bg-slate-950 border border-slate-800 rounded-lg placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
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
              className="px-5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm shadow-emerald-500/20"
            >
              {initialPosition ? 'Запази промените' : 'Добави позиция'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
