import { TradePosition, CalculatedTradeMetrics, PortfolioSummary } from '../types/trade';

/**
 * Calculates real-time risk, PnL, and R-Multiple for a single trade position.
 * R-Multiple formula:
 * R = (Current PnL $) / (Initial Open Risk $)
 * Van Tharp definition: Standardizes profits and losses in terms of the initial risk unit (1R).
 */
export function calculateMetrics(pos: TradePosition): CalculatedTradeMetrics {
  const shares = pos.shares || 0;
  const entryPrice = pos.entryPrice || 0;
  const currentPrice = pos.currentPrice || entryPrice;
  const stopLoss = pos.stopLoss || 0;
  const leverage = Math.max(1, pos.leverage || 1);

  const positionValue = shares * currentPrice;
  const initialCost = shares * entryPrice;
  const initialMargin = leverage > 0 ? initialCost / leverage : initialCost;

  let openPnL = 0;
  let openPnLPercent = 0;
  let riskPerShare = 0;

  if (pos.direction === 'short') {
    // Short position: profits when currentPrice < entryPrice
    openPnL = (entryPrice - currentPrice) * shares;
    openPnLPercent = entryPrice > 0 ? ((entryPrice - currentPrice) / entryPrice) * 100 : 0;
    // Risk in short: stop loss should be above entry price
    riskPerShare = stopLoss > entryPrice ? stopLoss - entryPrice : Math.abs(entryPrice - stopLoss);
  } else {
    // Long position (default): profits when currentPrice > entryPrice
    openPnL = (currentPrice - entryPrice) * shares;
    openPnLPercent = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
    // Risk in long: stop loss is below entry price
    riskPerShare = stopLoss > 0 && stopLoss < entryPrice ? entryPrice - stopLoss : Math.abs(entryPrice - stopLoss);
  }

  // Ensure non-zero open risk if stop loss is defined
  const openRisk = Math.max(0, riskPerShare * shares);

  // Return on Equity / Margin: ROE %
  const roePercent = initialMargin > 0 ? (openPnL / initialMargin) * 100 : openPnLPercent;

  // Estimated Liquidation Price for leveraged margin positions
  let liquidationPrice = 0;
  let isNearLiquidation = false;

  if (leverage > 1 && entryPrice > 0) {
    const maxDropFraction = (1 / leverage) * 0.95; // 95% of margin buffer
    if (pos.direction === 'short') {
      liquidationPrice = entryPrice * (1 + maxDropFraction);
      isNearLiquidation = currentPrice > 0 && currentPrice >= liquidationPrice * 0.97;
    } else {
      liquidationPrice = Math.max(0, entryPrice * (1 - maxDropFraction));
      isNearLiquidation = currentPrice > 0 && currentPrice <= liquidationPrice * 1.03;
    }
  }

  // Calculate R-Multiple
  let rMultiple = 0;
  if (openRisk > 0) {
    rMultiple = openPnL / openRisk;
  } else if (entryPrice > 0 && Math.abs(openPnL) > 0) {
    rMultiple = 0;
  }

  return {
    openPnL,
    openPnLPercent,
    rMultiple,
    openRisk,
    riskPerShare,
    positionValue,
    initialMargin,
    roePercent,
    liquidationPrice,
    isNearLiquidation,
  };
}

export function calculatePortfolioSummary(
  positions: TradePosition[],
  closedTrades: TradePosition[] = []
): PortfolioSummary {
  const openPositions = positions.filter((p) => p.status !== 'closed');

  let totalValue = 0;
  let totalOpenPnL = 0;
  let totalOpenRisk = 0;
  let totalInitialCost = 0;
  let totalMarginUsed = 0;
  let winningPositions = 0;
  let losingPositions = 0;
  let stocksCount = 0;
  let cryptoCount = 0;
  let sumRMultiples = 0;
  let positionsWithRiskCount = 0;

  for (const pos of openPositions) {
    const metrics = calculateMetrics(pos);
    totalValue += metrics.positionValue;
    totalOpenPnL += metrics.openPnL;
    totalOpenRisk += metrics.openRisk;
    totalInitialCost += pos.shares * pos.entryPrice;
    totalMarginUsed += metrics.initialMargin;

    if (metrics.openPnL > 0) {
      winningPositions++;
    } else if (metrics.openPnL < 0) {
      losingPositions++;
    }

    if (pos.assetType === 'crypto') {
      cryptoCount++;
    } else {
      stocksCount++;
    }

    if (metrics.openRisk > 0) {
      sumRMultiples += metrics.rMultiple;
      positionsWithRiskCount++;
    }
  }

  const totalOpenPnLPercent =
    totalInitialCost > 0 ? (totalOpenPnL / totalInitialCost) * 100 : 0;

  const avgRMultiple =
    positionsWithRiskCount > 0 ? sumRMultiples / positionsWithRiskCount : 0;

  const effectiveLeverage = totalMarginUsed > 0 ? totalValue / totalMarginUsed : 1;

  const realizedTotalPnL = closedTrades.reduce((acc, trade) => {
    return acc + (trade.realizedPnL || 0);
  }, 0);

  return {
    totalPositions: openPositions.length,
    totalValue,
    totalOpenPnL,
    totalOpenPnLPercent,
    totalOpenRisk,
    totalMarginUsed,
    effectiveLeverage,
    avgRMultiple,
    winningPositions,
    losingPositions,
    stocksCount,
    cryptoCount,
    realizedTotalPnL,
  };
}

export function formatCurrency(val: number, decimals: number = 2): string {
  const isNegative = val < 0;
  const absVal = Math.abs(val);

  // If value is small crypto price (e.g. 0.054)
  let dec = decimals;
  if (absVal > 0 && absVal < 0.1) dec = 4;
  if (absVal > 0 && absVal < 0.001) dec = 6;

  const formatted = absVal.toLocaleString('en-US', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });

  return `${isNegative ? '-' : ''}$${formatted}`;
}

export function formatPercent(val: number, withSign: boolean = true): string {
  const sign = withSign && val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

export function formatR(r: number): string {
  if (isNaN(r) || !isFinite(r)) return '0.00R';
  const sign = r > 0 ? '+' : '';
  return `${sign}${r.toFixed(2)}R`;
}

/**
 * Checks if a position's stop loss is hit based on the latest market price.
 * For Long positions: hit when currentPrice <= stopLoss.
 * For Short positions: hit when currentPrice >= stopLoss.
 */
export function isStopLossHit(pos: TradePosition, currentPrice: number): boolean {
  if (!pos.stopLoss || pos.stopLoss <= 0 || !currentPrice || currentPrice <= 0) return false;
  if (pos.direction === 'short') {
    return currentPrice >= pos.stopLoss;
  }
  return currentPrice <= pos.stopLoss;
}

/**
 * Converts a stopped-out position into a finalized closed trade record.
 */
export function executeStopLossExit(pos: TradePosition, exitPrice: number): TradePosition {
  const diff = pos.direction === 'short' ? pos.entryPrice - exitPrice : exitPrice - pos.entryPrice;
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
  const realizedR = initialTotalRisk > 0 ? realizedPnL / initialTotalRisk : -1.0;

  const today = new Date().toISOString().split('T')[0];

  return {
    ...pos,
    status: 'closed',
    currentPrice: exitPrice,
    exitPrice,
    closedDate: today,
    realizedPnL,
    realizedR,
    notes: `[Автоматичен Стоп-Лос] Активиран на $${exitPrice.toFixed(2)} (Стоп: $${pos.stopLoss.toFixed(2)})${pos.notes ? ' | ' + pos.notes : ''}`,
  };
}
