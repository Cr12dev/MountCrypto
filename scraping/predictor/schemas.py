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


class FactorWeight(BaseModel):
    name: str
    weight: float
    impact: str


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


class CoinPrediction(BaseModel):
    coin_id: str
    symbol: str
    name: str
    current_price: float
    current_date: str
    forecast: list[PredictionPoint]
    factors: list[FactorWeight]
    sentiment: SentimentData
    confidence: str
    model_metrics: list[ModelMetrics]
    prediction_days: int
