from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging
from datetime import datetime, timedelta, timezone
import numpy as np

from models import Article, Source, ScrapeResponse, ErrorResponse
from predictor.schemas import (
    CoinPrediction, PredictionPoint, ProbabilisticPoint, ScenarioPoint,
    FactorWeight, MarketContext, SentimentData, ModelMetrics,
    ProbabilisticMetrics, SUPPORTED_COINS, COIN_IDS,
)
from predictor.data import build_features, fetch_btc_market_chart
from predictor.sentiment import analyze_sentiment, fetch_fear_greed_index
from predictor.ensemble import predict_price
from predictor.probabilistic import (
    monte_carlo_simulation, compute_quantile_forecast,
    scenario_analysis, compute_probability_metrics,
)
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
        "market_context": {
            "market_regime": "bullish/bearish/sideways detected via SMA50/200 + ADX",
            "adx": "Average Directional Index — trend strength (>=25 trending, <25 ranging)",
            "support_resistance": "Price level clusters from histogram peaks",
            "btc_correlation": "Pearson correlation of log-returns with Bitcoin",
            "fear_greed": "Fear & Greed Index (alternative.me) with zone classification",
        },
        "models_used": [
            "linear_regression — least-squares trend line",
            "polynomial (degree 2) — quadratic curve fitting",
            "weighted_moving_average — recent prices weighted by recency",
            "momentum_regression — trend adjusted by short-term momentum",
            "seasonal_decomposition — 7-day cycle + trend decomposition",
            "arima(1,1,1) — AutoRegressive Integrated Moving Average",
            "kalman_filter — recursive state estimation with noise filtering",
            "garch_brownian — GARCH(1,1) volatility + geometric Brownian motion",
        ],
        "probabilistic_analysis": {
            "monte_carlo": "2,000 simulations via Geometric Brownian Motion",
            "quantiles": "p5/p25/p50/p75/p95 percentile forecasts",
            "scenarios": "bull (+1.5σ), base (μ), bear (-1.5σ) drift scenarios",
            "value_at_risk": "VaR at 95% and 99% confidence levels",
            "conditional_var": "Expected shortfall beyond VaR threshold",
            "sharpe_ratio": "Risk-adjusted return of ensemble forecast",
            "probability_up/down": "% of Monte Carlo paths above/below ensemble price",
        },
        "data_sources": {
            "price_data": "CoinGecko API (365 days of OHLC + market chart)",
            "btc_prices": "CoinGecko — for correlation computation",
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
        hist_days = max(days * 3, 90)
        btc_prices = await fetch_btc_market_chart(days=hist_days)
        fng_data = await fetch_fear_greed_index()
        fng_score = float(fng_data[0]["value"]) if fng_data and len(fng_data) > 0 else None
        features = await build_features(coin_id, days=min(hist_days, 365), btc_prices=btc_prices, fng_score=fng_score)
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

        prices_arr = features["close_prices"]
        vol_arr = features.get("volatility")
        mc_paths = monte_carlo_simulation(prices_arr, days, n_simulations=2000, volatility=vol_arr)
        quantiles = compute_quantile_forecast(mc_paths)
        scenarios = scenario_analysis(prices_arr, days, volatility=vol_arr)
        prob_metrics = compute_probability_metrics(mc_paths, result["ensemble"])

        probabilistic_forecast = [
            ProbabilisticPoint(
                date=dates[i],
                p5=round(float(quantiles["p5"][i]), 2),
                p25=round(float(quantiles["p25"][i]), 2),
                p50=round(float(quantiles["p50"][i]), 2),
                p75=round(float(quantiles["p75"][i]), 2),
                p95=round(float(quantiles["p95"][i]), 2),
                bull_case=round(float(scenarios["bull"][i]), 2),
                bear_case=round(float(scenarios["bear"][i]), 2),
            )
            for i in range(days)
        ]

        scenario_points = [
            ScenarioPoint(
                date=dates[i],
                bull=round(float(scenarios["bull"][i]), 2),
                base=round(float(scenarios["base"][i]), 2),
                bear=round(float(scenarios["bear"][i]), 2),
            )
            for i in range(days)
        ]

        market_ctx = MarketContext(
            regime=features.get("market_regime", "mixed"),
            adx=features.get("adx", 0.0),
            trend_strength=features.get("trend_strength", "unknown"),
            rsi_interpretation=features.get("rsi_interpretation", "neutral"),
            above_sma50=features.get("above_sma50", False),
            above_sma200=features.get("above_sma200", False),
            price_change_30d=features.get("price_change_30d", 0.0),
            support_levels=features.get("support_levels", []),
            resistance_levels=features.get("resistance_levels", []),
            btc_correlation=features.get("btc_correlation"),
            fear_greed_label=features.get("fear_greed", {}).get("label", "neutral"),
            fear_greed_value=features.get("fear_greed", {}).get("value", 50),
        )

        prob_metrics_schema = ProbabilisticMetrics(
            probability_up=prob_metrics["probability_up"],
            probability_down=prob_metrics["probability_down"],
            expected_price=prob_metrics["expected_price"],
            expected_return_pct=prob_metrics["expected_return_pct"],
            value_at_risk_95=prob_metrics["value_at_risk_95"],
            value_at_risk_99=prob_metrics["value_at_risk_99"],
            conditional_var_95=prob_metrics["conditional_var_95"],
            sharpe_ratio=prob_metrics["sharpe_ratio"],
            n_simulations=prob_metrics["n_simulations"],
        )

        price_vol = float(np.std(prices_arr[-90:]) / np.mean(prices_arr[-90:])) if len(prices_arr) >= 90 else 0.5
        if price_vol < 0.15:
            confidence = "high"
        elif price_vol < 0.30:
            confidence = "medium"
        else:
            confidence = "low"

        regime = features.get("market_regime", "mixed")
        regime_impact = "positive" if regime in ("strong_bullish", "bullish") else "negative" if regime in ("strong_bearish", "bearish") else "neutral"

        factors = [
            FactorWeight(name="Market Regime", weight=0.20, impact=regime_impact),
            FactorWeight(name="News Sentiment", weight=0.20, impact=sentiment["label"]),
            FactorWeight(name="Monte Carlo Probability", weight=0.15, impact=f"{prob_metrics['probability_up']:.0f}% up"),
            FactorWeight(name="Value at Risk (95%)", weight=0.10, impact=f"${prob_metrics['value_at_risk_95']:.0f}"),
            FactorWeight(name="Trend Strength (ADX)", weight=0.10, impact=f"{features.get('adx', 0):.1f}"),
            FactorWeight(name="BTC Correlation", weight=0.10, impact=f"{features.get('btc_correlation', 0):.2f}" if features.get("btc_correlation") is not None else "N/A"),
            FactorWeight(name="Fear & Greed", weight=0.10, impact=f"{features.get('fear_greed', {}).get('label', 'neutral')} ({features.get('fear_greed', {}).get('value', 50):.0f})"),
            FactorWeight(name="Price Momentum", weight=0.05, impact="positive" if features.get("momentum", np.array([0]))[-1] > 0 else "negative"),
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
            probabilistic_forecast=probabilistic_forecast,
            scenarios=scenario_points,
            market_context=market_ctx,
            probabilistic_metrics=prob_metrics_schema,
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
