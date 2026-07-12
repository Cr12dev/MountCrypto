import logging
from datetime import datetime, timezone

import numpy as np
import httpx

logger = logging.getLogger(__name__)

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

PRICE_CACHE: dict[str, tuple[list[float], float]] = {}
CACHE_TTL = 300


async def fetch_coin_ohlc(coin_id: str, days: int = 365) -> list[list[float]]:
    cache_key = f"{coin_id}_ohlc_{days}"
    now = datetime.now(timezone.utc).timestamp()
    if cache_key in PRICE_CACHE:
        data, ts = PRICE_CACHE[cache_key]
        if now - ts < CACHE_TTL:
            return data

    url = f"{COINGECKO_BASE}/coins/{coin_id}/ohlc?vs_currency=usd&days={days}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    PRICE_CACHE[cache_key] = (data, now)
    return data


async def fetch_coin_market_chart(coin_id: str, days: int = 365) -> dict:
    url = f"{COINGECKO_BASE}/coins/{coin_id}/market_chart?vs_currency=usd&days={days}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


async def fetch_coin_detail(coin_id: str) -> dict | None:
    url = f"{COINGECKO_BASE}/coins/{coin_id}?localization=false&tickers=false&community_data=false&developer_data=false"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            return None
        return resp.json()


async def fetch_global_data() -> dict | None:
    url = f"{COINGECKO_BASE}/global"
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url)
        if resp.status_code != 200:
            return None
        return resp.json()


def compute_rsi(prices: np.ndarray, period: int = 14) -> np.ndarray:
    deltas = np.diff(prices)
    gain = np.where(deltas > 0, deltas, 0)
    loss = np.where(deltas < 0, -deltas, 0)
    avg_gain = np.convolve(gain, np.ones(period) / period, mode="valid")
    avg_loss = np.convolve(loss, np.ones(period) / period, mode="valid")
    with np.errstate(divide="ignore", invalid="ignore"):
        rs = np.where(avg_loss != 0, avg_gain / avg_loss, 100)
        rsi = 100 - (100 / (1 + rs))
    rsi_full = np.full(len(prices), np.nan)
    rsi_full[period:] = rsi
    return rsi_full


def compute_moving_averages(prices: np.ndarray) -> dict[str, np.ndarray]:
    def sma(data: np.ndarray, window: int) -> np.ndarray:
        result = np.full(len(data), np.nan)
        if len(data) >= window:
            result[window - 1:] = np.convolve(data, np.ones(window) / window, mode="valid")
        return result

    def ema(data: np.ndarray, span: int) -> np.ndarray:
        result = np.full(len(data), np.nan)
        if len(data) < 2:
            return result
        alpha = 2 / (span + 1)
        result[0] = data[0]
        for i in range(1, len(data)):
            result[i] = alpha * data[i] + (1 - alpha) * result[i - 1]
        return result

    return {
        "sma_7": sma(prices, 7),
        "sma_25": sma(prices, 25),
        "sma_99": sma(prices, 99),
        "ema_12": ema(prices, 12),
        "ema_26": ema(prices, 26),
    }


def compute_macd(prices: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    def ema(data: np.ndarray, span: int) -> np.ndarray:
        result = np.full(len(data), np.nan)
        if len(data) < 2:
            return result
        alpha = 2 / (span + 1)
        result[0] = data[0]
        for i in range(1, len(data)):
            result[i] = alpha * data[i] + (1 - alpha) * result[i - 1]
        return result

    ema_12 = ema(prices, 12)
    ema_26 = ema(prices, 26)
    macd_line = ema_12 - ema_26
    signal = ema(macd_line, 9)
    return macd_line, signal


def compute_volatility(prices: np.ndarray, window: int = 30) -> np.ndarray:
    log_returns = np.diff(np.log(prices))
    result = np.full(len(prices), np.nan)
    if len(prices) > window:
        vol = np.array([
            np.std(log_returns[max(0, i - window):i]) * np.sqrt(365) * 100
            for i in range(1, len(prices))
        ])
        result[1:] = vol
    return result


def compute_momentum(prices: np.ndarray) -> np.ndarray:
    result = np.full(len(prices), np.nan)
    for i in range(20, len(prices)):
        result[i] = (prices[i] / prices[i - 20] - 1) * 100
    return result


async def build_features(coin_id: str, days: int = 365) -> dict:
    ohlc = await fetch_coin_ohlc(coin_id, min(days, 365))
    market_chart = await fetch_coin_market_chart(coin_id, min(days, 365))

    raw_prices = market_chart.get("prices", [])
    if not raw_prices and ohlc:
        raw_prices = [[o[0], o[4]] for o in ohlc]

    if not raw_prices:
        raise ValueError(f"No price data available for {coin_id}")

    timestamps = np.array([p[0] for p in raw_prices])
    prices = np.array([p[1] for p in raw_prices])

    dates = [datetime.fromtimestamp(ts / 1000, tz=timezone.utc) for ts in timestamps]

    mas = compute_moving_averages(prices)
    macd_line, macd_signal = compute_macd(prices)
    rsi = compute_rsi(prices)
    volatility = compute_volatility(prices)
    momentum = compute_momentum(prices)

    volume_data = market_chart.get("total_volumes", [])
    volumes = np.array([v[1] for v in volume_data]) if volume_data else np.array([])

    global_data = await fetch_global_data()
    btc_dominance = None
    total_market_cap = None
    if global_data and "data" in global_data:
        btc_dominance = global_data["data"].get("market_cap_percentage", {}).get("btc")
        total_market_cap = global_data["data"].get("total_market_cap", {}).get("usd")

    coin_detail = await fetch_coin_detail(coin_id)
    market_cap = None
    rank = None
    if coin_detail and "market_data" in coin_detail:
        md = coin_detail["market_data"]
        market_cap = md.get("market_cap", {}).get("usd")
        rank = md.get("market_cap_rank")

    return {
        "timestamps": timestamps,
        "dates": dates,
        "prices": prices,
        "close_prices": prices,
        "volumes": volumes,
        "sma_7": mas["sma_7"],
        "sma_25": mas["sma_25"],
        "sma_99": mas["sma_99"],
        "ema_12": mas["ema_12"],
        "ema_26": mas["ema_26"],
        "macd_line": macd_line,
        "macd_signal": macd_signal,
        "rsi": rsi,
        "volatility": volatility,
        "momentum": momentum,
        "btc_dominance": btc_dominance,
        "total_market_cap": total_market_cap,
        "market_cap": market_cap,
        "market_cap_rank": rank,
    }


async def get_current_price(coin_id: str) -> float:
    try:
        chart = await fetch_coin_market_chart(coin_id, days=1)
        prices = chart.get("prices", [])
        if prices:
            return prices[-1][1]
    except Exception as e:
        logger.warning(f"Failed to fetch price for {coin_id}: {e}")
    return 0.0
