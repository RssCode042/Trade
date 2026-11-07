import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  high24h?: number;
  low24h?: number;
  volume?: number;
  currency: string;
  timestamp: number;
}

// In-memory quote cache with 4-second TTL
const quoteCache = new Map<string, { data: QuoteData; cachedAt: number }>();
const CACHE_TTL_MS = 4000;

function normalizeCryptoSymbol(sym: string): { yahoo: string; binance: string; isCrypto: boolean } {
  const clean = sym.trim().toUpperCase();
  const knownCrypto = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'SUI', 'DOT', 'NEAR'];
  
  if (clean.includes('-USD') || clean.endsWith('USDT') || clean.endsWith('USD')) {
    const base = clean.replace('-USD', '').replace('USDT', '').replace('USD', '');
    return {
      yahoo: `${base}-USD`,
      binance: `${base}USDT`,
      isCrypto: true,
    };
  }

  if (knownCrypto.includes(clean)) {
    return {
      yahoo: `${clean}-USD`,
      binance: `${clean}USDT`,
      isCrypto: true,
    };
  }

  return {
    yahoo: clean,
    binance: `${clean}USDT`,
    isCrypto: false,
  };
}

async function fetchQuoteForSymbol(rawSymbol: string): Promise<QuoteData | null> {
  const norm = normalizeCryptoSymbol(rawSymbol);
  const now = Date.now();
  const cacheKey = rawSymbol.toUpperCase();

  const cached = quoteCache.get(cacheKey);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  // If crypto, try Binance first (high speed, accurate 24hr change)
  if (norm.isCrypto) {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${norm.binance}`, {
        headers: { 'User-Agent': 'ApexTrade/1.0' },
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const data = await res.json();
        const price = parseFloat(data.lastPrice);
        const prevClose = parseFloat(data.prevClosePrice);
        const change = parseFloat(data.priceChange);
        const changePercent = parseFloat(data.priceChangePercent);

        if (!isNaN(price) && price > 0) {
          const result: QuoteData = {
            symbol: rawSymbol.toUpperCase(),
            price,
            change: !isNaN(change) ? change : 0,
            changePercent: !isNaN(changePercent) ? changePercent : 0,
            previousClose: !isNaN(prevClose) ? prevClose : price,
            high24h: parseFloat(data.highPrice) || undefined,
            low24h: parseFloat(data.lowPrice) || undefined,
            volume: parseFloat(data.volume) || undefined,
            currency: 'USD',
            timestamp: now,
          };
          quoteCache.set(cacheKey, { data: result, cachedAt: now });
          return result;
        }
      }
    } catch {
      // fallback to Yahoo
    }
  }

  // Fetch from Yahoo Finance chart API (works for both stocks and crypto)
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(norm.yahoo)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const json = await res.json();
      const meta = json.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === 'number') {
        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change = price - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

        const result: QuoteData = {
          symbol: rawSymbol.toUpperCase(),
          price,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
          previousClose: prevClose,
          high24h: meta.regularMarketDayHigh ?? undefined,
          low24h: meta.regularMarketDayLow ?? undefined,
          currency: meta.currency || 'USD',
          timestamp: now,
        };
        quoteCache.set(cacheKey, { data: result, cachedAt: now });
        return result;
      }
    }
  } catch {
    // continue to fallback
  }

  // If previous cached data exists, return stale data
  if (cached) {
    return cached.data;
  }

  return null;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Real-time quotes proxy endpoint
  app.get('/api/quotes', async (req, res) => {
    const rawSymbols = (req.query.symbols as string) || '';
    if (!rawSymbols.trim()) {
      return res.status(400).json({ error: 'Missing "symbols" query parameter' });
    }

    const symbols = rawSymbols
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    // Fetch quotes in parallel
    const quotesEntries = await Promise.all(
      symbols.map(async (sym) => {
        const quote = await fetchQuoteForSymbol(sym);
        return [sym, quote] as const;
      })
    );

    const quotes: Record<string, QuoteData | null> = {};
    for (const [sym, data] of quotesEntries) {
      quotes[sym] = data;
    }

    res.json({
      success: true,
      timestamp: Date.now(),
      quotes,
    });
  });

  // Single quote lookup with company search
  app.get('/api/quote/:symbol', async (req, res) => {
    const symbol = req.params.symbol;
    const quote = await fetchQuoteForSymbol(symbol);
    if (!quote) {
      return res.status(404).json({ error: `Quote not found for ${symbol}` });
    }
    res.json(quote);
  });

  // Dev server vs Production static files
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ApexTrade server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
