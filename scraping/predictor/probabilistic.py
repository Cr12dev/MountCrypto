import logging

import numpy as np

logger = logging.getLogger(__name__)


def monte_carlo_simulation(
    prices: np.ndarray,
    steps: int,
    n_simulations: int = 2000,
    volatility: np.ndarray | None = None,
) -> np.ndarray:
    last_price = prices[-1]
    log_returns = np.diff(np.log(prices))
    mu = np.mean(log_returns) * 365
    if volatility is not None and len(volatility) > 0:
        recent_vol = np.nanmean(volatility[-min(30, len(volatility)):])
        if np.isnan(recent_vol) or recent_vol <= 0:
            sigma = np.std(log_returns) * np.sqrt(365)
        else:
            sigma = recent_vol / 100
    else:
        sigma = np.std(log_returns) * np.sqrt(365)
    dt = 1.0 / 365
    paths = np.zeros((n_simulations, steps))
    for i in range(n_simulations):
        rand = np.random.normal(0, 1, steps)
        prices_path = np.zeros(steps)
        current = last_price
        for t in range(steps):
            current = current * np.exp((mu - 0.5 * sigma ** 2) * dt + sigma * np.sqrt(dt) * rand[t])
            prices_path[t] = current
        paths[i] = prices_path
    return paths


def compute_quantile_forecast(paths: np.ndarray) -> dict[str, np.ndarray]:
    return {
        "p5": np.percentile(paths, 5, axis=0),
        "p25": np.percentile(paths, 25, axis=0),
        "p50": np.percentile(paths, 50, axis=0),
        "p75": np.percentile(paths, 75, axis=0),
        "p95": np.percentile(paths, 95, axis=0),
    }


def scenario_analysis(
    prices: np.ndarray,
    steps: int,
    volatility: np.ndarray | None = None,
) -> dict[str, np.ndarray]:
    last_price = prices[-1]
    log_returns = np.diff(np.log(prices))
    mu = np.mean(log_returns) * 365
    if volatility is not None and len(volatility) > 0:
        recent_vol = np.nanmean(volatility[-min(30, len(volatility)):])
        sigma = recent_vol / 100 if (not np.isnan(recent_vol) and recent_vol > 0) else np.std(log_returns) * np.sqrt(365)
    else:
        sigma = np.std(log_returns) * np.sqrt(365)
    dt = 1.0 / 365
    t = np.arange(1, steps + 1)
    drift = mu - 0.5 * sigma ** 2
    base = last_price * np.exp(drift * t * dt)
    bull = last_price * np.exp((drift + 1.5 * sigma) * t * dt)
    bear = last_price * np.exp((drift - 1.5 * sigma) * t * dt)
    return {"bull": bull, "base": base, "bear": bear}


def compute_probability_metrics(monte_carlo_paths: np.ndarray, ensemble_forecast: np.ndarray) -> dict:
    last_price = ensemble_forecast[0]
    final_prices = monte_carlo_paths[:, -1]
    p_up = float(np.mean(final_prices > ensemble_forecast[-1])) * 100
    p_down = float(np.mean(final_prices < ensemble_forecast[-1])) * 100
    expected_value = float(np.mean(final_prices))
    expected_return = float((expected_value / ensemble_forecast[-1] - 1) * 100)
    var_95 = float(np.percentile(final_prices, 5))
    var_99 = float(np.percentile(final_prices, 1))
    cvar_95 = float(np.mean(final_prices[final_prices <= var_95])) if np.any(final_prices <= var_95) else var_95
    sharpe_ratio = None
    if expected_return != 0:
        path_stds = np.std(monte_carlo_paths[:, -1])
        if path_stds > 0:
            sharpe_ratio = round(expected_return / path_stds, 4)
    return {
        "probability_up": round(p_up, 2),
        "probability_down": round(p_down, 2),
        "expected_price": round(expected_value, 2),
        "expected_return_pct": round(expected_return, 2),
        "value_at_risk_95": round(var_95, 2),
        "value_at_risk_99": round(var_99, 2),
        "conditional_var_95": round(cvar_95, 2),
        "sharpe_ratio": sharpe_ratio,
        "n_simulations": monte_carlo_paths.shape[0],
    }


def compute_skewness_kurtosis(prices: np.ndarray) -> dict[str, float]:
    log_returns = np.diff(np.log(prices))
    n = len(log_returns)
    if n < 3:
        return {"skewness": 0.0, "kurtosis": 0.0}
    std = np.std(log_returns)
    if std == 0:
        return {"skewness": 0.0, "kurtosis": 0.0}
    skew = float(np.mean((log_returns / std) ** 3))
    kurt = float(np.mean((log_returns / std) ** 4) - 3)
    return {"skewness": round(skew, 4), "kurtosis": round(kurt, 4)}


# ---- Regime-Specific Adjustments ----

REGIME_ADJUSTMENTS = {
    "strong_bullish": {"vol_mult": 0.7, "bias": 0.15},
    "bullish": {"vol_mult": 0.85, "bias": 0.08},
    "sideways": {"vol_mult": 1.0, "bias": 0.0},
    "mixed": {"vol_mult": 1.0, "bias": 0.0},
    "bearish": {"vol_mult": 1.15, "bias": -0.08},
    "strong_bearish": {"vol_mult": 1.3, "bias": -0.15},
}

DEFAULT_ADJUSTMENT = {"vol_mult": 1.0, "bias": 0.0}


def get_regime_adjustment(regime: str) -> dict:
    return REGIME_ADJUSTMENTS.get(regime, DEFAULT_ADJUSTMENT)
