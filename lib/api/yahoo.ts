import YahooFinance from "yahoo-finance2";
import type { ChangeMap } from "./timeframes";

let _yh: InstanceType<typeof YahooFinance> | null = null;
function getYahooFinance() {
  if (!_yh) _yh = new YahooFinance();
  return _yh;
}

const CACHE_TTL = 60_000;
const changeCache = new Map<string, { data: ChangeMap; at: number }>();

export type { ChangeMap } from "./timeframes";

export type IndexQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  changes: ChangeMap;
};

export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  changes: ChangeMap;
};

export type ForexQuote = {
  pair: string;
  name: string;
  bid: number;
  ask: number;
  change: number;
  changePercent: number;
  changes: ChangeMap;
};

export type CommodityQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
  changes: ChangeMap;
};

export type OhlcBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type ChartQuote = {
  date: Date;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
};

export const STOCK_SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
  "META", "TSLA", "JPM", "V", "IBM",
];

export const INDEX_SYMBOLS = [
  "^GSPC", "^IXIC", "^DJI", "^IBEX", "^FTSE", "^N225",
];

export const FOREX_SYMBOLS = [
  "EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDCHF=X",
  "AUDUSD=X", "USDCAD=X", "NZDUSD=X", "EURGBP=X",
];

export const COMMODITY_SYMBOLS = [
  "CL=F", "BZ=F", "GC=F", "SI=F", "HG=F", "NG=F", "ZW=F", "ZC=F",
];

const FOREX_PAIR_NAMES: Record<string, string> = {
  "EURUSD=X": "Euro / US Dollar",
  "GBPUSD=X": "British Pound / US Dollar",
  "USDJPY=X": "US Dollar / Japanese Yen",
  "USDCHF=X": "US Dollar / Swiss Franc",
  "AUDUSD=X": "Australian Dollar / US Dollar",
  "USDCAD=X": "US Dollar / Canadian Dollar",
  "NZDUSD=X": "New Zealand Dollar / US Dollar",
  "EURGBP=X": "Euro / British Pound",
};

const FOREX_PAIR_DISPLAY: Record<string, string> = {
  "EURUSD=X": "EUR/USD",
  "GBPUSD=X": "GBP/USD",
  "USDJPY=X": "USD/JPY",
  "USDCHF=X": "USD/CHF",
  "AUDUSD=X": "AUD/USD",
  "USDCAD=X": "USD/CAD",
  "NZDUSD=X": "NZD/USD",
  "EURGBP=X": "EUR/GBP",
};

const COMMODITY_UNITS: Record<string, string> = {
  "CL=F": "USD/bbl",
  "BZ=F": "USD/bbl",
  "GC=F": "USD/oz",
  "SI=F": "USD/oz",
  "HG=F": "USD/lb",
  "NG=F": "USD/MMBtu",
  "ZW=F": "USD/bu",
  "ZC=F": "USD/bu",
};

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function fetchChanges(symbol: string): Promise<ChangeMap> {
  const cached = changeCache.get(symbol);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.data;

  const changes: ChangeMap = {};

  try {
    const daily = (await getYahooFinance().chart(symbol, {
      period1: daysAgo(400),
      interval: "1d",
      return: "array",
    })) as unknown as { quotes: ChartQuote[] };

    if (daily.quotes?.length) {
      const prices = daily.quotes
        .filter((q): q is ChartQuote & { close: number } => q.close != null)
        .map((q) => q.close);

      if (prices.length >= 2) {
        const prev = prices[prices.length - 2];
        const curr = prices[prices.length - 1];
        changes["1d"] = ((curr - prev) / prev) * 100;
      }
      if (prices.length >= 8) {
        const idx = prices.length - 8;
        changes["7d"] = ((prices[prices.length - 1] - prices[idx]) / prices[idx]) * 100;
      }
      if (prices.length >= 29) {
        const idx = prices.length - 29;
        changes["28d"] = ((prices[prices.length - 1] - prices[idx]) / prices[idx]) * 100;
      }
      if (prices.length >= 252) {
        const idx = prices.length - 252;
        changes["1y"] = ((prices[prices.length - 1] - prices[idx]) / prices[idx]) * 100;
      }
      if (prices.length >= 1260) {
        const idx = prices.length - 1260;
        changes["5y"] = ((prices[prices.length - 1] - prices[idx]) / prices[idx]) * 100;
      }
    }
  } catch {
    console.error("fetchChanges failed for", symbol);
  }

  changeCache.set(symbol, { data: changes, at: Date.now() });
  return changes;
}

