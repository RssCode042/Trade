export type AssetType = 'stock' | 'crypto';
export type PositionDirection = 'long' | 'short';
export type MarginMode = 'isolated' | 'cross';

export interface TradePosition {
  id: string;
  ticker: string; // e.g. "NVDA", "AAPL", "BTC-USD", "SOL-USD"
  name?: string; // Company / Asset title
  assetType: AssetType; // 'stock' | 'crypto'
  direction: PositionDirection; // 'long' | 'short'
  entryDate: string; // "YYYY-MM-DD"
  shares: number; // Дялове / количество
  entryPrice: number; // Цена покупка ($)
  stopLoss: number; // Стоп цена ($)
  currentPrice: number; // Текуща цена ($)
  partialTakeProfit: string; // Частичен за прибиране на печалба
  targetPrice?: number; // Целева цена ($)
  notes: string; // Бележки за конкретната позиция

  // Margin & Leverage parameters
  leverage?: number; // 1x (Cash/Spot), 2x, 5x, 10x, 20x, 50x... (Defaults to 1)
  marginMode?: MarginMode; // 'isolated' | 'cross'

  // Status & Closure (for archive / closed positions)
  status: 'open' | 'closed';
  closedDate?: string;
  exitPrice?: number;
  realizedPnL?: number;
  realizedR?: number;

  // Real-time market tracking metadata
  priceChange24h?: number;
  priceChangePercent24h?: number;
  lastUpdated?: string;
}

export interface CalculatedTradeMetrics {
  openPnL: number; // in $
  openPnLPercent: number; // in % (Unleveraged price change %)
  rMultiple: number; // R (van Tharp multiple)
  openRisk: number; // in $
  riskPerShare: number; // in $
  positionValue: number; // in $ (Notional position size)
  initialMargin: number; // in $ (Collateral required = positionValue / leverage)
  roePercent: number; // in % (Return on Equity = openPnL / initialMargin * 100)
  liquidationPrice: number; // in $ (Estimated margin liquidation price)
  isNearLiquidation: boolean; // True if price is within 2.5% of liquidation
}

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  high24h?: number;
  low24h?: number;
  currency: string;
  timestamp: number;
}

export interface PortfolioSummary {
  totalPositions: number;
  totalValue: number; // Notional total exposure
  totalOpenPnL: number;
  totalOpenPnLPercent: number;
  totalOpenRisk: number;
  totalMarginUsed: number; // Actual capital/collateral locked in margin
  effectiveLeverage: number; // Notional value / total margin used
  avgRMultiple: number;
  winningPositions: number;
  losingPositions: number;
  stocksCount: number;
  cryptoCount: number;
  realizedTotalPnL: number;
}
