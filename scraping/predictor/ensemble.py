import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


def linear_regression_forecast(prices: np.ndarray, steps: int) -> np.ndarray:
    n = len(prices)
    x = np.arange(n)
    coeffs = np.polyfit(x, prices, 1)
    trend = np.polyval(coeffs, x)
    future_x = np.arange(n, n + steps)
    forecast = np.polyval(coeffs, future_x)
    return forecast


def polynomial_forecast(prices: np.ndarray, steps: int, degree: int = 2) -> np.ndarray:
    n = len(prices)
    x = np.arange(n)
    coeffs = np.polyfit(x, prices, min(degree, n - 1))
    future_x = np.arange(n, n + steps)
    forecast = np.polyval(coeffs, future_x)
    return forecast


def weighted_moving_average_forecast(prices: np.ndarray, steps: int, window: int = 20) -> np.ndarray:
    if len(prices) < window:
        window = max(5, len(prices))
    weights = np.arange(1, window + 1, dtype=float)
    weights = weights / weights.sum()

    recent = prices[-window:]
    wma = np.dot(recent, weights)

    slope = (prices[-1] - prices[-min(30, len(prices))]) / min(30, len(prices))
    forecast = np.array([wma + slope * (i + 1) for i in range(steps)])
    return forecast


def momentum_regression_forecast(prices: np.ndarray, steps: int) -> np.ndarray:
    n = len(prices)
    lookback = min(90, n)
    recent = prices[-lookback:]
    x = np.arange(lookback)
    coeffs = np.polyfit(x, recent, 1)
    trend_slope = coeffs[0]

    momentum = (prices[-1] / prices[-min(30, n)] - 1)
    adjustment = 1 + momentum * 0.3

    future_x = np.arange(1, steps + 1)
    forecast = prices[-1] + trend_slope * future_x * adjustment
    return forecast


def seasonal_decomposition_forecast(prices: np.ndarray, steps: int, period: int = 7) -> np.ndarray:
    n = len(prices)
    if n < period * 3:
        return polynomial_forecast(prices, steps, degree=1)

    trend = np.convolve(prices, np.ones(period) / period, mode="valid")
    detrended = prices[period - 1:] - trend

    seasonal = np.full(period, 0.0)
    for i in range(period):
        indices = range(i, len(detrended), period)
        vals = [detrended[j] for j in indices if j < len(detrended)]
        if vals:
            seasonal[i] = np.mean(vals)
    seasonal = seasonal - np.mean(seasonal)

    trend_forecast = np.polyval(np.polyfit(np.arange(len(trend)), trend, 1),
                                np.arange(len(trend), len(trend) + steps))

    forecast = np.array([
        trend_forecast[i] + seasonal[(len(prices) + i) % period]
        for i in range(steps)
    ])
    return forecast


def compute_mse(actual: np.ndarray, predicted: np.ndarray) -> float:
    min_len = min(len(actual), len(predicted))
    if min_len == 0:
        return float("inf")
    return float(np.mean((actual[-min_len:] - predicted[-min_len:]) ** 2))


def compute_mae(actual: np.ndarray, predicted: np.ndarray) -> float:
    min_len = min(len(actual), len(predicted))
    if min_len == 0:
        return float("inf")
    return float(np.mean(np.abs(actual[-min_len:] - predicted[-min_len:])))


def compute_confidence_interval(prices: np.ndarray, forecast: np.ndarray,
                                volatility: np.ndarray | None = None) -> tuple[np.ndarray, np.ndarray]:
    if volatility is not None and len(volatility) > 0:
        recent_vol = np.nanmean(volatility[-min(30, len(volatility)):])
        if np.isnan(recent_vol) or recent_vol <= 0:
            recent_vol = _compute_historical_vol(prices)
    else:
        recent_vol = _compute_historical_vol(prices)

    base_vol = recent_vol / 100
    confidence_factor = np.linspace(1.0, 2.5, len(forecast))
    std_dev = forecast * base_vol * confidence_factor

    upper = forecast + 1.96 * std_dev
    lower = forecast - 1.96 * std_dev
    lower = np.maximum(lower, 0)
    return upper, lower


