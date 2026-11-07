/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { TradePosition } from './types/trade';
import { INITIAL_OPEN_POSITIONS, INITIAL_CLOSED_TRADES } from './data/initialTrades';
import {
  calculatePortfolioSummary,
  isStopLossHit,
  executeStopLossExit,
  formatCurrency,
} from './utils/calculations';
import { fetchLiveQuotes } from './services/marketApi';
import { exportTradesToExcel } from './services/excelExport';
import { initAuth, googleSignIn, logout } from './services/googleAuth';

import { TopNav } from './components/TopNav';
import { KpiMetricsBar } from './components/KpiMetricsBar';
import { TradeTable } from './components/TradeTable';
import { AddEditPositionModal } from './components/AddEditPositionModal';
import { PartialCloseModal } from './components/PartialCloseModal';
import { ClosePositionModal } from './components/ClosePositionModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { RiskCalculatorModal } from './components/RiskCalculatorModal';
import { ClosedTradesTable } from './components/ClosedTradesTable';
import { AnalyticsPage } from './components/AnalyticsPage';

import {
  TrendingUp,
  RefreshCw,
  Plus,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Calculator,
  ShieldAlert,
  AlertTriangle,
  X,
} from 'lucide-react';

const STORAGE_KEY_OPEN = 'apextrade_open_positions_v1';
const STORAGE_KEY_CLOSED = 'apextrade_closed_trades_v2';
const STORAGE_KEY_AUTO_STOP = 'apextrade_auto_stop_loss_v1';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'open' | 'closed' | 'calculator' | 'analytics'>('open');

  // Trade state loaded from localStorage or demo defaults
  const [positions, setPositions] = useState<TradePosition[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OPEN);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_OPEN_POSITIONS;
  });

  const [closedTrades, setClosedTrades] = useState<TradePosition[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CLOSED);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_CLOSED_TRADES;
  });

  // Google Auth state
  const [user, setUser] = useState<User | null>(null);

  // Market quotes auto-refresh state
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30); // 30s default
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-transfer on Stop-Loss hit
  const [autoStopLossEnabled, setAutoStopLossEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTO_STOP);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [autoClosedAlert, setAutoClosedAlert] = useState<{
    time: string;
    trades: TradePosition[];
  } | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AUTO_STOP, JSON.stringify(autoStopLossEnabled));
  }, [autoStopLossEnabled]);

  // Modals state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<TradePosition | null>(null);

  const [isPartialCloseOpen, setIsPartialCloseOpen] = useState(false);
  const [partialCloseTarget, setPartialCloseTarget] = useState<TradePosition | null>(null);

  const [isClosePositionOpen, setIsClosePositionOpen] = useState(false);
  const [closeTarget, setCloseTarget] = useState<TradePosition | null>(null);

  const [isGoogleSheetsOpen, setIsGoogleSheetsOpen] = useState(false);
  const [isRiskCalcOpen, setIsRiskCalcOpen] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_OPEN, JSON.stringify(positions));
  }, [positions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CLOSED, JSON.stringify(closedTrades));
  }, [closedTrades]);

  // Toast feedback helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 4000);
  };

  // Live market quote fetcher with automatic Stop-Loss execution & archiving
  const refreshQuotes = useCallback(async () => {
    const openList = positions.filter((p) => p.status !== 'closed');
    if (openList.length === 0) return;

    setIsRefreshing(true);
    const symbols = openList.map((p) => p.ticker);

    try {
      const quotes = await fetchLiveQuotes(symbols);
      const nowStr = new Date().toLocaleTimeString('bg-BG', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const newlyTriggeredStops: TradePosition[] = [];
      const survivingPositions: TradePosition[] = [];

      for (const pos of positions) {
        if (pos.status === 'closed') continue;

        const q = quotes[pos.ticker.toUpperCase()];
        const newPrice = q && q.price > 0 ? q.price : pos.currentPrice;

        const updatedPos: TradePosition = {
          ...pos,
          currentPrice: newPrice,
          priceChange24h: q ? q.change : pos.priceChange24h,
          priceChangePercent24h: q ? q.changePercent : pos.priceChangePercent24h,
          lastUpdated: nowStr,
        };

        // Check if stop loss is hit based on the latest market price
        if (autoStopLossEnabled && isStopLossHit(updatedPos, newPrice)) {
          const closed = executeStopLossExit(updatedPos, newPrice);
          newlyTriggeredStops.push(closed);
        } else {
          survivingPositions.push(updatedPos);
        }
      }

      if (newlyTriggeredStops.length > 0) {
        setPositions(survivingPositions);
        setClosedTrades((prev) => [...newlyTriggeredStops, ...prev]);

        setAutoClosedAlert({
          time: nowStr,
          trades: newlyTriggeredStops,
        });

        const symbolsList = newlyTriggeredStops.map((t) => t.ticker).join(', ');
        showToast(
          `⚠️ Автоматичен Стоп-Лос: [${symbolsList}] достигна стоп цената и беше архивиран!`
        );
      } else {
        setPositions(survivingPositions);
      }

      setLastUpdatedTime(nowStr);
    } catch (err) {
      console.warn('Failed to refresh quotes:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [positions, autoStopLossEnabled]);

  // Initial fetch on mount
  useEffect(() => {
    refreshQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh interval polling
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const timer = setInterval(() => {
      refreshQuotes();
    }, autoRefreshInterval * 1000);

    return () => clearInterval(timer);
  }, [autoRefreshInterval, refreshQuotes]);

  // Firebase auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setUser(res.user);
        showToast(`Успешен вход като ${res.user.displayName || res.user.email}`);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      showToast('Грешка при вход с Google.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      showToast('Успешен изход от Google акаунт.');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Position management
  const handleOpenNewPosition = () => {
    setEditingPosition(null);
    setIsAddEditOpen(true);
  };

  const handleEditPosition = (pos: TradePosition) => {
    setEditingPosition(pos);
    setIsAddEditOpen(true);
  };

  const handleSavePosition = (pos: TradePosition) => {
    // Check if the entered price already violates stop loss with autoStop enabled
    if (autoStopLossEnabled && isStopLossHit(pos, pos.currentPrice)) {
      const closed = executeStopLossExit(pos, pos.currentPrice);
      setPositions((prev) => prev.filter((p) => p.id !== pos.id));
      setClosedTrades((prev) => [closed, ...prev]);
      setAutoClosedAlert({
        time: new Date().toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        trades: [closed],
      });
      showToast(`Позицията за ${pos.ticker} веднага удари стоп-лоса на $${pos.currentPrice} и беше архивирана.`);
      return;
    }

    setPositions((prev) => {
      const exists = prev.some((p) => p.id === pos.id);
      if (exists) {
        return prev.map((p) => (p.id === pos.id ? pos : p));
      }
      return [pos, ...prev];
    });

    showToast(`Позицията за ${pos.ticker} е запазена.`);

    // Quick fetch for this symbol
    fetchLiveQuotes([pos.ticker]).then((quotes) => {
      const q = quotes[pos.ticker.toUpperCase()];
      if (q && q.price > 0) {
        const livePrice = q.price;
        if (autoStopLossEnabled && isStopLossHit(pos, livePrice)) {
          const closed = executeStopLossExit({ ...pos, currentPrice: livePrice }, livePrice);
          setPositions((prev) => prev.filter((p) => p.id !== pos.id));
          setClosedTrades((prev) => [closed, ...prev]);
          setAutoClosedAlert({
            time: new Date().toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            trades: [closed],
          });
          showToast(`⚠️ Позицията за ${pos.ticker} достигна стопа на пазарна цена $${livePrice.toFixed(2)} и беше архивирана.`);
          return;
        }

        setPositions((prev) =>
          prev.map((p) =>
            p.id === pos.id
              ? {
                  ...p,
                  currentPrice: q.price,
                  priceChange24h: q.change,
                  priceChangePercent24h: q.changePercent,
                }
              : p
          )
        );
      }
    });
  };

  const handleDeletePosition = (id: string) => {
    const target = positions.find((p) => p.id === id);
    if (!target) return;
    if (window.confirm(`Сигурни ли сте, че искате да изтриете позицията за ${target.ticker}?`)) {
      setPositions((prev) => prev.filter((p) => p.id !== id));
      showToast(`Позицията за ${target.ticker} е премахната.`);
    }
  };

  // Partial profit taking
  const handleOpenPartialClose = (pos: TradePosition) => {
    setPartialCloseTarget(pos);
    setIsPartialCloseOpen(true);
  };

  const handleConfirmPartialClose = (
    positionId: string,
    closedShares: number,
    exitPrice: number,
    newStopLoss?: number,
    noteAddition?: string
  ) => {
    const pos = positions.find((p) => p.id === positionId);
    if (!pos) return;

    const priceDiff =
      pos.direction === 'short'
        ? pos.entryPrice - exitPrice
        : exitPrice - pos.entryPrice;

    const realizedPnL = priceDiff * closedShares;

    const riskPerShare =
      pos.direction === 'short'
        ? pos.stopLoss > pos.entryPrice
          ? pos.stopLoss - pos.entryPrice
          : Math.abs(pos.entryPrice - pos.stopLoss)
        : pos.stopLoss > 0 && pos.stopLoss < pos.entryPrice
        ? pos.entryPrice - pos.stopLoss
        : Math.abs(pos.entryPrice - pos.stopLoss);

    const initialRisk = riskPerShare * closedShares;
    const realizedR = initialRisk > 0 ? realizedPnL / initialRisk : 0;

    const today = new Date().toISOString().split('T')[0];

    // Create partial closed record in history
    const closedRecord: TradePosition = {
      ...pos,
      id: `closed-partial-${Date.now()}`,
      shares: closedShares,
      currentPrice: exitPrice,
      exitPrice: exitPrice,
      closedDate: today,
      realizedPnL,
      realizedR,
      status: 'closed',
      notes: noteAddition || `Частично прибиране на ${closedShares} дяла при $${exitPrice}`,
    };

    setClosedTrades((prev) => [closedRecord, ...prev]);

    // Update remaining position
    const remaining = pos.shares - closedShares;
    if (remaining <= 0.00001) {
      // If no shares remain, remove from open
      setPositions((prev) => prev.filter((p) => p.id !== positionId));
    } else {
      setPositions((prev) =>
        prev.map((p) => {
          if (p.id !== positionId) return p;
          return {
            ...p,
            shares: Math.round(remaining * 1000) / 1000,
            stopLoss: typeof newStopLoss === 'number' ? newStopLoss : p.stopLoss,
            notes: p.notes
              ? `${p.notes} | ${noteAddition || ''}`.trim()
              : noteAddition || '',
          };
        })
      );
    }

    showToast(`Прибрана печалба за ${pos.ticker}: ${realizedPnL >= 0 ? '+' : ''}$${realizedPnL.toFixed(2)}`);
  };

  // Full close
  const handleOpenClosePosition = (pos: TradePosition) => {
    setCloseTarget(pos);
    setIsClosePositionOpen(true);
  };

  const handleConfirmClosePosition = (
    positionId: string,
    exitPrice: number,
    closedDate: string,
    exitNote: string
  ) => {
    const pos = positions.find((p) => p.id === positionId);
    if (!pos) return;

    const diff =
      pos.direction === 'short'
        ? pos.entryPrice - exitPrice
        : exitPrice - pos.entryPrice;
    const realizedPnL = diff * pos.shares;

    const riskPerShare =
      pos.direction === 'short'
        ? pos.stopLoss > pos.entryPrice
          ? pos.stopLoss - pos.entryPrice
          : Math.abs(pos.entryPrice - pos.stopLoss)
        : pos.stopLoss > 0 && pos.stopLoss < pos.entryPrice
        ? pos.entryPrice - pos.stopLoss
        : Math.abs(pos.entryPrice - pos.stopLoss);

    const initialTotalRisk = riskPerShare * pos.shares;
    const realizedR = initialTotalRisk > 0 ? realizedPnL / initialTotalRisk : 0;

    const closedItem: TradePosition = {
      ...pos,
      status: 'closed',
      currentPrice: exitPrice,
      exitPrice: exitPrice,
      closedDate,
      realizedPnL,
      realizedR,
      notes: exitNote
        ? `${pos.notes ? pos.notes + ' | ' : ''}Изход: ${exitNote}`
        : pos.notes,
    };

    setPositions((prev) => prev.filter((p) => p.id !== positionId));
    setClosedTrades((prev) => [closedItem, ...prev]);

    showToast(`Позицията за ${pos.ticker} е затворена и архивирана.`);
  };

  // Delete from archive
  const handleDeleteClosedTrade = (id: string) => {
    setClosedTrades((prev) => prev.filter((t) => t.id !== id));
    showToast('Сделката е изтрита от архива.');
  };

  // Calculations
  const portfolioSummary = useMemo(() => {
    return calculatePortfolioSummary(positions, closedTrades);
  }, [positions, closedTrades]);

  // Excel Export
  const handleExportExcel = () => {
    exportTradesToExcel(positions, closedTrades, portfolioSummary);
    showToast('Дневникът е експортиран успешно в Excel (.xlsx).');
  };

  // Risk Calculator to New Trade preset
  const handleTransferToNewTrade = (preset: Partial<TradePosition>) => {
    const today = new Date().toISOString().split('T')[0];
    const newPos: TradePosition = {
      id: `pos-${Date.now()}`,
      ticker: preset.ticker || 'NVDA',
      assetType: preset.assetType || 'stock',
      direction: preset.direction || 'long',
      entryDate: today,
      shares: preset.shares || 10,
      entryPrice: preset.entryPrice || 100,
      stopLoss: preset.stopLoss || 90,
      currentPrice: preset.entryPrice || 100,
      targetPrice: preset.targetPrice,
      partialTakeProfit: preset.partialTakeProfit || '',
      leverage: preset.leverage || 1,
      marginMode: 'isolated',
      notes: 'Конфигурирано през Van Tharp Риск Калкулатор.',
      status: 'open',
    };
    setEditingPosition(newPos);
    setIsAddEditOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Contract (1 line brand, nav tabs, primary action) */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenNewPosition={handleOpenNewPosition}
        onOpenGoogleSheetsModal={() => setIsGoogleSheetsOpen(true)}
        isRefreshing={isRefreshing}
        onRefreshQuotes={refreshQuotes}
        lastUpdatedTime={lastUpdatedTime}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* KPI Summary Cards */}
        <KpiMetricsBar summary={portfolioSummary} />

        {/* Real-Time Auto Stop-Loss Alert Banner */}
        {autoClosedAlert && (
          <div className="mb-6 p-4 bg-rose-950/80 border border-rose-800 rounded-xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 bg-rose-900/60 border border-rose-700/60 rounded-lg text-rose-300 shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">
                    Автоматичен Стоп-Лос: {autoClosedAlert.trades.length} позиция(и) бяха прехвърлени в архива!
                  </h4>
                  <span className="text-[11px] font-mono text-rose-300 bg-rose-900/80 border border-rose-800 px-2 py-0.5 rounded">
                    {autoClosedAlert.time}
                  </span>
                </div>
                <div className="text-xs text-rose-200/90 flex flex-wrap gap-x-3 gap-y-1 font-mono">
                  {autoClosedAlert.trades.map((t) => (
                    <span key={t.id} className="inline-flex items-center gap-1">
                      <strong className="text-white">{t.ticker}</strong>: изход на ${t.exitPrice?.toFixed(2)} (Стоп: ${t.stopLoss.toFixed(2)}, {t.realizedPnL ? (t.realizedPnL >= 0 ? '+' : '') + formatCurrency(t.realizedPnL) : ''})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={() => {
                  setActiveTab('closed');
                  setAutoClosedAlert(null);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Виж в архива
              </button>
              <button
                onClick={() => setAutoClosedAlert(null)}
                className="p-1.5 text-rose-300 hover:text-white rounded-lg hover:bg-rose-900/60 transition-colors cursor-pointer"
                title="Затвори известието"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Отворени Позиции (Core Interactive Trading Journal) */}
        {activeTab === 'open' && (
          <div className="space-y-4">
            <TradeTable
              positions={positions}
              onEditPosition={handleEditPosition}
              onPartialClose={handleOpenPartialClose}
              onClosePosition={handleOpenClosePosition}
              onDeletePosition={handleDeletePosition}
              onExportExcel={handleExportExcel}
              onOpenGoogleSheets={() => setIsGoogleSheetsOpen(true)}
              autoRefreshInterval={autoRefreshInterval}
              setAutoRefreshInterval={setAutoRefreshInterval}
              isRefreshing={isRefreshing}
              onRefreshNow={refreshQuotes}
              lastUpdated={lastUpdatedTime}
              autoStopLossEnabled={autoStopLossEnabled}
              onToggleAutoStopLoss={setAutoStopLossEnabled}
            />
          </div>
        )}

        {/* Tab 2: Затворени сделки (History Archive) */}
        {activeTab === 'closed' && (
          <ClosedTradesTable
            closedTrades={closedTrades}
            onDeleteClosedTrade={handleDeleteClosedTrade}
            onExportExcel={handleExportExcel}
          />
        )}

        {/* Tab 3: Статистика & Анализ (Седмица, Месец, Batting Average, Win/Loss, Holding Days) */}
        {activeTab === 'analytics' && (
          <AnalyticsPage
            closedTrades={closedTrades}
            onExportExcel={handleExportExcel}
            onOpenGoogleSheets={() => setIsGoogleSheetsOpen(true)}
          />
        )}

        {/* Tab 4: Риск Калкулатор */}
        {activeTab === 'calculator' && (
          <div className="max-w-3xl mx-auto py-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-800">
                <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Търговски Калкулатор за Размер на Позицията (1R Risk Sizing)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Изчислете дяловете, капитала в риск и R-multiple целите преди да отворите позиция
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsRiskCalcOpen(true)}
                className="w-full py-3 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-emerald-500/20"
              >
                <Calculator className="w-4 h-4" />
                <span>Отвори пълния интерактивен калкулатор</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Subtle Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-slate-900/95 border border-slate-800 text-slate-200 text-xs rounded-xl shadow-2xl backdrop-blur-md transition-all">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <AddEditPositionModal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        onSave={handleSavePosition}
        initialPosition={editingPosition}
      />

      <PartialCloseModal
        isOpen={isPartialCloseOpen}
        onClose={() => setIsPartialCloseOpen(false)}
        position={partialCloseTarget}
        onConfirmPartialClose={handleConfirmPartialClose}
      />

      <ClosePositionModal
        isOpen={isClosePositionOpen}
        onClose={() => setIsClosePositionOpen(false)}
        position={closeTarget}
        onConfirmClose={handleConfirmClosePosition}
      />

      <GoogleSheetsModal
        isOpen={isGoogleSheetsOpen}
        onClose={() => setIsGoogleSheetsOpen(false)}
        user={user}
        onLogin={handleLogin}
        positions={positions}
        closedTrades={closedTrades}
        summary={portfolioSummary}
      />

      <RiskCalculatorModal
        isOpen={isRiskCalcOpen}
        onClose={() => setIsRiskCalcOpen(false)}
        onTransferToNewTrade={handleTransferToNewTrade}
      />
    </div>
  );
}