export async function fetchIndexQuotes(): Promise<IndexQuote[]> {
  const result = await getYahooFinance().quote(INDEX_SYMBOLS);
  const quotes = Array.isArray(result) ? result : [result];

  const mapped = quotes.map((q: Record<string, unknown>) => ({
    symbol: (q.symbol ?? "") as string,
    name: ((q.longName ?? q.shortName ?? q.displayName) ?? q.symbol ?? "") as string,
    price: (q.regularMarketPrice ?? 0) as number,
    change: (q.regularMarketChange ?? 0) as number,
    changePercent: (q.regularMarketChangePercent ?? 0) as number,
    changes: {} as ChangeMap,
  }));

  const withChanges = await Promise.allSettled(
    mapped.map(async (q) => {
      const changes = await fetchChanges(q.symbol);
      return { ...q, changes };
    }),
  );

  return withChanges.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return mapped[i];
  });
}

export async function fetchStockQuotes(): Promise<StockQuote[]> {
  const result = await getYahooFinance().quote(STOCK_SYMBOLS);
  const quotes = Array.isArray(result) ? result : [result];

  const mapped = quotes.map((q: Record<string, unknown>) => ({
    symbol: (q.symbol ?? "") as string,
    name: ((q.longName ?? q.shortName ?? q.displayName) ?? q.symbol ?? "") as string,
    price: (q.regularMarketPrice ?? 0) as number,
    change: (q.regularMarketChange ?? 0) as number,
    changePercent: (q.regularMarketChangePercent ?? 0) as number,
    marketCap: (q.marketCap ?? 0) as number,
    volume: (q.regularMarketVolume ?? 0) as number,
    changes: {} as ChangeMap,
  }));

  const withChanges = await Promise.allSettled(
    mapped.map(async (q) => {
      const changes = await fetchChanges(q.symbol);
      return { ...q, changes };
    }),
  );

  return withChanges.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return mapped[i];
  });
}

export async function fetchForexQuotes(): Promise<ForexQuote[]> {
  const result = await getYahooFinance().quote(FOREX_SYMBOLS);
  const quotes = Array.isArray(result) ? result : [result];

  const mapped = quotes.map((q: Record<string, unknown>) => {
    const yahooSymbol = (q.symbol ?? "") as string;
    const price = (q.regularMarketPrice ?? 0) as number;
    const spread = price * 0.00015;
    return {
      pair: FOREX_PAIR_DISPLAY[yahooSymbol] || yahooSymbol.replace("=X", ""),
      name: FOREX_PAIR_NAMES[yahooSymbol] || yahooSymbol,
      yahooSymbol,
      bid: price - spread / 2,
      ask: price + spread / 2,
      change: (q.regularMarketChange ?? 0) as number,
      changePercent: (q.regularMarketChangePercent ?? 0) as number,
      changes: {} as ChangeMap,
    };
  }) as (ForexQuote & { yahooSymbol: string })[];

  const withChanges = await Promise.allSettled(
    mapped.map(async (q) => {
      const changes = await fetchChanges(q.yahooSymbol);
      const { yahooSymbol: _, ...rest } = q;
      return { ...rest, changes };
    }),
  );

  return withChanges.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const { yahooSymbol: _, ...rest } = mapped[i];
    return rest;
  });
}