def _compute_historical_vol(prices: np.ndarray, window: int = 30) -> float:
    if len(prices) < 10:
        return 0.5
    log_returns = np.diff(np.log(prices[-min(window, len(prices)):]))
    if len(log_returns) < 2:
        return 0.5
    return float(np.std(log_returns) * np.sqrt(365))


async def predict_price(days: int, features: dict[str, Any],
                        sentiment_score: float) -> dict[str, Any]:
    prices = features["close_prices"]
    n = len(prices)

    if n < 10:
        raise ValueError(f"Not enough price data ({n} points), need at least 10")

    models = {
        "linear_regression": {
            "weight": 0.25,
            "fn": lambda: linear_regression_forecast(prices, days),
        },
        "polynomial": {
            "weight": 0.20,
            "fn": lambda: polynomial_forecast(prices, days, degree=2),
        },
        "weighted_ma": {
            "weight": 0.15,
            "fn": lambda: weighted_moving_average_forecast(prices, days),
        },
        "momentum": {
            "weight": 0.20,
            "fn": lambda: momentum_regression_forecast(prices, days),
        },
        "seasonal": {
            "weight": 0.20,
            "fn": lambda: seasonal_decomposition_forecast(prices, days),
        },
    }

    predictions: dict[str, np.ndarray] = {}
    metrics: list[dict[str, Any]] = []
    total_weight = 0.0

    split_idx = int(n * 0.8)
    train = prices[:split_idx]
    test = prices[split_idx:]

    for name, cfg in models.items():
        try:
            model_forecast = cfg["fn"]()
            predictions[name] = model_forecast

            weight = cfg["weight"]

            if len(test) > 5:
                train_prices = prices[:split_idx]
                test_prices = prices[split_idx:]
                model_test_pred = model_forecast[:len(test_prices)]
                if len(model_test_pred) < len(test_prices):
                    model_test_pred = np.pad(
                        model_test_pred,
                        (0, len(test_prices) - len(model_test_pred)),
                        mode="edge",
                    )
                mae = compute_mae(test_prices, model_test_pred)
                rmse = np.sqrt(compute_mse(test_prices, model_test_pred))

                perf_score = 1.0 / (1.0 + rmse / np.mean(test_prices))
                weight *= (0.5 + 0.5 * perf_score)

                metrics.append({
                    "model": name,
                    "mae": round(mae, 2),
                    "rmse": round(rmse, 2),
                    "weight": round(weight, 4),
                })
            else:
                metrics.append({
                    "model": name,
                    "mae": 0.0,
                    "rmse": 0.0,
                    "weight": round(weight, 4),
                })

            total_weight += weight
        except Exception as e:
            logger.warning(f"Model {name} failed: {e}")
            continue

    if not predictions:
        raise ValueError("All prediction models failed")

    ensemble = np.zeros(days, dtype=float)
    for name, pred in predictions.items():
        m = next((m for m in metrics if m["model"] == name), None)
        w = m["weight"] if m else 0.0
        ensemble += pred * w

    ensemble = ensemble / total_weight if total_weight > 0 else ensemble

    sentiment_adjustment = 1.0 + sentiment_score * 0.05
    ensemble = ensemble * sentiment_adjustment

    volatility = features.get("volatility")
    if isinstance(volatility, np.ndarray):
        upper, lower = compute_confidence_interval(prices, ensemble, volatility)
    else:
        upper, lower = compute_confidence_interval(prices, ensemble)

    norm_metrics = []
    for m in metrics:
        norm_m = m.copy()
        norm_m["weight"] = round(m["weight"] / total_weight, 4) if total_weight > 0 else 0
        norm_metrics.append(norm_m)

    return {
        "ensemble": ensemble,
        "upper": upper,
        "lower": lower,
        "metrics": norm_metrics,
        "sentiment_adjustment": round((sentiment_adjustment - 1) * 100, 2),
    }
