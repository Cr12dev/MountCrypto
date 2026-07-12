from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging
from datetime import datetime, timedelta, timezone
import numpy as np

from models import Article, Source, ScrapeResponse, ErrorResponse
from predictor.schemas import CoinPrediction, PredictionPoint, FactorWeight, SentimentData, ModelMetrics, SUPPORTED_COINS, COIN_IDS
from predictor.data import build_features, get_current_price
from predictor.sentiment import analyze_sentiment
from predictor.ensemble import predict_price
from scrapers.bbc import BBCScraper
from scrapers.wsj import WSJScraper
from scrapers.nytimes import NYTScraper
from scrapers.antena3 import Antena3Scraper
from scrapers.bild import BildScraper
from scrapers.economist import EconomistScraper
from scrapers.ft import FTScraper

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SCRAPERS = {
    Source.BBC: BBCScraper(),
    Source.WSJ: WSJScraper(),
    Source.NYT: NYTScraper(),
    Source.ANTENA3: Antena3Scraper(),
    Source.BILD: BildScraper(),
    Source.ECONOMIST: EconomistScraper(),
    Source.FT: FTScraper(),
}

store: dict[str, Article] = {}
store_lock = asyncio.Lock()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Scraping API started")
    yield
    logger.info("Scraping API stopped")


app = FastAPI(
    title="MountCrypto Scraping API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/scrape", response_model=ScrapeResponse)
async def scrape(
    sources: str = Query(None, description="Comma-separated source names"),
    timeout: int = Query(60, description="Max wait seconds per source"),
):
    global store

    selected = _resolve_sources(sources)
    results: list[Article] = []
    errors: list[str] = []

    async def run_scraper(name: Source):
        try:
            scraper = SCRAPERS.get(name)
            if not scraper:
                errors.append(f"Unknown source: {name}")
                return []
            loop = asyncio.get_event_loop()
            articles = await asyncio.wait_for(
                loop.run_in_executor(None, scraper.scrape),
                timeout=timeout,
            )
            logger.info(f"  ✓ {scraper.label}: {len(articles)} articles")
            return articles
        except asyncio.TimeoutError:
            logger.warning(f"  ✗ {name.value}: timeout")
            errors.append(f"{name.value}: timeout")
            return []
        except Exception as e:
            logger.warning(f"  ✗ {name.value}: {e}")
            errors.append(f"{name.value}: {e}")
            return []

    tasks = [run_scraper(s) for s in selected]
    task_results = await asyncio.gather(*tasks)

    async with store_lock:
        store.clear()
        for articles in task_results:
            for a in articles:
                store[a.id] = a
            results.extend(articles)

    return ScrapeResponse(
        articles=results,
        total=len(results),
        sources_scraped=[s.value for s in selected],
    )


@app.get("/articles", response_model=list[Article])
async def get_articles(
    source: str = Query(None, description="Filter by source name"),
    limit: int = Query(50, ge=1, le=200),
):
    async with store_lock:
        articles = list(store.values())

    if source:
        articles = [a for a in articles if a.source.value == source]

    articles.sort(key=lambda a: a.published or "", reverse=True)
    return articles[:limit]


@app.get("/health")
async def health():
    async with store_lock:
        count = len(store)
    return {"status": "ok", "articles_in_store": count}


@app.get("/predict/coins")
async def list_coins():
    return {
        "coins": [
            {"id": cid, "symbol": info["symbol"], "name": info["name"]}
            for cid, info in SUPPORTED_COINS.items()
        ]
    }


@app.get("/predict/factors")
async def prediction_factors():
    sentiment = await analyze_sentiment(keywords=["crypto", "bitcoin", "blockchain"])
    return {
        "sentiment": sentiment,
        "models_used": [
            "linear_regression",
            "polynomial (degree 2)",
            "weighted_moving_average",
            "momentum_regression",
            "seasonal_decomposition (7-day cycle)",
        ],
        "data_sources": {
            "price_data": "CoinGecko API (365 days of OHLC + market chart)",
            "market_sentiment": "Fear & Greed Index (alternative.me)",
            "news": "Scraping service articles filtered for crypto keywords",
        },
    }


@app.get("/predict/{coin_id}", response_model=CoinPrediction)
async def predict_coin(
    coin_id: str,
    days: int = Query(30, ge=7, le=365, description="Forecast horizon in days"),
):
    if coin_id not in SUPPORTED_COINS:
        raise HTTPException(status_code=404, detail=f"Unsupported coin '{coin_id}'. Use GET /predict/coins to see supported coins.")

    coin_info = SUPPORTED_COINS[coin_id]

    try:
        features = await build_features(coin_id, days=365)
        sentiment = await analyze_sentiment(keywords=coin_info["keywords"])
        current_price = float(features["close_prices"][-1])

        result = await predict_price(days, features, sentiment["score"])

        dates = [
            (datetime.now(timezone.utc) + timedelta(days=i + 1)).strftime("%Y-%m-%d")
            for i in range(days)
        ]

        forecast = [
            PredictionPoint(
                date=dates[i],
                predicted_price=round(float(result["ensemble"][i]), 2),
                upper_bound=round(float(result["upper"][i]), 2),
                lower_bound=round(float(result["lower"][i]), 2),
            )
            for i in range(days)
        ]

        price_vol = float(np.std(features["close_prices"][-90:]) / np.mean(features["close_prices"][-90:])) if len(features["close_prices"]) >= 90 else 0.5
        if price_vol < 0.15:
            confidence = "high"
        elif price_vol < 0.30:
            confidence = "medium"
        else:
            confidence = "low"

        factors = [
            FactorWeight(name="Price Momentum", weight=0.25, impact="positive" if features.get("momentum", np.array([0]))[-1] > 0 else "negative"),
            FactorWeight(name="Market Volatility", weight=0.20, impact="negative" if price_vol > 0.25 else "neutral"),
            FactorWeight(name="News Sentiment", weight=0.20, impact=sentiment["label"]),
            FactorWeight(name="Fear & Greed Index", weight=0.15, impact="positive" if sentiment.get("fear_greed_value", 50) > 50 else "negative"),
            FactorWeight(name="Trend Strength (SMA)",
                        weight=0.10,
                        impact="positive" if features["close_prices"][-1] > features["sma_99"][-1] else "negative"),
            FactorWeight(name="Volume Trend", weight=0.10, impact="neutral"),
        ]

        sentiment_data = SentimentData(
            score=sentiment["score"],
            label=sentiment["label"],
            article_count=sentiment["article_count"],
            recent_trend=sentiment.get("recent_trend", "neutral"),
        )

        model_metrics = [
            ModelMetrics(
                model=m["model"],
                mae=m["mae"],
                rmse=m["rmse"],
                weight=m["weight"],
            )
            for m in result["metrics"]
        ]

        return CoinPrediction(
            coin_id=coin_id,
            symbol=coin_info["symbol"],
            name=coin_info["name"],
            current_price=round(current_price, 2),
            current_date=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            forecast=forecast,
            factors=factors,
            sentiment=sentiment_data,
            confidence=confidence,
            model_metrics=model_metrics,
            prediction_days=days,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Prediction failed for {coin_id}")
        raise HTTPException(status_code=500, detail=f"Prediction failed for {coin_id}: {e}")


def _resolve_sources(sources: str | None) -> list[Source]:
    if not sources:
        return list(Source)
    names = [s.strip().lower() for s in sources.split(",")]
    resolved: list[Source] = []
    for name in names:
        for s in Source:
            if s.value == name:
                resolved.append(s)
                break
    return resolved or list(Source)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
