import * as XLSX from 'xlsx';
import { TradePosition, PortfolioSummary } from '../types/trade';
import { calculateMetrics, formatPercent, formatR } from '../utils/calculations';
import {
  calculatePerformanceMetrics,
  calculateDaysBetween,
  isDateInCurrentWeek,
  isDateInCurrentMonth,
  isDateInPreviousMonth,
} from '../utils/statistics';

export function exportTradesToExcel(
  positions: TradePosition[],
  closedTrades: TradePosition[],
  summary: PortfolioSummary
): void {
  const wb = XLSX.utils.book_new();

  // 1. Open Positions Sheet
  const openPositions = positions.filter((p) => p.status !== 'closed');
  const openRows = openPositions.map((pos) => {
    const m = calculateMetrics(pos);
    return {
      'Дата на вход': pos.entryDate,
      'Тикър': pos.ticker,
      'Клас актив': pos.assetType === 'crypto' ? 'Крипто' : 'Акция',
      'Посока': pos.direction === 'short' ? 'Short' : 'Long',
      'Дялове': pos.shares,
      'Ливъридж': `${pos.leverage || 1}x`,
      'Заделен марджин ($)': Math.round(m.initialMargin * 100) / 100,
      'Цена покупка ($)': pos.entryPrice,
      'Стоп цена ($)': pos.stopLoss,
      'Ликвидация ($)': m.liquidationPrice > 0 ? Math.round(m.liquidationPrice * 100) / 100 : 'Няма (1x)',
      'Текуща цена ($)': pos.currentPrice,
      'Open PnL ($)': Math.round(m.openPnL * 100) / 100,
      'Open PnL (%)': `${m.openPnLPercent >= 0 ? '+' : ''}${m.openPnLPercent.toFixed(2)}%`,
      'ROE (%)': `${m.roePercent >= 0 ? '+' : ''}${m.roePercent.toFixed(2)}%`,
      'R Multiple': formatR(m.rMultiple),
      'Open Risk ($)': Math.round(m.openRisk * 100) / 100,
      'Частичен за прибиране': pos.partialTakeProfit || '—',
      'Бележки': pos.notes || '',
    };
  });

  const wsOpen = XLSX.utils.json_to_sheet(openRows);
  wsOpen['!cols'] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 24 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, wsOpen, 'Отворени Позиции');

  // 2. Closed Trades Sheet with Holding Days
  if (closedTrades.length > 0) {
    const closedRows = closedTrades.map((t) => {
      const days = calculateDaysBetween(t.entryDate, t.closedDate);
      return {
        'Дата вход': t.entryDate,
        'Дата изход': t.closedDate || '—',
        'Дни държане': days,
        'Тикър': t.ticker,
        'Клас': t.assetType === 'crypto' ? 'Крипто' : 'Акция',
        'Посока': t.direction === 'short' ? 'Short' : 'Long',
        'Дялове': t.shares,
        'Цена вход ($)': t.entryPrice,
        'Цена изход ($)': t.exitPrice || t.currentPrice,
        'Реализиран PnL ($)': Math.round((t.realizedPnL ?? 0) * 100) / 100,
        'Реализиран R': formatR(t.realizedR ?? 0),
        'Бележки': t.notes || '',
      };
    });
    const wsClosed = XLSX.utils.json_to_sheet(closedRows);
    wsClosed['!cols'] = [
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 35 },
    ];
    XLSX.utils.book_append_sheet(wb, wsClosed, 'Затворени Позиции');
  }

  // 3. Weekly & Monthly Performance Statistics Sheet
  const weekTrades = closedTrades.filter((t) => isDateInCurrentWeek(t.closedDate || t.entryDate));
  const monthTrades = closedTrades.filter((t) => isDateInCurrentMonth(t.closedDate || t.entryDate));
  const allStats = calculatePerformanceMetrics(closedTrades, 'all');
  const weekStats = calculatePerformanceMetrics(weekTrades, 'week');
  const monthStats = calculatePerformanceMetrics(monthTrades, 'month');

  const statsRows = [
    { Показател: '--- ТАЗИ СЕДМИЦА ---', Стойност: '' },
    { Показател: 'Общ брой сделки (седмица)', Стойност: weekStats.totalTrades },
    { Показател: 'Батинг авередж (Win Rate %)', Стойност: `${weekStats.battingAverage.toFixed(1)}%` },
    { Показател: 'Печеливши / Губещи', Стойност: `${weekStats.winningTrades}W / ${weekStats.losingTrades}L` },
    { Показател: 'Нетен PnL ($)', Стойност: weekStats.netPnL.toFixed(2) },
    { Показател: 'Средно печеливша ($)', Стойност: weekStats.avgWin.toFixed(2) },
    { Показател: 'Средно губеща ($)', Стойност: weekStats.avgLoss.toFixed(2) },
    { Показател: 'Win / Loss Ratio', Стойност: weekStats.winLossRatio > 99 ? '∞' : `${weekStats.winLossRatio.toFixed(2)}:1` },
    { Показател: 'Най-голям печеливш ($)', Стойност: weekStats.largestWinTrade ? `${weekStats.largestWinTrade.ticker}: +$${weekStats.largestWin.toFixed(2)}` : '—' },
    { Показател: 'Най-голям губещ ($)', Стойност: weekStats.largestLossTrade ? `${weekStats.largestLossTrade.ticker}: -$${Math.abs(weekStats.largestLoss).toFixed(2)}` : '—' },
    { Показател: 'Ср. дни държане печеливши', Стойност: `${weekStats.avgHoldingDaysWinners.toFixed(1)} дни` },
    { Показател: 'Ср. дни държане губещи', Стойност: `${weekStats.avgHoldingDaysLosers.toFixed(1)} дни` },
    { Показател: '', Стойност: '' },

    { Показател: '--- ТОЗИ МЕСЕЦ ---', Стойност: '' },
    { Показател: 'Общ брой сделки (месец)', Стойност: monthStats.totalTrades },
    { Показател: 'Батинг авередж (Win Rate %)', Стойност: `${monthStats.battingAverage.toFixed(1)}%` },
    { Показател: 'Печеливши / Губещи', Стойност: `${monthStats.winningTrades}W / ${monthStats.losingTrades}L` },
    { Показател: 'Нетен PnL ($)', Стойност: monthStats.netPnL.toFixed(2) },
    { Показател: 'Средно печеливша ($)', Стойност: monthStats.avgWin.toFixed(2) },
    { Показател: 'Средно губеща ($)', Стойност: monthStats.avgLoss.toFixed(2) },
    { Показател: 'Win / Loss Ratio', Стойност: monthStats.winLossRatio > 99 ? '∞' : `${monthStats.winLossRatio.toFixed(2)}:1` },
    { Показател: 'Най-голям печеливш ($)', Стойност: monthStats.largestWinTrade ? `${monthStats.largestWinTrade.ticker}: +$${monthStats.largestWin.toFixed(2)}` : '—' },
    { Показател: 'Най-голям губещ ($)', Стойност: monthStats.largestLossTrade ? `${monthStats.largestLossTrade.ticker}: -$${Math.abs(monthStats.largestLoss).toFixed(2)}` : '—' },
    { Показател: 'Ср. дни държане печеливши', Стойност: `${monthStats.avgHoldingDaysWinners.toFixed(1)} дни` },
    { Показател: 'Ср. дни държане губещи', Стойност: `${monthStats.avgHoldingDaysLosers.toFixed(1)} дни` },
    { Показател: 'Profit Factor', Стойност: monthStats.profitFactor.toFixed(2) },
    { Показател: 'Expectancy ($/сделка)', Стойност: monthStats.expectancy.toFixed(2) },
    { Показател: '', Стойност: '' },

    { Показател: '--- ОБЩО ЗА ВСИЧКИ СДЕЛКИ ---', Стойност: '' },
    { Показател: 'Общ брой затворени сделки', Стойност: allStats.totalTrades },
    { Показател: 'Батинг авередж (Win Rate %)', Стойност: `${allStats.battingAverage.toFixed(1)}%` },
    { Показател: 'Печеливши / Губещи', Стойност: `${allStats.winningTrades}W / ${allStats.losingTrades}L` },
    { Показател: 'Общ нетен реализиран PnL ($)', Стойност: allStats.netPnL.toFixed(2) },
    { Показател: 'Средно печеливша ($)', Стойност: allStats.avgWin.toFixed(2) },
    { Показател: 'Средно губеща ($)', Стойност: allStats.avgLoss.toFixed(2) },
    { Показател: 'Win / Loss Ratio', Стойност: allStats.winLossRatio > 99 ? '∞' : `${allStats.winLossRatio.toFixed(2)}:1` },
    { Показател: 'Най-голям печеливш ($)', Стойност: allStats.largestWinTrade ? `${allStats.largestWinTrade.ticker}: +$${allStats.largestWin.toFixed(2)}` : '—' },
    { Показател: 'Най-голям губещ ($)', Стойност: allStats.largestLossTrade ? `${allStats.largestLossTrade.ticker}: -$${Math.abs(allStats.largestLoss).toFixed(2)}` : '—' },
    { Показател: 'Ср. дни държане печеливши', Стойност: `${allStats.avgHoldingDaysWinners.toFixed(1)} дни` },
    { Показател: 'Ср. дни държане губещи', Стойност: `${allStats.avgHoldingDaysLosers.toFixed(1)} дни` },
    { Показател: 'Среден R-Multiple', Стойност: formatR(allStats.avgRMultiple) },
    { Показател: 'Profit Factor', Стойност: allStats.profitFactor.toFixed(2) },
    { Показател: 'Expectancy ($/сделка)', Стойност: allStats.expectancy.toFixed(2) },
    { Показател: 'Общ заделен марджин ($)', Стойност: summary.totalMarginUsed.toFixed(2) },
    { Показател: 'Ефективен ливъридж на портфейла', Стойност: `${summary.effectiveLeverage.toFixed(2)}x` },
    { Показател: 'Дата на експорт', Стойност: new Date().toLocaleString('bg-BG') },
  ];

  const wsStats = XLSX.utils.json_to_sheet(statsRows);
  wsStats['!cols'] = [{ wch: 32 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsStats, 'Седмична и Месечна Статистика');

  // Trigger download
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `ApexTrade_Journal_${dateStr}.xlsx`);
}
