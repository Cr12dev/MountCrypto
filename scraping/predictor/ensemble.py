import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)


# ---- Existing models ----


def linear_regression_forecast(prices: np.ndarray, steps: int) -> np.ndarray:
    n = len(prices)
    x = np.arange(n)
    coeffs = np.polyfit(x, prices, 1)
    forecast = np.polyval(coeffs, np.arange(n, n + steps))
    return forecast


def polynomial_forecast(prices: np.ndarray, steps: int, degree: int = 2) -> np.ndarray:
    n = len(prices)
    coeffs = np.polyfit(np.arange(n), prices, min(degree, n - 1))
    return np.polyval(coeffs, np.arange(n, n + steps))


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
    coeffs = np.polyfit(np.arange(lookback), recent, 1)
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


# ---- Classical quantitative models ----


def arima_forecast(prices: np.ndarray, steps: int, p: int = 1, d: int = 1, q: int = 1) -> np.ndarray:
    n = len(prices)
    if n < 5:
        return linear_regression_forecast(prices, steps)

    differenced = np.diff(prices, d) if d > 0 else prices.copy()
    diff_len = len(differenced)

    ar_coeffs = np.zeros(p)
    ar_errors = np.zeros(diff_len)
    if p > 0 and diff_len > p:
        Y = differenced[p:]
        X = np.column_stack([differenced[p - 1 - i:diff_len - 1 - i] for i in range(p)])
        if q > 0:
            X = np.column_stack([X] + [np.zeros((len(Y), q))])
        if len(Y) > p:
            ar_coeffs = np.linalg.lstsq(X[:, :p], Y, rcond=None)[0]
            residuals = Y - X[:, :p] @ ar_coeffs
            ar_errors[-len(residuals):] = residuals

    ma_coeffs = np.zeros(q)
    if q > 0 and len(ar_errors) > q:
        Y = differenced[q:]
        X = np.column_stack([ar_errors[q - 1 - i:len(ar_errors) - 1 - i] for i in range(q)])
        if len(Y) > q:
            ma_coeffs = np.linalg.lstsq(X, Y, rcond=None)[0]

    last_diff = differenced[-p:] if p > 0 else np.array([])
    last_errors = ar_errors[-q:] if q > 0 and len(ar_errors) >= q else np.array([])

    forecast_diff = np.zeros(steps)
    for i in range(steps):
        ar_term = float(np.dot(ar_coeffs[:p], last_diff[-p:][::-1])) if p > 0 and len(last_diff) >= p else 0
        ma_term = float(np.dot(ma_coeffs[:q], last_errors[-q:][::-1])) if q > 0 and len(last_errors) >= q else 0
        val = ar_term + ma_term
        forecast_diff[i] = val
        last_diff = np.append(last_diff, val)
        last_errors = np.append(last_errors, 0)

    if d == 1:
        forecast = np.zeros(steps)
        forecast[0] = prices[-1] + forecast_diff[0]
        for i in range(1, steps):
            forecast[i] = forecast[i - 1] + forecast_diff[i]
        return forecast
    return linear_regression_forecast(prices, steps)


def garch_volatility_forecast(prices: np.ndarray, steps: int) -> tuple[np.ndarray, np.ndarray]:
    log_returns = np.diff(np.log(prices))
    if len(log_returns) < 10:
        sigma = np.std(log_returns)
        return np.full(steps, sigma), linear_regression_forecast(prices, steps)

    omega = np.var(log_returns) * 0.05
    alpha = 0.15
    beta = 0.80
    sigma2 = np.var(log_returns)
    n = len(log_returns)
    for ret in log_returns[-min(50, n):]:
        sigma2 = omega + alpha * ret ** 2 + beta * sigma2

    base_forecast = linear_regression_forecast(prices, steps)
    vol_forecast = np.full(steps, np.sqrt(sigma2))
    for i in range(1, steps):
        vol_forecast[i] = np.sqrt(omega + alpha * vol_forecast[i - 1] ** 2 + beta * vol_forecast[i - 1] ** 2)

    return vol_forecast, base_forecast


