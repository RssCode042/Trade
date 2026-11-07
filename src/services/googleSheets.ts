import { TradePosition, PortfolioSummary } from '../types/trade';
import { calculateMetrics, formatPercent, formatR } from '../utils/calculations';
import {
  calculatePerformanceMetrics,
  isDateInCurrentWeek,
  isDateInCurrentMonth,
} from '../utils/statistics';
import { getAccessToken } from './googleAuth';

export interface CreateSpreadsheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export async function createTradingSpreadsheet(
  positions: TradePosition[],
  summary: PortfolioSummary,
  customTitle?: string,
  closedTrades: TradePosition[] = []
): Promise<CreateSpreadsheetResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Липсва активен Google токен за достъп. Моля, влезте с Google.');
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const title = customTitle || `ApexTrade Journal - ${dateStr}`;

  // 1. Create a new Spreadsheet with an initial tab
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Отворени Позиции',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `Грешка при създаване на Google Sheet (${createRes.status})`
    );
  }

  const spreadsheetData = await createRes.json();
  const spreadsheetId = spreadsheetData.spreadsheetId;
  const spreadsheetUrl =
    spreadsheetData.spreadsheetUrl ||
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare tabular data
  const headers = [
    'Дата на вход',
    'Тикър',
    'Клас актив',
    'Посока',
    'Дялове / Брой',
    'Ливъридж',
    'Заделен марджин ($)',
    'Цена покупка ($)',
    'Стоп цена ($)',
    'Ликвидация ($)',
    'Текуща цена ($)',
    'Open PnL ($)',
    'Open PnL (%)',
    'ROE (%)',
    'R Multiple',
    'Open Risk ($)',
    'Частичен за прибиране на печалба',
    'Бележки',
  ];

  const rows: (string | number)[][] = [headers];

  const openPositions = positions.filter((p) => p.status !== 'closed');

  for (const pos of openPositions) {
    const metrics = calculateMetrics(pos);
    rows.push([
      pos.entryDate || '',
      pos.ticker,
      pos.assetType === 'crypto' ? 'Крипто' : 'Акция',
      pos.direction === 'short' ? 'Short' : 'Long',
      pos.shares,
      `${pos.leverage || 1}x`,
      Math.round(metrics.initialMargin * 100) / 100,
      pos.entryPrice,
      pos.stopLoss,
      metrics.liquidationPrice > 0 ? Math.round(metrics.liquidationPrice * 100) / 100 : 'Няма (1x)',
      pos.currentPrice,
      Math.round(metrics.openPnL * 100) / 100,
      formatPercent(metrics.openPnLPercent, false),
      formatPercent(metrics.roePercent, false),
      formatR(metrics.rMultiple),
      Math.round(metrics.openRisk * 100) / 100,
      pos.partialTakeProfit || '—',
      pos.notes || '',
    ]);
  }

  // Summary KPI Section
  rows.push([]);
  rows.push(['РЕЗЮМЕ НА ОТВОРЕНИТЕ ПОЗИЦИИ']);
  rows.push(['Общ брой отворени позиции', openPositions.length]);
  rows.push(['Обща пазарна стойност ($)', Math.round(summary.totalValue * 100) / 100]);
  rows.push(['Общ заделен марджин ($)', Math.round(summary.totalMarginUsed * 100) / 100]);
  rows.push(['Ефективен ливъридж на портфейла', `${summary.effectiveLeverage.toFixed(2)}x`]);
  rows.push(['Общ Open PnL ($)', Math.round(summary.totalOpenPnL * 100) / 100]);
  rows.push(['Общ Open PnL (%)', formatPercent(summary.totalOpenPnLPercent, true)]);
  rows.push(['Общ Открит Риск ($)', Math.round(summary.totalOpenRisk * 100) / 100]);
  rows.push(['Среден R-Multiple', formatR(summary.avgRMultiple)]);

  // Weekly & Monthly Analytics Section
  if (closedTrades.length > 0) {
    const weekTrades = closedTrades.filter((t) => isDateInCurrentWeek(t.closedDate || t.entryDate));
    const monthTrades = closedTrades.filter((t) => isDateInCurrentMonth(t.closedDate || t.entryDate));
    const weekStats = calculatePerformanceMetrics(weekTrades, 'week');
    const monthStats = calculatePerformanceMetrics(monthTrades, 'month');
    const allStats = calculatePerformanceMetrics(closedTrades, 'all');

    rows.push([]);
    rows.push(['СТАТИСТИКА ЗА ТАЗИ СЕДМИЦА']);
    rows.push(['Брой сделки (седмица)', weekStats.totalTrades]);
    rows.push(['Батинг авередж (Win Rate %)', `${weekStats.battingAverage.toFixed(1)}%`]);
    rows.push(['Печеливши / Губещи', `${weekStats.winningTrades}W / ${weekStats.losingTrades}L`]);
    rows.push(['Нетен PnL ($)', Math.round(weekStats.netPnL * 100) / 100]);
    rows.push(['Средно печеливша ($)', Math.round(weekStats.avgWin * 100) / 100]);
    rows.push(['Средно губеща ($)', Math.round(weekStats.avgLoss * 100) / 100]);
    rows.push(['Win / Loss Ratio', weekStats.winLossRatio > 99 ? '∞' : `${weekStats.winLossRatio.toFixed(2)}:1`]);
    rows.push(['Ср. дни държане (печеливши)', `${weekStats.avgHoldingDaysWinners.toFixed(1)} дни`]);
    rows.push(['Ср. дни държане (губещи)', `${weekStats.avgHoldingDaysLosers.toFixed(1)} дни`]);

    rows.push([]);
    rows.push(['СТАТИСТИКА ЗА ТОЗИ МЕСЕЦ']);
    rows.push(['Брой сделки (месец)', monthStats.totalTrades]);
    rows.push(['Батинг авередж (Win Rate %)', `${monthStats.battingAverage.toFixed(1)}%`]);
    rows.push(['Печеливши / Губещи', `${monthStats.winningTrades}W / ${monthStats.losingTrades}L`]);
    rows.push(['Нетен PnL ($)', Math.round(monthStats.netPnL * 100) / 100]);
    rows.push(['Средно печеливша ($)', Math.round(monthStats.avgWin * 100) / 100]);
    rows.push(['Средно губеща ($)', Math.round(monthStats.avgLoss * 100) / 100]);
    rows.push(['Win / Loss Ratio', monthStats.winLossRatio > 99 ? '∞' : `${monthStats.winLossRatio.toFixed(2)}:1`]);
    rows.push(['Най-голям печеливш ($)', monthStats.largestWinTrade ? `${monthStats.largestWinTrade.ticker}: +$${monthStats.largestWin.toFixed(2)}` : '—']);
    rows.push(['Най-голям губещ ($)', monthStats.largestLossTrade ? `${monthStats.largestLossTrade.ticker}: -$${Math.abs(monthStats.largestLoss).toFixed(2)}` : '—']);
    rows.push(['Ср. дни държане (печеливши)', `${monthStats.avgHoldingDaysWinners.toFixed(1)} дни`]);
    rows.push(['Ср. дни държане (губещи)', `${monthStats.avgHoldingDaysLosers.toFixed(1)} дни`]);
    rows.push(['Profit Factor', monthStats.profitFactor.toFixed(2)]);
    rows.push(['Expectancy ($/сделка)', Math.round(monthStats.expectancy * 100) / 100]);

    rows.push([]);
    rows.push(['ОБЩА СТАТИСТИКА (ALL-TIME PERFORMANCE)']);
    rows.push(['Общо затворени сделки', allStats.totalTrades]);
    rows.push(['Батинг авередж (Win Rate %)', `${allStats.battingAverage.toFixed(1)}%`]);
    rows.push(['Общ реализиран PnL ($)', Math.round(allStats.netPnL * 100) / 100]);
    rows.push(['Ср. дни държане печеливши vs губещи', `${allStats.avgHoldingDaysWinners.toFixed(1)}д vs ${allStats.avgHoldingDaysLosers.toFixed(1)}д`]);
    rows.push(['Последна актуализация', new Date().toLocaleString('bg-BG')]);
  }

  // 3. Populate rows into the spreadsheet
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!writeRes.ok) {
    const errorData = await writeRes.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `Грешка при записване на данни в Google Sheet (${writeRes.status})`
    );
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
}

