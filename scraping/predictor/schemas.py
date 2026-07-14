from pydantic import BaseModel
from datetime import datetime


SUPPORTED_COINS: dict[str, dict[str, str | list[str]]] = {
    "bitcoin": {"symbol": "BTC", "name": "Bitcoin", "keywords": ["bitcoin", "btc"]},
    "ethereum": {"symbol": "ETH", "name": "Ethereum", "keywords": ["ethereum", "eth"]},
    "litecoin": {"symbol": "LTC", "name": "Litecoin", "keywords": ["litecoin", "ltc"]},
    "dogecoin": {"symbol": "DOGE", "name": "Dogecoin", "keywords": ["dogecoin", "doge"]},
    "tether": {"symbol": "USDT", "name": "Tether", "keywords": ["tether", "usdt"]},
    "binancecoin": {"symbol": "BNB", "name": "BNB", "keywords": ["bnb", "binance coin"]},
    "ripple": {"symbol": "XRP", "name": "XRP", "keywords": ["xrp", "ripple"]},
    "solana": {"symbol": "SOL", "name": "Solana", "keywords": ["solana", "sol"]},
    "monero": {"symbol": "XMR", "name": "Monero", "keywords": ["monero", "xmr"]},
}

COIN_IDS = list(SUPPORTED_COINS.keys())


class PredictionPoint(BaseModel):
    date: str
    predicted_price: float
    upper_bound: float
    lower_bound: float


class ProbabilisticPoint(BaseModel):
    date: str
    p5: float
    p25: float
    p50: float
    p75: float
    p95: float
    bull_case: float
    bear_case: float


class ScenarioPoint(BaseModel):
    date: str
    bull: float
    base: float
    bear: float


class FactorWeight(BaseModel):
    name: str
    weight: float
    impact: str


class MarketContext(BaseModel):
    regime: str
    adx: float
    trend_strength: str
    rsi_interpretation: str
    above_sma50: bool
    above_sma200: bool
    price_change_30d: float
    support_levels: list[float]
    resistance_levels: list[float]
    btc_correlation: float | None = None
    fear_greed_label: str = "neutral"
    fear_greed_value: float = 50


class SentimentData(BaseModel):
    score: float
    label: str
    article_count: int
    recent_trend: str


class ModelMetrics(BaseModel):
    model: str
    mae: float
    rmse: float
    weight: float


class ProbabilisticMetrics(BaseModel):
    probability_up: float
    probability_down: float
    expected_price: float
    expected_return_pct: float
    value_at_risk_95: float
    value_at_risk_99: float
    conditional_var_95: float
    sharpe_ratio: float | None = None
    n_simulations: int


class CoinPrediction(BaseModel):
    coin_id: str
    symbol: str
    name: str
    current_price: float
    current_date: str
    forecast: list[PredictionPoint]
    probabilistic_forecast: list[ProbabilisticPoint] | None = None
    scenarios: list[ScenarioPoint] | None = None
    market_context: MarketContext | None = None
    probabilistic_metrics: ProbabilisticMetrics | None = None
    factors: list[FactorWeight]
    sentiment: SentimentData
    confidence: str
    model_metrics: list[ModelMetrics]
    prediction_days: int
