import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

SCRAPING_API_URL = "http://localhost:8000"
FEAR_GREED_URL = "https://api.alternative.me/fng/?limit=30"

GENERAL_CRYPTO_KEYWORDS = {"crypto", "cryptocurrency", "digital asset", "blockchain"}


async def fetch_crypto_news(keywords: list[str], limit: int = 50) -> list[dict[str, Any]]:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{SCRAPING_API_URL}/articles",
                params={"limit": limit},
            )
            if resp.status_code == 200:
                articles = resp.json()
                all_kw = set(k.lower() for k in keywords) | GENERAL_CRYPTO_KEYWORDS
                filtered = []
                for a in articles:
                    title = (a.get("title") or "").lower()
                    summary = (a.get("summary") or "").lower()
                    text = f"{title} {summary}"
                    if any(kw in text for kw in all_kw):
                        filtered.append(a)
                logger.info(f"Found {len(filtered)} relevant articles out of {len(articles)}")
                return filtered
    except Exception as e:
        logger.warning(f"Failed to fetch news from scraping API: {e}")
    return []


async def fetch_fear_greed_index() -> list[dict[str, Any]]:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(FEAR_GREED_URL)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("data", [])
    except Exception as e:
        logger.warning(f"Failed to fetch Fear & Greed index: {e}")
    return []


def compute_text_sentiment(articles: list[dict[str, Any]]) -> float:
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        analyzer = SentimentIntensityAnalyzer()
    except ImportError:
        logger.warning("vaderSentiment not available, using fallback sentiment")
        return _fallback_sentiment(articles)

    scores = []
    for article in articles:
        text = f"{article.get('title', '')} {article.get('summary', '')}"
        if not text.strip():
            continue
        vs = analyzer.polarity_scores(text)
        scores.append(vs["compound"])

    if not scores:
        return 0.0

    return sum(scores) / len(scores)


POSITIVE_WORDS = {"bull", "bullish", "surge", "rally", "gain", "up", "green", "moon",
                  "adoption", "institutional", "approval", "positive", "growth",
                  "breakthrough", "innovation", "opportunity", "support", "strong"}
NEGATIVE_WORDS = {"bear", "bearish", "crash", "dump", "loss", "down", "red", "fear",
                  "ban", "restrict", "regulation", "crackdown", "fraud", "hack",
                  "scam", "decline", "drop", "uncertainty", "risk", "weak", "sell-off"}


def _fallback_sentiment(articles: list[dict[str, Any]]) -> float:
    score = 0.0
    count = 0
    for article in articles:
        text = f"{article.get('title', '')} {article.get('summary', '')}".lower()
        pos_count = sum(1 for w in POSITIVE_WORDS if w in text)
        neg_count = sum(1 for w in NEGATIVE_WORDS if w in text)
        total = pos_count + neg_count
        if total > 0:
            score += (pos_count - neg_count) / total
            count += 1

    return score / count if count > 0 else 0.0


async def analyze_sentiment(keywords: list[str] | None = None) -> dict:
    kw = keywords or ["bitcoin", "btc"]
    articles = await fetch_crypto_news(kw, limit=50)
    text_score = compute_text_sentiment(articles)

    fng_data = await fetch_fear_greed_index()
    fng_score = 50.0
    fng_label = "neutral"
    if fng_data:
        latest = fng_data[0]
        fng_score = float(latest.get("value", 50))
        classification = latest.get("value_classification", "Neutral").lower()
        fng_label = classification

        if len(fng_data) >= 7:
            recent = [float(d.get("value", 50)) for d in fng_data[:7]]
            avg_recent = sum(recent) / len(recent)
            if avg_recent > fng_score + 2:
                fng_label += " (declining)"
            elif avg_recent < fng_score - 2:
                fng_label += " (rising)"

    normalized_fng = (fng_score - 50) / 50

    combined_score = 0.4 * text_score + 0.6 * normalized_fng

    if combined_score > 0.2:
        label = "bullish"
    elif combined_score < -0.2:
        label = "bearish"
    else:
        label = "neutral"

    return {
        "score": round(combined_score, 4),
        "label": label,
        "article_count": len(articles),
        "text_sentiment": round(text_score, 4),
        "fear_greed_value": fng_score,
        "fear_greed_trend": fng_label,
        "recent_trend": fng_label,
    }
