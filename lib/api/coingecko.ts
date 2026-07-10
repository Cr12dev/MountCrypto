const BASE = "https://api.coingecko.com/api/v3";

export type CoinMarket = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_1h_in_currency: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency: number;
  price_change_percentage_30d_in_currency: number;
  price_change_percentage_1y_in_currency: number;
  circulating_supply: number;
  sparkline_in_7d: { price: number[] };
};

export async function fetchCoinMarkets(
  page = 1,
  perPage = 50,
): Promise<CoinMarket[]> {
  const url = `${BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=true&price_change_percentage=1h%2C24h%2C7d%2C30d%2C1y`;
  const res = await fetch(url, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  return res.json();
}

export async function searchCoins(query: string) {
  const url = `${BASE}/search?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    next: { revalidate: 30 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  return res.json();
}

export type CoinDetail = {
  id: string;
  symbol: string;
  name: string;
  image: { large: string; small: string; thumb: string };
  market_data: {
    current_price: { usd: number };
    market_cap: { usd: number };
    total_volume: { usd: number };
    high_24h: { usd: number };
    low_24h: { usd: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    market_cap_rank: number;
    circulating_supply: number;
    total_supply: number | null;
    max_supply: number | null;
    ath: { usd: number };
    ath_date: { usd: string };
  };
  description: { en: string };
};

export async function fetchCoinDetail(coinId: string): Promise<CoinDetail> {
  const url = `${BASE}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`;
  const res = await fetch(url, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  return res.json();
}

export async function fetchCoinChart(coinId: string, days = 1) {
  const url = `${BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
  const res = await fetch(url, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  return res.json() as Promise<{ prices: [number, number][] }>;
}