export async function updateExistingSpreadsheet(
  spreadsheetId: string,
  positions: TradePosition[],
  summary: PortfolioSummary,
  closedTrades: TradePosition[] = []
): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Липсва активен Google токен за достъп.');
  }

  const headers = [
    'Дата на вход',
    'Тикър',
    'Клас актив',
    'Посока',
    'Дялове / Брой',
    'Ливъридж',
    'Заделен марджин ($)',
    'Цена покупка ($)',
    'Стоп цена ($)',
    'Ликвидация ($)',
    'Текуща цена ($)',
    'Open PnL ($)',
    'Open PnL (%)',
    'ROE (%)',
    'R Multiple',
    'Open Risk ($)',
    'Частичен за прибиране на печалба',
    'Бележки',
  ];

  const rows: (string | number)[][] = [headers];
  const openPositions = positions.filter((p) => p.status !== 'closed');

  for (const pos of openPositions) {
    const metrics = calculateMetrics(pos);
    rows.push([
      pos.entryDate || '',
      pos.ticker,
      pos.assetType === 'crypto' ? 'Крипто' : 'Акция',
      pos.direction === 'short' ? 'Short' : 'Long',
      pos.shares,
      `${pos.leverage || 1}x`,
      Math.round(metrics.initialMargin * 100) / 100,
      pos.entryPrice,
      pos.stopLoss,
      metrics.liquidationPrice > 0 ? Math.round(metrics.liquidationPrice * 100) / 100 : 'Няма (1x)',
      pos.currentPrice,
      Math.round(metrics.openPnL * 100) / 100,
      formatPercent(metrics.openPnLPercent, false),
      formatPercent(metrics.roePercent, false),
      formatR(metrics.rMultiple),
      Math.round(metrics.openRisk * 100) / 100,
      pos.partialTakeProfit || '—',
      pos.notes || '',
    ]);
  }

  rows.push([]);
  rows.push(['РЕЗЮМЕ НА ПОРТФЕЙЛА']);
  rows.push(['Обща пазарна стойност ($)', Math.round(summary.totalValue * 100) / 100]);
  rows.push(['Общ заделен марджин ($)', Math.round(summary.totalMarginUsed * 100) / 100]);
  rows.push(['Ефективен ливъридж', `${summary.effectiveLeverage.toFixed(2)}x`]);
  rows.push(['Общ Open PnL ($)', Math.round(summary.totalOpenPnL * 100) / 100]);
  rows.push(['Общ Открит Риск ($)', Math.round(summary.totalOpenRisk * 100) / 100]);
  rows.push(['Среден R-Multiple', formatR(summary.avgRMultiple)]);

  if (closedTrades.length > 0) {
    const allStats = calculatePerformanceMetrics(closedTrades, 'all');
    rows.push(['Батинг авередж (Win Rate %)', `${allStats.battingAverage.toFixed(1)}%`]);
    rows.push(['Win / Loss Ratio', allStats.winLossRatio > 99 ? '∞' : `${allStats.winLossRatio.toFixed(2)}:1`]);
    rows.push(['Държане печеливши / губещи', `${allStats.avgHoldingDaysWinners.toFixed(1)} дни / ${allStats.avgHoldingDaysLosers.toFixed(1)} дни`]);
    rows.push(['Общ Реализиран PnL ($)', Math.round(allStats.netPnL * 100) / 100]);
  }

  rows.push(['Актуализирано на', new Date().toLocaleString('bg-BG')]);

  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!writeRes.ok) {
    const errorData = await writeRes.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message ||
        `Грешка при обновяване на Google Sheet (${writeRes.status})`
    );
  }
}
