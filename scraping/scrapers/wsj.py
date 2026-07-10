import hashlib
from scrapers.base import BaseScraper
from models import Article, Source
from utils.filters import is_relevant


EXTRACT_JS = """
() => {
  const items = [];
  const seen = new Set();

  const containers = document.querySelectorAll('article, div[class*="story"], div[class*="card"], section[class*="story"]');

  containers.forEach(el => {
    const linkEl = el.tagName === 'A' ? el : el.querySelector('a[href*="/articles/"], a[href*="/news/"]');
    const href = linkEl ? linkEl.getAttribute('href') || '' : '';

    const titleEl = el.querySelector('h2, h3, h4, span[class*="headline"], [class*="title"]');
    const title = titleEl ? titleEl.innerText.trim() : '';

    if (!title || seen.has(title)) return;
    seen.add(title);

    const summaryEl = el.querySelector('p, [class*="summary"], [class*="description"]');
    const summary = summaryEl ? summaryEl.innerText.trim() : '';

    items.push({ title, summary, link: href, image_url: '' });
  });

  return items;
}
"""


class WSJScraper(BaseScraper):
    source = Source.WSJ
    label = "Wall Street Journal"
    base_url = "https://www.wsj.com"

    CATEGORY_URLS = [
        "https://www.wsj.com/news/markets",
        "https://www.wsj.com/news/economy",
        "https://www.wsj.com/news/finance",
        "https://www.wsj.com/news/business",
    ]

    def scrape(self) -> list[Article]:
        articles: list[Article] = []
        seen = set()

        for url in self.CATEGORY_URLS:
            items = self._fetch_playwright(url, timeout=35000, extract_js=EXTRACT_JS)

            for item in items:
                text = f"{item.get('title', '')} {item.get('summary', '')}"
                if not is_relevant(text):
                    continue

                key = hashlib.md5(
                    (item.get("title", "") + item.get("link", "")).encode()
                ).hexdigest()[:12]
                if key in seen:
                    continue
                seen.add(key)

                articles.append(self._build_article(item, key))

        return articles