def kalman_filter_forecast(prices: np.ndarray, steps: int) -> np.ndarray:
    n = len(prices)
    if n < 5:
        return linear_regression_forecast(prices, steps)

    x_est = np.zeros(n)
    p_est = np.zeros(n)
    q = np.var(prices) * 0.001
    r = np.var(prices) * 0.01
    x_est[0] = prices[0]
    p_est[0] = np.var(prices[:5]) if n >= 5 else np.var(prices)

    for i in range(1, n):
        x_pred = x_est[i - 1]
        p_pred = p_est[i - 1] + q
        k = p_pred / (p_pred + r)
        x_est[i] = x_pred + k * (prices[i] - x_pred)
        p_est[i] = (1 - k) * p_pred

    last_state = x_est[-1]
    last_slope = np.mean(np.diff(x_est[-min(10, len(x_est)):]))
    forecast = np.array([last_state + last_slope * (i + 1) for i in range(steps)])
    return forecast


def brownian_motion_forecast(prices: np.ndarray, steps: int, volatility_forecast: np.ndarray | None = None) -> np.ndarray:
    log_returns = np.diff(np.log(prices))
    mu = np.mean(log_returns)
    if volatility_forecast is not None:
        sigma = volatility_forecast
    else:
        sigma_avg = np.std(log_returns)
        sigma = np.full(steps, sigma_avg)
    dt = 1.0
    forecast = np.zeros(steps)
    current = np.log(prices[-1])
    for i in range(steps):
        current = current + (mu - 0.5 * sigma[i] ** 2) * dt + sigma[i] * np.random.normal(0, 1) * np.sqrt(dt)
        forecast[i] = np.exp(current)
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

    volatility = features.get("volatility")
    regime = features.get("market_regime", "sideways")

    garch_vol, garch_base = garch_volatility_forecast(prices, days) if n >= 20 else (np.full(days, np.std(np.diff(np.log(prices)))), linear_regression_forecast(prices, days))

    models = {
        "linear_regression": {
            "weight": 0.15,
            "fn": lambda: linear_regression_forecast(prices, days),
        },
        "polynomial": {
            "weight": 0.12,
            "fn": lambda: polynomial_forecast(prices, days, degree=2),
        },
        "weighted_ma": {
            "weight": 0.10,
            "fn": lambda: weighted_moving_average_forecast(prices, days),
        },
        "momentum": {
            "weight": 0.12,
            "fn": lambda: momentum_regression_forecast(prices, days),
        },
        "seasonal": {
            "weight": 0.10,
            "fn": lambda: seasonal_decomposition_forecast(prices, days),
        },
        "arima": {
            "weight": 0.15,
            "fn": lambda: arima_forecast(prices, days),
        },
        "kalman_filter": {
            "weight": 0.14,
            "fn": lambda: kalman_filter_forecast(prices, days),
        },
        "garch_brownian": {
            "weight": 0.12,
            "fn": lambda: brownian_motion_forecast(prices, days, garch_vol),
        },
    }

    predictions: dict[str, np.ndarray] = {}
    metrics: list[dict[str, Any]] = []
    total_weight = 0.0

    split_idx = int(n * 0.8)
    test = prices[split_idx:]

    for name, cfg in models.items():
        try:
            model_forecast = cfg["fn"]()
            predictions[name] = model_forecast

            weight = cfg["weight"]

            if len(test) > 5:
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

    from .probabilistic import get_regime_adjustment

    regime_adj = get_regime_adjustment(regime)
    if regime_adj["bias"] != 0:
        ensemble = ensemble * (1 + regime_adj["bias"] * np.linspace(0.3, 1, days))

    sentiment_adjustment = 1.0 + sentiment_score * 0.05
    ensemble = ensemble * sentiment_adjustment

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