export async function fetchCommodityQuotes(): Promise<CommodityQuote[]> {
  const result = await getYahooFinance().quote(COMMODITY_SYMBOLS);
  const quotes = Array.isArray(result) ? result : [result];

  const mapped = quotes.map((q: Record<string, unknown>) => {
    const symbol = (q.symbol ?? "") as string;
    return {
      symbol: symbol.replace("=F", ""),
      name: ((q.longName ?? q.shortName ?? q.displayName) ?? symbol) as string,
      price: (q.regularMarketPrice ?? 0) as number,
      change: (q.regularMarketChange ?? 0) as number,
      changePercent: (q.regularMarketChangePercent ?? 0) as number,
      unit: COMMODITY_UNITS[symbol] || "",
      changes: {} as ChangeMap,
    };
  });

  const withChanges = await Promise.allSettled(
    mapped.map(async (q) => {
      const yahooSymbol = COMMODITY_SYMBOLS.find(
        (s) => s.replace("=F", "") === q.symbol,
      );
      if (!yahooSymbol) return { ...q, changes: {} };
      const changes = await fetchChanges(yahooSymbol);
      return { ...q, changes };
    }),
  );

  return withChanges.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return mapped[i];
  });
}

export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const result = await getYahooFinance().quote([symbol]);
    const q = (Array.isArray(result) ? result : [result])[0] as Record<string, unknown>;
    return {
      symbol: (q.symbol ?? "") as string,
      name: ((q.longName ?? q.shortName ?? q.displayName) ?? q.symbol ?? "") as string,
      price: (q.regularMarketPrice ?? 0) as number,
      change: (q.regularMarketChange ?? 0) as number,
      changePercent: (q.regularMarketChangePercent ?? 0) as number,
      marketCap: (q.marketCap ?? 0) as number,
      volume: (q.regularMarketVolume ?? 0) as number,
      changes: {},
    };
  } catch {
    return null;
  }
}

export async function getForexQuote(pair: string): Promise<ForexQuote | null> {
  const upper = pair.toUpperCase();
  const yahooSymbol = Object.entries(FOREX_PAIR_DISPLAY).find(
    ([_, v]) => v === upper,
  )?.[0];
  if (!yahooSymbol) return null;

  try {
    const result = await getYahooFinance().quote([yahooSymbol]);
    const q = (Array.isArray(result) ? result : [result])[0] as Record<string, unknown>;
    const price = (q.regularMarketPrice ?? 0) as number;
    const spread = price * 0.00015;
    return {
      pair: FOREX_PAIR_DISPLAY[yahooSymbol] || upper,
      name: FOREX_PAIR_NAMES[yahooSymbol] || upper,
      bid: price - spread / 2,
      ask: price + spread / 2,
      change: (q.regularMarketChange ?? 0) as number,
      changePercent: (q.regularMarketChangePercent ?? 0) as number,
      changes: {},
    };
  } catch {
    return null;
  }
}

export async function getCommodityQuote(symbol: string): Promise<CommodityQuote | null> {
  const yahooSymbol = COMMODITY_SYMBOLS.find(
    (s) => s.replace("=F", "") === symbol.toUpperCase(),
  );
  if (!yahooSymbol) return null;

  try {
    const result = await getYahooFinance().quote([yahooSymbol]);
    const q = (Array.isArray(result) ? result : [result])[0] as Record<string, unknown>;
    const sym = (q.symbol ?? "") as string;
    return {
      symbol: sym.replace("=F", ""),
      name: ((q.longName ?? q.shortName ?? q.displayName) ?? sym) as string,
      price: (q.regularMarketPrice ?? 0) as number,
      change: (q.regularMarketChange ?? 0) as number,
      changePercent: (q.regularMarketChangePercent ?? 0) as number,
      unit: COMMODITY_UNITS[sym] || "",
      changes: {},
    };
  } catch {
    return null;
  }
}

export async function fetchOhlc(symbol: string, _type: string, days: string): Promise<OhlcBar[]> {
  const numDays = parseInt(days) || 1;
  const interval = numDays <= 3 ? "1h" : "1d";

  const result = (await getYahooFinance().chart(symbol, {
    period1: daysAgo(numDays),
    interval,
    return: "array",
  })) as unknown as { quotes: ChartQuote[] };

  return (result.quotes ?? [])
    .filter((q): q is ChartQuote & { close: number; open: number } => q.close != null && q.open != null)
    .map((q) => ({
      time: Math.floor(q.date.getTime() / 1000),
      open: q.open,
      high: (q.high ?? q.close) as number,
      low: (q.low ?? q.close) as number,
      close: q.close,
    }));
}
