from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging

from models import Article, Source, ScrapeResponse, ErrorResponse
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
