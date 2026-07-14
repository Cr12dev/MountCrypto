import { NextResponse } from "next/server";
import { fetchOhlc } from "@/lib/api/yahoo";

const YAHOO_SYMBOLS: Record<string, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
  XRP: "XRP-USD",
  ADA: "ADA-USD",
  DOGE: "DOGE-USD",
  DOT: "DOT-USD",
  MATIC: "POL-USD",
  AVAX: "AVAX-USD",
  LINK: "LINK-USD",
  AAPL: "AAPL",
  MSFT: "MSFT",
  GOOGL: "GOOGL",
  AMZN: "AMZN",
  NVDA: "NVDA",
  META: "META",
  TSLA: "TSLA",
  JPM: "JPM",
  V: "V",
  IBM: "IBM",
  SAN: "SAN",
  GGAL: "GGAL",
  MU: "MU",
  NFLX: "NFLX",
  MELI: "MELI",
  AMD: "AMD",
  INTC: "INTC",
  ADBE: "ADBE",
  NKE: "NKE",
  ADDYY: "ADDYY",
  MCD: "MCD",
  WMT: "WMT",
  COIN: "COIN",
  ASML: "ASML",
  PEP: "PEP",
  PYPL: "PYPL",
  CVX: "CVX",
  ACN: "ACN",
  "EUR/USD": "EURUSD=X",
  "GBP/USD": "GBPUSD=X",
  "USD/JPY": "USDJPY=X",
  GC: "GC=F",
  CL: "CL=F",
  SI: "SI=F",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase() || "BTC";
  const type = searchParams.get("type") || "crypto";
  const days = searchParams.get("days") || "1";
  const interval = searchParams.get("interval") || undefined;

  const forexPairs: Record<string, string> = {
    "EUR/USD": "EURUSD=X",
    "GBP/USD": "GBPUSD=X",
    "USD/JPY": "USDJPY=X",
    "USD/CHF": "USDCHF=X",
    "AUD/USD": "AUDUSD=X",
    "USD/CAD": "USDCAD=X",
    "NZD/USD": "NZDUSD=X",
    "EUR/GBP": "EURGBP=X",
  };

  let yahooSymbol: string;
  if (type === "crypto") {
    yahooSymbol = YAHOO_SYMBOLS[symbol] || `${symbol}-USD`;
  } else {
    yahooSymbol = YAHOO_SYMBOLS[symbol] || forexPairs[symbol] || `${symbol}=X`;
  }

  try {
    const bars = await fetchOhlc(yahooSymbol, type, days, interval);
    return NextResponse.json(bars);
  } catch {
    return NextResponse.json({ error: "Failed to load OHLC data" }, { status: 500 });
  }
}
