import hashlib
from scrapers.base import BaseScraper
from models import Article, Source
from utils.filters import is_relevant


EXTRACT_JS = """
() => {
  const items = [];
  const seen = new Set();

  const containers = document.querySelectorAll('article, div[class*="card"], li[class*="article"], div[class*="teaser"]');

  containers.forEach(el => {
    const linkEl = el.tagName === 'A' ? el : el.querySelector('a');
    const href = linkEl ? linkEl.getAttribute('href') || '' : '';

    const titleEl = el.querySelector('h2, h3, h4, [class*="headline"]');
    const title = titleEl ? titleEl.innerText.trim() : '';

    if (!title || seen.has(title)) return;
    seen.add(title);

    const summaryEl = el.querySelector('p, [class*="description"]');
    const summary = summaryEl ? summaryEl.innerText.trim() : '';

    const imgEl = el.querySelector('img');
    const imageUrl = imgEl ? (imgEl.getAttribute('src') || '') : '';

    items.push({ title, summary, link: href, image_url: imageUrl.startsWith('//') ? 'https:' + imageUrl : imageUrl });
  });

  return items;
}
"""


class EconomistScraper(BaseScraper):
    source = Source.ECONOMIST
    label = "The Economist"
    base_url = "https://www.economist.com"

    CATEGORY_URLS = [
        "https://www.economist.com/finance-and-economics",
        "https://www.economist.com/business",
        "https://www.economist.com/markets-and-data",
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
