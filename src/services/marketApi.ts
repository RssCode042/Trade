import { MarketQuote } from '../types/trade';

export async function fetchLiveQuotes(
  symbols: string[]
): Promise<Record<string, MarketQuote>> {
  if (!symbols || symbols.length === 0) return {};

  const cleanSymbols = Array.from(
    new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))
  );

  const results: Record<string, MarketQuote> = {};

  try {
    const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(cleanSymbols.join(','))}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.quotes) {
        for (const [sym, quote] of Object.entries(data.quotes)) {
          if (quote) {
            results[sym] = quote as MarketQuote;
          }
        }
      }
    }
  } catch (err) {
    console.warn('API /api/quotes fetch failed, attempting client fallback:', err);
  }

  // Check if any crypto symbols failed to fetch via backend, try direct Binance
  const missingCrypto = cleanSymbols.filter((sym) => {
    if (results[sym]) return false;
    const isCrypto =
      sym.includes('BTC') ||
      sym.includes('ETH') ||
      sym.includes('SOL') ||
      sym.includes('BNB') ||
      sym.includes('XRP') ||
      sym.includes('USD');
    return isCrypto;
  });

  if (missingCrypto.length > 0) {
    await Promise.all(
      missingCrypto.map(async (sym) => {
        try {
          const pair = sym.replace('-USD', '').replace('USD', '') + 'USDT';
          const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`);
          if (r.ok) {
            const d = await r.json();
            const price = parseFloat(d.lastPrice);
            const prevClose = parseFloat(d.prevClosePrice);
            const change = parseFloat(d.priceChange);
            const changePercent = parseFloat(d.priceChangePercent);

            if (!isNaN(price) && price > 0) {
              results[sym] = {
                symbol: sym,
                price,
                change: !isNaN(change) ? change : 0,
                changePercent: !isNaN(changePercent) ? changePercent : 0,
                previousClose: !isNaN(prevClose) ? prevClose : price,
                high24h: parseFloat(d.highPrice) || undefined,
                low24h: parseFloat(d.lowPrice) || undefined,
                currency: 'USD',
                timestamp: Date.now(),
              };
            }
          }
        } catch {
          // Ignore fallback errors
        }
      })
    );
  }

  return results;
}
