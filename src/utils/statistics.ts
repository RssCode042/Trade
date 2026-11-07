import { TradePosition } from '../types/trade';

export interface PerformanceMetrics {
  period: 'week' | 'month' | 'prev_month' | 'all';
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  battingAverage: number; // Win rate %

  grossProfit: number; // Общо печалби ($)
  grossLoss: number; // Общо загуби ($) (отрицателна стойност)
  netPnL: number; // Нетен реализиран PnL ($)

  avgWin: number; // Средно печеливша сделка ($) (всички печалби / брой печеливши)
  avgLoss: number; // Средно губеща сделка ($) (|всички загуби| / брой губещи)
  avgTradePnL: number; // Среден PnL на сделка ($) (нетен PnL / брой сделки)

  largestWin: number; // Най-голям печеливш ($)
  largestWinTrade?: TradePosition;
  largestLoss: number; // Най-голям губещ ($)
  largestLossTrade?: TradePosition;

  winLossRatio: number; // Съотношение Win/Loss (avgWin / avgLoss)
  profitFactor: number; // Profit Factor (grossProfit / |grossLoss|)
  expectancy: number; // Expectancy на сделка ($)

  // Време за задържане на позицията (Holding days)
  avgHoldingDaysAll: number; // Средно дни за всички
  avgHoldingDaysWinners: number; // По колко дни са държани печелившите
  avgHoldingDaysLosers: number; // По колко дни са държани губещите

  // R-Multiple
  avgRMultiple: number;
  avgRWinners: number;
  avgRLosers: number;
}

/**
 * Calculates days between two date strings (YYYY-MM-DD).
 */
export function calculateDaysBetween(startDateStr?: string, endDateStr?: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  const diffMs = end.getTime() - start.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

/**
 * Checks whether a date string (YYYY-MM-DD) falls within the current calendar week (Monday to Sunday).
 */
export function isDateInCurrentWeek(dateStr?: string, referenceDate: Date = new Date()): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;

  // Monday as first day of week
  const ref = new Date(referenceDate);
  const day = ref.getDay();
  const diffToMonday = ref.getDate() - day + (day === 0 ? -6 : 1);

  const startOfWeek = new Date(ref.setDate(diffToMonday));
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return d >= startOfWeek && d <= endOfWeek;
}

/**
 * Checks whether a date string (YYYY-MM-DD) falls within the current calendar month.
 */
export function isDateInCurrentMonth(dateStr?: string, referenceDate: Date = new Date()): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;

  return (
    d.getFullYear() === referenceDate.getFullYear() &&
    d.getMonth() === referenceDate.getMonth()
  );
}

/**
 * Checks whether a date string falls within the previous month.
 */
export function isDateInPreviousMonth(dateStr?: string, referenceDate: Date = new Date()): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;

  const targetYear = referenceDate.getMonth() === 0 ? referenceDate.getFullYear() - 1 : referenceDate.getFullYear();
  const targetMonth = referenceDate.getMonth() === 0 ? 11 : referenceDate.getMonth() - 1;

  return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
}

/**
 * Calculates full performance statistics for a specific set of closed trades.
 */
export function calculatePerformanceMetrics(
  trades: TradePosition[],
  period: 'week' | 'month' | 'prev_month' | 'all' = 'all'
): PerformanceMetrics {
  const totalTrades = trades.length;

  if (totalTrades === 0) {
    return {
      period,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      battingAverage: 0,
      grossProfit: 0,
      grossLoss: 0,
      netPnL: 0,
      avgWin: 0,
      avgLoss: 0,
      avgTradePnL: 0,
      largestWin: 0,
      largestLoss: 0,
      winLossRatio: 0,
      profitFactor: 0,
      expectancy: 0,
      avgHoldingDaysAll: 0,
      avgHoldingDaysWinners: 0,
      avgHoldingDaysLosers: 0,
      avgRMultiple: 0,
      avgRWinners: 0,
      avgRLosers: 0,
    };
  }

  const winners: TradePosition[] = [];
  const losers: TradePosition[] = [];
  const breakEvens: TradePosition[] = [];

  let grossProfit = 0;
  let grossLoss = 0; // negative number
  let sumHoldingDaysAll = 0;
  let sumHoldingDaysWinners = 0;
  let sumHoldingDaysLosers = 0;

  let sumRAll = 0;
  let sumRWinners = 0;
  let sumRLosers = 0;

  let largestWin = 0;
  let largestWinTrade: TradePosition | undefined;
  let largestLoss = 0; // negative number
  let largestLossTrade: TradePosition | undefined;

  for (const trade of trades) {
    const pnl = trade.realizedPnL ?? 0;
    const r = trade.realizedR ?? 0;
    const holdingDays = calculateDaysBetween(trade.entryDate, trade.closedDate);

    sumHoldingDaysAll += holdingDays;
    sumRAll += r;

    if (pnl > 0.001) {
      winners.push(trade);
      grossProfit += pnl;
      sumHoldingDaysWinners += holdingDays;
      sumRWinners += r;

      if (pnl > largestWin) {
        largestWin = pnl;
        largestWinTrade = trade;
      }
    } else if (pnl < -0.001) {
      losers.push(trade);
      grossLoss += pnl; // negative
      sumHoldingDaysLosers += holdingDays;
      sumRLosers += r;

      if (pnl < largestLoss) {
        largestLoss = pnl;
        largestLossTrade = trade;
      }
    } else {
      breakEvens.push(trade);
    }
  }

  const winningTrades = winners.length;
  const losingTrades = losers.length;
  const breakEvenTrades = breakEvens.length;

  const battingAverage = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const netPnL = grossProfit + grossLoss;

  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? Math.abs(grossLoss) / losingTrades : 0;
  const avgTradePnL = totalTrades > 0 ? netPnL / totalTrades : 0;

  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999 : 0;
  const profitFactor = Math.abs(grossLoss) > 0 ? grossProfit / Math.abs(grossLoss) : grossProfit > 0 ? 999 : 0;

  // Expectancy = (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
  const winRateFrac = totalTrades > 0 ? winningTrades / totalTrades : 0;
  const lossRateFrac = totalTrades > 0 ? losingTrades / totalTrades : 0;
  const expectancy = (winRateFrac * avgWin) - (lossRateFrac * avgLoss);

  const avgHoldingDaysAll = totalTrades > 0 ? sumHoldingDaysAll / totalTrades : 0;
  const avgHoldingDaysWinners = winningTrades > 0 ? sumHoldingDaysWinners / winningTrades : 0;
  const avgHoldingDaysLosers = losingTrades > 0 ? sumHoldingDaysLosers / losingTrades : 0;

  const avgRMultiple = totalTrades > 0 ? sumRAll / totalTrades : 0;
  const avgRWinners = winningTrades > 0 ? sumRWinners / winningTrades : 0;
  const avgRLosers = losingTrades > 0 ? sumRLosers / losingTrades : 0;

  return {
    period,
    totalTrades,
    winningTrades,
    losingTrades,
    breakEvenTrades,
    battingAverage,
    grossProfit,
    grossLoss,
    netPnL,
    avgWin,
    avgLoss,
    avgTradePnL,
    largestWin,
    largestWinTrade,
    largestLoss,
    largestLossTrade,
    winLossRatio,
    profitFactor,
    expectancy,
    avgHoldingDaysAll,
    avgHoldingDaysWinners,
    avgHoldingDaysLosers,
    avgRMultiple,
    avgRWinners,
    avgRLosers,
  };
}
