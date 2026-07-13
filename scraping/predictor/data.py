import logging
import asyncio
import time
from datetime import datetime, timezone

import numpy as np
import httpx

logger = logging.getLogger(__name__)

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

MAX_RETRIES = 4
INITIAL_BACKOFF = 2.0

_cache: dict[str, tuple[any, float]] = {}
CACHE_TTL = 300

_client: httpx.AsyncClient | None = None
_last_call = 0.0
_rate_lock = asyncio.Lock()


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(timeout=30)
    return _client


async def _throttle():
    global _last_call
    async with _rate_lock:
        now = time.monotonic()
        since = now - _last_call
        min_gap = 2.5
        if since < min_gap:
            await asyncio.sleep(min_gap - since)
        _last_call = time.monotonic()


async def _rate_limited_fetch(url: str) -> dict | list:
    client = _get_client()
    for attempt in range(MAX_RETRIES):
        await _throttle()
        resp = await client.get(url)
        if resp.status_code == 429:
            wait = INITIAL_BACKOFF * (2 ** attempt)
            logger.warning(f"429 on {url.split('?')[0].rsplit('/', 1)[-1]} — retrying in {wait}s (attempt {attempt + 1})")
            await asyncio.sleep(wait)
            continue
        resp.raise_for_status()
        return resp.json()
    raise httpx.HTTPStatusError(f"Still 429 after {MAX_RETRIES} retries", request=None, response=resp)


def _cached(key: str) -> any:
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
    return None


def _set_cache(key: str, data: any):
    _cache[key] = (data, time.time())


async def fetch_coin_market_chart(coin_id: str, days: int = 90) -> dict:
    cache_key = f"chart_{coin_id}_{days}"
    cached = _cached(cache_key)
    if cached:
        return cached

    url = f"{COINGECKO_BASE}/coins/{coin_id}/market_chart?vs_currency=usd&days={days}"
    data = await _rate_limited_fetch(url)

    _set_cache(cache_key, data)
    return data


async def fetch_coin_detail(coin_id: str) -> dict | None:
    cache_key = f"detail_{coin_id}"
    cached = _cached(cache_key)
    if cached is not None:
        return cached

    url = f"{COINGECKO_BASE}/coins/{coin_id}?localization=false&tickers=false&community_data=false&developer_data=false"
    try:
        data = await _rate_limited_fetch(url)
        _set_cache(cache_key, data)
        return data
    except Exception as e:
        logger.warning(f"Failed to fetch detail for {coin_id}: {e}")
        _set_cache(cache_key, None)
        return None


async def fetch_global_data() -> dict | None:
    cache_key = "global"
    cached = _cached(cache_key)
    if cached is not None:
        return cached

    url = f"{COINGECKO_BASE}/global"
    try:
        data = await _rate_limited_fetch(url)
        _set_cache(cache_key, data)
        return data
    except Exception as e:
        logger.warning(f"Failed to fetch global data: {e}")
        _set_cache(cache_key, None)
        return None


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


async def build_features(coin_id: str, days: int = 90) -> dict:
    chart_days = min(max(days, 30), 365)
    market_chart = await fetch_coin_market_chart(coin_id, chart_days)

    raw_prices = market_chart.get("prices", [])
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

    global_data, coin_detail = await asyncio.gather(
        fetch_global_data(),
        fetch_coin_detail(coin_id),
        return_exceptions=True,
    )

    btc_dominance = None
    total_market_cap = None
    if isinstance(global_data, dict) and "data" in global_data:
        btc_dominance = global_data["data"].get("market_cap_percentage", {}).get("btc")
        total_market_cap = global_data["data"].get("total_market_cap", {}).get("usd")

    market_cap = None
    rank = None
    if isinstance(coin_detail, dict) and "market_data" in coin_detail:
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
