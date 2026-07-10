from abc import ABC, abstractmethod
from typing import Optional
from datetime import datetime
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

from models import Article, Source


class BaseScraper(ABC):
    source: Source
    label: str
    base_url: str

    @abstractmethod
    def scrape(self) -> list[Article]:
        ...

    def _fetch_json(self, url: str, timeout: int = 30000) -> Optional[dict]:
        import httpx
        try:
            with httpx.Client(timeout=timeout / 1000) as client:
                r = client.get(url, headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/125.0.0.0 Safari/537.36"
                    ),
                    "Accept": "application/json",
                })
                if r.status_code == 200:
                    return r.json()
        except Exception:
            return None
        return None

    def _fetch_playwright(
        self, url: str, timeout: int = 30000, extract_js: str = ""
    ) -> Optional[list[dict]]:
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    viewport={"width": 1920, "height": 1080},
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/125.0.0.0 Safari/537.36"
                    ),
                )
                page = context.new_page()
                Stealth().apply_stealth_sync(page)

                page.goto(url, wait_until="domcontentloaded", timeout=timeout)
                page.wait_for_timeout(4000)

                if extract_js:
                    result = page.evaluate(extract_js)
                    browser.close()
                    return result if isinstance(result, list) else []

                browser.close()
                return []
        except Exception:
            return []

    def _build_article(self, item: dict, uid: str) -> Article:
        published = None
        if item.get("published"):
            for fmt in [
                "%Y-%m-%dT%H:%M:%S%z",
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%d",
                "%d %B %Y",
                "%B %d, %Y",
                "%d/%m/%Y",
            ]:
                try:
                    published = datetime.strptime(
                        str(item["published"]).rstrip("Z"), fmt
                    )
                    break
                except ValueError:
                    continue

        link = item.get("link", "")
        if link.startswith("/"):
            parsed = urlparse(self.base_url)
            link = f"{parsed.scheme}://{parsed.netloc}{link}"
        elif link and not link.startswith("http"):
            link = f"{self.base_url.rstrip('/')}/{link.lstrip('/')}"

        return Article(
            id=f"{self.source.value}_{uid}",
            source=self.source,
            title=item.get("title", ""),
            summary=item.get("summary", ""),
            link=link,
            published=published,
            image_url=item.get("image_url"),
        )
